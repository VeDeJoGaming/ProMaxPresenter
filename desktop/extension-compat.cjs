/* Electron 44's MV2 module scripts have a separate Chrome API world from
 * session preloads. Bridge only extension-origin pages, then initialize the
 * MIT-licensed electron-chrome-extensions API in each uBO module entry point.
 * The official extension files are copied locally; originals are never edited.
 */
const fs=require('node:fs/promises'),path=require('node:path');
function moduleBridge(main,patchRequests){
  if(globalThis.chrome?.browserAction||globalThis.chrome?.action){patchRequests();return;}
  const channel='promax-extension-api',pending=new Map(),listeners=new Map();let next=0;
  const send=value=>window.postMessage({channel,direction:'request',...value},location.origin);
  addEventListener('message',event=>{
    const value=event.data;if(event.source!==window||value?.channel!==channel)return;
    if(value.direction==='response'){pending.get(value.id)?.(value.result);pending.delete(value.id);}
    if(value.direction==='event')listeners.get(value.id)?.callback(...value.args);
  });
  if(!globalThis.electron)globalThis.electron={
    async invokeExtension(_extension,name,options={},...args){
      const callback=typeof args.at(-1)==='function'?args.pop():null;
      if(options.noop){callback?.(options.defaultResponse);return options.defaultResponse;}
      if(options.serialize)args=options.serialize(...args);
      const id=++next,result=await new Promise(resolve=>{pending.set(id,resolve);send({method:'invoke',id,name,args});});callback?.(result);return result;
    },
    addExtensionListener(_extension,name,callback){const id=++next;listeners.set(id,{name,callback});send({method:'listen',id,name});},
    removeExtensionListener(_extension,name,callback){for(const [id,item]of listeners)if(item.name===name&&item.callback===callback){listeners.delete(id);send({method:'unlisten',id,name});}},
    connectNative(){throw Error('Native messaging is not available in ProMax.');},
    disconnectNative(){}
  };
  main();
  globalThis.browser=globalThis.chrome;
  patchRequests();
}
function patchRequestTabs(){
  // Electron reports -1 for native Chrome webRequest tab IDs. Resolve the
  // actual YouTube WebContents ID from the tab API so uBO applies page filters
  // instead of treating all of YouTube as background extension traffic.
  const request=chrome.webRequest;if(!request||request.__promaxTabAdapter)return;
  const proxy={...request,__promaxTabAdapter:true};
  const tabs=new Map();let current=-1;
  const update=tab=>{if(tab?.id>0){tabs.set(tab.id,{...tabs.get(tab.id),...tab});if(/^https?:/.test(tab.url||''))current=tab.id;}};
  chrome.tabs.query({},values=>(values||[]).forEach(update));
  chrome.tabs.onCreated?.addListener(update);
  chrome.tabs.onUpdated?.addListener((id,change,tab)=>update({...tab,...change,id}));
  chrome.tabs.onRemoved?.addListener(id=>{tabs.delete(id);if(current===id)current=-1;});
  for(const name of ['onBeforeRequest','onBeforeSendHeaders','onSendHeaders','onHeadersReceived','onResponseStarted','onBeforeRedirect','onCompleted','onErrorOccurred']){
    const event=request[name];if(!event)continue;
    const add=event.addListener.bind(event),remove=event.removeListener.bind(event),wrapped=new WeakMap();
    const adapted={...event};
    adapted.addListener=(callback,...args)=>{
      if(args[0])args[0]=Object.fromEntries(Object.entries(args[0]).filter(([,value])=>value!==undefined));
      const listener=details=>{
        if(details.tabId<0&&!details.initiator?.startsWith('chrome-extension:')){
          const origin=details.initiator||(()=>{try{return new URL(details.url).origin;}catch{return '';}})();
          const matched=[...tabs.values()].find(tab=>{try{return new URL(tab.url).origin===origin;}catch{return false;}});
          const tabId=matched?.id||current;
          if(tabId>0)details={...details,tabId};
        }
        return callback(details);
      };
      wrapped.set(callback,listener);return add(listener,...args);
    };
    adapted.removeListener=callback=>remove(wrapped.get(callback)||callback);
    if(event.hasListener)adapted.hasListener=callback=>event.hasListener(wrapped.get(callback)||callback);
    proxy[name]=adapted;
  }
  Object.defineProperty(chrome,'webRequest',{value:proxy,enumerable:true,configurable:true});
  globalThis.browser=globalThis.chrome;
}
function preloadBridge(){
  const channel='promax-extension-api',listeners=new Map();
  addEventListener('message',async event=>{
    const value=event.data;
    if(event.source!==window||value?.channel!==channel||value.direction!=='request'||typeof value.name!=='string'||value.name.length>100)return;
    const extensionId=location.hostname;
    if(value.method==='invoke'&&Array.isArray(value.args)){
      const result=await invokeExtension(extensionId,value.name,{},...value.args);
      window.postMessage({channel,direction:'response',id:value.id,result},location.origin);
    }else if(value.method==='listen'&&!listeners.has(value.id)){
      const callback=(...args)=>window.postMessage({channel,direction:'event',id:value.id,args},location.origin);
      listeners.set(value.id,{name:value.name,callback});addExtensionListener(extensionId,value.name,callback);
    }else if(value.method==='unlisten'){
      const item=listeners.get(value.id);if(item){removeExtensionListener(extensionId,item.name,item.callback);listeners.delete(value.id);}
    }
  });
}
async function prepareCompatibility(folder){
  const source=(await fs.readFile(require.resolve('electron-chrome-extensions/preload'),'utf8')).replace('Object.freeze(chrome);','').replace('delete globalThis.electron;','');
  const start=source.indexOf('    function mainWorldScript() {'),end=source.indexOf('    if (!process.contextIsolated)');
  if(start<0||end<=start||!source.includes('      mainWorldScript();'))throw Error('Extension compatibility version changed.');
  const notice='/* Generated locally from electron-chrome-extensions 4.10.0, MIT, Copyright Samuel Maddock. */\n';
  // Keep ordinary extension pages on the library's contextBridge path. MV2
  // background modules initialize through a DOM message bridge instead.
  const patched=source.replace('      mainWorldScript();','      ('+preloadBridge.toString()+')();');
  await fs.mkdir(folder,{recursive:true});
  const preload=path.join(folder,'extension-api.preload.js');await fs.writeFile(preload,notice+patched);
  return {preload,module:notice+'('+moduleBridge.toString()+')('+source.slice(start,end).trim()+','+patchRequestTabs.toString()+');\n'};
}
async function adaptUBlock(folder,module){
  await fs.writeFile(path.join(folder,'promax-extension-api.js'),module);
  const pages=[];
  async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);if(entry.isDirectory())await scan(full);
    else if(entry.name.endsWith('.html')){
      const html=await fs.readFile(full,'utf8');
      const entries=[];
      for(const match of html.matchAll(/<script\b([^>]+)>/gi)){
        const attrs=match[1],src=attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
        if(!/\btype=["']module["']/i.test(attrs)||!src||src.includes(':'))continue;
        const target=path.resolve(dir,src),relative=path.relative(folder,target);
        if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Invalid extension module path.');entries.push(target);
      }
      if(entries.length)pages.push({file:full,html,entries});
    }
  }}
  await scan(folder);
  if(!pages.some(page=>page.entries.includes(path.join(folder,'js','start.js'))))throw Error('This uBlock Origin version needs a newer ProMax adapter.');
  // Chromium module worlds in Electron do not share all native extension
  // bindings with classic scripts. Bundle each page's module graph once and
  // run it as a deferred classic script, retaining top-level await in an IIFE.
  if(require('electron').app.isPackaged){
    const binary=path.join(process.resourcesPath,'app.asar.unpacked','node_modules','@esbuild',process.platform+'-'+process.arch,process.platform==='win32'?'esbuild.exe':'bin/esbuild');
    await fs.access(binary);process.env.ESBUILD_BINARY_PATH=binary;
  }
  const esbuild=require('esbuild');let index=0;
  for(const page of pages){
    const imports=[path.join(folder,'promax-extension-api.js'),...page.entries];
    let contents=imports.map(file=>'import '+JSON.stringify('./'+path.relative(folder,file).replaceAll('\\','/'))+';').join('\n');
    if(page.entries.includes(path.join(folder,'js','start.js')))contents+='\nimport core from "./js/background.js";globalThis.µBlock=core;';
    const result=await esbuild.build({stdin:{contents,resolveDir:folder,sourcefile:'promax-extension-entry.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'chrome140',logLevel:'silent',plugins:[{name:'extension-root',setup(build){build.onResolve({filter:/^\//},args=>({path:path.join(folder,args.path)}));}}]});
    const name='promax-page-'+ ++index+'.js';
    await fs.writeFile(path.join(folder,name),'/* Local ProMax compatibility bundle; upstream uBlock Origin remains GPL-3.0. */\n(async()=>{\n'+result.outputFiles[0].text+'\n})().catch(console.error);');
    let inserted=false;
    const html=page.html.replace(/<script\b([^>]*)>\s*<\/script>/gi,(tag,attrs)=>{
      if(!/\btype=["']module["']/i.test(attrs))return tag;
      if(inserted)return '';inserted=true;
      return '<script defer src="'+path.relative(path.dirname(page.file),path.join(folder,name)).replaceAll('\\','/')+'"></script>';
    });
    await fs.writeFile(page.file,html);
  }
}
module.exports={prepareCompatibility,adaptUBlock};
