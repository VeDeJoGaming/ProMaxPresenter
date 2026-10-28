/* Synthetic profiles only. Tests the renderer's IndexedDB/localStorage adapter. */
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const http=require('node:http');
const {chromium}=require('playwright');const {startTestService}=require('../shared-service/local-test-server.cjs');const {createPrivateController}=require('../desktop/private-controller.cjs');const {createPrivateFiles}=require('../desktop/private-files.cjs');
async function run(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-private-browser-')),repo=path.join(__dirname,'..');
  const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;const relative=name==='/'?'index.html':name.slice(1);if(!/^[\w.-]+\.(js|css|html)$/.test(relative)&&!/^visuals\/[\w.-]+\.(svg|png)$/.test(relative))throw Error();res.setHeader('content-type',relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.png')?'image/png':relative.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await fs.readFile(path.join(repo,relative)));}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port,service=await startTestService();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});
    async function profile(name){const folder=path.join(root,name);let saved=null,key='';const files=createPrivateFiles(folder);
      const controller=createPrivateController({origin:service.url,checkpointDir:path.join(folder,'checkpoints'),vault:{async read(){return saved;},async write(v){saved=structuredClone(v);},async clear(){saved=null;}},clipboard:{writeText(v){key=v;}}});await controller.init();
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      await context.exposeBinding('privateBridge',async(_source,action,input)=>{try{return await (action==='readFile'?files.read(input):action==='writeFile'?files.write(input):controller[action](input));}catch(error){return {error:error.message};}});
      await context.addInitScript(({root})=>{window.proMaxPrivate=Object.fromEntries(['getState','create','restore','setEnabled','copyKey','disconnect','sync','applied','readFile','writeFile'].map(action=>[action,input=>window.privateBridge(action,input)]));window.promaxDesktop={initialData:{presentationRoot:root},saveLibrary(){},publish(){},onYouTubeStatus(){},onActive(){},onKey(){},onLibraryError(){}};},{root:files.root});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ProMaxPrivateContent&&window.ProMaxFeatures?.ready);await page.evaluate(()=>ProMaxFeatures.ready);
      return {page,controller,files,key:()=>key,errors};
    }
    const a=await profile('pc'),b=await profile('laptop');
    const slide=await a.files.write({name:'00000000-0000-0000-0000-000000000000/slide-0001.png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='});
    await a.page.evaluate(async slide=>{
      songs=[{id:'test-song',title:'Synthetic PC song',lyrics:'Test',lines:4,slides:[{id:'slide',text:'Test',section:'Verse',key:'v'}]}];selected='test-song';meetingFolders=[{id:'test-meeting',name:'Synthetic meeting',items:[{id:'item',type:'song',songId:selected,title:'Test'}]}];settings.color='#ff4400';save();
      await storedAsset('put',{name:'Synthetic Bible',verses:[{book:'John',chapter:1,verse:1,text:'Synthetic verse'}]},'bible');
      await storedAsset('put',new File(['synthetic bytes'],'clip.mp4',{type:'video/mp4',lastModified:123}),'video:test-video');
      await storedAsset('put',[{id:'test-video',name:'Test clip'}],'video-list');
      await storedAsset('put',[{id:'test-document',title:'Test deck',slides:[slide]}],'presentations');
      await storedAsset('put',[{id:'test-youtube',title:'Test link',url:'https://youtu.be/M7lc1UVf-VE'}],'youtube-list');
      await storedAsset('put',new Blob(['test background'],{type:'image/png'}),'background');
    },slide);
    await a.controller.create();await a.controller.copyKey();await a.controller.setEnabled(true);await b.controller.restore(a.key());await b.controller.setEnabled(true);
    async function sync(p){const before=await p.page.evaluate(()=>ProMaxPrivateContent.snapshot());const result=await p.controller.sync(before);await p.page.evaluate(snapshot=>ProMaxPrivateContent.apply(snapshot),result.snapshot);await p.controller.applied(result.receipt);await p.page.reload();await p.page.waitForFunction(()=>window.ProMaxFeatures?.ready);await p.page.evaluate(()=>ProMaxFeatures.ready);return result.snapshot;}
    await sync(a);await sync(b);
    const received=await b.page.evaluate(async()=>({songs:songs.map(s=>s.title),meeting:meetingFolders.find(f=>f.id==='test-meeting')?.name,color:settings.color,video:await (await storedAsset('get',null,'video:test-video')).text(),bible:(await storedAsset('get',null,'bible')).verses[0].text,document:(await storedAsset('get',null,'presentations'))[0].slides[0],youtube:(await storedAsset('get',null,'youtube-list'))[0].title,background:await (await storedAsset('get')).text()}));
    assert.ok(received.songs.includes('Synthetic PC song'));assert.equal(received.meeting,'Synthetic meeting');assert.equal(received.video,'synthetic bytes');assert.equal(received.bible,'Synthetic verse');assert.equal(received.youtube,'Test link');assert.equal(received.background,'test background');assert.ok(received.document.startsWith(b.files.root));assert.equal((await b.files.read(received.document)).data,(await a.files.read(slide)).data);
    // Browser reload rebuilds the local media, meetings and document feature state.
    assert.equal(await b.page.evaluate(()=>ProMaxFeatures.getDocuments()[0].title),'Test deck');
    await a.page.evaluate(()=>{songs.find(s=>s.id==='test-song').title='PC edit';save();});await b.page.evaluate(()=>{songs.find(s=>s.id==='test-song').title='Laptop edit';save();});await sync(a);const result=await sync(b);assert.ok(Object.values(result.conflicts).some(c=>c?.key==='song/test-song'));
    await b.page.locator('#app-settings').click();await b.page.locator('#shared-open').click();await b.page.screenshot({path:path.join(repo,'test-results','private-library.png')});
    const conflict=b.page.locator('#private-conflicts details').filter({has:b.page.locator('summary').filter({hasText:'song/test-song'})});await conflict.locator('summary').click();
    await Promise.all([b.page.waitForEvent('load'),conflict.getByRole('button',{name:'Use incoming',exact:true}).click()]);
    await b.page.waitForFunction(()=>window.ProMaxFeatures?.ready);await b.page.evaluate(()=>ProMaxFeatures.ready);
    assert.equal(await b.page.evaluate(()=>songs.find(s=>s.id==='test-song').title),'PC edit');
    await sync(a);const resolved=await a.page.evaluate(()=>ProMaxPrivateContent.snapshot());assert.ok(!Object.values(resolved.conflicts).some(c=>c?.key==='song/test-song'));
    assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);console.log('PASSED: browser startup, live-store export/import, all content types, portable slides, reload, two profiles and conflicts.');
  }finally{await browser?.close();await service.close();await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true});}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
