const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {BrowserWindow,session,webContents}=require('electron');
const {ElectronChromeExtensions}=require('electron-chrome-extensions');
const {prepareCompatibility,adaptUBlock}=require('./extension-compat.cjs');
async function createBrowserExtensions({userData,getControl,isPresenting}){
  const root=path.join(userData,'browser-extensions'),config=path.join(root,'installed.json');
  const isolated=session.fromPartition('persist:promax-youtube-browser');
  const compatibility=await prepareCompatibility(path.join(root,'runtime'));
  const windows=new Set();
  const validURL=value=>{try{const u=new URL(value);return ['https:','chrome-extension:'].includes(u.protocol);}catch{return false;}};
  async function createTab(details){
    if(isPresenting())throw Error('Turn off Presentation before opening extension settings.');
    if(!validURL(details.url))throw Error('Unsupported extension page.');
    const win=new BrowserWindow({width:1000,height:760,parent:getControl()||undefined,show:false,autoHideMenuBar:true,webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true}});
    windows.add(win);win.on('closed',()=>windows.delete(win));
    win.webContents.setWindowOpenHandler(({url})=>{if(validURL(url))createTab({url}).catch(()=>{});return {action:'deny'};});
    win.webContents.on('will-navigate',(event,url)=>{if(!validURL(url))event.preventDefault();});
    api.addTab(win.webContents,win);try{await win.loadURL(details.url);win.show();return [win.webContents,win];}catch(error){win.close();throw error;}
  }
  const api=new ElectronChromeExtensions({session:isolated,createTab,selectTab:(tab,win)=>{if(!isPresenting())win.show();},removeTab:tab=>{for(const win of windows)if(win.webContents===tab)win.close();}});
  const frame=isolated.getPreloadScripts().find(p=>p.id==='crx-mv2-preload');if(frame)isolated.unregisterPreloadScript(frame.id);
  isolated.registerPreloadScript({id:'promax-extension-api',type:'frame',filePath:compatibility.preload});
  isolated.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  let records=[],busy=false;
  try{const saved=JSON.parse(await fs.readFile(config,'utf8'));if(Array.isArray(saved))records=saved.filter(r=>/^[a-f0-9-]{36}$/.test(r.key)&&typeof r.name==='string').map(r=>({...r,loaded:false,error:null}));}catch(error){if(error.code!=='ENOENT')console.warn('Could not restore browser extension list:',error.message);}
  const directory=record=>path.join(root,record.key);
  const save=async()=>{await fs.writeFile(config+'.tmp',JSON.stringify(records.map(({key,name,version,enabled})=>({key,name,version,enabled})),null,2));await fs.rename(config+'.tmp',config);};
  async function load(record){try{
    const extension=await isolated.extensions.loadExtension(directory(record));record.extensionId=extension.id;
    if(extension.manifest.background&&!extension.manifest.background.service_worker){
      const deadline=Date.now()+5000;
      while(Date.now()<deadline){
        const background=webContents.getAllWebContents().find(w=>w.session===isolated&&w.getType()==='backgroundPage'&&w.getURL().startsWith('chrome-extension://'+extension.id+'/'));
        if(background&&!background.isLoading())break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
    }
    if(record.name==='uBlock Origin'){
      let ready=false;const deadline=Date.now()+15000;
      while(Date.now()<deadline){
        const background=webContents.getAllWebContents().find(w=>w.session===isolated&&w.getURL()==='chrome-extension://'+extension.id+'/background.html');
        if(background){
          let timeout;
          try{ready=await Promise.race([background.executeJavaScript('typeof µBlock!=="undefined"&&µBlock.readyToFilter===true&&typeof vAPI.net?.suspendableListener==="function"').catch(()=>false),new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),500);})]);}finally{clearTimeout(timeout);}
        }
        if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));
      }
      if(!ready){isolated.extensions.removeExtension(extension.id);throw Error('uBlock Origin did not finish starting. Check your connection and enable it again.');}
    }
    record.loaded=true;record.error=null;
  }catch(error){record.loaded=false;record.error=error.message;}}
  for(const record of records)if(record.enabled)await load(record);
  const state=()=>({items:records.map(({key,name,version,enabled,loaded,error})=>({key,name,version,enabled,loaded,error})),busy});
  async function installFolder(folder){
    const source=await fs.realpath(folder),relativeRoot=path.relative(source,root);
    if(!relativeRoot||(!relativeRoot.startsWith('..')&&!path.isAbsolute(relativeRoot)))throw Error('Choose the extension folder itself, not an app data or parent folder.');
    const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
    if(![2,3].includes(manifest.manifest_version)||typeof manifest.name!=='string'||typeof manifest.version!=='string')throw Error('Choose an unpacked Chrome extension folder containing manifest.json.');
    const ublock=manifest.name==='uBlock Origin'&&manifest.manifest_version===2;
    if(records.some(r=>r.name===manifest.name))throw Error('This extension is already installed. Remove it before adding another version.');
    const record={key:crypto.randomUUID(),name:manifest.name,version:manifest.version,enabled:true,loaded:false,error:null};
    const destination=directory(record);
    await fs.cp(folder,destination,{recursive:true,filter:async source=>{const stat=await fs.lstat(source);if(stat.isSymbolicLink())throw Error('Extension folders cannot contain links.');return true;}});
    try{
      if(ublock)await adaptUBlock(destination,compatibility.module);
      await load(record);if(!record.loaded)throw Error(record.error);
      records.push(record);await save();return state();
    }catch(error){if(record.extensionId)isolated.extensions.removeExtension(record.extensionId);records=records.filter(r=>r!==record);/* Keep failed local files for diagnosis; never touch the source folder. */throw error;}
  }
  async function downloadUBlock(){
    const response=await fetch('https://api.github.com/repos/gorhill/uBlock/releases/latest',{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Could not find the official uBlock Origin download.');
    const release=await response.json(),asset=release.assets?.find(a=>a.name.endsWith('.chromium.zip'));
    if(!asset||!asset.browser_download_url.startsWith('https://github.com/gorhill/uBlock/releases/download/')||asset.size>30000000||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw Error('The official uBlock Origin download could not be verified.');
    const download=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(60000)});if(!download.ok)throw Error('uBlock Origin download failed.');
    const bytes=Buffer.from(await download.arrayBuffer());if(bytes.length!==asset.size||'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')!==asset.digest)throw Error('uBlock Origin download checksum did not match.');
    const staging=await fs.mkdtemp(path.join(root,'download-')),zip=path.join(staging,'ublock.zip');await fs.writeFile(zip,bytes);
    await require('extract-zip')(zip,{dir:path.join(staging,'unpacked')});
    return installFolder(path.join(staging,'unpacked','uBlock0.chromium'));
  }
  async function command(action,input){
    if(action==='list')return state();
    if(isPresenting())throw Error('Turn off Presentation before changing browser extensions.');
    if(busy)throw Error('An extension operation is already running.');busy=true;
    try{
      if(action==='install-ublock')return await downloadUBlock();
      if(action==='add-folder')return await installFolder(input.folder);
      const record=records.find(r=>r.key===input?.key);if(!record)throw Error('Extension not found.');
      if(action==='enabled'){
        if(input.enabled&&!record.loaded)await load(record);
        else if(!input.enabled&&record.extensionId){isolated.extensions.removeExtension(record.extensionId);record.loaded=false;}
        record.enabled=!!input.enabled;await save();
      }else if(action==='remove'){
        if(record.extensionId)isolated.extensions.removeExtension(record.extensionId);records=records.filter(r=>r!==record);await save();
      }else if(action==='options'){
        const extension=isolated.extensions.getExtension(record.extensionId),page=extension?.manifest.options_ui?.page||extension?.manifest.options_page;
        if(!page)throw Error('Enable the extension to open its settings.');await createTab({url:'chrome-extension://'+record.extensionId+'/'+page});
      }else throw Error('Unknown extension action.');
      return state();
    }finally{busy=false;}
  }
  // Every tab belongs only to the dedicated YouTube session. The song library
  // and sharing windows never enter this extension system.
  const registerTab=(contents,window)=>{api.addTab(contents,window);api.selectTab(contents);};
  return {session:isolated,command,registerTab,close:()=>{for(const win of windows)win.close();},getState:state};
}
module.exports={createBrowserExtensions};
