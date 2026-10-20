const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {DatabaseSync}=require('node:sqlite');
function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(require.resolve('../shared-service/schema.sql'),'utf8'));
  const db={prepare(statement){let args=[];const result={bind(...v){args=v;return result;},async first(){return sql.prepare(statement).get(...args)||null;},async all(){return {results:sql.prepare(statement).all(...args)};},async run(){const r=sql.prepare(statement).run(...args);return {meta:{changes:Number(r.changes)}};},execute(){const s=sql.prepare(statement);return {results:s.columns().length?s.all(...args):(s.run(...args),[])};}};return result;},async batch(list){sql.exec('BEGIN');try{const out=list.map(s=>s.execute());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  let ip=0;
  async function request(route,method='GET',data,token){const {handleLibraryRequest}=await import('../shared-service/library-api.mjs');
    const response=await handleLibraryRequest(new Request('https://test.local/api/v1'+route,{method,headers:{'cf-connecting-ip':String(++ip),...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})}),db);
    return {status:response.status,...await response.json()};}
  return {sql,db,request};
}
const ownSong={title:'Test song',lyrics:'<img src=x onerror=alert(1)>\nSecond line',lines:4,slides:[{text:'Words',section:'Verse',key:'v'}]};
async function group(f,choice='share'){return f.request('/groups','POST',{groupName:'Friends',displayName:'Owner',mode:choice});}
test('private groups: consent, isolation, invitations, author rights, revisions and revocation',async()=>{
  const f=fixture(),a=await group(f),other=await group(f);assert.equal(a.status,201);
  assert.equal((await f.request('/songs')).status,401);
  const invite=await f.request('/invites','POST',{},a.token);assert.match(invite.code,/^PMX-[\w-]{32}$/);
  const b=await f.request('/join','POST',{code:invite.code,displayName:'Friend',mode:'receive',role:'owner'});assert.equal(b.self.role,'member');
  const id=crypto.randomUUID();const first=await f.request('/songs/'+id,'PUT',{song:ownSong,revision:0},a.token);assert.equal(first.status,201);assert.equal(first.publication.revision,1);
  assert.equal((await f.request('/songs/'+id,'PUT',{song:ownSong,revision:0},a.token)).publication.id,first.publication.id);
  assert.equal((await f.request('/songs/'+id,'PUT',{song:ownSong,revision:0},b.token)).status,403);
  assert.equal((await f.request('/songs','GET',null,other.token)).songs.length,0);
  const read=await f.request('/songs','GET',null,b.token);assert.equal(read.songs.length,1);assert.equal(read.songs[0].song.lyrics,ownSong.lyrics);
  assert.equal((await f.request('/songs/'+first.publication.id,'DELETE',null,other.token)).status,404);
  assert.equal((await f.request('/songs/'+first.publication.id,'DELETE',null,b.token)).status,404);
  const changed={...ownSong,lyrics:'New version'};
  const updates=await Promise.all([f.request('/songs/'+id,'PUT',{song:changed,revision:1},a.token),f.request('/songs/'+id,'PUT',{song:{...changed,lyrics:'Other change'},revision:1},a.token)]);
  assert.deepEqual(updates.map(x=>x.status).sort(),[200,409]);
  await f.request('/me','PATCH',{mode:'none'},b.token);assert.equal((await f.request('/songs','GET',null,b.token)).status,403);
  await f.request('/members/'+b.self.id,'DELETE',null,a.token);assert.equal((await f.request('/me','GET',null,b.token)).status,401);
  assert.equal((await f.request('/join','POST',{code:invite.code,displayName:'Again',mode:'share'})).status,403);
  const tokens=f.sql.prepare('SELECT token_hash FROM members').all();assert.ok(tokens.every(r=>r.token_hash!==a.token&&r.token_hash.length===64));
  f.sql.close();
});
test('pause authorizes no writes, removal is retained and can only be restored explicitly',async()=>{
  const f=fixture(),a=await group(f);const id=crypto.randomUUID();const initial=await f.request('/songs/'+id,'PUT',{song:ownSong,revision:0},a.token);
  await f.request('/songs/'+initial.publication.id,'DELETE',null,a.token);
  assert.equal((await f.request('/songs','GET',null,a.token)).songs.length,0);
  assert.equal((await f.request('/songs/'+id,'PUT',{song:ownSong,revision:2},a.token)).status,409);
  assert.equal((await f.request('/songs/'+id,'PUT',{song:ownSong,revision:2,restore:true},a.token)).publication.revision,3);
  await f.request('/me','PATCH',{mode:'none'},a.token);assert.equal((await f.request('/songs/'+crypto.randomUUID(),'PUT',{song:ownSong,revision:0},a.token)).status,403);
  f.sql.close();
});
test('oversized, hostile origin, malformed and expired invitation requests fail safely',async()=>{
  const f=fixture(),a=await group(f);const invitation=await f.request('/invites','POST',{},a.token);
  f.sql.prepare('UPDATE invites SET expires_at=0').run();assert.equal((await f.request('/join','POST',{code:invitation.code,displayName:'Friend',mode:'receive'})).status,403);
  assert.equal((await f.request('/songs/'+crypto.randomUUID(),'PUT',{song:{...ownSong,lyrics:'x'.repeat(300000)},revision:0},a.token)).status,413);
  const {handleLibraryRequest}=await import('../shared-service/library-api.mjs');const r=await handleLibraryRequest(new Request('https://test.local/api/v1/me',{headers:{origin:'https://evil.test',authorization:'Bearer '+a.token}}),f.db);assert.equal(r.status,403);f.sql.close();
});
module.exports={fixture,ownSong};
