const {test}=require('node:test');const assert=require('node:assert/strict');const {createSharedController}=require('../desktop/shared-controller.cjs');
function setup(fetchImpl,initialMode='none'){
  let saved={token:'a'.repeat(43),group:{id:'group',name:'Friends'},self:{id:'member',name:'Me',role:'owner',mode:initialMode},publications:{}};
  const vault={read:async()=>structuredClone(saved),write:async v=>{saved=structuredClone(v);},clear:async()=>{saved=null;}};
  const controller=createSharedController({origin:'https://fixed.example',vault,clipboard:{writeText(){}},fetchImpl});return {controller,saved:()=>saved};
}
test('off sends no network requests; credentials never reach renderer state',async()=>{const s=setup(async()=>{throw Error('Unexpected network');});await s.controller.init();assert.ok(!JSON.stringify(s.controller.getState()).includes('a'.repeat(43)));assert.equal((await s.controller.sync([])).songs.length,0);});
test('pausing interrupts an active sync and persists consent before returning',async()=>{
  let started;const ready=new Promise(r=>started=r);let calls=0;
  const s=setup(async(url,options)=>{calls++;assert.equal(url.origin,'https://fixed.example');assert.equal(options.redirect,'error');
    if(options.method==='PATCH')return Response.json({self:{id:'member',name:'Me',role:'owner',mode:'none'}});
    started();return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('cancelled'),{name:'AbortError'}))));
  },'share');await s.controller.init();const sync=s.controller.sync([]);await ready;const pause=s.controller.setMode('none');await assert.rejects(sync,/interrupted/);await pause;
  assert.equal(s.saved().self.mode,'none');const count=calls;await s.controller.sync([]);assert.equal(calls,count);
});
test('received songs cannot be published and selecting share does not upload anything',async()=>{
  const urls=[];const s=setup(async(url,options)=>{urls.push(url.pathname);return Response.json({self:{id:'member',name:'Me',role:'owner',mode:'share'}});});await s.controller.init();await s.controller.setMode('share');
  assert.deepEqual(urls,['/api/v1/me']);assert.equal((await s.controller.publish([{shared:{groupId:'other'}}])).count,0);
});
const sharedSong={id:'local-song',title:'Synthetic sync song',lyrics:'Test words',lines:4,slides:[{text:'Test words',section:'Verse',key:'v'}]};
test('sync automatically publishes new own songs, including named drafts, and skips unchanged content',async()=>{
  const uploads=[];const s=setup(async(url,options)=>{
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);uploads.push({route:url.pathname,...body});
      return Response.json({publication:{id:'remote-'+uploads.length,revision:1}});
    }
    return url.pathname==='/api/v1/me'?Response.json({self:{mode:'share'}}):Response.json({songs:[],nextAfter:null});
  },'share');
  await s.controller.init();
  const draft={id:'named-draft',title:'test',lyrics:'',lines:4,slides:[]};
  const songs=[sharedSong,draft,{...draft,id:'blank',title:'Untitled song'},{...sharedSong,id:'received',shared:{groupId:'group'}}];
  assert.equal((await s.controller.sync(songs)).published,2);
  assert.deepEqual(uploads.map(p=>p.route),['/api/v1/songs/local-song','/api/v1/songs/named-draft']);
  assert.ok(uploads.every(p=>p.revision===0&&!p.restore));
  assert.equal((await s.controller.sync(songs)).published,0);
  assert.equal(uploads.length,2,'unchanged songs are not uploaded again');
});
test('receive-only never publishes own songs',async()=>{
  const s=setup(async(url,options)=>{
    assert.equal(options.method,'GET');
    return url.pathname==='/api/v1/me'?Response.json({self:{mode:'receive'}}):Response.json({songs:[],nextAfter:null});
  },'receive');
  await s.controller.init();assert.equal((await s.controller.sync([sharedSong])).published,0);
});
test('stopping sharing survives restart and sync; explicitly sharing resumes it',async()=>{
  let puts=0,deletes=0;
  const s=setup(async(url,options)=>{
    if(options.method==='PUT'){puts++;return Response.json({publication:{id:'remote-song',revision:puts}});}
    if(options.method==='DELETE'){deletes++;return Response.json({ok:true});}
    return url.pathname==='/api/v1/me'?Response.json({self:{mode:'share'}}):Response.json({songs:[],nextAfter:null});
  },'share');
  await s.controller.init();await s.controller.sync([sharedSong]);
  await s.controller.unpublish(sharedSong.id);await s.controller.init();
  assert.equal((await s.controller.sync([{...sharedSong,lyrics:'Edited while stopped'}])).published,0);
  assert.equal(puts,1);assert.equal(deletes,1);
  await s.controller.publish([sharedSong]);assert.equal(puts,2);
  assert.equal((await s.controller.sync([{...sharedSong,lyrics:'Automatic edit'}])).published,1);
});
test('restored member receives its own shared songs on another computer',async()=>{
  const row={id:'remote-song',authorId:'member',revision:1,song:sharedSong};
  const s=setup(async url=>url.pathname==='/api/v1/me'?Response.json({self:{mode:'receive'}}):Response.json({songs:[row],nextAfter:null}),'receive');
  await s.controller.init();
  assert.deepEqual((await s.controller.sync([])).songs,[row]);
});
test('failed automatic publication does not block incoming songs and is reported',async()=>{
  const calls=[],row={id:'remote-song',authorId:'friend',revision:1,song:sharedSong};
  const s=setup(async(url,options)=>{
    calls.push([url.pathname,options.method]);
    if(options.method==='PUT')return Response.json({error:'This song is too large or invalid.'},{status:400});
    return url.pathname==='/api/v1/me'?Response.json({self:{mode:'share'}}):Response.json({songs:[row],nextAfter:null});
  },'share');
  s.saved().publications[sharedSong.id]={revision:1,hash:'previous-content'};
  await s.controller.init();const result=await s.controller.sync([sharedSong]);
  assert.deepEqual(result.songs,[row]);
  assert.deepEqual(result.publishFailures,[{id:sharedSong.id,message:'This song is too large or invalid.'}]);
  assert.ok(calls.some(([route,method])=>route==='/api/v1/songs'&&method==='GET'));
  assert.equal(s.saved().publications[sharedSong.id].revision,1,'Rejected upload remains pending');
});
