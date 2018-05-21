const Immutable = require('immutable');
const parseColumn = require('./util').parseColumn;
const toSqlColumn = require('./util').toSqlColumn;

module.exports.callJoinBuilder = (f, state) => {
  var sql;
  if (typeof f === "function") {
    const jc = createInitialCtxt(state);
    const jb = f(joinBuilder(jc));
    if (!jb) {
      throw '"join" needs to return a join function';
    }
    sql = jb._toSql();
  } else if (typeof f === 'string') {
    sql = f;
  } else {
    throw 'Unknown join definition "' + f + '".';
  }
  return state.updateIn(['join'], l => l.push(sql));
};

function createInitialCtxt(state) {
  return Immutable.Map({
    cols: Immutable.List(),
    joinOps: Immutable.List(),
    state,
  });
}

function joinBuilder(ctxt) {
  //"orgA.t" dp1 JOIN "orgB.t" dp2 ON dp1.id = dp2.id
  function toSql() {
    const cols = ctxt.get('cols').toJS();
    if (cols.length < 2) {
      throw 'Join needs at least two columns, but found only ' 
        + cols.length + '.';
    }
    const joinOps = ctxt.get('joinOps').toJS();
    if (cols.length !== joinOps.length + 1) {
      throw 'Unexpected number of join tables and associated join operations';
    }

    const ra = [ toSqlTable(cols[0]) ];
    var i;
    for (i = 1; i < cols.length; i++) {
      ra.push('JOIN');
      ra.push(toSqlTable(cols[i]));
      ra.push('ON');
      ra.push(toSqlJoinOp(joinOps[i - 1], cols[i - 1], cols[i]));
    }
    return ra.join(' ');
  }

  function toSqlTable(t) {
    var s = t.table;
    if (t.tableAlias) {
      s += ' ' + t.tableAlias;
    }
    return s;
  }

  function toSqlJoinOp(joinOp, left, right) {
    return [
      toSqlColumn(left),
      ' ', joinOp, ' ',
      toSqlColumn(right)
    ].join('');
  }

  function joinOp(op) {
    return () => {
      const c = ctxt.updateIn(['joinOps'], l => {
        return l.push(op);
      });
      return joinBuilder(c);
    };
  }

  return {
    column: colId => {
      const c = ctxt.updateIn(['cols'], l => {
        const ch = parseColumn(colId, ctxt.get('state'));
        const js = ctxt.get('joinOps').size;
        if (js !== l.size) {
          throw 'Column needs to be first or follow a join operator';
        }
        return l.push(ch);
      });
      return joinBuilder(c);
    },

    eq: joinOp('='),

    _toSql: toSql
  };
}