// Separate capability namespace: group members and group owners have no access.
const encoder=new TextEncoder();
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export async function handlePrivateRequest(request,db,readBody){
  const route=new URL(request.url).pathname.replace(/^\/api\/v1\/private/,'');
  const q=(sql,...args)=>db.prepare(sql).bind(...args);
  try{
    const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if(!token)fail(401,'Private sync key required.');
    const tokenHash=await digest(token);
    const account=await q('SELECT * FROM private_spaces WHERE token_hash=?',tokenHash).first();
    if(route===''&&request.method==='POST'){
      if(account)return reply({ok:true});
      // Limit registrations independently of song groups.
      const ip=await digest((request.headers.get('cf-connecting-ip')||'local')+':private:'+Math.floor(Date.now()/86400000));
      const rate=await q('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<5 RETURNING count',ip,Date.now()+86400000).first();
      if(!rate)fail(429,'Too many private libraries created today.');
      await q('INSERT INTO private_spaces (token_hash,revision,manifest_json) VALUES (?,0,?)',tokenHash,'[]').run();return reply({ok:true},201);
    }
    if(!account)fail(401,'Private sync access was not found.');
    if(route==='/state'&&request.method==='GET')return reply({revision:account.revision,chunks:JSON.parse(account.manifest_json)});
    const blob=route.match(/^\/blobs\/([a-f0-9]{64})$/);
    if(blob&&request.method==='GET'){
      const row=await q('SELECT data FROM private_blobs WHERE space=? AND hash=?',tokenHash,blob[1]).first();
      if(!row)fail(404,'Private content is missing.');return reply({data:row.data});
    }
    if(blob&&request.method==='PUT'){
      const b=await readBody(request);
      if(typeof b.data!=='string'||b.data.length>180000||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data)||await digest(b.data)!==blob[1])fail(400,'Invalid encrypted chunk.');
      const row=await q(`INSERT INTO private_blobs (space,hash,data,bytes) SELECT ?,?,?,? WHERE
        (SELECT COALESCE(SUM(bytes),0) FROM private_blobs WHERE space=?)+?<=536870912
        ON CONFLICT(space,hash) DO NOTHING RETURNING hash`,tokenHash,blob[1],b.data,b.data.length,tokenHash,b.data.length).first();
      if(!row&&!await q('SELECT hash FROM private_blobs WHERE space=? AND hash=?',tokenHash,blob[1]).first())fail(413,'Private library storage is full.');
      return reply({ok:true});
    }
    if(route==='/state'&&request.method==='PUT'){
      const b=await readBody(request);
      if(!Number.isSafeInteger(b.revision)||b.revision<0||!Array.isArray(b.chunks)||b.chunks.length>4096||!b.chunks.length||b.chunks.some(h=>typeof h!=='string'||! /^[a-f0-9]{64}$/.test(h)))fail(400,'Invalid private manifest.');
      const unique=[...new Set(b.chunks)];
      for(let offset=0;offset<unique.length;offset+=80){const batch=unique.slice(offset,offset+80);const found=await q('SELECT COUNT(*) count FROM private_blobs WHERE space=? AND hash IN ('+batch.map(()=>'?').join(',')+')',tokenHash,...batch).first();if(found.count!==batch.length)fail(400,'Upload all encrypted content first.');}
      const row=await q('UPDATE private_spaces SET revision=revision+1,manifest_json=? WHERE token_hash=? AND revision=? RETURNING revision',JSON.stringify(b.chunks),tokenHash,b.revision).first();
      if(!row)fail(409,'Another computer synced. Retry to merge its changes.');
      // Old chunks remain recoverable; enforce the quota instead of racing readers with GC.
      return reply({revision:row.revision});
    }
    fail(404,'Private sync operation not found.');
  }catch(error){return reply({error:error.status?error.message:'Private sync is unavailable. The service may need its private-sync migration.'},error.status||503);}
}
