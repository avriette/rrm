'use strict';

var Schema = { "defined": 0 };

var Riak   = require('riak-dc')
	, dg     = require('deep-grep')
	, q      = require('q');

var logger  = require( 'log4js' ).getLogger( 'rrm' )
	, logwrap = {
		debug : function (s) { if (process.env.DEBUG != undefined) { logger.debug(s) } },
		info  : function (s) { if (process.env.DEBUG != undefined) { logger.info(s) } },
		warn  : function (s) { if (process.env.DEBUG != undefined) { logger.warn(s) } },
		error : function (s) { if (process.env.DEBUG != undefined) { logger.error(s); return new Error(s) } },
	};

var promise_err_handler = function (err) {
	return logger.error( 'promise rejected: ' + err );
}

/**
 * Sends a ping through to Riak.
 */
function ping () { return Riak.ping() }

/**
 * Gets a copy of the schema from Riak.
 */
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
		logwrap.debug( 'Returning memoized schema.' );
		return deferred.promise;
	}

	return Riak.get_keys('prototypes').then( function( prototypes ) {
		var map = { };
		return q.all(
			prototypes.map( function( prototype ) {
				if (prototype != 'defined') { // XXX: hack to support memoization/mock data
					logwrap.debug( 'fetching prototype for ' + prototype );
					return Riak.get_tuple( 'prototypes', prototype ).then(
						function( rp ) {
							if (typeof rp == 'string') {
								logwrap.debug( 'json parsing ' + rp );
								rp = JSON.parse(rp)
								map[prototype] = rp;
							}
							else {
								logwrap.debug( 'passed a native object, assigning to map' );
								map[prototype] = rp;
							}
						}
					) // get_tuple.then
				} // gross hack
			} ) // prototypes.map
		) // q.all
	.then( function () {
		Schema = map;
		logwrap.debug( 'Set defined bit in schema' );
		Schema['defined'] = 1;
		logwrap.debug( 'Returning from get_schema' );
		return map;
	} ) // q.all.then
	} ) // get_keys.then
} // }}} get_schema()

/**
 * Updates an object ("row" or "record") in Riak.
 * @param {object} object - the object you wish to update
 */
function update_object (object)  { // {{{
	// Takes an object and a serial, updates Riak to change that object. Returns
	// the new serial for the updated object (Riak does not have update).
	//
	// TODO: writeme
} // }}}

/**
 * Creates a new schema from a javascript object (useful for reading a schema off disk)
 * @param {object} schema - the javascript object representing your desired schema
 */
