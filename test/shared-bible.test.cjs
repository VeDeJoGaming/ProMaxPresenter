const test=require('node:test'),assert=require('node:assert/strict');
const {startTestService}=require('../shared-service/local-test-server.cjs');
const {createSharedController}=require('../desktop/shared-controller.cjs');
function client(origin){let saved;const clipboard={value:'',writeText(v){this.value=v;}};return {clipboard,vault:()=>saved,controller:createSharedController({origin,clipboard,vault:{read:async()=>saved,write:async v=>{saved=structuredClone(v);},clear:async()=>{saved=null;}}})};}
test('group Bible: explicit multi-part publication, offline-ready receive, isolation, consent, integrity and revocation',async()=>{
  const service=await startTestService();
  try{
    const a=client(service.url),b=client(service.url),other=client(service.url);
    await a.controller.create({displayName:'Owner',groupName:'Bible test',mode:'share'});
    await a.controller.copyInvite(false);const code=new URLSearchParams(new URL(a.clipboard.value).hash.slice(1)).get('invite');
    await b.controller.join({displayName:'Reader',mode:'receive',code});
    await other.controller.create({displayName:'Other',groupName:'Isolated',mode:'share'});
    assert.equal((await b.controller.bibleInfo()).bible,null);
    const bible={name:'Synthetic Bible',verses:Array.from({length:2000},(_,i)=>({book:'Matteus',chapter:Math.floor(i/100)+1,verse:i%100+1,text:'Generated words æøå. '.repeat(7).trim()}))};
    const published=await a.controller.publishBible(bible);assert.ok(published.bible.chunkCount>1);
    const info=(await b.controller.bibleInfo()).bible;assert.equal(info.verseCount,2000);
    assert.deepEqual((await b.controller.downloadBible(info.id)).bible,bible);
    assert.equal((await other.controller.bibleInfo()).bible,null);
    await assert.rejects(other.controller.downloadBible(info.id),/changed/);
    await assert.rejects(b.controller.publishBible(bible),/Receive & share/);
    await b.controller.setMode('share');await assert.rejects(b.controller.publishBible(bible),/publisher or group owner/);
    const request=async(route,body)=>{const r=await fetch(service.url+'/api/v1'+route,{method:'POST',headers:{authorization:'Bearer '+a.vault().token,'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
    const pending=await request('/bible/uploads',{name:'Incomplete',verseCount:1,chunkCount:1,byteLength:2,digest:'0'.repeat(64)});
    assert.equal(pending.status,201);assert.equal((await request('/bible/'+pending.data.id+'/commit',{})).status,409);
    assert.equal((await b.controller.bibleInfo()).bible.id,info.id,'partial upload preserves published Bible');
    const invalid=await fetch(service.url+'/api/v1/bible/'+pending.data.id+'/chunks/0',{method:'PUT',headers:{authorization:'Bearer '+a.vault().token,'content-type':'application/json'},body:JSON.stringify({text:'{}'})});assert.equal(invalid.status,200);
    assert.equal((await request('/bible/'+pending.data.id+'/commit',{})).status,400,'corrupt digest cannot publish');
    assert.equal((await b.controller.bibleInfo()).bible.id,info.id);
    // Bible traffic has its own budget and cannot throttle ordinary song sync.
    for(let i=0;i<125;i++)await a.controller.bibleInfo();
    assert.equal((await a.controller.sync([])).songs.length,0);
    await a.controller.unpublishBible();assert.equal((await b.controller.bibleInfo()).bible,null);
    await assert.rejects(b.controller.downloadBible(info.id),/changed/);
    await a.controller.publishBible({name:'Replacement',verses:[bible.verses[0]]});
    await a.controller.revoke(b.vault().self.id);await assert.rejects(b.controller.bibleInfo(),/access has ended/);
    await a.controller.setMode('none');await assert.rejects(a.controller.bibleInfo(),/Enable receiving/);
    await assert.rejects(a.controller.publishBible(bible),/Receive & share/);
  }finally{await service.close();}
});
