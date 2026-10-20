const {WebContentsView,session}=require('electron');
const presentationScript=require('node:fs').readFileSync(require('node:path').join(__dirname,'youtube-presentation-page.js'),'utf8');

function createYouTubeBrowser({getControl,getPresentation,onStatus}){
  let view=null,owner=null,entry=null,bounds=null,live=false,blackout=false,presentationReady=false,lastCommand=null,prepareTimer=null,poll=null,requestedState=null;
  const allowed=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['youtube.com','www.youtube.com','m.youtube.com','youtu.be','accounts.google.com','consent.youtube.com','consent.google.com'].includes(u.hostname);}catch{return false;}};
  const execute=code=>view&&!view.webContents.isDestroyed()&&view.webContents.getURL()?view.webContents.executeJavaScript(code,true).catch(()=>null):Promise.resolve(null);
  function transfer(window){
    if(!view||!window||window.isDestroyed())return;
    if(owner!==window){if(owner&&!owner.isDestroyed())owner.contentView.removeChildView(view);window.contentView.addChildView(view);owner=window;}
  }
  function layout(show=true){
    if(!view)return;
    if(live){const win=getPresentation();if(!win||win.isDestroyed())return;transfer(win);const [width,height]=win.getContentSize();view.setBounds({x:0,y:0,width,height});view.setVisible(show&&presentationReady&&!requestedState?.black);}
    else{transfer(getControl());view.setVisible(!!bounds);if(bounds)view.setBounds(bounds);}
  }
  async function pause(){if(view){view.webContents.setAudioMuted(true);await execute("(document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video'))?.pause()");}}
  async function park(){
    live=false;blackout=false;presentationReady=false;lastCommand=null;
    const paused=pause();
    await execute('window.__promaxRestorePlayer?.()');
    layout();await paused;
  }
  async function prepare(value){
    if(!/^[\w-]{11}$/.test(value.videoId||''))throw Error('Invalid YouTube video.');
    if(!view){
      const isolated=session.fromPartition('persist:promax-youtube-browser');
      isolated.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
      view=new WebContentsView({webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
      view.webContents.setWindowOpenHandler(({url})=>{if(allowed(url))view.webContents.loadURL(url).catch(()=>{});return {action:'deny'};});
      view.webContents.on('will-navigate',(event,url)=>{
        if(!allowed(url)){event.preventDefault();return;}
        // YouTube may reload solely to update its colour theme when the view
        // changes windows. Preserve the loaded video and its buffer instead.
        const next=new URL(url),current=new URL(view.webContents.getURL()||'https://www.youtube.com');
        if(next.searchParams.has('themeRefresh')){next.searchParams.delete('themeRefresh');current.searchParams.delete('themeRefresh');if(next.href===current.href)event.preventDefault();}
      });
      poll=setInterval(async()=>{
        if(!entry)return;
        const info=await execute(`(()=>{const v=document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video');if(!v)return null;let buffered=0;for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=v.currentTime&&v.buffered.end(i)>=v.currentTime)buffered=v.buffered.end(i)-v.currentTime;return {position:v.currentTime,quality:v.videoHeight? v.videoHeight+'p':'Loading',buffered:Math.round(buffered),paused:v.paused,ready:v.readyState>=2};})()`);
        if(info)onStatus({id:entry.id,type:'browser',...info,isOutput:live});
      },1000);
    }
    if(entry?.videoId===value.videoId&&entry?.start===value.start){entry={...value};layout();return {prepared:true};}
    clearTimeout(prepareTimer);await park();entry={...value,start:Math.max(0,Math.min(Number(value.start)||0,86400))};
    view.webContents.setAudioMuted(true);layout();
    await view.webContents.loadURL(`https://www.youtube.com/watch?v=${entry.videoId}&t=${entry.start}s`);
    const videoId=entry.videoId;
    // Warm up the real page's video in the operator's preview, with audio muted.
    await execute("(document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video'))?.play().catch(()=>{})");
    prepareTimer=setTimeout(async()=>{
      if(live||entry?.videoId!==videoId)return;
      await execute(`(()=>{const v=document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video');if(v){v.pause();v.currentTime=${entry.start};}})()`);
      onStatus({id:entry.id,type:'browser-prepared',isOutput:false});
    },10000);
    return {prepared:true};
  }
  function setBounds(value){
    if(value&&[value.x,value.y,value.width,value.height].every(Number.isFinite)&&value.width>=200&&value.height>=200){bounds={x:Math.max(0,Math.round(value.x)),y:Math.max(0,Math.round(value.y)),width:Math.round(value.width),height:Math.round(value.height)};}else bounds=null;
    layout();
  }
  async function sync(state){
    const cue=state.youtube;
    if(!cue?.nativeBrowser){if(live)await park();return;}
    if(!view||entry?.id!==cue.id)return;
    if(state.black){blackout=true;await pause();if(view)view.setVisible(false);return;}
    const resumeAfterBlack=blackout;blackout=false;
    clearTimeout(prepareTimer);live=true;presentationReady=false;layout(false);
    const result=await execute(presentationScript);
    if(!result?.ready){await park();throw Error('YouTube video is not ready to show. Wait for the browser preview and try again.');}
    if(requestedState?.black||!requestedState?.youtube?.nativeBrowser)return;
    presentationReady=true;
    view.setVisible(true);
    view.webContents.setAudioMuted(!!cue.muted);
    if(lastCommand!==cue.command){
      lastCommand=cue.command;
      await execute(`(()=>{const v=document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video');if(!v)return;${cue.restart?'v.currentTime='+entry.start+';':''}${cue.paused?'v.pause();':'v.play().catch(()=>{});'}})()`);
    }else if(resumeAfterBlack&&!cue.paused)await execute("(document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video'))?.play().catch(()=>{})");
  }
  async function command(action){
    if(action==='pause'){await execute("(()=>{const v=document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video');if(v){if(v.paused)v.play().catch(()=>{});else v.pause();}})()");}
    if(action==='restart')await execute(`(()=>{const v=document.querySelector('[data-promax-presentation] video')||document.querySelector('#movie_player video');if(v){v.currentTime=${entry?.start||0};v.play().catch(()=>{});}})()`);
  }
  function destroy(){clearTimeout(prepareTimer);clearInterval(poll);if(view&&!view.webContents.isDestroyed())view.webContents.close();view=null;owner=null;}
  function immediate(state){requestedState=state;if(view&&live&&(state.black||!state.youtube?.nativeBrowser)){view.setVisible(false);view.webContents.setAudioMuted(true);}}
  return {prepare,setBounds,sync,park,command,destroy,immediate,resize:layout,getView:()=>view};
}
module.exports={createYouTubeBrowser};
