const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {startTestService}=require('../shared-service/local-test-server.cjs');
const {createPrivateController,hashes}=require('../desktop/private-controller.cjs');
const {merge}=require('../private-sync');
const snapshot=records=>({format:1,records,conflicts:{}});
async function client(url){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'promax-private-test-'));let saved=null,copied='';
  const controller=createPrivateController({origin:url,vault:{async read(){return structuredClone(saved);},async write(v){saved=structuredClone(v);},async clear(){saved=null;}},clipboard:{writeText(v){copied=v;}},checkpointDir:directory});await controller.init();
  return {controller,key:()=>copied,saved:()=>saved,close:()=>fs.rm(directory,{recursive:true,force:true})};
}
async function sync(client,records){const result=await client.controller.sync(snapshot(records));await client.controller.applied(result.receipt);return result.snapshot;}
test('private sync: encrypted two-device round trip, offline merge, deletion, conflicts and explicit resolution',async()=>{
  const service=await startTestService(),a=await client(service.url),b=await client(service.url);
  try{
    await a.controller.create();await a.controller.copyKey();assert.match(a.key(),/^PMXP-[\w-]{43}$/);
    await assert.rejects(()=>a.controller.sync(snapshot({})),/Enable/);
    await a.controller.setEnabled(true);
    let first=await sync(a,{'song/one':{title:'Synthetic private song'},'meeting/service':{name:'Sunday',items:[]},'setting/color':'#ff0000','asset/bible':{verses:[{text:'Synthetic test verse'}]},'asset/video:one':{$blob:'AQID',type:'video/mp4'},'file/00000000-0000-0000-0000-000000000000/slide-0001.png':'AQID'});
    assert.ok(!JSON.stringify(a.controller.getState()).includes(a.saved().seed));
    await b.controller.restore(a.key());assert.equal(b.controller.getState().enabled,false);await b.controller.setEnabled(true);
    let second=await sync(b,{});assert.deepEqual(second.records,first.records);
    const data=service.sql.prepare('SELECT data FROM private_blobs').all();assert.ok(data.length);assert.ok(!JSON.stringify(data).includes('Synthetic'));
    const changedA={...first.records,'song/one':{title:'Edited on PC'}};delete changedA['asset/bible'];
    first=await sync(a,changedA);
    const changedB={...second.records,'song/one':{title:'Edited on laptop'},'song/two':{title:'Laptop only'}};
    second=await sync(b,changedB);assert.equal(second.records['asset/bible'],null);assert.equal(second.records['song/one'].title,'Edited on laptop');assert.equal(second.records['song/two'].title,'Laptop only');
    const entries=Object.entries(second.conflicts);assert.equal(entries.length,1);assert.equal(entries[0][1].incoming.title,'Edited on PC');
    const latest={...second,records:{...second.records,'song/one':entries[0][1].incoming},conflicts:{[entries[0][0]]:null}};
    const resolved=await b.controller.sync(latest);await b.controller.applied(resolved.receipt);assert.equal(resolved.snapshot.conflicts[entries[0][0]],null);
    const again=await a.controller.sync(first);assert.equal(again.snapshot.records['song/one'].title,'Edited on PC');assert.equal(again.snapshot.conflicts[entries[0][0]],null);
    await a.controller.setEnabled(false);await assert.rejects(()=>a.controller.applied(again.receipt),/changed/);await assert.rejects(()=>a.controller.sync(first),/Enable/);
    await b.controller.disconnect();assert.equal(b.controller.getState().connected,false);
  }finally{await service.close();await a.close();await b.close();}
});
test('private service rejects group keys, other private keys, missing chunks, cross-origin and stale revisions',async()=>{
  const service=await startTestService(),a=await client(service.url),other=await client(service.url);
  const request=async(route,method='GET',body,token)=>fetch(service.url+'/api/v1'+route,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  try{
    await a.controller.create();await a.controller.setEnabled(true);await other.controller.create();await other.controller.setEnabled(true);
    await sync(a,{'song/private':{title:'Not a group song'}});const isolated=await sync(other,{});assert.equal(isolated.records['song/private'],undefined);
    const group=await (await request('/groups','POST',{groupName:'Test',displayName:'Owner',mode:'share'})).json();
    assert.equal((await request('/private/state','GET',null,group.token)).status,401);
    assert.equal((await request('/private/state')).status,401);
    const h=require('node:crypto').createHmac('sha256',Buffer.from(a.saved().seed,'base64url')).update('ProMax private access v1').digest('base64url');
    assert.equal((await request('/private/state','PUT',{revision:1,chunks:['a'.repeat(64)]},h)).status,400);
    const state=await (await request('/private/state','GET',null,h)).json();
    assert.equal((await request('/private/state','PUT',{revision:0,chunks:state.chunks},h)).status,409);
    assert.equal((await fetch(service.url+'/api/v1/private/state',{headers:{authorization:'Bearer '+h,origin:'https://evil.test'}})).status,403);
    service.sql.prepare('UPDATE private_blobs SET data=?').run('corrupted');
    await assert.rejects(()=>a.controller.sync(snapshot({'song/local':{title:'Kept'}})),/verification/);
  }finally{await service.close();await a.close();await other.close();}
});
test('three-way merge propagates deletions, preserves edit versus delete, and keeps independent additions',()=>{
  const base=snapshot({'song/a':{title:'old'},'song/b':{title:'b'}}),baseline=hashes(base);
  const local=snapshot({'song/a':{title:'edit'},'song/b':{title:'b'},'song/c':{title:'c'}}),remote=snapshot({'song/b':{title:'b'},'song/d':{title:'d'}});
  local.hashes=hashes(local,Object.keys(baseline));remote.hashes=hashes(remote,Object.keys(baseline));
  const result=merge(local,remote,baseline);assert.equal(Object.keys(result.conflicts).length,1);assert.equal(result.records['song/a'].title,'edit');assert.equal(result.records['song/c'].title,'c');assert.equal(result.records['song/d'].title,'d');
  const id=Object.keys(result.conflicts)[0],resolved={...remote,conflicts:{[id]:null}};
  assert.equal(merge({...local,conflicts:result.conflicts},resolved,baseline).conflicts[id],null);
});
test('private pause aborts in-flight sync and sends no requests while disabled',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'promax-private-cancel-'));let started;const ready=new Promise(resolve=>started=resolve);let calls=0,saved={seed:'a'.repeat(43),enabled:true,baseline:{}};
  const controller=createPrivateController({origin:'https://test.example',checkpointDir:directory,clipboard:{writeText(){}},vault:{async read(){return saved;},async write(v){saved=structuredClone(v);},async clear(){saved=null;}},fetchImpl:async(_url,options)=>{calls++;started();return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'}))));}});
  try{await controller.init();const active=controller.sync(snapshot({'song/a':{title:'Local'}}));await ready;const pause=controller.setEnabled(false);await assert.rejects(active,/interrupted/);await pause;assert.equal(saved.enabled,false);const before=calls;await assert.rejects(()=>controller.sync(snapshot({})),/Enable/);assert.equal(calls,before);}finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('presentation transfer confines paths and never overwrites a differing local file',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-private-files-'));const files=require('../desktop/private-files.cjs').createPrivateFiles(root);
  try{await assert.rejects(()=>files.write({name:'../private-key',data:'AQID'}),/path/);const name='00000000-0000-0000-0000-000000000000/slide-0001.png';const url=await files.write({name,data:'AQID'});assert.equal((await files.read(url)).data,'AQID');await assert.rejects(()=>files.write({name,data:'BAUG'}),/kept/);assert.equal((await files.read(url)).data,'AQID');
    const nativeName=name.replace('slide-0001.png','source.pptx'),source=await files.write({name:nativeName,data:'UEsDBA=='});assert.equal((await files.read(source)).data,'UEsDBA==');await assert.rejects(()=>files.write({name:nativeName.replace('pptx','exe'),data:'AQID'}),/path/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
