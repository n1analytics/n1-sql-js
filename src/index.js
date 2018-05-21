const Immutable = require('immutable');
const Fetch = require('fetch-ponyfill')();

const setSingularState = require('./util').setSingularState;
const callJoinBuilder = require('./join').callJoinBuilder;
const callWhereBuilder = require('./where').callWhereBuilder;

const RESULT_CTXT = 'https://schema.n1analytics.com/api/vbase/1/query/finished/result';
const TRY_LATER_CTXT = 'https://schema.n1analytics.com/api/vbase/1/query/tryLater';
const ERROR_CTXT = 'https://schema.n1analytics.com/api/vbase/1/query/finished/error';

const RETRY_INTERVAL = 5000;

function builder(state) {
  function setSingular(path, value) {
    const s = setSingularState(state, path, value);
    return builder(s);
  }

  function toSql() {
    const a = [
      'SELECT', toSqlSelect(),
      'FROM', state.get('join').join(' '),
      'WHERE', state.get('where').join(' AND '),
    ];
    if (state.get('groupBy')) {
      a.push('GROUP BY ' + state.get('groupBy'));
    }
    return a.join(' ') + ';';
  }

  function toSqlSelect() {
    return state.get('select').map(e => {
      const a = [];
      if (e.aggOp) a.push(e.aggOp + '(');
      a.push(e.column);
      if (e.aggOp) a.push(')');
      if (e.alias) {
        a.push(' AS ');
        a.push(e.alias);
      }
      return a.join('');
    }).join(', ');
  }

  function _select(aggOp) {
    return (column, alias) => {
      return builder(state.updateIn(['select'], l => {
        return l.push({aggOp, column, alias});
      }));
    };
  }

  function exec() {
    const url = getUrl();
    const sql = toSql();
    console.debug('Remotely "' + url + '" executing query: ' + sql);
    return Fetch.fetch(url, {
      method: 'POST',
      body: sql,
      headers: {
        'Content-Type': 'text'
      },
      mode: 'cors',
      credentials: 'include'
    }).then(resp => {
      if (!resp.ok) {
        throw new Error(resp.statusText);
      }
      return resp.json();
    }).then(handleServerReply)
    .then(result => {
      console.debug('Received ' + result.rows.length + ' rows '
      + 'requiring ' + Math.round(result.runInfo.runTime) + ' sec for query: ' + sql);
      return result; // for debugging only
    })
    .catch(e => {
      console.warn('Error "' + e + ' while executing query - ' + sql);
      throw new Error(e);
    });
  }

  function handleServerReply(j) {
    const ctxt = j['@context'];
    switch (ctxt) {
      case RESULT_CTXT:
        return j;
      case ERROR_CTXT:
        throw new Error(errMsg(j));
      case TRY_LATER_CTXT:
        const url = j['@id'];
        return new Promise((fulfill, reject) => {
          retryAgainLater(url, fulfill, reject);
        });
      default:
        throw Error('Unknown server reply message type "' + ctxt + '".');
    }
  }

  function retryAgainLater(url, fulfill, reject) {
    console.debug('Checking for result "' + url + '" again in ' + RETRY_INTERVAL + ' msec.');
    setTimeout(() => {
      Fetch.fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
      }).then(resp => {
        if (!resp.ok) {
          reject(resp.statusText);
        }
        return resp.json();
      }).then(j => {
        const ctxt = j['@context'];
        if (ctxt === TRY_LATER_CTXT) {
          return retryAgainLater(url, fulfill, reject);
        }
        fulfill(handleServerReply(j));
      })
      .catch(reject);
    }, RETRY_INTERVAL);
  }

  function errMsg(j) {
    var msg = 'Unknown error';
    if (j.cause && j.cause.message) {
      msg = j.cause.message;
    }
    return msg;
  }

  function getUrl() {
    const url = state.get('url');
    const vdbs = state.get('vdbs');
    return url + '/v1/vdbs/' + vdbs + '/queries';
  }

  return {
    useTable: (alias, table) => {
      if (!table) {
        table = alias;
      }
      const s1 = state.updateIn(['tables'], l => {
        return l.push({table, alias});
      });
      const h = {};
      h[table] = table;
      if (alias) {
        h[alias] = table;
      }
      const s2 = s1.mergeDeep({table2dp: h});
      return builder(s2);
    },

    select: _select(),
    selectCount: (alias) =>  _select('COUNT')('*', alias),
    selectSum: _select('SUM'),
    selectAvg: _select('AVG'),
    
    vdbs: name => {
      return setSingular('vdbs', name);
    },

    join: f => {
      const s = callJoinBuilder(f, state);
      return builder(s);
    },

    groupBy: column => {
      return setSingular('groupBy', column);
    },

    where: f => {
      const s = callWhereBuilder(f, state);
      return builder(s);
    },

    toSql,

    debug: () => {
      const s = setSingularState(state, 'sql', toSql());
      console.debug(s.toJS());
      return builder(state);
    },

    exec

  };
}

function intialState(url) {
  return Immutable.fromJS({
    url,
    tables: [],
    table2dp: {},
    join: [],
    where: [],
    select: []  
  });
}

module.exports = (url) => builder(intialState(url));