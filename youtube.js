(() => {
  const pools=new WeakMap();
  let endpoint;
  const getEndpoint=()=>endpoint||(endpoint=window.promaxDesktop?window.promaxDesktop.youtubeHost():Promise.resolve(new URL('youtube-player.html',location.href).href));
  function pool(doc){
    if(pools.has(doc))return pools.get(doc);
    const holder=doc.createElement('div');holder.style.cssText='position:fixed;left:-2000px;top:0;width:640px;height:360px;pointer-events:none';doc.body.append(holder);
    const p={holder,entries:new Map()};pools.set(doc,p);
    doc.defaultView.addEventListener('message',event=>{
      const entry=[...p.entries.values()].find(e=>e.frame.contentWindow===event.source);
      if(!entry||!event.data?.promaxYouTube||event.data.videoId!==entry.cue.videoId||event.origin!==entry.origin)return;
      const data=event.data;entry.status=data.type==='position'?entry.status:data.type;
      if(Number.isFinite(data.position))entry.position=data.position;
      if(data.type==='ready')entry.ready=true;
      if(data.type==='ready'&&entry.pending){post(entry,entry.pending);entry.pending=null;}
      if(entry.active&&entry.cue.loop&&data.type==='ended')post(entry,{action:'play',position:entry.cue.start||0,muted:entry.cue.muted,paused:false});
      doc.dispatchEvent(new doc.defaultView.CustomEvent('promax-youtube-status',{detail:{id:entry.cue.id,videoId:entry.cue.videoId,...data}}));
    });return p;
  }
  function post(entry,data){
    if(!entry.origin||!entry.ready){entry.pending=data;return;}
    entry.frame.contentWindow.postMessage({promaxYouTube:true,videoId:entry.cue.videoId,...data},entry.origin);
  }
  function ensure(doc,cue){
    const p=pool(doc),key=cue.videoId+':'+(cue.start||0);if(p.entries.has(key))return p.entries.get(key);
    const frame=doc.createElement('iframe');frame.title=cue.title||'YouTube video';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.style.cssText='width:100%;height:100%;border:0';frame.dataset.youtube='true';
    const entry={frame,cue,status:'loading',ready:false,position:cue.start||0,active:false};p.entries.set(key,entry);p.holder.append(frame);
    getEndpoint().then(base=>{if(!frame.isConnected)return;const url=new URL(base);url.searchParams.set('videoId',cue.videoId);url.searchParams.set('start',cue.start||0);entry.origin=url.origin;frame.src=url.href;}).catch(()=>{entry.status='error';});
    return entry;
  }
  function warm(doc,cue){
    if(cue)ensure(doc,cue);
    const p=pools.get(doc);if(!p)return;
    // Keep the active player and only one upcoming player to limit bandwidth.
    for(const [key,entry] of p.entries)if(!entry.active&&(!cue||key!==cue.videoId+':'+(cue.start||0))){post(entry,{action:'pause'});entry.frame.remove();p.entries.delete(key);}
  }
  function release(doc){const p=pools.get(doc);if(!p)return;for(const entry of p.entries.values())if(entry.active){entry.resumeCommand=entry.command;entry.resumePosition=entry.position;post(entry,{action:'pause'});entry.active=false;entry.command=null;move(p.holder,entry.frame);}}
  function move(container,frame){if(container.moveBefore&&frame.isConnected&&container.isConnected)container.moveBefore(frame,null);else container.append(frame);}
  function render(doc,container,value,isOutput){
    if(!isOutput){if(!value.youtube||value.black)return false;
      const key='youtube:'+value.youtube.id;
      if(container.dataset.mediaKey!==key){window.ProMaxPlayback?.clear(doc,container);container.replaceChildren();const label=doc.createElement('div');label.className='screen-text';container.append(label);container.dataset.mediaKey=key;}
      container.style.background='#000';container.querySelector('.screen-text').textContent=value.youtube.title+'\n\n'+(value.youtube.paused?'Paused':'YouTube on presentation display');return true;
    }
    if(value.youtube?.nativeBrowser){release(doc);return false;}
    if(!value.youtube||value.black){release(doc);warm(doc,value.prepareYouTube);return false;}
    const cue=value.youtube,entry=ensure(doc,cue);entry.cue=cue;
    if(entry.frame.parentNode!==container){release(doc);window.ProMaxPlayback?.clear(doc,container);container.replaceChildren();move(container,entry.frame);delete container.dataset.mediaKey;}
    entry.active=true;container.style.background='#000';
    if(entry.command!==cue.command){entry.command=cue.command;const position=entry.resumeCommand===cue.command?entry.resumePosition:cue.position;entry.resumeCommand=null;post(entry,{action:'play',paused:cue.paused,muted:cue.muted,position});}
    return true;
  }
  function preview(container,cue){const entry=ensure(container.ownerDocument,cue);if(entry.active)return;move(container,entry.frame);return entry;}
  function pauseAll(doc){const p=pools.get(doc);if(p)for(const entry of p.entries.values())post(entry,{action:'pause'});}
  function park(doc){const p=pools.get(doc);if(p)for(const entry of p.entries.values())if(!entry.active&&entry.frame.parentNode!==p.holder)move(p.holder,entry.frame);}
  window.ProMaxYouTube={warm,render,release,preview,pauseAll,park,position:(doc,cue)=>pools.get(doc)?.entries.get(cue.videoId+':'+(cue.start||0))?.position};
})();
