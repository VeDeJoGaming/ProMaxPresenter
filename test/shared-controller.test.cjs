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
