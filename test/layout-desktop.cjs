const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-layout-')),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 const executablePath=process.argv[2];let app;
 try{
  app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
  const page=await app.firstWindow();await page.waitForFunction(()=>window.ProMaxControls&&document.querySelector('#app-settings'));
  await page.evaluate(async()=>{await ProMaxControls.ready;await ProMaxControls.mutate('Layout fixture',()=>{songs=Array.from({length:40},(_,i)=>({id:'layout-'+i,title:'Example song '+String(i+1).padStart(2,'0'),lyrics:'Sample lyrics',lines:4,slides:Array.from({length:25},(_,j)=>({id:'s-'+i+'-'+j,text:'Sample lyrics '+j,section:'Verse'}))}));selected=songs[0].id;});selectSong(songs[0].id);selectVisual('dynamic-glass');document.querySelector('#glass-controls').closest('details').open=true;document.querySelector('#lyrics-fold').open=true;});
  assert.equal(await page.locator('#app-settings-dialog #updates-panel').count(),1);
  assert.equal(await page.locator('#app-version').count(),1);
  assert.equal(await page.evaluate(()=>CSS.supports('appearance','base-select')),true);
  assert.equal(await page.locator('#glass-palette').evaluate(el=>getComputedStyle(el).appearance),'base-select');
  await page.locator('#glass-palette').click();await fs.mkdir(path.join(__dirname,'../test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../test-results/layout-dropdown.png')});
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('#glass-palette').inputValue(),'solid');
  await page.locator('#lyrics').focus();await page.keyboard.press('F6');assert.equal(await page.evaluate(()=>state.black),true);await page.keyboard.press('F6');assert.equal(await page.evaluate(()=>state.black),false);
  await page.keyboard.press('F5');await page.waitForFunction(()=>document.querySelector('#open-output').getAttribute('aria-pressed')==='true');
  await page.keyboard.press('F5');await page.waitForFunction(()=>document.querySelector('#open-output').getAttribute('aria-pressed')==='false');
  await page.locator('#app-settings').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.black),false,'Dialog dismissal must not blackout');
  const panes=['aside','.workspace','.control'];
  for(const pane of panes){await page.locator('main>'+pane).evaluate(el=>el.scrollTop=0);}
  for(const pane of panes){
   const before=await page.evaluate(()=>[...document.querySelector('main').children].map(el=>el.scrollTop));
   await page.locator('main>'+pane).hover({position:{x:30,y:100}});await page.mouse.wheel(0,400);await page.waitForTimeout(300);
   const after=await page.evaluate(()=>[...document.querySelector('main').children].map(el=>el.scrollTop));
   const index=panes.indexOf(pane);assert.ok(after[index]>before[index],pane+' scrolls '+JSON.stringify({before,after,geometry:await page.locator('main>'+pane).evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,fold:el.querySelector('details')?.open}))}));for(let j=0;j<3;j++)if(j!==index)assert.equal(after[j],before[j],'Other panes stay still');
  }
  for(const width of [1440,1050,850]){
   await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('ProMax')).setSize(width,800),width);
   await page.waitForTimeout(100);
   const bounds=await page.evaluate(()=>({body:document.body.scrollHeight,h:innerHeight,w:innerWidth,main:document.querySelector('main').getBoundingClientRect().toJSON(),panes:[...document.querySelector('main').children].map(el=>el.getBoundingClientRect().toJSON()),buttons:[...document.querySelectorAll('header button')].map(el=>el.getBoundingClientRect().toJSON())}));
   assert.ok(bounds.body<=bounds.h,'No page scroll');assert.ok(bounds.panes.every(r=>r.bottom<=bounds.h+1&&r.y===bounds.main.y),'All columns fit viewport');assert.ok(bounds.buttons.every(r=>r.right<bounds.w&&r.bottom<=bounds.main.y),'Header buttons fit');
   await page.screenshot({path:path.join(__dirname,'../test-results/layout-'+width+'.png')});
  }
  console.log('PASSED: styled native picker, keyboard selection, independent wheel scrolling, 850/1050/1440 layout, updates in settings, F5/F6 while typing, safe dialog dismissal; '+(executablePath||'source'));
 }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
