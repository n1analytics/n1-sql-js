const Immutable = require('immutable');
const setSingularState = require('./util').setSingularState;
const parseColumn = require('./util').parseColumn;
const toSqlColumn = require('./util').toSqlColumn;

const COMP_OP = 'compOp';

module.exports.callWhereBuilder = (f, state) => {
  var sql;
  if (typeof f === "function") {
    const jc = createInitialCtxt(state);
    const jb = f(whereBuilder(jc));
    if (jb === undefined) {
      throw '"where" needs to return a where function';
    }
    sql = jb._toSql();
  } else if (typeof f === "string") {
    sql = f;
  } else {
    throw 'Unknown where definition "' + f + '".';
  }
  return state.updateIn(['where'], l => l.push(sql));
};

function createInitialCtxt(state) {
  return Immutable.Map({
    cols: Immutable.List(),
    state,
  });
}

function whereBuilder(ctxt) {

  function toSql() {
    const cols = ctxt.get('cols').toJS();
    if (cols.length === 0 ||  cols.length > 2) {
      throw 'Where clause needs at least one and max. two columns, but found ' 
        + cols.length + '.';
    }
    const left = cols[0];
    const right = cols[1];

    const compOp = ctxt.get(COMP_OP);
    if (!compOp) {
      throw 'Missing compare operation ';
    }

    const a = [ toSqlColumn(left), compOp ];
    const value = ctxt.get('value');
    if (value) {
      a.push(value);
    } else if (right) {
      a.push(toSqlColumn(right));
    } else {
      throw 'Missing right hand side of where clause';
    }
    if (ctxt.get('partialSql')) {
      a.unshift(ctxt.get('partialSql'));
    }
    return a.join(' ');
  }

  function compOp(sql) {
    return v => {
      var c = setSingularState(ctxt, COMP_OP, sql);
      if (v) {
        c = setSingularState(c, 'value', v);
      }
      return whereBuilder(c);
    };
  }

  function logicOp(op) {
    return () => {
      const sql = toSql() + ' ' + op + ' ';
      const p = ctxt.get('partialSql');
      const c = createInitialCtxt(ctxt.get('state'))
        .setIn(['partialSql'], p ? p + ' ' + sql : sql);
      return whereBuilder(c);
    }
  }

  return {
    column: colId => {
      const c = ctxt.updateIn(['cols'], l => {
        const ch = parseColumn(colId, ctxt.get('state'));
        return l.push(ch);
      });
      return whereBuilder(c);
    },

    gt: compOp('>'),
    ge: compOp('>='),
    eq: compOp('='),
    neq: compOp('!='),
    lt: compOp('<'),
    le: compOp('<='),

    or: logicOp('OR'),
    and: logicOp('AND'),

    _toSql: toSql
  };
}
