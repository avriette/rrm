var rrm    = require( 'rrm' )
	, Riak   = require( 'riak-dc' )
	, chai   = require( 'chai' )
	, cap    = require( 'chai-as-promised' )
	, assert = require( 'assert' )
	, sinon  = require( 'sinon' );

chai.use( cap );

var schema = {
	"Automobile": {
		"name"    : { "isa": "string", "defined": true, "distinct": true },
		"hasone"  : [ "manufacturer" ],
		"hasmany" : [ "repair", "part" ]
	},
	"Manufacturer": {
		"name"    : { "isa": "string", "defined": true, "distinct": true, "verified": "RESERVED" },
		"hasmany" : [ "automobile", "model" ]
	}
};

it( 'test schema syntax is valid', function () { assert( schema ) } )
/*

// Get the schema
// Verify it's an object and not a string
//
{
	setUp: function () {
		sinon.spy(rrm, 'get_schema');
	},

	rrm.get_schema().then( console.log );
}

// Get object types
//
rrm.object_types().then( console.log );

// Describe what we know about an object's prototype
//
rrm.new_object( object_type ).then( console.log );

// this should be a serial from Riak.
//
rrm.add_object( object_type, tuple ); // .then( console.log );

// Return all objects of a supplied type
//
rrm.get_objects( object_type ).then( console.log );


describe( "test", function () { return it( "1 is true", function () { return 1 } ) } );

*/
