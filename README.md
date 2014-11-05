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

* `add_object( )`
* `del_object( )`
* `get_objects( )`
* `get_schema( )`
* `new_object( )`
* `object_types( )`
* `update_object( )`

[@avriette](https://github.com/avriette), jane@cpan.org
