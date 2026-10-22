const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID();
const sample={id:uid(),title:'Amazing Grace',lyrics:'[Verse 1]\nAmazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.\n\n[Verse 2]\n’Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed.',lines:4,slides:[]};
let meetingFolders=[],meetingSelected=null;
let songs=[],selected,liveIndex=-1,output=null,media=null,pdfUrl=null,timer=null,deadline=null;
let settings={color:'#181818',fontSize:5,align:'center',glassPalette:'gold',glassAuto:true,glassVariant:'a'};
let state={text:'',black:false,pdf:null};
function parseLyrics(text,maxLines){return ProMaxLyrics.parse(text,maxLines);}
function notify(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>$('toast').style.display='none',3500);}
function current(){return songs.find(s=>s.id===selected);}
let lastSavedRaw=null,lastShadowAt=0,nativeSaveTimer=null,pendingSaveTimer=null,pendingSaveSince=0;
// Typing updates the model immediately. Coalesce the full-library serialization,
// localStorage write and undo snapshot instead of blocking every input event.
function scheduleSave(){
  if(!pendingSaveSince)pendingSaveSince=Date.now();
  clearTimeout(pendingSaveTimer);
  pendingSaveTimer=setTimeout(()=>save(),Math.max(0,Math.min(250,1000-(Date.now()-pendingSaveSince))));
  $('status').textContent='Saving changes...';
}
function flushPendingSave(){if(pendingSaveTimer!==null)return save();return true;}
function save(){
  clearTimeout(pendingSaveTimer);pendingSaveTimer=null;pendingSaveSince=0;
  try{
    const raw=JSON.stringify({schemaVersion:1,savedAt:Date.now(),songs,selected,settings,meetingFolders,meetingSelected});
    localStorage.setItem('promax-library',raw);
    if(lastSavedRaw&&Date.now()-lastShadowAt>10000){try{localStorage.setItem('promax-library-recovery',lastSavedRaw);lastShadowAt=Date.now();}catch{}}
    lastSavedRaw=raw;
    if(window.promaxDesktop?.saveLibrary){clearTimeout(nativeSaveTimer);nativeSaveTimer=setTimeout(()=>window.promaxDesktop.saveLibrary(lastSavedRaw),350);}
    $('status').textContent='All changes saved';return true;
  }catch(e){$('status').textContent='Save failed';notify('Could not save automatically. Your latest changes are not saved.');return false;}
}
const libraryRows=new Map();
function renderLibrary(){
  const term=$('search').value.toLowerCase(),list=$('library'),visible=[],ids=new Set();
  for(const song of songs){
    ids.add(song.id);
    if(!song.title.toLowerCase().includes(term))continue;
    let row=libraryRows.get(song.id);
    if(!row){
      const button=document.createElement('button'),title=document.createTextNode(''),count=document.createElement('small');
      button.className='song';button.dataset.songId=song.id;button.append(title,count);button.onclick=()=>selectSong(song.id);
      row={button,title,count};libraryRows.set(song.id,row);
    }
    const title=song.title||'Untitled song',count=`${song.slides.length} slides`,active=song.id===selected;
    if(row.title.textContent!==title)row.title.textContent=title;
    if(row.count.textContent!==count)row.count.textContent=count;
    if(row.button.classList.contains('active')!==active)row.button.classList.toggle('active',active);
    visible.push(row.button);
  }
  for(const id of libraryRows.keys())if(!ids.has(id))libraryRows.delete(id);
  if(list.children.length!==visible.length||visible.some((row,i)=>list.children[i]!==row))list.replaceChildren(...visible);
}
let libraryRenderFrame=null;
function scheduleLibraryRender(){
  if(libraryRenderFrame!==null)return;
  libraryRenderFrame=requestAnimationFrame(()=>{libraryRenderFrame=null;renderLibrary();});
}
function selectSong(id){selected=id;liveIndex=-1;const s=current();$('title').value=s.title;$('lyrics').value=s.lyrics;$('lines').value=s.lines;renderLibrary();renderSlides();save();}
const backgroundPosters=new Map();
function addBackgroundPoster(container,url){
  const image=document.createElement('img');image.className='media';image.alt='';container.prepend(image);
  const shade=document.createElement('div');shade.className='shade';container.insertBefore(shade,image.nextSibling);
  if(!backgroundPosters.has(url)){
    const ready=new Promise(resolve=>{
      const video=document.createElement('video');video.muted=true;video.preload='auto';video.playsInline=true;
      const finish=value=>{clearTimeout(timeout);video.onloadeddata=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load();resolve(value);};
      const timeout=setTimeout(()=>finish(null),8000);
      video.onloadeddata=()=>{try{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const scale=Math.max(320/video.videoWidth,180/video.videoHeight),width=video.videoWidth*scale,height=video.videoHeight*scale;canvas.getContext('2d').drawImage(video,(320-width)/2,(180-height)/2,width,height);finish(canvas.toDataURL('image/jpeg',.75));}catch{finish(null);}};
      video.onerror=()=>finish(null);video.src=url;video.load();
    });
    backgroundPosters.set(url,ready);if(backgroundPosters.size>8)backgroundPosters.delete(backgroundPosters.keys().next().value);
  }
  backgroundPosters.get(url).then(poster=>{if(poster&&image.isConnected)image.src=poster;});
}
function addMedia(container,previewOnly=false,section=''){if(settings.visual){ProMaxVisuals.mount(container,settings.visual,!previewOnly,{...settings,section});return;}if(!media)return;if(previewOnly&&media.type.startsWith('video/')){addBackgroundPoster(container,media.url);return;}const el=document.createElement(media.type.startsWith('video/')?'video':'img');el.className='media';el.src=media.url;if(el.tagName==='VIDEO'){el.muted=true;el.loop=true;el.autoplay=!previewOnly;el.preload='auto';el.playsInline=true;}container.prepend(el);const shade=document.createElement('div');shade.className='shade';container.insertBefore(shade,el.nextSibling);}
let slidesRenderKey='';
function renderSlides(){
  const s=current();if(!s)return;
  const appearance=['color','visual','visualPalette','visualColors','visualColor','visualMotion','glassPalette','glassAuto','glassVariant'].map(k=>settings[k]);
  const renderKey=JSON.stringify([s.id,s.slides,appearance,media?.url]);
  if(renderKey===slidesRenderKey){[...$('slides').children].forEach((card,i)=>card.classList.toggle('active',i===liveIndex));return;}
  slidesRenderKey=renderKey;
  for(const canvas of $('slides').querySelectorAll('canvas'))canvas.stop?.();
  $('slides').replaceChildren();$('slide-count').textContent=s.slides.length;
  if(!s.slides.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Paste your song above, then generate slides. Use [Verse 1], [Chorus] and [Bridge] to name sections.';$('slides').append(empty);}
  const fragment=document.createDocumentFragment();
  s.slides.forEach((slide,i)=>{
    const card=document.createElement('div');card.className='slide-card'+(i===liveIndex?' active':'');card.dataset.songId=s.id;card.dataset.slideId=slide.id;
    const thumb=document.createElement('div');thumb.className='thumbnail';thumb.style.background=settings.color;addMedia(thumb,true,slide.section);
    const caption=document.createElement('div');caption.className='caption';ProMaxPlayback.renderText(caption,slide);thumb.append(caption);thumb.onclick=()=>goLive(i);
    const footer=document.createElement('div');footer.className='card-footer';const label=document.createElement('span');label.textContent=`${i+1} · ${slide.section}`;
    const key=document.createElement('input');key.maxLength=1;key.value=slide.key;key.title='Custom shortcut for this slide';key.setAttribute('aria-label',`Shortcut for slide ${i+1}`);key.oninput=()=>{slide.key=key.value.toLowerCase().trim();scheduleSave();};
    const edit=document.createElement('button');edit.className='slide-edit-button';edit.textContent='Edit';edit.setAttribute('aria-label','Edit slide '+(i+1));edit.onclick=()=>openSlideEditor(i);
    footer.append(label,edit,key);card.append(thumb,footer);fragment.append(card);
  });$('slides').append(fragment);
}
function stopTimer(){clearInterval(timer);timer=null;deadline=null;}
function goLive(i){const s=current();if(!s.slides.length)return;stopTimer();liveIndex=Math.max(0,Math.min(s.slides.length-1,i));state={text:s.slides[liveIndex].text,section:s.slides[liveIndex].section,biblePassage:s.slides[liveIndex].biblePassage,black:false,pdf:null};$('live-label').textContent=`${s.title} · ${s.slides[liveIndex].section} · ${liveIndex+1}/${s.slides.length}`;paint();renderSlides();if(typeof updateVisualName==='function')updateVisualName();}
function paintScreenContent(doc,container,isOutput){if(ProMaxYouTube.render(doc,container,state,isOutput))return;if(ProMaxVisuals.renderGlass(doc,container,{...state,settings,media},isOutput))return;for(const canvas of container.querySelectorAll('canvas[data-glass]'))canvas.stop?.();if(window.ProMaxPlayback?.render(doc,container,state,isOutput))return;const existing=container.querySelector('.screen-text');const mediaKey=settings.visual||media?.url||'';if(existing&&!state.black&&!state.pdf&&container.dataset.mediaKey===mediaKey){container.style.background=settings.color;ProMaxPlayback.renderText(existing,state);existing.style.textAlign=settings.align;existing.style.fontSize=isOutput?settings.fontSize+'vw':($('preview').clientWidth*settings.fontSize/100)+'px';return;}container.dataset.mediaKey=mediaKey;ProMaxPlayback.clear(doc,container);container.replaceChildren();container.style.background=state.black?'#000':settings.color;if(state.black)return;if(state.pdf){const frame=doc.createElement('iframe');frame.src=state.pdf;frame.style.cssText='width:100%;height:100%;border:0;position:absolute;inset:0';frame.title='PDF presentation';container.append(frame);return;}if(settings.visual){ProMaxVisuals.mount(container,settings.visual,true);}else if(media){const el=doc.createElement(media.type.startsWith('video/')?'video':'img');el.className='media';el.src=media.url;if(el.tagName==='VIDEO'){el.muted=true;el.loop=true;el.autoplay=true;el.preload='auto';el.playsInline=true;}container.append(el);const shade=doc.createElement('div');shade.className='shade';container.append(shade);}const text=doc.createElement('div');text.className='screen-text';ProMaxPlayback.renderText(text,state);text.style.textAlign=settings.align;text.style.fontSize=isOutput?settings.fontSize+'vw':($('preview').clientWidth*settings.fontSize/100)+'px';container.append(text);}
function paintScreen(doc,container,isOutput){const finish=ProMaxVisuals.beginBackground(doc,container,{...state,settings,media});paintScreenContent(doc,container,isOutput);finish();}
function paint(){
  if(window.promaxDesktop)window.promaxDesktop.publish({...state,settings,media,prepareYouTube:window.ProMaxYouTubeLibrary?.prepared(),warmVideos:window.ProMaxFeatures?.videoUrls()||[]});
  ProMaxYouTube.warm(document,window.ProMaxYouTubeLibrary?.prepared());paintScreen(document,$('preview'),false);window.ProMaxPlayback?.fit($('preview'));syncLiveStatus();
  if(output&&!output.closed){try{paintScreen(output.document,output.document.getElementById('stage'),true);ProMaxPlayback.fit(output.document.getElementById('stage'));}catch(e){notify('Reopen the presentation window.');}}
}
function syncLiveStatus(){
  const active=window.promaxDesktop?nativeOutputActive:!!output&&!output.closed;
  const indicator=document.querySelector('.live-dot');indicator.textContent=!active?'● OUTPUT OFF':state.black?'● BLACKOUT':'● LIVE';indicator.dataset.mode=!active?'off':state.black?'black':'live';
  $('blackout').setAttribute('aria-pressed',String(state.black));$('blackout').textContent=state.black?'Restore output':'Blackout';
}
function toggleBlackout(){
  const black=!state.black;
  if(state.video){const cue=state.video;const position=black?($('preview').querySelector('video')?.currentTime??cue.position):cue.position;
    state.video={...cue,position,at:Date.now(),command:'blackout:'+uid()};
  }
  state.black=black;paint();
}
let nativeOutputActive=false;let presentationBusy=false;
let outputWatcher=null;
function syncOutputButton(){
    const active=window.promaxDesktop?nativeOutputActive:!!output&&!output.closed;
    $('open-output').textContent=active?'■ Presentation on':'↗ Presentation off';
    $('open-output').setAttribute('aria-pressed',String(active));
    $('open-output').setAttribute('aria-busy',String(presentationBusy));
    $('open-output').title=active?'Close presentation and release the display':'Show presentation fullscreen on the second display';
    syncLiveStatus();
}
function closeOutput(){
    if(output&&!output.closed)output.close();
    output=null;
    clearInterval(outputWatcher);
    outputWatcher=null;
    syncOutputButton();
}
async function openOutput(){
    if(presentationBusy)return;
    if(window.promaxDesktop){
        presentationBusy=true;syncOutputButton();
        try{paint();const result=await window.promaxDesktop.toggle(settings.presentationDisplay);nativeOutputActive=result.active;if(result.error)notify(result.error);}
        catch(error){notify('Could not change the presentation display.');}
        finally{presentationBusy=false;syncOutputButton();}
        return;
    }
    if(output&&!output.closed){closeOutput();return;}
    presentationBusy=true;
    syncOutputButton();
    let targetScreen=null;
    try{
        if(!window.getScreenDetails){notify('Automatic display placement requires a recent Edge or Chrome.');return;}
        let details;
        try{details=await window.getScreenDetails();}
        catch(error){notify('Allow window management in browser settings to use the second display.');return;}
        // Browsers expose display geometry, not Windows display numbers.
        targetScreen=details.screens.find(s=>!s.isPrimary&&s!==details.currentScreen)
            ||details.screens.find(s=>s!==details.currentScreen);
        if(!targetScreen){notify('Connect a second display and use Extend displays in Windows.');return;}
        output=window.open('','promax-output',`popup,fullscreen,left=${targetScreen.availLeft},top=${targetScreen.availTop},width=${targetScreen.availWidth},height=${targetScreen.availHeight}`);
        if(!output){notify('Allow popups, then click Presentation off again.');return;}
        const presentation=output;
        presentation.document.open();
        presentation.document.write('<!doctype html><html><head><title>ProMax • Presentation</title><style>html,body{margin:0;background:#000;width:100%;height:100%;overflow:hidden;font-family:Segoe UI,Arial,sans-serif;color:white}#stage{position:relative;width:100vw;height:100vh;display:grid;place-items:center}.media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:#0005}.screen-text{position:relative;white-space:pre-line;line-height:1.3;font-weight:600;width:90%;text-shadow:0 2px 8px #000}#tip{position:fixed;bottom:14px;right:14px;font-size:12px;background:#0009;padding:9px;border-radius:5px;opacity:.6}</style></head><body><div id="stage"></div><div id="tip" hidden>Double-click for fullscreen</div></body></html>');
        presentation.document.close();
        const enterFullscreen=()=>presentation.document.documentElement.requestFullscreen({screen:targetScreen,navigationUI:'hide'});
        presentation.document.body.ondblclick=()=>enterFullscreen().catch(()=>notify('Fullscreen was blocked by the browser.'));
        presentation.document.addEventListener('fullscreenchange',()=>{
            presentation.document.getElementById('tip').hidden=!!presentation.document.fullscreenElement;
        });
        presentation.document.addEventListener('keydown',handleKey);
        paint();
        // Opening on another screen preserves activation in supporting browsers.
        if(!presentation.document.fullscreenElement){
            try{await enterFullscreen();}
            catch(error){presentation.document.getElementById('tip').hidden=false;notify('Presentation is on the second display. Double-click it if fullscreen was blocked.');}
        }
        clearInterval(outputWatcher);
        outputWatcher=setInterval(()=>{
            if(presentation.closed){if(output===presentation)output=null;clearInterval(outputWatcher);outputWatcher=null;syncOutputButton();}
        },300);
    }catch(error){closeOutput();notify('Could not open presentation. Please try again.');}
    finally{presentationBusy=false;syncOutputButton();}
}
document.addEventListener('focusout',()=>flushPendingSave());
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushPendingSave();});
window.addEventListener('beforeunload',()=>{flushPendingSave();if(lastSavedRaw)window.promaxDesktop?.saveLibrary?.(lastSavedRaw);closeOutput();});
function handleKey(e){if(window.ProMaxFeatures?.handleKey(e))return;if(document.getElementById('visual-library')?.open||document.getElementById('slide-editor')?.open)return;if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;const key=e.key.toLowerCase();if(key==='arrowright'||key===' '){e.preventDefault();goLive(liveIndex+1);}else if(key==='arrowleft'){e.preventDefault();goLive(liveIndex-1);}else if(key==='escape'){e.preventDefault();toggleBlackout();}else{const matches=current().slides.map((s,i)=>s.key===key?i:-1).filter(i=>i>=0);if(matches.length){e.preventDefault();goLive(matches.find(i=>i>liveIndex)??matches[0]);}}}
let dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('promax-media',1);request.onupgradeneeded=()=>request.result.createObjectStore('assets');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
async function storedAsset(action,value,key='background'){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('assets',action==='get'?'readonly':'readwrite');const store=tx.objectStore('assets');const req=action==='get'?store.get(key):action==='delete'?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function setMedia(file){settings.visual=null;save();if(media)URL.revokeObjectURL(media.url);media=file?{url:URL.createObjectURL(file),type:file.type}:null;renderSlides();paint();if(typeof updateVisualName==='function')updateVisualName();}
function bind(){ $('new-song').onclick=()=>{const s={id:uid(),title:'Untitled song',lyrics:'',lines:4,slides:[]};songs.push(s);selectSong(s.id);$('title').focus();};$('search').oninput=scheduleLibraryRender;$('quick-text').oninput=()=>{settings.quickText=$('quick-text').value;scheduleSave();};$('minutes').oninput=()=>{settings.countdownMinutes=$('minutes').value;scheduleSave();};for(const id of ['title','lyrics','lines'])$(id).oninput=()=>{const s=current();s.title=$('title').value;s.lyrics=$('lyrics').value;s.lines=Number($('lines').value);scheduleSave();if(id==='title')scheduleLibraryRender();};$('build').onclick=()=>{const s=current();const old=s.slides;s.slides=parseLyrics(s.lyrics,s.lines).map((slide,i)=>({...slide,key:old[i]?.text===slide.text?old[i].key:slide.key}));liveIndex=-1;save();renderLibrary();renderSlides();notify(`${s.slides.length} slides ready`);};$('delete-song').onclick=()=>{if(window.ProMaxControls){ProMaxControls.remove({type:'song',songId:selected});return;}if(!confirm(`Delete “${current().title}”?`))return;songs=songs.filter(s=>s.id!==selected);if(!songs.length)songs.push({id:uid(),title:'Untitled song',lyrics:'',lines:4,slides:[]});selectSong(songs[0].id);};$('open-output').onclick=openOutput;$('previous').onclick=()=>goLive(liveIndex-1);$('next').onclick=()=>goLive(liveIndex+1);$('clear').onclick=()=>{stopTimer();state={text:'',black:false,pdf:null};paint();};$('blackout').onclick=toggleBlackout;for(const [id,prop]of [['color','color'],['font-size','fontSize'],['align','align']])$(id).oninput=()=>{settings[prop]=id==='font-size'?Number($(id).value):$(id).value;scheduleSave();paint();if(id==='color')renderSlides();};$('background').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{await storedAsset('put',file);setMedia(file);notify('Background saved for offline use');}catch(err){notify('Could not save this media. Try a smaller file.');}e.target.value='';};$('remove-background').onclick=async()=>{try{await storedAsset('delete');setMedia(null);}catch(e){notify('Could not remove the background.');}};$('show-text').onclick=()=>{stopTimer();state={text:$('quick-text').value,black:false,pdf:null};paint();$('live-label').textContent='Temporary text';};$('countdown').onclick=()=>{const min=Number($('minutes').value);if(!Number.isFinite(min)||min<=0||min>180){notify('Choose a duration between 0 and 180 minutes.');return;}stopTimer();deadline=Date.now()+min*60000;state={text:'',black:false,pdf:null};const tick=()=>{const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));const formatted=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;if(state.text!==formatted){state.text=formatted;paint();}if(!seconds)stopTimer();};tick();timer=setInterval(tick,200);$('live-label').textContent='Countdown';};$('stop-countdown').onclick=stopTimer;$('pdf').onchange=e=>{const file=e.target.files[0];if(!file)return;stopTimer();if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(file);state={text:'',black:false,pdf:pdfUrl};paint();$('live-label').textContent=file.name;e.target.value='';};document.addEventListener('keydown',handleKey);window.addEventListener('resize',paint);}
async function init(){
  let data=null,recovered=false,invalid=false;
  try{const raw=localStorage.getItem('promax-library');if(raw){data=ProMaxLibraryData.parse(raw);lastSavedRaw=raw;}}catch{invalid=true;}
  if(!data)try{const raw=localStorage.getItem('promax-library-recovery');if(raw){data=ProMaxLibraryData.parse(raw);recovered=true;}}catch{}
  const native=window.promaxDesktop?.initialData;
  if(data&&native?.library){
    try{const migrated=ProMaxMigration.reunite(JSON.parse(localStorage.getItem('promax-library')),native.library);if(migrated){data=ProMaxLibraryData.normalize(migrated);recovered=true;}}catch{}
  }
  if(native?.library&&(!data||native.library.savedAt>data.savedAt)){data=native.library;recovered=true;}
  if(data){songs=data.songs;selected=data.selected;settings={...settings,...data.settings};meetingFolders=data.meetingFolders;meetingSelected=data.meetingSelected;}
  if(!songs.length){sample.slides=parseLyrics(sample.lyrics,4);songs=[sample];}
  selected=songs.some(s=>s.id===selected)?selected:songs[0].id;
  if(settings.color.toLowerCase()==='#142a39')settings.color='#181818';
  $('color').value=settings.color;$('font-size').value=settings.fontSize;$('align').value=settings.align;$('quick-text').value=settings.quickText||'';$('minutes').value=settings.countdownMinutes||5;
  bind();bindVisualLibrary();bindSlideEditor();selectSong(selected);paint();
  if(recovered||invalid)setTimeout(()=>notify(recovered?'Your library was recovered from a saved copy.':'The saved library could not be read. Your media files are still kept in app data.'),900);
  if(native?.notice)setTimeout(()=>notify(native.notice.message),1200);
  try{const file=await storedAsset('get');if(file&&!settings.visual)setMedia(file);}catch(e){notify('Media storage is unavailable in this browser.');}
}
if(window.promaxDesktop){
    window.promaxDesktop.onLibraryError?.(message=>{$('status').textContent='Recovery copy failed';notify(message);});
    window.promaxDesktop.onActive(active=>{nativeOutputActive=active;syncOutputButton();});
    window.promaxDesktop.onKey(key=>handleKey({key,target:{tagName:'BODY'},preventDefault(){}}));
}
init();
