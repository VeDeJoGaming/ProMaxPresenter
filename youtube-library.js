(() => {
  let entries=[],prepared=null,onlyEntry=null,command=0;
  const statuses=new Map(),outputPositions=new Map(),browserInfo=new Map();
  const nativeBrowser=!!window.promaxDesktop?.prepareYouTubeBrowser;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const button=(text,action)=>{const b=node('button',text);b.type='button';b.onclick=action;return b;};
  async function persist(){await storedAsset('put',entries,'youtube-list');}
  function refresh(){ProMaxFeatures.showTab('videos',{preserveFocus:true});window.ProMaxMeetings?.render();}
  async function add(url,title){
    const parsed=ProMaxYouTubeLinks.parse(url),entry={...parsed,id:uid(),title:title.trim()||'YouTube · '+parsed.videoId};
    const next=[...entries,entry];await storedAsset('put',next,'youtube-list');entries=next;await prepare(entry);return entry;
  }
  async function prepare(entry){
    prepared=entry;
    if(nativeBrowser&&!entry.localAssetId){browserInfo.delete(entry.id);statuses.set(entry.id,'Opening browser…');}
    if(state.youtube?.nativeBrowser){state={text:'',black:false,pdf:null};paint();}
    ProMaxYouTube.warm(document,entry.localAssetId||nativeBrowser?null:entry);refresh();paint();
    if(nativeBrowser)document.querySelector('[data-native-youtube-preview]')?.scrollIntoView({block:'center'});
    if(nativeBrowser&&!entry.localAssetId){try{await window.promaxDesktop.prepareYouTubeBrowser(entry);window.ProMaxYouTubeBrowserUI?.update();}catch(error){notify('Could not open YouTube: '+error.message);}}
  }
  async function play(entry){
    if(entry.localAssetId){const asset=ProMaxFeatures.getVideos().find(a=>a.id===entry.localAssetId);if(!asset){notify('The local copy is missing. Attach it again before presenting.');return;}await ProMaxFeatures.playVideo(asset,{start:entry.start,meetingContext:window.ProMaxMeetings?.cueContext('youtube',entry.id)});return;}
    if(window.promaxDesktop&&!nativeOutputActive){prepare(entry);notify('Turn on Presentation before showing this YouTube video.');return;}
    if(nativeBrowser){if(prepared?.id!==entry.id)await prepare(entry);if(!browserInfo.get(entry.id)?.ready){notify('Wait for the video to load in the browser preview. Choose its quality there before showing it.');return;}}
    prepared=entry;stopTimer();ProMaxFeatures.externalCue();ProMaxYouTube.pauseAll(document);
    state={text:'',black:false,pdf:null,youtube:{...entry,nativeBrowser,position:entry.start||0,paused:false,muted:false,loop:false,command:++command}};
    window.ProMaxMeetings?.trackCue(ProMaxMeetings.cueContext('youtube',entry.id));
    $('live-label').textContent=entry.title;paint();refresh();
  }
  function control(action){
    const cue=state.youtube;if(!cue)return;
    const position=outputPositions.get(cue.id)??ProMaxYouTube.position(document,cue)??cue.position;
    state.youtube={...cue,position:action==='restart'?cue.start||0:position,restart:action==='restart',paused:action==='pause'?!cue.paused:cue.paused,command:++command};
    if(action==='stop'){state={text:'',black:false,pdf:null};$('live-label').textContent='Nothing live';}
    paint();refresh();
  }
  async function attach(entry,file){
    const previous=new Set(ProMaxFeatures.getVideos().map(a=>a.id));
    await ProMaxFeatures.addVideos([file]);const asset=ProMaxFeatures.getVideos().find(a=>!previous.has(a.id));
    if(!asset)throw Error('Choose a playable local video file.');
    entry.localAssetId=asset.id;await persist();refresh();notify('Local copy attached. This entry now uses the local video.');
  }
  function render(view){
    window.ProMaxControls?.changed();
    const section=node('section');section.className='youtube-library';if(!onlyEntry)section.append(node('h2','YouTube'));
    section.append(node('p',onlyEntry?'Prepare the video silently and choose its quality. Show it on presentation when you are ready.':nativeBrowser?'Prepare opens regular YouTube, plays silently for about 10 seconds, then pauses at the start. Select quality with the player’s gear menu. The same browser moves to the presentation display without reloading. Ads and buffering may still occur.':'Prepare the player before the meeting. YouTube needs internet; ads and buffering may occur. Attach a local video file for ad-free playback.'));
    const form=node('form');form.className='youtube-add';
    const link=node('input');link.type='url';link.required=true;link.placeholder='Paste YouTube video link…';link.setAttribute('aria-label','YouTube video link');link.id='youtube-link';
    const title=node('input');title.placeholder='Name (optional)';title.setAttribute('aria-label','YouTube video name');title.id='youtube-title';
    const submit=node('button','Add video');submit.type='submit';
    form.append(link,title,submit);form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await add(link.value,title.value);}catch(error){notify(error.message);submit.disabled=false;}};if(!onlyEntry)section.append(form);
    for(const entry of entries.filter(e=>!onlyEntry||e.id===onlyEntry)){
      const card=node('div');card.className='youtube-card';card.dataset.youtubeId=entry.id;
      const heading=node('div');heading.className='youtube-card-heading';heading.append(node('strong',entry.title));
      const status=node('small');status.dataset.youtubeStatus=entry.id;status.textContent=entry.localAssetId?'Local copy · No YouTube ads':statuses.get(entry.id)||'Not prepared';heading.append(status);card.append(heading);
      const actions=node('div');actions.className='feature-actions';actions.append(button('Prepare',()=>prepare(entry)),button(entry.localAssetId?'Play local copy':'Show on presentation',()=>play(entry)),...(!onlyEntry?[button('＋ Meeting',()=>window.ProMaxMeetings?.add({type:'youtube',assetId:entry.id,title:entry.title}))]:[]));
      const local=node('label','Attach local copy');local.className='button';const input=node('input');input.type='file';input.accept='video/*,.mp4,.webm,.mov,.m4v';input.hidden=true;input.onchange=async()=>{try{if(input.files[0])await attach(entry,input.files[0]);}catch(error){notify(error.message);}};local.append(input);actions.append(local);if(!onlyEntry)actions.append(button('Remove',async()=>{try{await remove(entry.id);}catch{notify('Could not remove this YouTube entry.');}}));card.append(actions);
      if(prepared?.id===entry.id&&!entry.localAssetId){const preview=node('div');preview.className='youtube-preparation';if(nativeBrowser){preview.dataset.nativeYoutubePreview=entry.id;preview.textContent='Opening YouTube browser…';}else preview.dataset.youtubePreview=entry.id;card.append(preview);}
      section.append(card);
    }
    if(state.youtube&&(!onlyEntry||state.youtube.id===onlyEntry)){const controls=node('div');controls.className='feature-actions';controls.append(button(state.youtube.paused?'Resume YouTube':'Pause YouTube',()=>control('pause')),button('Restart YouTube',()=>control('restart')),button('Stop YouTube',()=>control('stop')));section.append(controls);}
    view.append(section);
    for(const preview of section.querySelectorAll('[data-youtube-preview]'))ProMaxYouTube.preview(preview,entries.find(e=>e.id===preview.dataset.youtubePreview));
    window.ProMaxYouTubeBrowserUI?.update();
  }
  document.addEventListener('promax-youtube-status',event=>{
    const data=event.detail;
    if(data.type==='error'&&data.code==='browser'&&data.message){notify(data.message);if(state.youtube?.nativeBrowser){state={text:'',black:true,pdf:null};paint();}return;}
    if(data.type==='browser')browserInfo.set(data.id,data);
    if(data.type==='browser'&&data.isOutput&&!state.black&&state.youtube?.nativeBrowser&&state.youtube.id===data.id)state.youtube.paused=data.paused;
    if(data.isOutput&&Number.isFinite(data.position))outputPositions.set(data.id,data.position);
    if(data.isOutput&&data.type==='ended'&&state.youtube?.id===data.id&&!state.youtube.loop){state={text:'',black:false,pdf:null};paint();refresh();}
    if(entries.find(e=>e.id===data.id)?.localAssetId)return;
    const errors={100:'Video unavailable or private',101:'Embedding disabled by the video owner',150:'Embedding disabled by the video owner',153:'YouTube could not identify the app',network:'Cannot connect to YouTube'};
    const label=data.type==='error'?(errors[data.code]||'YouTube playback failed'):data.type==='browser'?`${data.quality} · ${data.buffered} s buffered · ${data.paused?'Paused':data.isOutput?'Playing on output':'Playing silently'}`:data.type==='browser-prepared'?'Preview finished · Choose quality in the player':data.type==='ready'?'Player ready · Video may still buffer':data.type==='blocked'?'Playback blocked · Use the player’s Play button':data.type==='buffering'?'Buffering…':data.type==='position'?null:data.type;
    if(label){statuses.set(data.id,label);for(const e of document.querySelectorAll('[data-youtube-status]'))if(e.dataset.youtubeStatus===data.id)e.textContent=label;}
  });
  window.promaxDesktop?.onYouTubeStatus(data=>document.dispatchEvent(new CustomEvent('promax-youtube-status',{detail:data})));
  document.querySelector('.workspace-tabs').addEventListener('click',event=>{if(event.target.closest('[data-tab="videos"]')){onlyEntry=null;refresh();}});
  const ready=(async()=>{try{entries=await storedAsset('get',null,'youtube-list')||[];if(document.querySelector('[data-tab="videos"][aria-pressed="true"]'))refresh();}catch{notify('Could not restore YouTube links.');}})();
  async function remove(id){entries=entries.filter(e=>e.id!==id);if(onlyEntry===id)onlyEntry=null;await persist();refresh();}
  const history={take:()=>structuredClone(entries),apply:async value=>{entries=structuredClone(value);if(onlyEntry&&!entries.some(e=>e.id===onlyEntry))onlyEntry=null;await persist();}};
  window.ProMaxYouTubeLibrary={render,add,play,prepare,attach,ready,history,remove,list:()=>entries,prepared:()=>prepared?.localAssetId||nativeBrowser?null:prepared,
    clearFocus:()=>{onlyEntry=null;},focused:()=>entries.find(e=>e.id===onlyEntry),
    open:entry=>{ProMaxFeatures.showTab('videos');onlyEntry=entry.id;refresh();}};
})();
