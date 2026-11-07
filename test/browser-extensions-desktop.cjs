const {launch}=require('./hidden-native.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-extensions-')),fixture=path.join(profile,'fixture');await fs.mkdir(fixture);
  await fs.writeFile(path.join(fixture,'manifest.json'),JSON.stringify({manifest_version:2,name:'ProMax synthetic blocker',version:'1.0.0',background:{scripts:['background.js']},permissions:['webRequest','webRequestBlocking','<all_urls>']}));
  await fs.writeFile(path.join(fixture,'background.js'),"chrome.webRequest.onBeforeRequest.addListener(details=>({cancel:details.url.includes('/blocked-by-extension.js')}),{urls:['<all_urls>']},['blocking']);");
  let app;const watchdog=setTimeout(()=>{app?.child.kill();console.error('Extension check timed out');process.exit(1);},120000);watchdog.unref();
  try{
    app=await launch(profile,process.argv[2]);let {page,main}=app;
    async function choose(folder){await main(`testRequire('electron').dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${JSON.stringify(folder)}]})`);return page.evaluate(()=>promaxDesktop.browserExtensions('add-folder'));}
    const installed=await choose(fixture);assert.equal(installed.error,undefined);assert.equal(installed.items[0].loaded,true);let key=installed.items[0].key;console.log('Synthetic extension installed');
    async function configure(){await main("(async()=>{const {session,BrowserWindow}=testRequire('electron'),s=session.fromPartition('persist:promax-youtube-browser');globalThis.extensionTestWindow=new BrowserWindow({show:false,webPreferences:{session:s,sandbox:true,contextIsolation:true,nodeIntegration:false}});testRequire('electron-chrome-extensions').ElectronChromeExtensions.fromSession(s).addTab(extensionTestWindow.webContents,extensionTestWindow);globalThis.extensionTestServer=testRequire('node:http').createServer((request,response)=>{const script=request.url.startsWith('/blocked-by-extension.js');response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type',script?'application/javascript':'text/html');response.end(script?'window.adLoaded=true':'<!doctype html><body>Fixture<script src=\"/blocked-by-extension.js?step='+Date.now()+'\"></script>');});await new Promise(resolve=>extensionTestServer.listen(0,'127.0.0.1',resolve));return true;})()");}
    await configure();console.log('Extension fixture protocol ready');
    async function prepare(){await main("(async()=>{await extensionTestWindow.webContents.loadURL('http://127.0.0.1:'+extensionTestServer.address().port);return true;})()");for(let n=0;n<100;n++){const browser=app.context.pages().find(p=>p.url().startsWith('http://127.0.0.1:'));if(browser)return browser;await page.waitForTimeout(50);}throw Error('Synthetic extension browser was not discovered.');}
    await page.evaluate(()=>window.extensionEntry=null);
    let browser=await prepare();console.log('Extension browser prepared');await browser.waitForLoadState('load');assert.equal(await browser.evaluate(()=>!!window.adLoaded),false,'Enabled extension must actually cancel a network request');console.log('Network block verified');
    let result=await page.evaluate(key=>promaxDesktop.browserExtensions('enabled',{key,enabled:false}),key);assert.equal(result.items[0].loaded,false);browser=await prepare();await browser.waitForLoadState('load');assert.equal(await browser.evaluate(()=>!!window.adLoaded),true,'Disabling releases the request');
    result=await page.evaluate(key=>promaxDesktop.browserExtensions('enabled',{key,enabled:true}),key);assert.equal(result.items[0].loaded,true);browser=await prepare();await browser.waitForLoadState('load');assert.equal(await browser.evaluate(()=>!!window.adLoaded),false);
    await app.close();app=await launch(profile,process.argv[2]);({page,main}=app);await configure();assert.equal((await page.evaluate(()=>promaxDesktop.browserExtensions('list'))).items[0].loaded,true,'Extensions reload after app restart');await page.evaluate(()=>window.extensionEntry=null);browser=await prepare();await browser.waitForLoadState('load');assert.equal(await browser.evaluate(()=>!!window.adLoaded),false);
    result=await page.evaluate(key=>promaxDesktop.browserExtensions('remove',{key}),key);assert.equal(result.items.length,0);
    if(process.env.PROMAX_UBLOCK_FOLDER){
      // Locally run against an unmodified official Chromium release. CI remains
      // offline/deterministic with the synthetic extension above.
      const source=process.env.PROMAX_UBLOCK_FOLDER,original=await fs.readFile(path.join(source,'js/start.js'));
      await main("testRequire('electron').app.on('web-contents-created',(_event,w)=>w.on('console-message',(_event,level,message,line,source)=>{if(level>=3)console.log('EXTENSION ERROR',message,line,source)}))");
      result=process.env.PROMAX_UBLOCK_DOWNLOAD?await page.evaluate(()=>promaxDesktop.browserExtensions('install-ublock')):await choose(source);assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.items[0].name,'uBlock Origin');assert.equal(result.items[0].loaded,true);console.log('Official uBlock Origin ready');
      assert.deepEqual(await fs.readFile(path.join(source,'js/start.js')),original,'Import never edits the official source');
      key=result.items[0].key;const opened=app.context.waitForEvent('page');result=await page.evaluate(key=>promaxDesktop.browserExtensions('options',{key}),key);assert.equal(result.error,undefined);
      const dashboard=await opened;await dashboard.waitForURL(/\/dashboard.html/);console.log('uBlock dashboard ready');
      await dashboard.locator('[data-pane="1p-filters.html"]').click();
      const editor=dashboard.frames().find(f=>f.url().includes('/1p-filters.html'));assert(editor);await editor.waitForSelector('.CodeMirror');
      await editor.evaluate(()=>document.querySelector('.CodeMirror').CodeMirror.setValue('||127.0.0.1^$script\n'));
      await editor.locator('#userFiltersApply').click();await editor.waitForFunction(()=>document.querySelector('#userFiltersApply').classList.contains('disabled')||document.querySelector('#userFiltersApply').disabled);
      await page.waitForTimeout(500);console.log('uBlock test filter saved');
      browser=await prepare();await browser.waitForLoadState('load');assert.equal(await browser.evaluate(()=>!!window.adLoaded),false,'Real uBlock Origin must block the synthetic script');
      await page.evaluate(()=>ProMaxSettings.open('presentation'));await page.waitForSelector('#browser-extensions-list strong');
      await page.evaluate(()=>document.querySelector('#app-settings-dialog').close());
      console.log('PASS: official uBlock Origin starts, blocks a real request and opens its dashboard; '+result.items[0].version);
    }
    console.log('PASS: extension import, network filtering, disable/enable, re-preparation, restart persistence and removal; '+(process.argv[2]||'source'));
  }finally{clearTimeout(watchdog);await app?.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
