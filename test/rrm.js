var rrm  = require( 'rrm' );

// Display the schema for the user. This is kind of messy.
//
rrm.get_schema().then( console.log );

// Display the schema for the user. This is kind of messy.
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
