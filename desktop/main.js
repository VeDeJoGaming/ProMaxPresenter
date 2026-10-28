const { app, BrowserWindow, ipcMain, screen, Menu, dialog, shell, powerSaveBlocker } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
// Prefer the discrete GPU (for example NVIDIA) before Chromium initializes.
// Keep normal driver checks and hardware-acceleration fallbacks enabled.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.setName('ProMax Presenter');
app.setAppUserModelId('com.promax.presenter');
if (!app.isPackaged && process.env.PROMAX_TEST_DATA) app.setPath('userData', process.env.PROMAX_TEST_DATA);
const {createLibraryRecovery}=require('./library-recovery');
const {inspectBackup,runMaintenance}=require('./backups');
const { presentationDisplay } = require('./displays');
const { importPowerPoint } = require('./documents');
const { protectPresentation } = require('./presentation-protection');
let youtubeHost=null;
let recovery=null,startupNotice=null,powerBlocker=null,maintenanceBusy=false,quitting=false,starting=true;
ipcMain.on('library:read',(event)=>{
  if(event.sender!==control?.webContents){event.returnValue=null;return;}
  let restoredFrom=null;try{restoredFrom=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'restored-path.json'),'utf8')).from;}catch{}
  const root=folder=>require('node:url').pathToFileURL(path.join(folder,'presentations')+path.sep).href;
  event.returnValue={...recovery?.read(),notice:startupNotice,presentationRoot:root(app.getPath('userData')),restoredPresentationRoot:restoredFrom?root(restoredFrom):null};
});
ipcMain.on('library:save',(event,raw)=>{if(event.sender===control?.webContents)try{recovery?.save(raw);}catch(error){control.webContents.send('library:error',error.message);}});
ipcMain.handle('settings:info',event=>{
  if(event.sender!==control?.webContents)throw Error('Invalid window.');
  const current=screen.getDisplayMatching(control.getBounds());
  return {version:app.getVersion(),dataPath:app.getPath('userData'),displays:screen.getAllDisplays().map((d,i)=>({id:d.id,label:d.label||`Display ${i+1}`,width:d.size.width,height:d.size.height,isControl:d.id===current.id,isOutput:d.id===displayId}))};
});
ipcMain.handle('settings:open-data',event=>{if(event.sender===control?.webContents)return shell.openPath(app.getPath('userData'));});
ipcMain.handle('meeting:check-files',async(event,urls)=>{
  if(event.sender!==control?.webContents)throw Error('Invalid window.');
  try{return await require('./meeting-files.cjs').checkPresentationFiles(app.getPath('userData'),urls);}catch(error){return {error:error.message};}
});
ipcMain.handle('settings:maintenance',async(event,kind)=>{
  if(event.sender!==control?.webContents||!['backup','restore'].includes(kind))throw Error('Invalid backup request.');
  if(maintenanceBusy)return {error:'A backup operation is already running.'};maintenanceBusy=true;
  try{
    const choice=await dialog.showOpenDialog(control,{title:kind==='backup'?'Choose where to save the full backup':'Choose a ProMax backup folder',defaultPath:app.getPath('documents'),properties:['openDirectory','createDirectory']});
    if(choice.canceled)return {canceled:true};
    const chosen=choice.filePaths[0];
    const destination=kind==='backup'?path.join(chosen,'ProMax-backup-'+new Date().toISOString().replace(/[:.]/g,'-')):chosen;
    control.webContents.send('settings:maintenance-progress',kind==='restore'?'Verifying backup files…':'Preparing to create your backup…');
    if(kind==='restore')await inspectBackup(destination);
    await recovery.flush();control.webContents.session.flushStorageData();
    await require('node:fs/promises').writeFile(path.join(app.getPath('userData'),'pending-maintenance.json'),JSON.stringify({kind,path:destination}));
    app.relaunch();app.quit();return {restarting:true};
  }catch(error){return {error:error.message};}finally{maintenanceBusy=false;}
});
let youtubeBrowser=null,browserQueue=Promise.resolve();
function browserOperation(action){const operation=browserQueue.then(action);browserQueue=operation.catch(()=>{});return operation;}
ipcMain.handle('youtube:browser-prepare',(event,value)=>{
  if(event.sender!==control?.webContents)throw Error('Invalid window.');
  return browserOperation(()=>youtubeBrowser.prepare(value));
});
ipcMain.on('youtube:browser-bounds',(event,value)=>{if(event.sender===control?.webContents)youtubeBrowser?.setBounds(value);});
ipcMain.handle('youtube:host',event=>{
  if(event.sender!==control?.webContents&&event.sender!==presentation?.webContents)throw Error('Invalid window.');
  return youtubeHost.url;
});
ipcMain.on('youtube:status',(event,value)=>{
  if(event.sender===presentation?.webContents&&value&&control&&!control.isDestroyed())control.webContents.send('youtube:status',{...value,isOutput:true});
});
let importingPowerPoint = false;
ipcMain.handle('documents:powerpoint', async event => {
  if (event.sender !== control?.webContents || importingPowerPoint) return { error: 'An import is already running.' };
  importingPowerPoint = true;
  try {
    const choice = await dialog.showOpenDialog(control, { title: 'Import PowerPoint',
      filters: [{ name: 'PowerPoint presentations', extensions: ['pptx', 'ppt', 'ppsx', 'pps'] }], properties: ['openFile'] });
    if (choice.canceled) return { canceled: true };
    return { document: await importPowerPoint(choice.filePaths[0], app.getPath('userData')) };
  } catch (error) { return { error: error.message }; }
  finally { importingPowerPoint = false; }
});
let control = null, presentation = null, latest = null, displayId = null;
ipcMain.handle('documents:edit',async(event,request)=>{
  if(event.sender!==control?.webContents||importingPowerPoint)return {error:'Another PowerPoint operation is running.'};
  importingPowerPoint=true;
  try{
    if(request?.action==='addImage'){
      const choice=await dialog.showOpenDialog(control,{title:'Add picture to PowerPoint',filters:[{name:'Pictures',extensions:['png','jpg','jpeg','webp','bmp']}],properties:['openFile']});
      if(choice.canceled)return {canceled:true};request={...request,imagePath:choice.filePaths[0]};
    }
    return await require('./pptx-editor.cjs').editPowerPoint(app.getPath('userData'),request);
  }
  catch(error){return {error:error.message};}finally{importingPowerPoint=false;}
});
ipcMain.handle('documents:export',async(event,request)=>{
  if(event.sender!==control?.webContents||importingPowerPoint)return {error:'Another PowerPoint operation is running.'};
  importingPowerPoint=true;
  try{
    const source=await require('./pptx-editor.cjs').sourceFile(app.getPath('userData'),request.source);
    const title=String(request.title||'Presentation').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100);
    const choice=await dialog.showSaveDialog(control,{title:'Save editable PowerPoint',defaultPath:path.join(app.getPath('documents'),title+'.pptx'),filters:[{name:'PowerPoint',extensions:['pptx']}]});
    if(choice.canceled)return {canceled:true};
    const destination=choice.filePath.toLowerCase().endsWith('.pptx')?choice.filePath:choice.filePath+'.pptx';
    if(path.resolve(destination).toLowerCase()===path.resolve(source).toLowerCase())return {saved:true};
    await require('node:fs/promises').copyFile(source,destination);return {saved:true};
  }catch(error){return {error:error.message};}finally{importingPowerPoint=false;}
});
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', require('node:fs').mkdtempSync(path.join(app.getPath('temp'), 'promax-smoke-')));
const preferences = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, plugins: true };
function secure(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
}
function sendActive() {
  if (control && !control.isDestroyed()) control.webContents.send('presentation:active', !!presentation);
  if(!presentation&&control&&!control.isDestroyed())control.webContents.send('presentation:performance',null);
}
ipcMain.on('presentation:performance',(event,value)=>{if(event.sender===presentation?.webContents&&control&&!control.isDestroyed())control.webContents.send('presentation:performance',value);});
function closePresentation() {
  if (presentation && !presentation.isDestroyed()) presentation.close();
}
async function openPresentation(target) {
  displayId = target.id;
  const win = new BrowserWindow({ ...target.bounds, show: false, frame: false, backgroundColor: '#000000', fullscreenable: true, minimizable: false, skipTaskbar: true, autoHideMenuBar: true, webPreferences: {...preferences,backgroundThrottling:false} });
  presentation = win;
  secure(win);
  win.on('close',()=>youtubeBrowser?.park().catch(()=>{}));
  win.on('closed', () => { if (presentation === win) { presentation = null; displayId = null;if(powerBlocker!==null){powerSaveBlocker.stop(powerBlocker);powerBlocker=null;}youtubeBrowser?.park().catch(()=>{}); sendActive(); } });
  win.on('resize',()=>youtubeBrowser?.resize());
  try {
    await win.loadFile(path.join(__dirname, 'output.html'));
    if (win.isDestroyed()) return;
    if (latest) win.webContents.send('presentation:state', latest);
    win.setBounds(target.bounds);
    win.setFullScreen(true);
    // Keep output above ordinary applications and the Windows taskbar without
    // taking keyboard focus away from the operator or another application.
    win.setAlwaysOnTop(true, 'screen-saver');
    await protectPresentation(win);
    if (win.isDestroyed()) return;
    win.showInactive();
    win.moveTop();
    if(powerBlocker===null)powerBlocker=powerSaveBlocker.start('prevent-display-sleep');
    sendActive();
  } catch (error) { if (!win.isDestroyed()) win.close(); throw error; }
}
ipcMain.handle('presentation:toggle', async (event,preferredDisplay) => {
  if (event.sender !== control?.webContents) return { active: false, error: 'Invalid window.' };
  if (presentation) { closePresentation(); return { active: false }; }
  const current = screen.getDisplayMatching(control.getBounds());
  const displays=screen.getAllDisplays();
  const target = preferredDisplay!==undefined&&preferredDisplay!==null&&preferredDisplay!==''?displays.find(d=>d.id===Number(preferredDisplay)&&d.id!==current.id):presentationDisplay(displays,current.id,screen.getPrimaryDisplay().id);
  if(!target&&preferredDisplay)return {active:false,error:'The selected output display is unavailable. Choose another display in Settings.'};
  if (!target) return { active: false, error: 'Connect a second display and select Extend displays in Windows.' };
  try { await openPresentation(target); return { active: !!presentation }; }
  catch { return { active: false, error: 'Could not open the presentation display.' }; }
});
ipcMain.on('presentation:state', (event, value) => {
  if (event.sender !== control?.webContents || !value || typeof value.text !== 'string') return;
  latest = value;
  youtubeBrowser?.immediate(value);
  if(youtubeBrowser)browserOperation(()=>youtubeBrowser.sync(value)).catch(error=>control?.webContents.send('youtube:status',{type:'error',code:'browser',message:error.message}));
  if (presentation && !presentation.isDestroyed()) presentation.webContents.send('presentation:state', value);
});
ipcMain.on('presentation:key', (event, value) => {
  if (event.sender === presentation?.webContents && typeof value === 'string' && value.length < 32) control?.webContents.send('presentation:key', value);
});
if (!smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (control) { if (control.isMinimized()) control.restore(); control.show(); control.focus(); } });
  app.whenReady().then(async () => {
    // Even a window using an in-memory partition initializes Chromium's default
    // storage context on Windows. Finish maintenance before creating any window
    // so Local Storage and IndexedDB can be replaced without locked files.
    startupNotice=await runMaintenance(app.getPath('userData'),app.getVersion());
    recovery=createLibraryRecovery(app.getPath('userData'),message=>{if(control&&!control.isDestroyed())control.webContents.send('library:error','Could not write the recovery copy: '+message);});
    const integrations=await require('./integrations.cjs').initializeIntegrations({app,getControl:()=>control,hasPresentation:()=>!!presentation||maintenanceBusy,flush:()=>recovery.flush()});
    youtubeHost=await require('./youtube-host').startYouTubeHost();
    youtubeBrowser=require('./youtube-browser').createYouTubeBrowser({getControl:()=>control,getPresentation:()=>presentation,onStatus:value=>control?.webContents.send('youtube:status',value)});
    app.once('will-quit',()=>youtubeHost.close());
    Menu.setApplicationMenu(null);
    control = new BrowserWindow({ width: 1440, height: 940, minWidth: 850, minHeight: 650, show: false, titleBarStyle: 'hidden', titleBarOverlay: { color: '#1c1616', symbolColor: '#f4e9e5', height: 36 }, backgroundColor: '#0d0d0d', title: 'ProMax Presenter', webPreferences: preferences });
    secure(control);
    control.webContents.once('did-finish-load',()=>integrations.start());
    control.webContents.on('did-finish-load', sendActive);
    control.on('closed', () => {youtubeBrowser.destroy(); closePresentation(); control = null; });
    screen.on('display-removed', (_event, removed) => { if (removed.id === displayId) closePresentation(); });
    screen.on('display-metrics-changed', (_event, changed) => {
      if (presentation && changed.id === displayId) { presentation.setFullScreen(false); presentation.setBounds(changed.bounds); presentation.setFullScreen(true); }
    });
    await control.loadFile(path.join(__dirname, '..', 'index.html'));
    starting=false;
    if (smoke) {
      try {
        const assert = require('node:assert/strict');
        assert.equal(await control.webContents.executeJavaScript('!!window.promaxDesktop && document.querySelectorAll(".slide-card").length > 0'), true);
        await control.webContents.executeJavaScript(`document.getElementById('lyrics').value='Vers 1:\\nFirst line\\nSecond line\\n\\nRefreng:\\nThird line\\nFourth line';document.getElementById('lyrics').dispatchEvent(new Event('input'));document.getElementById('build').click()`);
        assert.equal(await control.webContents.executeJavaScript('document.querySelectorAll(".slide-card").length'), 2);
        assert.deepEqual(await control.webContents.executeJavaScript('current().slides.map(s=>s.section)'), ['Vers 1', 'Refreng']);
        assert.deepEqual(await control.webContents.executeJavaScript('current().slides.map(s=>s.key)'), ['v', 'c']);
        assert.equal(await control.webContents.executeJavaScript('current().slides[0].text'), 'First line\nSecond line');
        const smokeDisplay=screen.getAllDisplays().find(d=>d.id!==screen.getPrimaryDisplay().id)||screen.getPrimaryDisplay();
        await openPresentation(smokeDisplay);
        await control.webContents.executeJavaScript("document.getElementById('show-text').click()");
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.equal(presentation.isFullScreen(), true);
        assert.equal(presentation.isAlwaysOnTop(), true);
        if (process.platform === 'win32') assert.equal(await protectPresentation(presentation), true);
        const competingWindow = new BrowserWindow({ ...smokeDisplay.bounds, show: false });
        try {
          await competingWindow.loadURL('data:text/html,<body style="background:magenta">Another application</body>');
          competingWindow.show();
          competingWindow.focus();
          await new Promise(resolve => setTimeout(resolve, 150));
          assert.equal(presentation.isAlwaysOnTop(), true);
          assert.equal(presentation.isFullScreen(), true);
          assert.equal(competingWindow.isAlwaysOnTop(), false);
          if (process.platform === 'win32') {
            const handle = window => window.getNativeWindowHandle().readBigUInt64LE().toString();
            const command = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class ProMaxWindowOrder { [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h); [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint command); }'; $p = [IntPtr]::new([long]${handle(presentation)}); $r = [IntPtr]::new([long]${handle(competingWindow)}); $w = [ProMaxWindowOrder]::GetTopWindow([IntPtr]::Zero); while ($w -ne [IntPtr]::Zero) { if ($w -eq $p) { Write-Output 'presentation'; break }; if ($w -eq $r) { Write-Output 'competitor'; break }; $w = [ProMaxWindowOrder]::GetWindow($w, 2) }`;
            const order = require('node:child_process').execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
            assert.equal(order.trim(), 'presentation', 'Presentation must stay above a newly focused application');
          }
        } finally { competingWindow.destroy(); }
        assert.equal(presentation.getBounds().width, smokeDisplay.bounds.width);
        await control.webContents.executeJavaScript("document.getElementById('quick-text').value='Desktop smoke test';document.getElementById('show-text').click()");
        await new Promise(resolve => setTimeout(resolve, 200));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('.screen-text').textContent"), 'Desktop smoke test');
        await control.webContents.executeJavaScript(`setMedia(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>'], {type:'image/svg+xml'}))`);
        await new Promise(resolve => setTimeout(resolve, 250));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('img').naturalWidth"), 8);
        await control.webContents.executeJavaScript("document.getElementById('blackout').click()");
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(await presentation.webContents.executeJavaScript("document.getElementById('stage').children.length"), 0);
        await control.webContents.executeJavaScript("document.getElementById('blackout').click();setMedia(null)");
        await new Promise(resolve => setTimeout(resolve, 100));
        await control.webContents.executeJavaScript("document.getElementById('browse-visuals').click()");
        assert.equal(await control.webContents.executeJavaScript("document.querySelectorAll('.visual-option').length===ProMaxVisuals.presets.length"), true);
        const loopChecks = await control.webContents.executeJavaScript(`(() => {
          const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
          return ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg').map(p=>{
            const frame=phase=>{ProMaxVisuals.draw(canvas,p,phase);return canvas.toDataURL();};
            const first=frame(0);return {name:p.name,loops:first===frame(1),moves:first!==frame(.173)};
          });
        })()`);
        for (const check of loopChecks) { assert.ok(check.loops, check.name+' loop seam'); assert.ok(check.moves, check.name+' motion'); }
        await control.webContents.executeJavaScript("selectVisual('golden-hour')");
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelectorAll('canvas[data-glass]').length"), 1);
        await presentation.webContents.executeJavaScript("window.testCanvas=document.querySelector('canvas')");
        await control.webContents.executeJavaScript("document.querySelector('.thumbnail').click()");
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(await presentation.webContents.executeJavaScript("window.testCanvas===document.querySelector('canvas')"), true);
        assert.equal(await control.webContents.executeJavaScript("JSON.parse(localStorage.getItem('promax-library')).settings.visual"), 'golden-hour');
        await control.webContents.executeJavaScript("[...document.querySelectorAll('#visual-filters button')].find(b=>b.textContent==='Atmosphere').click()");
        assert.equal(await control.webContents.executeJavaScript("document.querySelectorAll('.visual-option').length===ProMaxVisuals.presets.filter(p=>p.category==='Atmosphere').length"), true);
        await control.webContents.executeJavaScript("document.querySelectorAll('#visual-filters button')[0].click()");
        await control.webContents.executeJavaScript("[...document.querySelectorAll('#visual-filters button')].find(b=>b.textContent==='Cinematic').click();selectVisual('molten-glass')");
        assert.equal(await control.webContents.executeJavaScript("document.querySelectorAll('.visual-option').length===ProMaxVisuals.presets.filter(p=>p.category==='Cinematic').length"), true);
        await control.webContents.executeJavaScript("document.querySelector('.visual-option').dispatchEvent(new Event('pointerenter'))");
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.ok(await control.webContents.executeJavaScript("(()=>{const c=document.querySelector('.visual-option canvas');return c.width>=192&&c.width<=384;})()"), 'Gallery previews keep their optimized resolution budget');
        await control.webContents.executeJavaScript("document.querySelector('.visual-option').dispatchEvent(new Event('pointerleave'))");
        assert.equal(await control.webContents.executeJavaScript("document.querySelector('.visual-option canvas').width"), 192);
        await control.webContents.executeJavaScript("document.getElementById('close-visuals').click()");
        for(const visual of await control.webContents.executeJavaScript('ProMaxBundledVisuals.presets.map(p=>p.id)')){
          await control.webContents.executeJavaScript(`selectVisual(${JSON.stringify(visual)});goLive(0)`);
          await new Promise(resolve=>setTimeout(resolve,150));
          assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('img[data-bundled-visual]')?.naturalWidth"),1920,visual+' must load in native output');
          await presentation.webContents.executeJavaScript("window.bundledImage=document.querySelector('img[data-bundled-visual]')");
          await control.webContents.executeJavaScript('goLive(1)');
          await new Promise(resolve=>setTimeout(resolve,50));
          assert.equal(await presentation.webContents.executeJavaScript("window.bundledImage===document.querySelector('img[data-bundled-visual]')"),true);
        }
        await control.webContents.executeJavaScript("selectVisual('dynamic-glass');goLive(0)");
        await new Promise(resolve=>setTimeout(resolve,100));
        await presentation.webContents.executeJavaScript("window.glassCanvas=document.querySelector('canvas')");
        await control.webContents.executeJavaScript("goLive(1)");
        await new Promise(resolve=>setTimeout(resolve,100));
        assert.equal(await presentation.webContents.executeJavaScript("window.glassCanvas===document.querySelector('canvas')"),true);
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('.screen-text').textContent"),await control.webContents.executeJavaScript("state.text"));
        await control.webContents.executeJavaScript("selectVisual('molten-glass')");
        const beforeEdit = await control.webContents.executeJavaScript('state.text');
        await control.webContents.executeJavaScript("document.querySelector('.slide-edit-button').click();document.getElementById('slide-edit-text').value='Edited line one\\nEdited line two';document.getElementById('slide-edit-section').value='Bro';document.getElementById('slide-edit-key').value='x';document.getElementById('slide-edit-text').dispatchEvent(new Event('input'));document.getElementById('slide-edit-cancel').click()");
        assert.equal(await control.webContents.executeJavaScript('state.text'), beforeEdit, 'Saving must not change live output');
        assert.equal(await control.webContents.executeJavaScript('current().slides[0].section'), 'Bro');
        assert.equal(await control.webContents.executeJavaScript('current().slides[0].key'), 'x');
        await new Promise(resolve=>setTimeout(resolve,350)); // Let the coalesced autosave reach storage.
        assert.equal(await control.webContents.executeJavaScript("JSON.parse(localStorage.getItem('promax-library')).songs.find(s=>s.id===selected).slides[0].text"), 'Edited line one\nEdited line two');
        assert.ok(await control.webContents.executeJavaScript("document.getElementById('lyrics').value.includes('Edited line one')"));
        await control.webContents.executeJavaScript("document.querySelector('.slide-edit-button').click();document.getElementById('slide-edit-text').value='Canceled edit';document.getElementById('slide-edit-cancel').click()");
        assert.equal(await control.webContents.executeJavaScript('current().slides[0].text'), 'Edited line one\nEdited line two');
        await control.webContents.executeJavaScript("document.querySelector('.slide-edit-button').click();document.getElementById('slide-save-live').click()");
        await new Promise(resolve=>setTimeout(resolve,150));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('.screen-text').textContent"), 'Edited line one\nEdited line two');
        await control.webContents.executeJavaScript(`(async()=>{
          await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Live search test',verses:[
            {book:'Matt',chapter:1,verse:1,text:'First Matthew verse'},
            {book:'Matt',chapter:1,verse:2,text:'Second Matthew verse'},
            {book:'Matt',chapter:16,verse:26,text:'Passage first verse'},
            {book:'Matt',chapter:16,verse:27,text:'Passage second verse'},
            {book:'John',chapter:1,verse:1,text:'John verse'}
          ]})],'live-search.json'));
          ProMaxFeatures.showTab('bible');
          const input=document.getElementById('bible-search');input.value='Mat';input.dispatchEvent(new Event('input'));
        })()`);
        assert.equal(await control.webContents.executeJavaScript("document.querySelectorAll('.verse-row').length"),4);
        assert.ok(await control.webContents.executeJavaScript("document.querySelector('.verse-button').textContent.startsWith('Matteus 1:1')"));
        assert.equal(await control.webContents.executeJavaScript("document.getElementById('bible-search').form.querySelectorAll('button').length"),0);
        await control.webContents.executeJavaScript("document.getElementById('bible-search').value='Mat 1.1';document.getElementById('bible-search').dispatchEvent(new Event('input'))");
        assert.equal(await control.webContents.executeJavaScript("document.querySelectorAll('.verse-row').length"),1);
        await control.webContents.executeJavaScript(`document.getElementById('bible-search').value='Mat 16:26-27';document.getElementById('bible-search').dispatchEvent(new Event('input'));
          document.querySelectorAll('.verse-row input').forEach(c=>{c.checked=true;c.dispatchEvent(new Event('change'))});
          [...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Show selected passage').click();`);
        await new Promise(resolve=>setTimeout(resolve,150));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelectorAll('.verse-number').length"),2);
        assert.ok(await presentation.webContents.executeJavaScript("document.querySelector('.screen-text').textContent.endsWith('Matteus 16:26-27')"));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelector('.screen-text').textContent.includes('Live search test')"),false);
        assert.ok(await presentation.webContents.executeJavaScript("parseFloat(getComputedStyle(document.querySelector('.verse-number')).fontSize)<parseFloat(getComputedStyle(document.querySelector('.screen-text')).fontSize)*.6"));
        await control.webContents.executeJavaScript("selectVisual('dynamic-glass')");
        await new Promise(resolve=>setTimeout(resolve,100));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelectorAll('.verse-number').length"),2);
        await control.webContents.executeJavaScript("[...document.querySelectorAll('#feature-view button')].find(b=>b.textContent==='Add passage to song library').click();goLive(0)");
        await new Promise(resolve=>setTimeout(resolve,100));
        assert.equal(await presentation.webContents.executeJavaScript("document.querySelectorAll('.verse-number').length"),2);
        await control.webContents.executeJavaScript("ProMaxFeatures.showTab('bible')");
        await control.webContents.executeJavaScript("document.getElementById('bible-search').value='';document.getElementById('bible-search').dispatchEvent(new Event('input'));ProMaxFeatures.showTab('songs')");
        if (process.argv.includes('--youtube-test')) await require('./native-youtube-smoke')({control,getPresentation:()=>presentation,browser:youtubeBrowser});
        if(process.argv.includes('--youtube-player-test')){
          await control.webContents.executeJavaScript("ProMaxYouTubeLibrary.add('https://youtu.be/M7lc1UVf-VE','Packaged YouTube test')");
          let ready=false;const deadline=Date.now()+20000;
          while(Date.now()<deadline){ready=await control.webContents.executeJavaScript("[...document.querySelectorAll('[data-youtube-status]')].some(e=>/\d+p/.test(e.textContent))");if(ready)break;await new Promise(r=>setTimeout(r,250));}
          assert.ok(ready,'Packaged YouTube player must connect and become ready');
        }
        if (process.argv.includes('--feature-test')) await require('./feature-smoke')({ app, control, getPresentation: () => presentation });
        if (process.argv.includes('--release-test')) await require('./release-smoke')({ app, control, getPresentation: () => presentation, recovery });
        if (process.argv.includes('--performance-test')) await require('./performance-smoke')({control,getPresentation:()=>presentation});
        control.setBounds({...smokeDisplay.workArea,width:Math.min(1440,smokeDisplay.workArea.width),height:Math.min(1000,smokeDisplay.workArea.height)});
        control.showInactive();
        await new Promise(resolve => setTimeout(resolve, 250));
        const capture = await control.webContents.capturePage();
        require('node:fs').writeFileSync(path.join(app.getPath('temp'), 'promax-desktop-preview.png'), capture.toPNG());
        closePresentation();
        await new Promise(resolve => setTimeout(resolve, 200));
        assert.equal(presentation, null);
        require('node:fs').writeFileSync(path.join(app.getPath('temp'), 'promax-smoke-result.txt'), 'PASSED: UI, IPC, native fullscreen, media, blackout, all installed moving seamless backgrounds, gallery filters, saved choice, continuous motion between slides, close.' + (process.argv.includes('--feature-test') ? ' Bible import/search/passages, XML, offline video library, native video playback/mute/pause/restart/blackout, PowerPoint conversion/navigation, persistence after reload.' : ''));
        app.exit(0);
      } catch (error) { require('node:fs').writeFileSync(path.join(app.getPath('temp'), 'promax-smoke-result.txt'), error.stack); app.exit(1); }
    } else control.show();
  }).catch(error => { if (smoke) require('node:fs').writeFileSync(path.join(app.getPath('temp'), 'promax-smoke-result.txt'), error.stack); console.error(error); app.exit(1); });
  app.on('before-quit',event=>{if(recovery&&!quitting){event.preventDefault();quitting=true;closePresentation();recovery.flush().catch(console.error).finally(()=>app.quit());}});
  app.on('window-all-closed', () => {if(!starting)app.quit();});
}
