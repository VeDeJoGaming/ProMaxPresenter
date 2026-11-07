const {chromium}=require('playwright'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
async function run(){
  const root=path.join(__dirname,'..'),evidence=path.join(root,'artifacts/test-results/youtube-timers');await fs.mkdir(evidence,{recursive:true});
  const server=http.createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!/^[\w.-]+\.(js|css|html)$/.test(file)&&!/^visuals\/[\w.-]+\.(svg|png)$/.test(file))throw Error();res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]);res.end(await fs.readFile(path.join(root,file)));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});const page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.promaxDesktop={initialData:null,saveLibrary(){},publish(){},onActive(){},onKey(){},onLibraryError(){},onYouTubeStatus(){},settingsInfo:async()=>({version:'1.5.0',dataPath:'Synthetic',displays:[]}),browserExtensions:async()=>({items:[{key:'synthetic',name:'uBlock Origin',version:'1.75.4',enabled:true,loaded:true}]}),youtubeHost:async()=>''};});
    await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>ProMaxControls.ready);
    await page.evaluate(()=>{document.querySelector('#minutes').closest('details').open=true;document.querySelector('#countdown').click();document.querySelector('#countdown-pause').click();document.querySelector('#countdown-position').scrollIntoView({block:'center'});});
    await page.screenshot({path:path.join(evidence,'timer-controls.png')});
    await page.setViewportSize({width:850,height:650});await page.selectOption('#timer-mode','stopwatch');await page.evaluate(()=>{document.querySelector('#countdown').click();document.querySelector('#countdown-pause').click();document.querySelector('#countdown-position').scrollIntoView({block:'center'});});
    assert.equal(await page.locator('.countdown-actions').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await page.screenshot({path:path.join(evidence,'timer-controls-compact.png')});
    await page.setViewportSize({width:1440,height:940});await page.evaluate(()=>ProMaxSettings.open('presentation'));await page.waitForSelector('#browser-extensions-list strong');await page.locator('#browser-extensions-card').evaluate(e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(evidence,'extension-settings.png')});
    const stage=await browser.newPage({viewport:{width:1280,height:720}}),clip=(await fs.readFile(path.join(root,'desktop/smoke-video.webm'))).toString('base64');
    await stage.setContent('<style>body{margin:0;background:#172b3b}#stage{position:relative;width:100vw;height:100vh}video{width:100%;height:100%;object-fit:contain}</style><div id="stage"><video loop autoplay muted src="data:video/webm;base64,'+clip+'"></video></div>');await stage.addScriptTag({path:path.join(root,'countdown-overlay.js')});
    await stage.evaluate(()=>ProMaxCountdownOverlay.render(document,document.querySelector('#stage'),{countdown:{seconds:75,mode:'countdown',position:'bottom-right'}}));await stage.screenshot({path:path.join(evidence,'youtube-countdown.png')});
    await stage.evaluate(()=>ProMaxCountdownOverlay.render(document,document.querySelector('#stage'),{countdown:{seconds:42,mode:'stopwatch',position:'top-left'}}));await stage.screenshot({path:path.join(evidence,'youtube-stopwatch.png')});assert.deepEqual(errors,[]);
    console.log('PASS: timer/extension settings visual review at desktop and compact sizes, countdown and stopwatch over video');
  }finally{await browser?.close();server.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
