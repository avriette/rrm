#!/usr/bin/env node

var parsed = require('sendak-usage').parsedown( {
	'stdout' : { 'type': [ Boolean ], 'description': 'print data to stdout'                                   },
	'file'   : { 'type': [ String  ], 'description': 'specify a file to write to'                             },
	's3'     : { 'type': [ String  ], 'description': 'the s3 bucket you wish to write to.'                    },
	'label'  : { 'type': [ String  ], 'description': 'the label you wish to use for \'file\' and \'s3\' args' },
	'help'   : { 'type': [ Boolean ], 'description': 'is verreh halpful'                                      }
}, process.argv )
	, nopt   = parsed[0]
	, usage  = parsed[1];

if (nopt['help']) {
	// Be halpful
	//
	console.log( 'Usage: ' );
	console.log( usage );
	process.exit(0); // success
}

var rrm      = require( 'rrm' )
	, q        = require( 'q' )
	, deferred = q.defer()
	, objects  = { }
	, moment   = require( 'moment' )
	, label    = nopt['label'] ? nopt['label'] : moment().format()

function pull_data () {
return rrm.object_types().then( function (types) {
	return q.all( types.map( function (type) {
			var roster = [ ]
				, proster = deferred.promise;

			deferred.resolve( roster );

			rrm.get_objects( type ).then( function (object) {
				roster.push( object )
			} )
			objects[type] = proster;
	} ) )
	.then( function () {
		return objects;
	} )
} )
}

pull_data().then( function (schema) {
	Object.keys( schema ).forEach( function (otype) {
		schema[otype].then( function (thing) { console.log( thing ) } );
	} );
} );
