#!/usr/bin/env node

var parsed = require('sendak-usage').parsedown( {
	'stdout' : { 'type': [ Boolean ], 'description': 'print data to stdout'       },
	'file'   : { 'type': [ String  ], 'description': 'specify a file to write to' },
}, process.argv )
	, nopt   = parsed[0]
	, usage  = parsed[1];

if (parsed['help']) {
	// Be halpful
	//
	console.log( 'Usage: ' );
	console.log( usage );
	process.exit(0); // success
}

var rrm  = require( 'rrm' );
