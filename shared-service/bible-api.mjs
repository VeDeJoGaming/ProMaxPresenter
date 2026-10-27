const encoder=new TextEncoder(),MAX_BYTES=16*1024*1024;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function handleBibleRequest({route,method,request,db,member:m,body}){
  const q=(sql,...args)=>db.prepare(sql).bind(...args),now=Date.now();
  const current=()=>q('SELECT b.version_id id,b.owner_member_id authorId,b.updated_at updatedAt,u.name,u.verse_count verseCount,u.chunk_count chunkCount,u.byte_length byteLength,u.digest FROM group_bibles b JOIN bible_uploads u ON b.version_id=u.id WHERE b.group_id=?',m.group_id).first();
  const canReceive=()=>{if(!['receive','share'].includes(m.mode))fail(403,'Enable receiving first.');};
  const canShare=async()=>{if(m.mode!=='share')fail(403,'Choose Receive & share first.');const existing=await current();if(existing&&existing.authorId!==m.id&&m.role!=='owner')fail(403,'Only the Bible publisher or group owner can replace it.');return existing;};
  if(route==='/bible'&&method==='GET'){canReceive();return json({bible:await current()});}
  if(route==='/bible'&&method==='DELETE'){
    const existing=await canShare();await q('DELETE FROM group_bibles WHERE group_id=? AND EXISTS(SELECT 1 FROM members WHERE id=? AND revoked_at IS NULL AND mode=\'share\')',m.group_id,m.id).run();
    if(existing)await q('DELETE FROM bible_uploads WHERE id=? AND id NOT IN(SELECT version_id FROM group_bibles)',existing.id).run();return json({ok:true});
  }
  if(route==='/bible/uploads'&&method==='POST'){
    const existing=await canShare(),b=await body(request);
    if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||!Number.isSafeInteger(b.verseCount)||b.verseCount<1||b.verseCount>100000||!Number.isSafeInteger(b.chunkCount)||b.chunkCount<1||b.chunkCount>300||!Number.isSafeInteger(b.byteLength)||b.byteLength<1||b.byteLength>MAX_BYTES||!/^([a-f0-9]{64})$/.test(b.digest))fail(400,'Bible is too large or invalid (maximum 16 MiB).');
    await q('DELETE FROM bible_uploads WHERE group_id=? AND id NOT IN(SELECT version_id FROM group_bibles) AND created_at<?',m.group_id,now-3600000).run();
    const count=await q('SELECT COUNT(*) n FROM bible_uploads WHERE group_id=? AND owner_member_id=? AND id NOT IN(SELECT version_id FROM group_bibles)',m.group_id,m.id).first();
    if(count.n>=3)fail(429,'Too many unfinished Bible uploads. Try again in an hour.');
    const id=crypto.randomUUID();await q('INSERT INTO bible_uploads VALUES(?,?,?,?,?,?,?,?,?,?)',id,m.group_id,m.id,b.name.trim(),b.verseCount,b.chunkCount,b.byteLength,b.digest,existing?.id||null,now).run();return json({id},201);
  }
  const chunk=route.match(/^\/bible\/([a-f0-9-]{36})\/chunks\/(\d+)$/),commit=route.match(/^\/bible\/([a-f0-9-]{36})\/commit$/);
  if(chunk&&method==='GET'){
    canReceive();const row=await q('SELECT c.text FROM bible_chunks c JOIN group_bibles b ON b.version_id=c.upload_id WHERE b.group_id=? AND c.upload_id=? AND c.chunk_index=?',m.group_id,chunk[1],Number(chunk[2])).first();
    if(!row)fail(404,'Shared Bible changed. Sync again.');return json(row);
  }
  if((chunk&&method==='PUT')||(commit&&method==='POST')){
    await canShare();const id=(chunk||commit)[1];
    const upload=await q('SELECT * FROM bible_uploads WHERE id=? AND group_id=? AND owner_member_id=? AND created_at>?',id,m.group_id,m.id,now-3600000).first();
    if(!upload)fail(404,'Bible upload expired. Start again.');
    if(chunk){const b=await body(request),index=Number(chunk[2]);if(index>=upload.chunk_count||typeof b.text!=='string'||b.text.length>60000)fail(400,'Invalid Bible part.');
      const stored=await q('SELECT COALESCE(SUM(length(CAST(text AS BLOB))),0) n FROM bible_chunks WHERE upload_id=? AND chunk_index<>?',id,index).first();
      if(stored.n+encoder.encode(b.text).length>upload.byte_length)fail(413,'Bible upload exceeds its declared size.');
      await q('INSERT INTO bible_chunks VALUES(?,?,?) ON CONFLICT(upload_id,chunk_index) DO UPDATE SET text=excluded.text',id,index,b.text).run();return json({ok:true});}
    const parts=await q('SELECT text FROM bible_chunks WHERE upload_id=? ORDER BY chunk_index',id).all();
    if(parts.results.length!==upload.chunk_count)fail(409,'Bible upload is incomplete.');
    const text=parts.results.map(p=>p.text).join('');
    if(encoder.encode(text).length!==upload.byte_length||await hash(text)!==upload.digest)fail(400,'Bible integrity check failed.');
    let bible;try{bible=JSON.parse(text);}catch{fail(400,'Invalid Bible.');}
    if(bible.name!==upload.name||!Array.isArray(bible.verses)||bible.verses.length!==upload.verse_count)fail(400,'Invalid Bible manifest.');
    const seen=new Set();for(const v of bible.verses){const key=`${v.book}:${v.chapter}:${v.verse}`;if(typeof v.book!=='string'||!v.book.trim()||v.book.length>200||!Number.isSafeInteger(v.chapter)||v.chapter<1||!Number.isSafeInteger(v.verse)||v.verse<1||typeof v.text!=='string'||!v.text.trim()||v.text.length>100000||seen.has(key))fail(400,'Invalid Bible verse.');seen.add(key);}
    const row=await q(`INSERT INTO group_bibles SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM members WHERE id=? AND group_id=? AND revoked_at IS NULL AND mode='share')
      ON CONFLICT(group_id) DO UPDATE SET version_id=excluded.version_id,owner_member_id=excluded.owner_member_id,updated_at=excluded.updated_at
      WHERE group_bibles.version_id=? AND (group_bibles.owner_member_id=? OR ?) RETURNING version_id`,m.group_id,id,m.id,now,m.id,m.group_id,upload.base_version,m.id,m.role==='owner'?1:0).first();
    if(!row)fail(409,'Shared Bible changed or sharing was paused. Start again.');
    if(upload.base_version)await q('DELETE FROM bible_uploads WHERE id=? AND id NOT IN(SELECT version_id FROM group_bibles)',upload.base_version).run();
    return json({bible:await current()});
  }
  fail(404,'Bible action not found.');
}
