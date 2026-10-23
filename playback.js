(function () {
  const pools=new WeakMap();
  function pool(doc) {
    if (!pools.has(doc)) { const holder=doc.createElement('div');holder.hidden=true;doc.body.append(holder);pools.set(doc,{holder,videos:new Map()}); }
    return pools.get(doc);
  }
  function warm(doc, urls) {
    const p=pool(doc);
    const upcoming=(urls||[]).slice(0,3);
    for (const url of upcoming) if (!p.videos.has(url)) {
      const video=doc.createElement('video');video.src=url;video.preload='auto';video.muted=true;video.playsInline=true;
      p.videos.set(url,video);p.holder.append(video);video.load();
    }
    for (const [url,video] of p.videos) if (!upcoming.includes(url) && video.parentNode===p.holder) {
      video.pause();video.removeAttribute('src');video.load();video.remove();p.videos.delete(url);
    }
  }
  function release(doc,container) {
    const p=pool(doc);
    for (const video of container.querySelectorAll('video[data-cue]')) { video.pause();video.muted=true;delete video.dataset.command;p.holder.append(video); }
  }
  function clear(doc,container){
    release(doc,container);
    for(const video of container.querySelectorAll('video')){video.pause();video.muted=true;video.removeAttribute('src');video.load();}
    for(const canvas of container.querySelectorAll('canvas'))canvas.stop?.();
  }
  function render(doc,container,state,isOutput) {
    if (state.black || (!state.video && !state.image)) { release(doc,container);return false; }
    const key=state.video?.url || state.image;
    if (container.dataset.cueKey!==key || !container.querySelector('[data-cue]')) {
      clear(doc,container);container.replaceChildren();container.dataset.cueKey=key;delete container.dataset.mediaKey;
      if (state.image) { const image=doc.createElement('img');image.src=state.image;image.className='media document-image';image.dataset.cue='image';image.style.objectFit='contain';container.append(image); }
      else { const p=pool(doc);let video=p.videos.get(key);if (!video) { warm(doc,[key,...p.videos.keys()]);video=p.videos.get(key); }
        video.preload='auto';video.className='media';video.style.objectFit='contain';video.dataset.cue='video';container.append(video);
      }
    }
    container.style.background='#000';
    if (state.video) {
      const cue=state.video, video=container.querySelector('video');
      video.loop=cue.loop;video.muted=!isOutput || cue.muted;
      if (video.dataset.command!==String(cue.command)) {
        video.dataset.command=String(cue.command);
        const synchronize=()=>{
          if (!video.isConnected || video.dataset.command!==String(cue.command)) return;
          const position=cue.position+(cue.paused?0:Math.max(0,(Date.now()-cue.at)/1000));
          video.currentTime=Number.isFinite(video.duration) && video.duration>0 ? (cue.loop?position%video.duration:Math.min(position,video.duration)) : position;
          if (cue.paused) video.pause();else video.play().catch(()=>{});
        };
        if (video.readyState>=1) synchronize();else video.addEventListener('loadedmetadata',synchronize,{once:true});
      }
      if (cue.paused) video.pause();else if (video.paused) video.play().catch(()=>{});
    }
    return true;
  }
  function fit(container) {
    const text=container.querySelector('.screen-text');if (!text || !container.clientHeight) return;
    const size=parseFloat(text.ownerDocument.defaultView.getComputedStyle(text).fontSize);
    const minimum=container.id==='preview'?5:12;
    const height=container.clientHeight*.88,width=container.clientWidth*.94;
    const fits=()=>text.scrollHeight<=height&&text.scrollWidth<=width;
    if(!Number.isFinite(size)||size<=minimum||fits())return;
    // Binary search avoids hundreds of forced layouts for a long Bible passage.
    let low=minimum,high=size;
    while(high-low>.5){const middle=(low+high)/2;text.style.fontSize=middle+'px';if(fits())low=middle;else high=middle;}
    text.style.fontSize=(Math.floor(low*2)/2)+'px';
  }
  function renderText(text, state) {
    const passage=state.biblePassage;
    const key=JSON.stringify([state.text,passage]);
    if(text.dataset.textKey===key)return false;
    text.dataset.textKey=key;text.replaceChildren();
    if(!passage){text.textContent=state.text;return true;}
    const doc=text.ownerDocument;
    passage.verses.forEach((verse,index)=>{
      if(index)text.append(doc.createTextNode('\n\n'));
      const number=doc.createElement('span');number.className='verse-number';
      number.textContent=String(verse.verse);
      number.style.cssText='font-size:.55em;vertical-align:super;line-height:0;margin-right:.35em';
      text.append(number,doc.createTextNode(' '+verse.text));
    });
    text.append(doc.createTextNode('\n\n'+passage.reference));
    return true;
  }
  const entrances=new WeakMap();
  function renderLiveText(text,state){
    const hadText=!!text.textContent.trim();
    const previousKey=text.dataset.textKey;
    const nextKey=JSON.stringify([state.text,state.biblePassage]);
    if(previousKey===nextKey)return false;
    const parent=text.parentNode,win=text.ownerDocument.defaultView;
    let ghost=null;
    if(hadText&&parent){
      const style=win.getComputedStyle(text);
      ghost=text.cloneNode(true);ghost.className='text-outgoing';ghost.removeAttribute('id');ghost.setAttribute('aria-hidden','true');
      ghost.style.cssText=`position:absolute;pointer-events:none;z-index:2;left:${text.offsetLeft}px;top:${text.offsetTop}px;width:${text.clientWidth}px;height:${text.clientHeight}px;opacity:${style.opacity}`;
      for(const property of ['font','letter-spacing','line-height','color','text-shadow','white-space','text-align','word-break','overflow-wrap'])ghost.style.setProperty(property,style.getPropertyValue(property));
      parent.append(ghost);
    }
    if(!renderText(text,state))return false;
    entrances.get(text)?.cancel();entrances.delete(text);
    if(!text.textContent.trim()){
      for(const old of parent?.querySelectorAll('.text-outgoing')||[]){old.getAnimations().forEach(a=>a.cancel());old.remove();}
    }else{
      if(ghost){const fade=ghost.animate?.([{opacity:Number(ghost.style.opacity)},{opacity:0}],{duration:450,easing:'ease-in-out',fill:'forwards'});if(fade){fade.onfinish=()=>ghost.remove();fade.oncancel=()=>ghost.remove();}else ghost.remove();}
      const animation=text.animate?.([{opacity:0},{opacity:1}],{duration:hadText?450:650,easing:'ease-in-out'});
      if(animation)entrances.set(text,animation);
    }
    return true;
  }
  window.ProMaxPlayback={warm,render,fit,renderText,renderLiveText,release,clear};
})();
