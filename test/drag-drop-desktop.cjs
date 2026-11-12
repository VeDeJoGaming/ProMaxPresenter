/* Hidden native app, isolated synthetic profile: never takes desktop focus. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const executable=process.argv[2]||require('electron'),root=path.join(__dirname,'..');
const browserMode=process.env.PROMAX_DRAG_BROWSER==='1';let previewServer;
let child,browser,inspector;
const watchdog=setTimeout(()=>{child?.kill();console.error('Drag/drop timed out');process.exit(1);},90000);watchdog.unref();
async function launch(profile){
  if(browserMode){
    browser=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1440,height:940},...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});
    const page=browser.pages()[0];await page.goto('http://127.0.0.1:'+previewServer.address().port);await page.evaluate(()=>ProMaxControls.ready);return page;
  }
  const env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  child=spawn(executable,['--inspect-brk=127.0.0.1:0','--remote-debugging-port=0',`--user-data-dir=${profile}`,...(process.argv[2]?[]:[root])],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>stderr+=d);
  async function endpoint(pattern){for(let n=0;n<400;n++){const match=stderr.match(pattern);if(match)return match[1];if(child.exitCode!==null)throw Error(stderr);await new Promise(r=>setTimeout(r,50));}throw Error('Missing debugger endpoint: '+stderr);}
  inspector=new WebSocket(await endpoint(/Debugger listening on (ws:\/\/\S+)/));
  await new Promise((resolve,reject)=>{inspector.onopen=resolve;inspector.onerror=reject;});
  let seq=0;const pending=new Map(),events=new Map();
  inspector.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(Error(msg.error.message));else p.resolve(msg.result);}else{events.get(msg.method)?.(msg.params);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});inspector.send(JSON.stringify({id,method,params}));});
  await send('Debugger.enable');
  const paused=new Promise(resolve=>events.set('Debugger.paused',resolve));
  await send('Runtime.runIfWaitingForDebugger');
  let pause=await paused;
  if(!process.argv[2]){
    await send('Debugger.setBreakpointByUrl',{lineNumber:0,urlRegex:'[/\\\\]desktop[/\\\\]main\\.js$'});
    const mainPause=new Promise(resolve=>events.set('Debugger.paused',resolve));
    await send('Debugger.resume');pause=await mainPause;
  }
  const hook=await send('Debugger.evaluateOnCallFrame',{callFrameId:pause.callFrames[0].callFrameId,expression:"(()=>{const {BrowserWindow}=require('electron'); for(const name of ['show','showInactive','focus','moveTop'])BrowserWindow.prototype[name]=function(){};const load=BrowserWindow.prototype.loadFile;BrowserWindow.prototype.loadFile=function(...args){this.webContents.setBackgroundThrottling(false);return load.apply(this,args);};return true;})()",returnByValue:true});
  assert.equal(hook.result?.value,true,'Install hidden-window hooks before application starts: '+JSON.stringify(hook));
  await send('Debugger.resume');
  browser=await chromium.connectOverCDP(await endpoint(/DevTools listening on (ws:\/\/\S+)/));
  const context=browser.contexts()[0];let page;
  for(let i=0;i<400;i++){page=context.pages().find(p=>p.url().endsWith('/index.html'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert(page,'Control page loaded');await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);return page;
}
async function close(){await browser?.close();browser=null;inspector?.close();inspector=null;const process=child;child=null;if(process&&process.exitCode===null){process.kill();await new Promise(r=>process.once('exit',r));}}
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-drag-drop-')),errors=[];
 try{
  if(browserMode){
   previewServer=require('node:http').createServer(async(req,res)=>{try{const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!/^[\w.-]+\.(js|css|html)$/.test(relative)&&!/^visuals\/[\w.-]+\.(svg|png)$/.test(relative))throw Error();res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(relative)]);res.end(await fs.readFile(path.join(root,relative)));}catch{res.writeHead(404);res.end();}});
   await new Promise(r=>previewServer.listen(0,'127.0.0.1',r));
  }
  let page=await launch(profile);page.on('pageerror',e=>errors.push(e.message));
  async function settle(){await page.waitForFunction(()=>!ProMaxControls.busy);}
  async function undo(){await page.evaluate(()=>ProMaxControls.undo());await settle();}
  async function drag(source,target,{after=false,copy=false,gap=false,cancel=false}={}){
   const result=await page.evaluate(({source,target,after,copy,gap,cancel})=>{
    const from=document.querySelector(source);if(!from)throw Error('Missing drag source '+source);
    const data=new DataTransfer(),start=new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data});from.dispatchEvent(start);
    if(start.defaultPrevented)throw Error('Drag unexpectedly rejected: '+source);
    const to=document.querySelector(target);if(!to)throw Error('Missing target '+target);
    const r=to.getBoundingClientRect(),grid=to.matches('.slide-card,.prepared-slide,.document-slide');
    const point={clientX:gap?r.right-2:grid?(after?r.right-3:r.left+3):r.left+r.width/2,clientY:gap?r.bottom-1:grid?r.top+r.height/2:after?r.bottom-2:r.top+2};
    const over=new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:data,ctrlKey:copy,...point});to.dispatchEvent(over);
    const mark=document.querySelector('.drop-before,.drop-after,.drop-into'),effect=data.dropEffect;
    if(!cancel)to.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data,ctrlKey:copy,...point}));
    from.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:data}));
    return {accepted:over.defaultPrevented,marked:!!mark,effect,clean:!document.querySelector('.drop-before,.drop-after,.drop-into,#folder-drop-targets')};
   },{source,target,after,copy,gap,cancel});
   await settle();assert.equal(result.clean,true,'All feedback is cleaned up');assert.equal(result.marked,true,'A valid drop is highlighted: '+JSON.stringify({source,target,result}));return result;
  }
  await page.evaluate(async()=>{
   await ProMaxControls.mutate('Synthetic drag library',()=>{
    songs=['z','a','m'].map(id=>({id,title:id.toUpperCase(),lyrics:'[Verse]\nSynthetic '+id,lines:4,slides:['1','2','3'].map(n=>({id:id+n,text:id+n,section:'Verse',key:''}))}));selected='a';
    meetingFolders=[{id:'first',name:'First',items:[{id:'one',type:'song',songId:'a',title:'A'},{id:'two',type:'text',title:'Text cue',slides:[{id:'p1',text:'Prepared one'},{id:'p2',text:'Prepared two'}]}]},{id:'empty',name:'Empty',items:[]}];meetingSelected=null;
   });
   goLive(1);window.dragCue=state;
  });
  assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['a','m','z']);
  if(browserMode){
   await page.evaluate(()=>{window.trustedDragStarts=0;document.addEventListener('dragstart',e=>{if(e.isTrusted)trustedDragStarts++;});});
   await page.locator('.song[data-song-id="z"]').dragTo(page.locator('.song[data-song-id="a"]'),{sourcePosition:{x:20,y:10},targetPosition:{x:20,y:2}});await settle();
   assert.equal(await page.evaluate(()=>trustedDragStarts),1,'Real Chromium pointer gesture starts a trusted drag');
   assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['z','a','m']);await undo();
  }
  await drag('.song[data-song-id="z"]','.song[data-song-id="a"]');
  assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['z','a','m'],'Manual order stays visible instead of being alphabetized again');
  assert.equal(await page.evaluate(()=>settings.songOrder),'manual');await undo();
  assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['a','m','z']);
  await drag('.song[data-song-id="z"]','#library',{gap:true});
  assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['a','m','z'],'Bottom list padding appends');
  await page.evaluate(()=>ProMaxControls.drop({type:'song',songId:'z'},{type:'song',songId:'a'}));
  await page.evaluate(()=>{$('search').value='Synthetic';renderLibrary();});
  assert.deepEqual(await page.locator('.song').evaluateAll(rows=>rows.map(r=>r.dataset.songId)),['z','a','m'],'Filtered custom ordering remains visible');
  await page.evaluate(()=>{$('search').value='';renderLibrary();});
  await drag('.slide-card[data-slide-id="a1"]','.slide-card[data-slide-id="a3"]',{after:true});
  assert.deepEqual(await page.evaluate(()=>current().slides.map(s=>s.id)),['a2','a3','a1']);
  assert.equal(await page.evaluate(()=>liveIndex),0);assert.equal(await page.evaluate(()=>state===dragCue),true);
  await drag('.slide-card[data-slide-id="a3"]','.slide-card[data-slide-id="a3"]',{after:true});
  assert.deepEqual(await page.evaluate(()=>current().slides.map(s=>s.id)),['a2','a3','a1'],'Self-drop must not move to the next tile');
  await undo();assert.deepEqual(await page.evaluate(()=>current().slides.map(s=>s.id)),['a1','a2','a3'],'Self-drop creates no undo entry');
  await drag('.slide-card[data-slide-id="a1"]','#slides',{gap:true});
  assert.deepEqual(await page.evaluate(()=>current().slides.map(s=>s.id)),['a2','a3','a1']);await undo();
  await drag('.meeting-folder[data-folder-id="empty"]','.meeting-folder[data-folder-id="first"]');
  assert.deepEqual(await page.evaluate(()=>meetingFolders.map(f=>f.id)),['empty','first']);await undo();
  await drag('.song[data-song-id="m"]','.meeting-folder[data-folder-id="empty"]');
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[0].songId),'m');assert.equal(await page.evaluate(()=>songs.length),3);await undo();
  await page.evaluate(()=>ProMaxMeetings.select('first'));
  await page.evaluate(()=>ProMaxControls.mutate('Price-game drag fixture',()=>{
   ProMaxMeetings.folder().items.push(ProMaxPriceGame.makeItem({title:'Guess the Price',currency:'kr',rounds:[{id:'product-one',name:'First product',price:'149,90',description:'Synthetic description'},{id:'product-two',name:'Second product',price:'99'}]},{id:'price-game-drag'}));
  }));
  const priceBefore=await page.evaluate(()=>JSON.stringify(ProMaxMeetings.folder().items.at(-1)));
  await page.locator('.meeting-item[data-item-id="price-game-drag"] .meeting-item-open').dragTo(page.locator('.meeting-item[data-item-id="one"] .meeting-item-open'),{sourcePosition:{x:60,y:35},targetPosition:{x:60,y:5}});await settle();
  assert.deepEqual(await page.evaluate(()=>ProMaxMeetings.folder().items.map(i=>i.id)),['price-game-drag','one','two'],'Guess the Price moves inside its meeting folder');
  assert.equal(await page.evaluate(()=>JSON.stringify(ProMaxMeetings.folder().items[0])),priceBefore,'Moving the whole game preserves all round, image and slide data');
  assert.equal(await page.evaluate(()=>state===dragCue),true,'Moving the whole price game does not show it live');
  await page.locator('.meeting-item[data-item-id="price-game-drag"] .meeting-item-drag-handle').dragTo(page.locator('.meeting-item[data-item-id="two"]'),{sourcePosition:{x:12,y:12},targetPosition:{x:60,y:85}});await settle();
  assert.deepEqual(await page.evaluate(()=>ProMaxMeetings.folder().items.map(i=>i.id)),['one','two','price-game-drag'],'The visible grip also moves the complete game downward');
  await undo();
  const grip=await page.locator('.meeting-item[data-item-id="price-game-drag"] .meeting-item-drag-handle').boundingBox(),next=await page.locator('.meeting-item[data-item-id="two"]').boundingBox();
  await page.mouse.move(grip.x+10,grip.y+10);await page.mouse.down();await page.mouse.move(next.x+50,next.y+next.height-4,{steps:5});
  assert.equal(await page.locator('#meeting-drag-preview').count(),1,'The captured pointer shows a preview while moving');
  await page.keyboard.press('Escape');await page.mouse.up();await settle();
  assert.deepEqual(await page.evaluate(()=>ProMaxMeetings.folder().items.map(i=>i.id)),['price-game-drag','one','two'],'Escape cancels a pointer move without changing order');
  assert.equal(await page.locator('#meeting-drag-preview,#folder-drop-targets,.pointer-drag-source').count(),0,'Cancellation cleans up capture and drag visuals');
  assert.equal(await page.evaluate(()=>state===dragCue),true,'Escape during dragging must not toggle the live blackout');
  for(const copy of [true,false]){
   const source=await page.locator('.meeting-item[data-item-id="price-game-drag"] .meeting-item-drag-handle').boundingBox();
   await page.mouse.move(source.x+10,source.y+10);await page.mouse.down();await page.mouse.move(source.x+22,source.y+22,{steps:3});
   const folderTarget=await page.locator('.folder-drop-target[data-folder-id="empty"]').boundingBox();
   if(copy)await page.keyboard.down('Control');
   await page.mouse.move(folderTarget.x+30,folderTarget.y+folderTarget.height/2,{steps:5});await page.mouse.up();if(copy)await page.keyboard.up('Control');await settle();
   assert.equal(await page.evaluate(()=>meetingFolders[1].items[0].priceGame.rounds.length),2,'Pointer move/copy retains the complete price game');
   assert.equal(await page.evaluate(()=>meetingFolders[0].items.some(i=>i.id==='price-game-drag')),copy,'Ctrl copies; an ordinary pointer drag moves between folders');await undo();
  }
  await undo();await undo();
  await drag('.meeting-item[data-item-id="two"]','.meeting-item[data-item-id="one"]');
  assert.deepEqual(await page.evaluate(()=>ProMaxMeetings.folder().items.map(i=>i.id)),['two','one']);await undo();
  await drag('.meeting-item[data-item-id="two"]','.folder-drop-target[data-folder-id="empty"]',{cancel:true});
  assert.equal(await page.evaluate(()=>meetingFolders[0].items.length),2);
  await drag('.meeting-item[data-item-id="two"]','.folder-drop-target[data-folder-id="empty"]',{copy:true});
  assert.equal(await page.evaluate(()=>meetingFolders[0].items.length),2);
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[0].slides[0].id!=='p1'),true,'Copy assigns independent slide identities');await undo();
  await drag('.meeting-item[data-item-id="two"]','.folder-drop-target[data-folder-id="empty"]');
  assert.deepEqual(await page.evaluate(()=>meetingFolders.map(f=>f.items.length)),[1,1]);await undo();
  await page.evaluate(()=>ProMaxMeetings.open(ProMaxMeetings.folder().items[1]));
  await drag('.prepared-slide[data-slide-id="p1"]','.prepared-slide[data-slide-id="p2"]',{after:true});
  assert.deepEqual(await page.evaluate(()=>ProMaxMeetings.folder().items[1].slides.map(s=>s.id)),['p2','p1']);await undo();
  await page.evaluate(()=>{document.querySelector('.prepared-slide .thumbnail').click();window.dragCue=state;});
  assert.equal(await page.evaluate(()=>ProMaxFeatures.captureDeck()?.index),0,'Explicit preview clicks work immediately after a drag');
  await page.evaluate(async()=>{
   ProMaxMeetings.select(null);
   const feature=ProMaxFeatures.history.take();
   feature.videos=['v1','v2','v3'].map(id=>({id,name:id+'.mp4',type:'video/mp4',size:0}));
   const image=color=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="'+color+'"/></svg>');
   feature.documents=['d1','d2'].map(id=>({id,title:id,slides:['red','orange','blue'].map(image)}));
   await ProMaxControls.mutate('Synthetic media',async()=>{await ProMaxFeatures.history.apply(feature);await ProMaxYouTubeLibrary.history.apply(['y1','y2'].map(id=>({id,title:id,videoId:'dQw4w9WgXcQ',localAssetId:'v1'})));});
   ProMaxFeatures.showTab('videos');
  });
  await drag('.asset-row[data-asset-id="v1"]','.asset-row[data-asset-id="v3"]',{after:true});
  assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.getVideos().map(a=>a.id)),['v2','v3','v1']);await undo();
  await drag('.youtube-card[data-youtube-id="y2"]','.youtube-card[data-youtube-id="y1"]');
  assert.deepEqual(await page.evaluate(()=>ProMaxYouTubeLibrary.list().map(a=>a.id)),['y2','y1']);
  await page.evaluate(()=>{ProMaxMeetings.select('empty');ProMaxFeatures.showTab('videos');});
  await drag('.asset-row[data-asset-id="v1"]','#meeting-items',{gap:true});
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[0].assetId),'v1','The entire empty folder area accepts content');await undo();
  await page.evaluate(()=>{ProMaxMeetings.select(null);ProMaxFeatures.showTab('videos');});
  await drag('.youtube-card[data-youtube-id="y1"]','.meeting-folder[data-folder-id="empty"]');
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[0].type),'youtube');
  await drag('.asset-row[data-asset-id="v1"]','.meeting-folder[data-folder-id="empty"]');
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[1].assetId),'v1');
  await page.evaluate(()=>ProMaxFeatures.showTab('presentations'));
  await drag('.document-deck[data-document-id="d2"] h3','.document-deck[data-document-id="d1"]');
  assert.deepEqual(await page.evaluate(()=>ProMaxFeatures.getDocuments().map(d=>d.id)),['d2','d1']);
  assert.equal(await page.locator('.document-slide img').first().evaluate(img=>img.draggable),false,'Images do not start unrelated browser drags');
  await drag('.document-deck[data-document-id="d1"] .document-slide img','.document-deck[data-document-id="d1"] .document-slide:last-child',{after:true});
  assert.equal(await page.evaluate(()=>decodeURIComponent(ProMaxFeatures.getDocuments()[1].slides[2]).includes('fill="red"')),true);
  await drag('.document-deck[data-document-id="d1"] h3','.meeting-folder[data-folder-id="empty"]');
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[2].type),'document');
  // A stale source and an unrelated target cannot remove the last valid entry.
  const before=await page.evaluate(()=>JSON.stringify(meetingFolders));
  await page.evaluate(async()=>{await ProMaxControls.drop({type:'item',folderId:'first',itemId:'missing'},{type:'folder',folderId:'empty'});await ProMaxControls.drop({type:'document-slide',documentId:'missing',index:0},{type:'document-slide',documentId:'missing',index:1});});
  assert.equal(await page.evaluate(()=>JSON.stringify(meetingFolders)),before);
  await page.evaluate(async()=>{
   await ProMaxFeatures.receiveBible({verses:[{book:'Genesis',chapter:1,verse:1,text:'Synthetic passage'}]});ProMaxFeatures.showTab('bible');$('bible-search').value='Synthetic';$('bible-search').dispatchEvent(new Event('input'));
  });
  await page.waitForSelector('.verse-row');
  await drag('.verse-row','.meeting-folder[data-folder-id="empty"]');
  assert.equal(await page.evaluate(()=>meetingFolders[1].items[3].type),'bible');
  // Scroll continues while the pointer rests at the pane edge, and stops on cancellation.
  await page.evaluate(()=>{ProMaxMeetings.select('first');for(let n=0;n<45;n++)ProMaxMeetings.folder().items.push({id:'scroll'+n,type:'song',songId:'a',title:'Scroll '+n});save();ProMaxMeetings.render();document.querySelector('aside').scrollTop=0;});
  await page.evaluate(()=>{
   const source=document.querySelector('.meeting-item'),pane=document.querySelector('aside'),r=pane.getBoundingClientRect(),data=new DataTransfer();window.scrollDragSource=source;
   source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:data}));
   pane.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:data,clientX:r.left+30,clientY:r.bottom-3}));
  });
  await page.waitForFunction(()=>document.querySelector('aside').scrollTop>40);
  if(browserMode){await fs.mkdir(path.join(root,'artifacts','test-results'),{recursive:true});await page.screenshot({path:path.join(root,'artifacts','test-results','drag-drop-folders.png')});}
  await page.evaluate(()=>scrollDragSource.dispatchEvent(new DragEvent('dragend',{bubbles:true})));
  const stopped=await page.evaluate(()=>document.querySelector('aside').scrollTop);await new Promise(r=>setTimeout(r,100));
  assert.equal(await page.evaluate(()=>document.querySelector('aside').scrollTop),stopped);
  assert.equal(await page.evaluate(()=>state===dragCue),true,'Every drag operation preserves the current live cue');
  await page.evaluate(()=>{ProMaxMeetings.select(null);ProMaxFeatures.showTab('songs');flushPendingSave();});
  const saved=await page.evaluate(()=>({songs,meetingFolders,songOrder:settings.songOrder,videos:ProMaxFeatures.getVideos(),documents:ProMaxFeatures.getDocuments(),youtube:ProMaxYouTubeLibrary.list()}));
  await page.evaluate(()=>window.promaxDesktop?.saveLibrary(JSON.stringify(librarySnapshot())));await new Promise(r=>setTimeout(r,1200));
  if(browserMode){await fs.mkdir(path.join(root,'artifacts','test-results'),{recursive:true});await page.screenshot({path:path.join(root,'artifacts','test-results','drag-drop-library.png')});}
  await close();page=await launch(profile);
  assert.deepEqual(await page.evaluate(()=>({songs,meetingFolders,songOrder:settings.songOrder,videos:ProMaxFeatures.getVideos(),documents:ProMaxFeatures.getDocuments(),youtube:ProMaxYouTubeLibrary.list()})),saved,'All orders and contents survive a full installed-app restart');
  assert.deepEqual(errors,[]);console.log('PASS: songs/folders/items/slides/prepared/Bible/video/YouTube/PowerPoint, gap/empty-folder drops, Ctrl-copy, self-drop, cancel, stale IDs, continuous autoscroll, undo, live isolation and restart; '+(browserMode?'headless Chromium with trusted pointer drag':'hidden native '+executable));
 }finally{await close();if(previewServer)await new Promise(r=>previewServer.close(r));clearTimeout(watchdog);}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
