var rrm       = require( '../lib/rrm' )
	, mock_riak = { }
	, jgrep     = require( 'jagrep' )
	, q         = require( 'q' )
	, chai      = require( 'chai' )
	, cap       = require( 'chai-as-promised' )
	, assert    = require( 'assert' )
	, sinon     = require( 'sinon' );

chai.use( cap );

var Schema = {
	'Automobile': {
		'name'    : { 'isa': 'string', 'defined': true, 'distinct': true },
		'hasone'  : [ 'manufacturer' ],
		'hasmany' : [ 'repair', 'part' ],
		'data'    : [ ] // NOTE THIS IS FOR MOCKING
	},
	'Manufacturer': {
		'name'    : { 'isa': 'string', 'defined': true, 'distinct': true, 'verified': 'RESERVED' },
		'hasmany' : [ 'automobile', 'model' ],
		'data'    : [ ] // NOTE THIS IS FOR MOCKING
	},
	'defined' : 1
};

// Mock riak-dc {{{

function get_buckets () { // {{{
	// get_buckets returns a (promise of a) list of all the buckets riak knows about.
	//

	var deferred = q.defer()
		, buckets  = Object.keys(Schema);

	deferred.resolve( buckets );

	return deferred.promise;

} // }}} get_buckets

function get_keys (bucket) { // {{{
	var deferred = q.defer();
	
	if (bucket == 'prototypes') {
		deferred.resolve( Object.keys( Schema ) );
		return deferred.promise;
	}

	var keys = Schema[bucket]['data'].forEach( function (object) { return object['serial'] } );

	deferred.resolve( keys );

	return deferred.promise;

} // }}} get_keys

function get_tuple (bucket, key) { // {{{
	var deferred = q.defer()
		, tuple    = jgrep.sync( {
			'function' : function (t) {
				if (t['serial'] == key) return 1;
			}
		}, Schema[bucket] );

	deferred.resolve( tuple );

	return deferred.promise;
} // }}} get_tuple

function del_tuple (bucket, key) { // {{{
	var deferred = q.defer();

	Schema = jgrep.sync( { 'function' : function (t) { if (t['serial'] != key) { return 1 } } }, Schema[bucket] )

	return deferred.promise;
} // }}} del_tuple

function put_tuple (bucket, payload, forced_key) { // {{{
	var deferred = q.defer()
		, serial   = gen_serial();

	payload['serial'] = serial;

	Schema[bucket]['data'].push( payload );

	deferred.resolve( serial );

	return deferred.promise;

} // }}} put_tuple

function gen_serial () { // {{{
	return crypto.randomBytes( Math.ceil(32) ).toString('hex');
} // }}}

mock_riak.get_keys    = get_keys;
mock_riak.get_tuple   = get_tuple;
mock_riak.get_buckets = get_buckets;
mock_riak.put_tuple   = put_tuple;
mock_riak.del_tuple   = del_tuple;

// }}}

it( 'test schema syntax is valid', function () { assert( Schema ) } );

it( 'rrm accepts a mock riak handle', function () {
	assert.deepEqual(
		rrm.set_riak_handle( mock_riak ),
		mock_riak,
		'mock object returned'
	)
} );

// object_types( )
//

it( 'rrm object_types', function () {
	return rrm.object_types().then( function (types) {
		types.forEach( function (t) { assert( typeof t == 'string', 'list of strings returned' ) } );
		assert.deepEqual( types, [ 'Automobile', 'Manufacturer' ], 'list of types correct' );
	} );
} );

// new_object( type )
//

it( 'rmm new_object', function () {
	assert( rrm.new_object( 'Automobile' ), 'object returned' )
} );

// get_schema( )
//

// get_objects( type )
//

// del_object( type, object )
//

// add_object( type, object )
//

// update_object( type, object )
//

