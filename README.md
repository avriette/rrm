RRM, an ORM\* for Riak
====

So in the course of building [Sendak](https://github.com/18F/Sendak) for
[18F](https://18f.gsa.gov/), I wanted to use an ORM. I found that ORMs
were very complicated. I found that node itself was kind of poorly-suited
to the way that ORMs worked. I also found that ORMs (for Javascript)
generally did not provide the functionality I wanted (for example
keeping state in the database).

As I sat down to write my own ORM, I realised that the biggest part of it,
code-wise, was going to actually be the SQL layer. As it happens, writing
SQL parsers, SQL generators, stored procedures, and so forth, while
maintaining an agnostic stance towards choice of database (even without this),
the task is nothing less than odious, and results in huge code-sprawl, when
all I wanted was a way to create some simple objects and store them in a
place that bunches of things could get to (accordingly, a json file was not
sufficient), and I didn't want to have to worry about the "database layer";
I wanted objects &mdash; data structures &mdash; that I could read and write
without having data logic in my code.

There are lots of document-store and key-value store "databases" out there.
For various reasons, I chose Riak to put this on top of. No more need for
SQL, native storage of JSON, and it seemed like a win.

Rather than use the rather ponderous and somewhat inscrutable [riak-js](http://riakjs.com/),
I wrote a very tiny library, [riak-dc](https://github.com/avriette/riak-dc), which is
the barest of wrappers around node's own [http](http://nodejs.org/api/http.html).

Accordingly, you will find that this library is very tiny, takes up very
little space in terms of lines-of-code, is end-to-end javascript & json, and
meets the above requirements:

* No stupid SQL tricks
* JSON object storage
* Schema stored in the database
* Exceedingly simple API
* No pyramid of fail

\* note: RRM is not actually "relational."

How to use RRM
====

Basically, `npm install rrm` should do the trick and install dependencies.
Unit tests are mocked, but you will need a Riak somewhere to talk to. `riak-dc`
assumes that you are using `http://localhost:8098/riak`, and if you are, RRM
requires no configuration. If not, be sure to initialise `riak-dc` before
using RRM.

#### Exported functions:

Unless otherwise specified, all references to returned values are actually
promises (using `q`, rather than the value itself). So "returns a hash" means
"returns a promise to a hash."

* `add_object( type )`

Takes two arguments, the type of object being added and the actual object to
be added. Note that if this object is already in Riak, an exception will be
thrown. For existing objects, use `update_object`.

* `del_object( type, object )`

Takes two arguments, the type of object to be deleted from Riak and the object
itself. This object must have a serial, or an exception will be thrown.

* `get_objects( type )`

Takes one argument, the type of objects requested. This returns *all* the
objects of that type in Riak. This is actually a very fast operation in Riak
at most practical scales.

* `get_schema( )`

Returns a hash of what the objects look like in Riak. This includes metadata
and should not be used to "create new objects" (see `new_object`). Takes no
arguments.

* `new_object( type )`

Takes object type as sole argument, and returns a new object with relevant
attributes from the schema. This will not be stored until `add_object` is
called.

* `object_types( )`

Takes no arguments and returns a list of object types defined in the schema.

* `update_object( type, object )`

Provided a type and object, RRM will attempt to find the object in Riak,
*delete* that object, and re-insert, providing you with a new copy of your
object with appropriate serial. Note that delete objects are
[tricky](http://docs.basho.com/riak/latest/ops/advanced/deletion/#Tombstones)
in Riak, so be sparing about the this operation (delete & insert).

#### The basic design pattern

```
var rrm     = require( 'rrm' )
	, types   = rrm.object_types()
	, schema  = rrm.get_schema()
	, banana  = rrm.new_object( 'fruit' );

banana['color'] = 'green';

var pbanana = rrm.add_object( banana ).then( function (b) {
	// 'pbanana' infers 'promise to a banana'
	//
	// the banana object now has a serial and can be referenced in Riak.
	banana = b;

	// Time elapses...

	banana['color'] = 'yellow';

	var promise = rrm.update_object( 'fruit', banana );

	promise.then( function (b) {
		// What will you do with your now-yellow banana?
		//
		banana = b;

		// Time elapses...

		// This will not return anything meaningful, although an exception will be
		// triggered if the serial for this banana is not found.
		//
		rrm.del_object( 'fruit', banana );
	} );

} );
```

Author
====

[@avriette](https://github.com/avriette), jane@cpan.org
