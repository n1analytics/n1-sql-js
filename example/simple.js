const sql = require('../src');


// SELECT dp1.gender, COUNT(*) as cnt 
// FROM orgA.t dp1 JOIN orgB.t dp2 ON dp1.id = dp2.id 
// WHERE dp1.spend > 1000 
// GROUP BY dp1.gender
const q = sql('http://localhost:9000')
  .vdbs('mock-20')
  .useTable('dp1', 'orgA.t')
  .useTable('dp2', 'orgB.t')
  .join(c => c.column('dp1.id').eq().column('dp2.id'))
  //.useTable('dp3', 'orgC.t')
  //.join(c => c.column('dp1.id').eq().column('dp2.id').eq().column('dp3.id'))
  .select('dp1.gender', 'gender')
  .selectSum('dp2.spend', 'spend')
  .selectCount('cnt')
  .groupBy('dp1.gender')
  .where(c => c.column('dp1.spend').gt(1000))
  // .where(c => c.column('dp1.age').eq().column('dp1.age'))
  // .where(c => c.column('dp1.age').eq().column('dp1.age')
  //                .or()
  //                .column('dp1.spend').ge(1000))
  //.debug()
  ;

console.log(q.toSql());
q.exec().then(j => {
  console.info(j.rows);
});