function init_schema (schema) { // {{{
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

/**
 * Places a new object into the database.
 * @param {string} type - the type of object you are storing
 * @param {object} object - the javascript object you wish to store.
 */
function add_object (type, object) { // {{{
	if (object['serial']) {
		return new Error( 'Object id ' + object['serial'] + ' already in Riak; update_object() instead?' );
	}

	if ( Schema['defined'] ) {
		if ( Schema.hasOwnProperty( type ) ) {
			// This looks like a Schema that has an object of the type we are
			// being asked to commit.
			//
			logwrap.debug( 'adding object of type ' + type );
			return Riak.put_tuple(type, object).then( function( pserial ) {
				return pserial;
			} );
		}
		else {
			// We don't actually have objects of this type, so error
			//
			return logwrap.error( 'Object type ' + type + ' not defined in schema.' );
		}
	}
	else {
		logwrap.debug( 'Encountered empty schema, pulling fresh copy' );
		var pschema = get_schema();
		return pschema.then( function (s) {
			if ( Schema.hasOwnProperty( type ) ) {
				// This looks like a Schema that has an object of the type we are
				// being asked to commit.
				//
				logwrap.debug( 'adding object of type ' + type );
				return Riak.put_tuple(type, object).then( function( pserial ) {
					return pserial;
				} );
			}
			else {
				// We don't actually have objects of this type, so error
				//
				return logwrap.error( 'Object type ' + type + ' not defined in schema.' );
			}
		} ) // promised schema
	} // is the schema defined?
} // }}} add_object()

/**
 * Deletes an object from Riak
 * @param {string} type - the type of object you are deleting
 * @param {object} object - the javascript object you wish to delete. (optional, sort of)
 * @param {string} id - the serial ('nonce') of the object you wish to delete (optional)
 */
function del_object (type, object, id) { // {{{
	// Attempt to delete an object from the store. Takes the type of object and
	// the object. The object contains its serial.
	//
	var serial = object['serial']
		, deferred = q.defer();

	if (!serial) {
		if (!id) {
			return logwrap.error( 'Anonymous object provided without serial; cannot delete this object.' );
		}
		else {
			// A serial has been provided rather than an object, so we attempt to
			// just delete the tuple by 'name' and see how Riak reacts.
			//
			return Riak.del_tuple( type, id ).then( function (result) {
				if (!result) {
					return logwrap.error( 'Failed to delete anonymous object by supplied serial' );
				}
				else {
					deferred.resolve( result );
				}
			} );
		}
	}

	logwrap.debug( 'processed request to delete object tid ' + bucket + '/' + serial );

	Riak.del_tuple( type, serial ).then( function (result) {
		deferred.resolve( result );
	} );

	return deferred.promise;
} // }}}

/**
 * Return a new "empty" and "anonymous" (no serial) object
 * @param {string} type - the type of object you are deleting
 */
function new_object (type) { // {{{
	if (Schema.hasOwnProperty( type )) {
		// If it looks like we have a prototype for this object in the schema,
		// take that // definition and copy it, returning a fresh copy of that
		// object to the user.
		//
		var clone = schema_to_object( Schema[ type ] );

		logwrap.debug( 'returning cloned object of type ' + type );
		return clone;
	}
	else {
		// It looks like the schema hasn't been populated, so go get it.
		//
		// XXX: Obviously this is only a test for the keyness of type, rather than
		//      defined-ness of the schema, which is a bug and fixable.
		//
		logwrap.debug( 'fetching schema for new_object' );
		var pschema = get_schema();
		return pschema.then( function (s) {
			var clone = schema_to_object( s[ type ] );
			logwrap.debug( 'returning cloned object of type ' + type );
			return clone;
		} ) // return
	} // if has property etc
} // }}} new_object()

/**
 * Return list of the available object types in the schema.
 */
function object_types () { // {{{
	// Return a (promise of a) list of object types we know about in the
	// schema - no data or 'prototypes' of these objects are actually returned.
	//
	var keys = [ ]
		, deferred = q.defer();

	if (Schema['defined']) {
		dg.deeply( Object.keys( Schema ), function (t) {
			if ( (t != 'defined') && (t.substr(0,1) != '_') ) return 1
		} ).forEach( function (key) {
			keys.push(key);
		} )
		logwrap.debug( 'returning promise to keys' );
		deferred.resolve(keys);
		return deferred.promise;
	}
	else {
		// Haven't seen the schema yet, so populate it
		//
		logwrap.debug( 'populating schema in object_types' );
		var pschema = get_schema();
		return pschema.then( function (s) {
			dg.deeply( Object.keys( Schema ), function (t) {
				if ( (t != 'defined') && (t.substr(0,1) != '_') ) return 1
			} ).forEach( function (key) {
				keys.push(key);
			} )
			logwrap.debug( 'returning object types list' );
			deferred.resolve( keys );
			return deferred.promise;
		} );
	}
} // }}} object_types()

/**
 * Return all the objects of a given type
 * @param {string} type - the type of objects you would like from the database
 */
function get_objects (type) { // {{{
	// Pull every single object of a provided type out of Riak, as a promise to
	// a list. As all these objects have been stored, they will have serials.
	//
	var records = [ ];

	logwrap.debug( 'looking for ' + type + ' objects' );

	// Repeated from get_schema above
	//
	return Riak.get_keys(type).then( function( keys ) {
		return q.all(
			keys.map( function( key ) {
				logwrap.debug( 'fetching key ' + key );
				return Riak.get_tuple( type, key ).then(
					function( record ) {
						logwrap.debug( 'discovered ' + record );
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

/**
 * Pass in a database handle you will use for storing objects.
 * @param {object} object - the database handle.
 */
function set_riak_handle (obj) { // {{{
	// Accept a riak object from the user. This is expected to behave exactly
	// the way riak-dc does and this hook is almost entirely intended for
	// inserting spies during testing.
	//
	Riak = obj;
	return Riak;
} // }}}

/**
 * Re-initialise the schema in memory (not in Riak!).
 * @param {object} schema - the schema.
 */
function set_schema (s) { // {{{
	// Largely for test purposes, this function exists to clobber the Schema
	// singleton and replace it with a spy.
	Schema = s;
	return Schema;
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
exports.set_schema      = set_schema;
exports.ping            = ping;

// Not exported things
//
function schema_to_object (definition) { // {{{
	// Take the prototype definitions from the schema and create object stubs
	// out of it. These can subsequently be populated, but will not have a
	// serial until it's been written to Riak (add_object).
	//
	var clone = { }
		, map   = (typeof definition == 'string') ? JSON.parse(definition) : definition;

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

// @janearc // jane@cpan.org // vim:tw=79:ts=2:noet
