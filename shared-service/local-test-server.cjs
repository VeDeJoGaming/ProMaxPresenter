const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const http=require('node:http');
async function startTestService(){
  const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(require.resolve('./schema.sql'),'utf8'));
  sql.exec(fs.readFileSync(require.resolve('./private-schema.sql'),'utf8'));
  const db={prepare(statement){let args=[];const result={bind(...v){args=v;return result;},async first(){return sql.prepare(statement).get(...args)||null;},async all(){return {results:sql.prepare(statement).all(...args)};},async run(){const r=sql.prepare(statement).run(...args);return {meta:{changes:Number(r.changes)}};},execute(){const s=sql.prepare(statement);return {results:s.columns().length?s.all(...args):(s.run(...args),[])};}};return result;},async batch(list){sql.exec('BEGIN');try{const out=list.map(s=>s.execute());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const {handleLibraryRequest}=await import('./library-api.mjs');
  const server=http.createServer(async(req,res)=>{const bytes=[];for await(const part of req)bytes.push(part);
    const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(bytes)}:{})});
    const response=await handleLibraryRequest(request,db);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {url:'http://127.0.0.1:'+server.address().port,sql,async close(){await new Promise(resolve=>server.close(resolve));sql.close();}};
}
module.exports={startTestService};
