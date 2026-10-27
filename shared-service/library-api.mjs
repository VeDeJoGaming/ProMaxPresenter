import {handleBibleRequest} from './bible-api.mjs';
import {handlePrivateRequest} from './private-api.mjs';
// Shared by the hosted service and its SQLite integration tests. No credentials are logged.
const modes = new Set(['none', 'receive', 'share']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 262144;
const encoder = new TextEncoder();
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: {
  'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
} });
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function name(value, max = 80) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, 'Please enter a shorter name.');
  return value.trim();
}
function mode(value) { if (!modes.has(value)) fail(400, 'Choose a sharing mode.'); return value; }
async function hash(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
function secret(size) { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(size)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'JSON required.');
  if (Number(request.headers.get('content-length')) > MAX_BODY) fail(413, 'Song is too large.');
  const reader = request.body?.getReader(); if (!reader) fail(400, 'Missing request.');
  const chunks = []; let length = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length;
    if (length > MAX_BODY) { await reader.cancel(); fail(413, 'Song is too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const result = JSON.parse(new TextDecoder().decode(bytes)); if (!result || Array.isArray(result) || typeof result !== 'object') throw Error(); return result; }
  catch { fail(400, 'Invalid request.'); }
}
function song(value) {
  if (!value || typeof value.lyrics !== 'string' || value.lyrics.length > 100000 || ![2,4,6,8].includes(value.lines) ||
      !Array.isArray(value.slides) || value.slides.length > 500) fail(400, 'This song is too large or invalid.');
  const result = { title: name(value.title, 200), lyrics: value.lyrics, lines: value.lines, slides: value.slides.map(s => {
    if (!s || typeof s.text !== 'string' || s.text.length > 10000 || typeof s.section !== 'string' || s.section.length > 200 || typeof s.key !== 'string' || s.key.length > 1) fail(400, 'Invalid slides.');
    return {text:s.text,section:s.section,key:s.key.toLowerCase().trim()};
  }) };
  const text = JSON.stringify(result); if (encoder.encode(text).length > 230000) fail(413, 'Song is too large.'); return text;
}
const active = 'EXISTS (SELECT 1 FROM members m WHERE m.id=? AND m.group_id=? AND m.revoked_at IS NULL)';
const owner = "EXISTS (SELECT 1 FROM members m WHERE m.id=? AND m.group_id=? AND m.role='owner' AND m.revoked_at IS NULL)";
const sharing = "EXISTS (SELECT 1 FROM members m WHERE m.id=? AND m.group_id=? AND m.mode='share' AND m.revoked_at IS NULL)";
const receiving = "EXISTS (SELECT 1 FROM members m WHERE m.id=? AND m.group_id=? AND m.mode IN ('receive','share') AND m.revoked_at IS NULL)";
function view(m) { return { group:{id:m.group_id,name:m.group_name}, self:{id:m.id,name:m.name,role:m.role,mode:m.mode} }; }
function record(row) { return { id:row.id, authorId:row.owner_member_id, revision:row.revision, song:JSON.parse(row.payload_json) }; }

export async function handleLibraryRequest(request, db) {
  const url = new URL(request.url); const route = url.pathname.replace(/^\/api\/v1/, '').replace(/\/$/, '') || '/';
  const method = request.method;
  const q = (sql, ...args) => db.prepare(sql).bind(...args);
  const now = Date.now();
  async function rate(bucket, identity, maximum, duration) {
    const key = await hash(`${bucket}:${identity}:${Math.floor(now/duration)}`);
    const row = await q('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',key,now+duration,maximum).first();
    if (!row) fail(429, 'Too many requests. Please try again later.');
    // Opportunistic bounded cleanup; rate keys contain only hashes.
    if (crypto.getRandomValues(new Uint8Array(1))[0] < 4) await q('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 100)',now).run();
  }
  async function auth() {
    const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) fail(401, 'Connect to your group again.');
    const m = await q('SELECT m.*,g.name group_name FROM members m JOIN groups g ON g.id=m.group_id WHERE m.token_hash=? AND m.revoked_at IS NULL',await hash(token)).first();
    if (!m) fail(401, 'Your access has ended. Ask the group owner for a new invitation.');
    await rate(route.startsWith('/bible')?'bible-member':'member',m.id,route.startsWith('/bible')?900:method==='GET'?120:60,60000); return m;
  }
  try {
    const origin = request.headers.get('origin'); if (origin && origin !== url.origin) fail(403, 'Origin not allowed.');
    if(route==='/private'||route.startsWith('/private/'))return handlePrivateRequest(request,db,body);
    if (route==='/health' && method==='GET') { await q('SELECT 1').first(); return json({ok:true,version:1}); }
    if (method==='POST' && (route==='/groups'||route==='/join')) {
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      await rate(route,ip,route==='/groups'?3:20,route==='/groups'?86400000:3600000);
      const b=await body(request); const display=name(b.displayName); const choice=mode(b.mode);
      const token=secret(32), tokenHash=await hash(token), memberId=crypto.randomUUID();
      if (route==='/groups') {
        const id=crypto.randomUUID(), groupName=name(b.groupName);
        await db.batch([
          q('INSERT INTO groups (id,name,created_at) VALUES (?,?,?)',id,groupName,now),
          q("INSERT INTO members (id,group_id,name,role,mode,token_hash,created_at) VALUES (?,?,?,'owner',?,?,?)",memberId,id,display,choice,tokenHash,now)
        ]);
        return json({token,group:{id,name:groupName},self:{id:memberId,name:display,role:'owner',mode:choice}},201);
      }
      if (typeof b.code!=='string'||!/^PMX-[A-Za-z0-9_-]{32}$/.test(b.code)) fail(400,'Invalid invitation code.');
      const invitation=await q('SELECT group_id FROM invites WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',await hash(b.code),now).first();
      if (!invitation) fail(403,'This invitation has expired or was replaced.');
      const inserted=await q(`INSERT INTO members (id,group_id,name,role,mode,token_hash,created_at)
        SELECT ?,?,?, 'member',?,?,? WHERE EXISTS (SELECT 1 FROM invites WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?)
        AND (SELECT COUNT(*) FROM members WHERE group_id=? AND revoked_at IS NULL)<100 RETURNING id`,
        memberId,invitation.group_id,display,choice,tokenHash,now,await hash(b.code),now,invitation.group_id).first();
      if(!inserted) fail(409,'The invitation is no longer available or the group is full.');
      const m=await q('SELECT m.*,g.name group_name FROM members m JOIN groups g ON g.id=m.group_id WHERE m.id=?',memberId).first();
      return json({token,...view(m)},201);
    }
    const m=await auth(); const membership=[m.id,m.group_id];
    if(route==='/bible'||route.startsWith('/bible/'))return await handleBibleRequest({route,method,request,db,member:m,body});
    if(route==='/me'&&method==='GET') return json(view(m));
    if(route==='/me'&&method==='PATCH') {
      const b=await body(request); const updated=await q(`UPDATE members SET mode=? WHERE id=? AND revoked_at IS NULL RETURNING id`,mode(b.mode),m.id).first();
      if(!updated) fail(401,'Your access has ended.'); return json({...view(m),self:{...view(m).self,mode:b.mode}});
    }
    if(route==='/me'&&method==='DELETE') {
      if(m.role==='owner') fail(409,'The owner can pause the group. Keep your access key to return.');
      await q('UPDATE members SET revoked_at=? WHERE id=? AND revoked_at IS NULL',now,m.id).run(); return json({ok:true});
    }
    if((route==='/invites'||route==='/invites/rotate')&&method==='POST') {
      if(m.role!=='owner') fail(403,'Only the owner can invite people.');
      const code='PMX-'+secret(24), id=crypto.randomUUID(), expiry=now+30*86400000;
      const statements=[];
      if(route.endsWith('/rotate')) statements.push(q(`UPDATE invites SET revoked_at=? WHERE group_id=? AND ${owner}`,now,m.group_id,...membership));
      statements.push(q(`INSERT INTO invites (id,group_id,token_hash,created_at,expires_at) SELECT ?,?,?,?,? WHERE ${owner}
        AND (SELECT COUNT(*) FROM invites WHERE group_id=? AND revoked_at IS NULL AND expires_at>?)<16 RETURNING id`,id,m.group_id,await hash(code),now,expiry,...membership,m.group_id,now));
      const results=await db.batch(statements); if(!results.at(-1).results?.length) fail(409,'Replace invitations before creating more.');
      return json({code,expiresAt:expiry});
    }
    if(route==='/members'&&method==='GET') {
      if(m.role!=='owner') fail(403,'Only the owner can manage people.');
      const rows=await q(`SELECT id,name,role,mode FROM members WHERE group_id=? AND revoked_at IS NULL AND ${owner} ORDER BY created_at`,m.group_id,...membership).all();return json({members:rows.results});
    }
    const memberPath=route.match(/^\/members\/([0-9a-f-]+)$/i);
    if(memberPath&&method==='DELETE') {
      if(m.role!=='owner'||!uuid.test(memberPath[1])||memberPath[1]===m.id) fail(403,'Cannot remove this person.');
      const results=await db.batch([
        q(`UPDATE members SET revoked_at=? WHERE id=? AND group_id=? AND role='member' AND ${owner} RETURNING id`,now,memberPath[1],m.group_id,...membership),
        q(`UPDATE invites SET revoked_at=? WHERE group_id=? AND ${owner}`,now,m.group_id,...membership)
      ]);
      if(!results[0].results?.length) fail(404,'Person not found.');return json({ok:true,invitationReplaced:true});
    }
    if(route==='/songs'&&method==='GET') {
      if(m.mode==='none') fail(403,'Receiving is paused.');
      const after=Number(url.searchParams.get('after')||0); if(!Number.isSafeInteger(after)||after<0) fail(400,'Invalid page.');
      const rows=await q(`SELECT * FROM songs WHERE group_id=? AND seq>? AND deleted_at IS NULL AND ${receiving} ORDER BY seq LIMIT 10`,m.group_id,after,...membership).all();
      return json({songs:rows.results.map(record),nextAfter:rows.results.length===10?rows.results.at(-1).seq:null});
    }
    const songPath=route.match(/^\/songs\/([0-9a-f-]+)$/i);
    if(songPath&&uuid.test(songPath[1])&&method==='PUT') {
      if(m.mode!=='share') fail(403,'Choose Receive & share before sharing a song.');
      const b=await body(request), payload=song(b.song), bytes=encoder.encode(payload).length;
      if(!Number.isSafeInteger(b.revision)||b.revision<0) fail(400,'Invalid song revision.');
      const source=songPath[1];
      const existing=await q('SELECT * FROM songs WHERE group_id=? AND owner_member_id=? AND source_key=?',m.group_id,m.id,source).first();
      if(existing) {
        if(existing.payload_json===payload&&!existing.deleted_at) return json({publication:record(existing)});
        if(existing.deleted_at&&!b.restore) fail(409,'This song was removed. Share it explicitly to restore it.');
        const row=await q(`UPDATE songs SET payload_json=?,byte_length=?,revision=revision+1,updated_at=?,deleted_at=NULL
          WHERE id=? AND revision=? AND ${sharing}
          AND (SELECT COALESCE(SUM(byte_length),0) FROM songs WHERE group_id=? AND deleted_at IS NULL)-CASE WHEN deleted_at IS NULL THEN byte_length ELSE 0 END+?<=10485760
          AND (deleted_at IS NULL OR (SELECT COUNT(*) FROM songs WHERE group_id=? AND deleted_at IS NULL)<1000) RETURNING *`,
          payload,bytes,now,existing.id,b.revision,...membership,m.group_id,bytes,m.group_id).first();
        if(!row) fail(409,'The shared song changed, sharing was paused, or the group is full.');return json({publication:record(row)});
      }
      if(b.revision!==0) fail(409,'Song no longer exists.');
      const row=await q(`INSERT INTO songs (id,group_id,owner_member_id,source_key,payload_json,byte_length,revision,created_at,updated_at)
        SELECT ?,?,?,?,?,?,1,?,? WHERE ${sharing}
        AND (SELECT COUNT(*) FROM songs WHERE group_id=? AND deleted_at IS NULL)<1000
        AND (SELECT COALESCE(SUM(byte_length),0) FROM songs WHERE group_id=? AND deleted_at IS NULL)+?<=10485760
        ON CONFLICT(group_id,owner_member_id,source_key) DO NOTHING RETURNING *`,
        crypto.randomUUID(),m.group_id,m.id,source,payload,bytes,now,now,...membership,m.group_id,m.group_id,bytes).first();
      if(!row) fail(409,'Song changed, sharing was paused, or the group is full.');return json({publication:record(row)},201);
    }
    if(songPath&&uuid.test(songPath[1])&&method==='DELETE') {
      const row=await q(`UPDATE songs SET deleted_at=?,revision=revision+1 WHERE id=? AND group_id=? AND deleted_at IS NULL
        AND (owner_member_id=? OR ?) AND ${active} RETURNING id`,now,songPath[1],m.group_id,m.id,m.role==='owner'?1:0,...membership).first();
      if(!row) fail(404,'Shared song not found.');return json({ok:true});
    }
    fail(404,'Not found.');
  } catch(error) { return json({error:error.status?error.message:'The shared library is temporarily unavailable.'},error.status||503); }
}
