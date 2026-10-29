const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createLibraryRecovery}=require('../desktop/library-recovery');
const raw=title=>JSON.stringify({schemaVersion:1,savedAt:Date.now(),songs:[{id:'song',title,lyrics:'Synthetic words',slides:[{id:'slide',text:'Synthetic words',section:'Verse',key:'v'}]}],settings:{},meetingFolders:[]});
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-recovery-queue-'));t.after(async()=>{if(path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith('promax-recovery-queue-'))throw Error('Unexpected recovery test path');await fs.rm(root,{recursive:true,force:true});});return root;}
for(const delayed of [false,true])test(delayed?'a delayed write and an explicit flush use one writer':'simultaneous flushes cannot overwrite a newer snapshot',async t=>{
  const root=await temporary(t),entered=gate(),release=gate();let active=0,maximum=0,writes=0;
  const io={...fs,writeFile:async(name,...args)=>{if(!name.endsWith('library.json.tmp'))return fs.writeFile(name,...args);active++;maximum=Math.max(maximum,active);try{if(++writes===1){entered.resolve();await release.promise;}return await fs.writeFile(name,...args);}finally{active--;}}};
  const recovery=createLibraryRecovery(root,()=>{},{io,debounceMs:5});recovery.save(raw('Older'));const first=recovery.flush();await entered.promise;recovery.save(raw('Latest'));
  const second=delayed?null:recovery.flush();await new Promise(r=>setTimeout(r,20));release.resolve();const results=await Promise.allSettled([first,...(second?[second]:[])]);await recovery.flush();
  assert.ok(results.every(r=>r.status==='fulfilled'));assert.equal(maximum,1,'Only one atomic replacement can be in flight');assert.equal(recovery.read().library.songs[0].title,'Latest');assert.equal((await fs.readdir(recovery.directory)).includes('library.json.tmp'),false);
});
test('a failed replacement reports the error and retains the newest raw data for retry',async t=>{
  const root=await temporary(t),errors=[];let fail=true;const io={...fs,writeFile:async(name,...args)=>{if(fail&&name.endsWith('library.json.tmp'))throw Object.assign(Error('Synthetic disk failure'),{code:'EIO'});return fs.writeFile(name,...args);}};
  const recovery=createLibraryRecovery(root,message=>errors.push(message),{io});recovery.save(raw('Keep for retry'));await assert.rejects(recovery.flush(),/Synthetic disk failure/);fail=false;await recovery.flush();assert.equal(recovery.read()?.library.songs[0].title,'Keep for retry');assert.deepEqual(errors,['Synthetic disk failure']);
});
test('a newer edit is retained when an older in-flight write fails',async t=>{
  const root=await temporary(t),entered=gate(),release=gate();let fail=true;
  const io={...fs,writeFile:async(name,...args)=>{if(fail&&name.endsWith('library.json.tmp')){entered.resolve();await release.promise;throw Error('Synthetic delayed disk failure');}return fs.writeFile(name,...args);}};
  const recovery=createLibraryRecovery(root,()=>{},{io});recovery.save(raw('Older failed write'));const first=recovery.flush();await entered.promise;recovery.save(raw('Newer edit'));release.resolve();await assert.rejects(first,/delayed disk failure/);fail=false;await recovery.flush();assert.equal(recovery.read().library.songs[0].title,'Newer edit');
});
test('damaged current and previous copies recover the newest valid retained snapshot',async t=>{
  const root=await temporary(t),recovery=createLibraryRecovery(root);recovery.save(raw('Original historical copy'));await recovery.flush();
  await fs.writeFile(path.join(recovery.directory,'library.json'),'{damaged');await fs.writeFile(path.join(recovery.directory,'library-previous.json'),'{damaged');await fs.writeFile(path.join(recovery.directory,'library-9999999999999.json'),'{newest is damaged');await fs.writeFile(path.join(recovery.directory,'library-9999999999998.json'),raw('Newest valid historical copy'));
  assert.equal(recovery.read()?.library.songs[0].title,'Newest valid historical copy');assert.equal(recovery.read()?.recovered,true);
});

test('oversized recovery reports a clear rejection without discarding an accepted pending save',async t=>{
  const root=await temporary(t),recovery=createLibraryRecovery(root);recovery.save(raw('Previous accepted copy'));await recovery.flush();
  recovery.save(raw('Latest accepted copy'));try{assert.throws(()=>recovery.save('x'.repeat(32*1024*1024+1)),{code:'RECOVERY_LIMIT'});}finally{await recovery.flush();}
  assert.equal(recovery.read().library.songs[0].title,'Latest accepted copy');assert.equal(JSON.parse(await fs.readFile(path.join(recovery.directory,'library-previous.json'),'utf8')).songs[0].title,'Previous accepted copy');
});
