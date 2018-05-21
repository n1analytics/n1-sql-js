
module.exports.setSingularState = (state, path, value) => {
  const old = state.getIn([path]);
  if (old) {
    throw '"' + path + '" already set to "' + old + '".';
  }
  return state.setIn([path], value);
};

module.exports.parseColumn = (colId, state) => {
  const cs = colId.split('.');
  if (cs.length !== 2) {
    throw 'Expected a column description of kind "table.colName", but got "'
      + colId + '".';
  }
  const tableName = cs[0];
  const table = state.getIn(['table2dp', tableName]);
  if (!table) {
    throw 'Undeclared table "' + tableName
      + '" in join "' + colId + '".';
  }
  const column = cs[1];
  const res = {table, column};
  if (tableName !== table) {
    res.tableAlias = tableName;
  }
  return res;
};

module.exports.toSqlColumn = colHash => {
  const t = colHash.tableAlias ? colHash.tableAlias : colHash.table;
  return t + '.' + colHash.column;
};
