/* Synthetic data only; settings navigation, Bible management and scrollbar regression. */
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-settings-')),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 const executablePath=process.argv[2];let app;const errors=[];
 try{
  app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>window.ProMaxSettings&&window.ProMaxControls);
  await page.evaluate(async()=>{await ProMaxControls.ready;await ProMaxControls.mutate('Large synthetic library',()=>{songs=Array.from({length:1000},(_,i)=>({id:'fixture-'+i,title:'Example song '+String(i).padStart(4,'0'),lyrics:'Synthetic words only',lines:4,slides:[{id:'slide-'+i,text:'Example lyric '+i,section:'Verse',key:''}]}));selected=songs[0].id;});selectSong(songs[0].id);state={text:'Keep this live cue',black:false};paint();});
  assert.equal(await page.locator('header #shared-open').count(),0);assert.equal(await page.locator('header').getByRole('button',{name:'Shortcuts',exact:true}).count(),0);
  await page.locator('#app-settings').click();assert.equal(await page.locator('.settings-nav button').count(),7);
  await page.locator('#settings-nav-bible').click();await page.locator('#settings-page-bible input[type=file]').setInputFiles({name:'test-bible.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({name:'Example Bible',verses:[{book:'Matt',chapter:1,verse:1,text:'Synthetic verse only'}]}))});
  await page.locator('.bible-settings-status').filter({hasText:'Example Bible'}).waitFor();assert.equal(await page.evaluate(()=>document.querySelector('#feature-view').hidden),true,'Import does not switch workspace');
  await page.locator('#settings-page-bible input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('bad json')});assert.equal(await page.evaluate(()=>ProMaxFeatures.getBible().name),'Example Bible');
  await page.locator('#shared-open').click();await page.locator('#shared-choice').waitFor();
  await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/settings-sharing.png')});
  await page.locator('#settings-nav-shortcuts').click();assert.ok(await page.locator('#editing-help').innerText().then(t=>t.includes('F5')&&t.includes('F6')));
  await page.locator('#settings-nav-updates').click();assert.equal(await page.locator('#update-action').isVisible(),true);
  await page.locator('#settings-nav-backup').click();assert.equal(await page.locator('#full-backup').isVisible(),true);
  await page.locator('#settings-nav-presentation').click();await page.screenshot({path:path.join(__dirname,'../test-results/settings-presentation.png')});
  await page.locator('#settings-close').click();await page.evaluate(()=>ProMaxFeatures.showTab('bible'));await page.locator('#bible-search').fill('Matt 1:1');assert.equal(await page.locator('.verse-row').count(),1);
  assert.equal(await page.locator('#feature-view input[type=file]').count(),0);assert.equal(await page.getByRole('button',{name:'Remove Bible',exact:true}).isVisible(),false);
  await page.locator('#app-settings').click();await page.locator('#settings-nav-bible').click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove Bible',exact:true}).click();await page.waitForFunction(()=>!ProMaxFeatures.getBible());
  await page.locator('#settings-close').click();await page.getByRole('button',{name:'Open Bible settings',exact:true}).click();assert.equal(await page.locator('#settings-page-bible').isVisible(),true);
  await page.mouse.click(8,200);assert.equal(await page.locator('#app-settings-dialog').isVisible(),false);
  await page.evaluate(()=>ProMaxFeatures.showTab('songs'));
  // Click outside Find over a live thumbnail: dismiss without sending a cue.
  await page.locator('#quick-open-button').click();const thumb=await page.locator('.thumbnail').first().boundingBox();await page.mouse.click(thumb.x+8,thumb.y+8);
  assert.equal(await page.locator('#quick-open').isVisible(),false);assert.equal(await page.evaluate(()=>state.text),'Keep this live cue');
  // Opening with keyboard and dismissing at the opposite edge behaves identically.
  await page.keyboard.press('Control+k');await page.mouse.click(8,200);assert.equal(await page.locator('#quick-open').isVisible(),false);
  const perf=await page.evaluate(async()=>{
   const pane=document.querySelector('main>aside'),r=pane.getBoundingClientRect();pane.scrollTop=0;
   ProMaxControls.select({type:'song',songId:selected});await new Promise(requestAnimationFrame);
   const refs=[...document.querySelectorAll('.song')];let mutations=0;
   const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.querySelector('main'),{attributes:true,attributeFilter:['draggable'],childList:true,subtree:true});
   const before=JSON.stringify(state),start=performance.now();for(let i=0;i<40;i++){pane.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.right-2,clientY:r.top+100}));pane.scrollTop=i*400;}
   await new Promise(requestAnimationFrame);observer.disconnect();
   const elapsed=performance.now()-start,after=[...document.querySelectorAll('.song')],retained=refs.every((el,i)=>after[i]===el);
   return {ms:elapsed,mutations,retained,liveKept:before===JSON.stringify(state),scrollTop:pane.scrollTop,dims:{client:pane.clientWidth,offset:pane.offsetWidth,width:r.width,scrollHeight:pane.scrollHeight,height:pane.clientHeight,clientLeft:pane.clientLeft},button:getComputedStyle(pane,'::-webkit-scrollbar-button').display};
  });
  assert.equal(perf.mutations,0,'Dragging scrollbar does not rescan/rebuild rows');assert.ok(perf.retained&&perf.liveKept&&perf.scrollTop>0);assert.equal(perf.button,'none');
  const sidebar=await page.locator('main>aside').boundingBox();await page.locator('main>aside').evaluate(el=>el.scrollTop=0);await page.mouse.move(sidebar.x+sidebar.width-4,sidebar.y+40);await page.mouse.down();await page.mouse.move(sidebar.x+sidebar.width-4,sidebar.y+sidebar.height-80,{steps:20});await page.mouse.up();assert.ok(await page.locator('main>aside').evaluate(el=>el.scrollTop)>0);
  for(const size of [[1440,940],[850,650]]){await app.evaluate(({BrowserWindow},[width,height])=>BrowserWindow.getAllWindows()[0].setSize(width,height),size);await page.locator('#app-settings').click();await page.locator('#settings-nav-bible').click();const dims=await page.locator('#app-settings-dialog').boundingBox();assert.ok(dims.y>=0&&dims.y+dims.height<=size[1]);await page.screenshot({path:path.join(__dirname,'../test-results/settings-'+size[0]+'.png')});await page.locator('#settings-close').click();}
  assert.deepEqual(errors,[]);console.log('PASSED: Settings categories, Bible import/error/removal, unchanged workspace/live cue, integrated sharing/shortcuts/updates/backup, outside dismissal without click-through, 1000-song scrollbar drag with retained rows and zero scans, responsive dialog. '+JSON.stringify(perf));
 }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
