
n1-sql
===

An npm package for interacting with an N1 SQL service endpoint.

Getting Started
---

Install `n1-sql` npm.

    npm install immutable

Then require it into any module.

```
const n1_sql = require('n1-sql');

n1_sql('http://localhost:9000')
  .vdbs('mock-20')
  .useTable('dp1', 'orgA.t')
  .useTable('dp2', 'orgB.t')
  .join(c => c.column('dp1.id').eq().column('dp2.id'))
  .selectSum('dp2.spend', 'spend')
  .where(c => c.column('dp1.age').gt(40))
  .exec().then(j => {
    console.info(j.rows);
  });
```

### Browser

To use `n1-sql` from a browser, download `dist/n1-sql.js`.

Then, add it as a script tag to your page:

```
<script src="n1-sql.js"></script>
<script>
  var base = N1Sql('http://localhost:9000')
    .vdbs('mock-20')
    .useTable('dp1', 'orgA.t')
    .useTable('dp2', 'orgB.t')
    .join(c => c.column('dp1.id').eq().column('dp2.id'));
    ....

</script> 
```

API
---

The API is implemented in a purely functional and fluent design pattern. Specifically, any construction of an API call starts with identifying the _N1 SQL Service_ through the single function provided by the library.

```
const n1_sql = require('n1-sql');
n1_sql(...)
```

The intial function call and most subsequent ones will return a new context providing a set of functions to further shape that context. Each context is immutable and can be used multiple times without any side effects.

```
const rel = n1_sql(...).vdbs('foo').useTable(...)
              .join(...).selectCount();

const q1 = rel.where(c => c.column('dp1.spend').gt(1000)));
const q2 = rel.where(c => c.column('dp2.age').lt(35)));
```
---

### Constructor(url)

Create a new connection pool. The initial probe connection is created to find out whether the configuration is valid.

#### Arguments

* __url__ - URL of the N1 SQL endpoint

#### Example

```
const n1_sql = require('n1-sql');

n1_sql('http://localhost:9000')
```

---

### vdbs(vdbName)

Select the name of the virtual database to use on the
REST endpoint.

#### Arguments

* __vdbName__ - Name of virtual database provided

#### Example

```
n1_sql(...)
  .vdbs('mock-20')
  ...
```

---

### useTable(alias, tableName)

Select one of the tables available via `vdbs` and bind an alias to it. The alias will be used for identifiying respective columns.

#### Arguments

* __alias__ - The alias to use for `tableName`
* __tableName__ - The name of a table in `vdbs`.


#### Example

```
const n1_sql = require('n1-sql');

n1_sql('http://localhost:9000')
  .vdbs('mock-20')
  .useTable('dp1', 'orgA.t')
```

---

### join(callback)

Defines on how all the selected tables (`useTable`) will be joined to create one single relation.

#### Arguments

* __callback(joinBuilder)__ - A callback providing a reference to a `joinBuilder`

The `joinBuilder` provides the following chainable functions.

* __column(colId)__ selecting a column of the format `tblAlias.colName`.
* __eq()__ declares an `equal` constraint between the preceeding column and the following one.


#### Example

```
  n1_sql(...)
    ...
    .useTable('dp1', 'orgA.t')
    .useTable('dp2', 'orgB.t')
    .useTable('dp3', 'orgC.t')
    .join(cb => cb.column('dp1.id')
                  .eq()
                  .column('dp2.id')
                  .eq()
                  .column('dp3.id'))
```
---

### selectSum(colId, alias)

Add a column to the result which holds the sum of all the values in column `colId` in the final relation.


#### Arguments

* __colId__ - The selected column ID of the format `tblAlias.colName`.
* __alias__ - The name of result column

#### Example

```
  n1_sql(...)
    ...
    .selectSum('dp2.spend', 'spend')
```
---

### selectCount(alias)

Add a column to the result which holds the number of rows in the final relation.

#### Arguments

* __colId__ - The selected column ID of the format `tblAlias.colName`.

#### Example

```
  n1_sql(...)
    ...
    .selectCount('count')
```
---

### select(colId, alias)

Add a column to the result which holds the value for the column defined by `groupBy`. 


#### Arguments

* __colId__ - The selected column ID of the format `tblAlias.colName`.
* __alias__ - The name of result column

#### Example

```
  n1_sql(...)
    ...
    .select('dp2.gender', 'gender')
```
---

### groupBy(colId)

Group the result by the value of this column.

#### Arguments

* __colId__ - The selected column ID of the format `tblAlias.colName`.

#### Example

```
  n1_sql(...)
    ...
    .groupBy('dp2.gender')
```
---

### where(callback)

Defines the constraints on the relation defined by `join`.

Multiple `where` constraints can be defined and will be `AND` combined for the final SQL statement.

#### Arguments

* __callback(whereBuilder)__ - A callback providing a reference to a `whereBuilder`

The `whereBuilder` provides the following chainable functions.

* __column(colId)__ selecting a column of the format `tblAlias.colName`.

* __gt([value])__:  '>'
* __ge([value])__:  '>='
* __eq([value])__:  '='
* __neq([value])__:  '!='
* __lt([value])__:  '<'
* __le([value])__:  '<='

* __or()__:  'OR'
* __and()__:  'AND'

#### Example

```
  // WHERE dp1.foodSpend < dp1.travelSpend OR dp1.age >= 50
  n1_sql(...)
    ...
    .where(wb => wb.column('dp1.foodSpend')
                     .lt()
                     .column('dp1.travelSpend')
                   .or()
                     .column('dp1.age')
                     .ge(50))
```

---

### exec()

Turn the defined query into a proper SQL expression, call the defined N1 SQL service endpoint, and peridically query for a result if it isn't returned immediately (rather unlikely).

The result of the service call is returned in a _Promise_.

#### Arguments


#### Example

```
  n1_sql(...)
    ...
    .exec()
    .then(j => {
      console.log(j.rows);
    })
    .catch(console.error);
```
---

### toSql()

Convert the current context into an SQL string and return it.

---
