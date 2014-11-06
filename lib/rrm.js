var rrm;
var Schema = { "defined": 0 };

var Riak   = require('riak-dc')
	, jgrep  = require('jagrep')
	, q      = require('q');

var promise_err_handler = function (err) {
	console.log( 'promise rejected: ' + err );
}

function get_schema () { // {{{
	// Returns a (promise of a) hash of what the objects look like in Riak
	// credit to @rla (#node.js, github) for reworking some of this.
	//
	if (Schema['defined']) {
		// Basically memoize the call to get_schema because it takes a while
		//
		// We offer a promise here despite its definedness for purposes of API consistency
		//
		var deferred = q.defer();
		deferred.resolve( Schema );
		return deferred.promise;
	}

	return Riak.get_keys('prototypes').then( function( prototypes ) {
		var map = { };
		return q.all(
			prototypes.map( function( prototype ) {
				return Riak.get_tuple( 'prototypes', prototype ).then(
					function( rp ) {
						rp = JSON.parse(rp);
						map[prototype] = rp;
					}
				) // get_tuple.then
			} ) // prototypes.map
		) // q.all
	.then( function () {
		Schema = map;
		Schema['defined'] = 1;
		return map;
	} ) // q.all.then
	} ) // get_keys.then
} // }}} get_schema()

function update_object (object)  { // {{{
	// Takes an object and a serial, updates Riak to change that object. Returns
	// the new serial for the updated object (Riak does not have update).
	//
	// TODO: writeme
} // }}}

function init_schema ( schema ) { // {{{
	// Take a javascript object (so json.parse your string pls), and feed it to
	// Riak.
	//
	// NOTE: Because of how Riak works, this is not destructive. Riak also has
	//       no 'truncate' or 'initdb' type operation. If you try to initialise
	//       a fresh schema in Riak when one exists already, confusion will
	//       ensue.
	//
	// TODO: Riak 'initdb' script.
	//
	var returns  = [ ]
		, deferred = q.defer();

	Object.keys( schema ).forEach( function (type) {
		returns.push( Riak.put_tuple( 'prototypes', schema[type], type ) );
	} );

	deferred.resolve( returns );

	return deferred.promise;
} // }}}

function add_object ( type, object ) { // {{{
	if (object['serial']) {
		return new Error( 'Object id ' + object['serial'] + ' already in Riak; update_object() instead?' );
	}

	if ( Schema['defined'] ) {
		if ( Schema.hasOwnProperty( type ) ) {
			// This looks like a Schema that has an object of the type we are
			// being asked to commit.
			//
			var pserial = Riak.put_tuple( type, object );

			return Riak.put_tuple(type, object).then( function( pserial ) {
				return pserial;
			} );
		}
		else {
			// We don't actually have objects of this type, so error
			//
			return new Error( 'Object type ' + type + ' not defined in schema.' );
		}
	}
	else {
		var pschema = get_schema();
		pschema.then( function (s) {
			if ( Schema.hasOwnProperty( type ) ) {
				// This looks like a Schema that has an object of the type we are
				// being asked to commit.
				//
				var pserial = Riak.put_tuple( type, object );

				return Riak.put_tuple(type, object).then( function( pserial ) {
					return pserial;
				} );
			}
			else {
				// We don't actually have objects of this type, so error
				//
				return new Error( 'Object type ' + type + ' not defined in schema.' );
			}
		} ) // promised schema
	} // is the schema defined?
} // }}} add_object()

function del_object ( type, object ) { // {{{
	// Attempt to delete an object from the store. Takes the type of object and
	// the object. The object contains its serial.
	//
	var serial = object['serial']
		, deferred = q.defer();

	if (!serial) {
		return new Error( 'attempt to delete anonymous object' );
	}

	Riak.del_tuple( type, serial ).then( function (result) {
		deferred.resolve( result );
	} );

	return deferred.promise;
} // }}}

function new_object ( type ) { // {{{
	if (Schema.hasOwnProperty( type )) {
		// If it looks like we have a prototype for this object in the schema,
		// take that // definition and copy it, returning a fresh copy of that
		// object to the user.
		//
		var clone = schema_to_object( Schema[ type ] );

		return clone;
	}
	else {
		// It looks like the schema hasn't been populated, so go get it.
		//
		var pschema = get_schema();
		return pschema.then( function (s) {
			var clone = schema_to_object( s[ type ] );
			return clone;
		} ) // return
	} // if has property etc
} // }}} new_object()

function object_types () { // {{{
	// Return a (promise of a) list of object types we know about in the
	// schema - no data or 'prototypes' of these objects are actually returned.
	//
	var keys = [ ]
		, deferred = q.defer();

	if (Schema['defined']) {
		for (var key in Object.keys(Schema)) {
			// Elements of the schema beginning with '_', like '_version', are
			// reserved. Please don't mess with that.
			//
			var thiskey = Object.keys(Schema)[ key ];
			if (thiskey.substr(0,1) != '_') {
				keys.push(thiskey);
			}
		}
		return deferred.promise( keys );
	}
	else {
		// Haven't seen the schema yet, so populate it
		//
		var pschema = get_schema();
		return pschema.then( function (s) {
			for (var key in jgrep.sync(
				{ 'function' : function (t) { if (t != 'defined' ) return 1 } }
				, Object.keys(Schema) ) ) {
				// Elements of the schema beginning with '_', like '_version', are
				// reserved. Please don't mess with that.
				//
				var thiskey = Object.keys(Schema)[ key ];
				if (thiskey.substr(0,1) != '_') {
					keys.push(thiskey);
				}
			}
			return keys;
		} );
	}
} // }}} object_types()

function get_objects (type) { // {{{
	// Pull every single object of a provided type out of Riak, as a promise to
	// a list. As all these objects have been stored, they will have serials.
	//
	var records = [ ];

	console.log( 'looking for ' + type + ' objects' );

	// Repeated from get_schema above
	//
	return Riak.get_keys(type).then( function( keys ) {
		return q.all(
			keys.map( function( key ) {
				console.log( 'fetching key ' + key );
				return Riak.get_tuple( type, key ).then(
					function( record ) {
						console.log( 'discovered ' + record );
						records.push( record );
					}
				) // get_tuple.then
			} ) // objects.map
		) // q.all
	.then( function () {
		return records;
	} ) // q.all.then
	} ) // get_keys.then
} // }}}

function set_riak_handle (obj) { // {{{
	// Accept a riak object from the user. This is expected to behave exactly
	// the way riak-dc does and this hook is almost entirely intended for
	// inserting spies during testing.
	//
	rrm = obj;
	return rrm;
} // }}}

// Exported things
//

exports.add_object    = add_object;
exports.del_object    = del_object;
exports.get_objects   = get_objects;
exports.get_schema    = get_schema;
exports.new_object    = new_object;
exports.object_types  = object_types;
exports.update_object = update_object;

exports.set_riak_handle = set_riak_handle;

// Not exported things
//
function schema_to_object ( definition ) { // {{{
	// Take the prototype definitions from the schema and create object stubs
	// out of it. These can subsequently be populated, but will not have a
	// serial until it's been written to Riak (add_object).
	//
	var clone = { }
		, map   = JSON.parse(definition);

	Object.keys(map).forEach( function (k) {
		if ( (k != 'hasone') && (k != 'hasmany') ) {
			// Create the actual hash, casting it to string or integer based on
			// this gross hack.
			//
			clone[k] = map[k].isa == 'string' ? '' : 0 ;
		} // if it's a key and the right key
	} ) // walk the hash

	return clone;
} // }}}
