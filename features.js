/* Local Bible, preloaded video cues and imported PowerPoint presentations. */
(function () {
  'use strict';
  const workspace=document.querySelector('.workspace');
  const nav=document.createElement('nav');nav.className='workspace-tabs';nav.setAttribute('aria-label','Workspace');
  const view=document.createElement('section');view.id='feature-view';view.hidden=true;
  workspace.prepend(nav);workspace.append(view);
  let tab='songs', bible=null, bibleResults=[], chosen=new Set(), bibleDeck=null, bibleQuery='';
  let assets=[], documents=[], deck=null, activeVideo=null, command=0;
  let focusedAsset=null;
  const cache=new Map();
  const videoDurations=new Map();
  let videoQueue=Promise.resolve();
  function videoOperation(action){const operation=videoQueue.then(action);videoQueue=operation.catch(()=>{});return operation;}
  const tabs=[['songs','Songs'],['bible','Bible'],['videos','Videos'],['presentations','PowerPoint'],['scores','Poengtelling']];
  for (const [id,label] of tabs) { const b=document.createElement('button');b.textContent=label;b.onclick=()=>showTab(id);b.dataset.tab=id;nav.append(b); }
  function showTab(id,options={}) {
    window.ProMaxVideoControls?.clear();
    if(id!=='videos')window.ProMaxYouTube?.pauseAll(document);
    if(!options.preserveFocus){focusedAsset=null;if(id==='videos')window.ProMaxYouTubeLibrary?.clearFocus();}
    tab=id;for (const b of nav.children) b.setAttribute('aria-pressed',String(b.dataset.tab===id));
    for (const child of workspace.children) if (child!==nav && child!==view) child.hidden=id!=='songs';
    view.hidden=id==='songs';
    if (id==='bible') renderBible(options.bibleVerse);else if (id==='videos') renderVideos();else if (id==='presentations') renderDocuments();else if(id==='scores') window.ProMaxScores?.render(view);
    window.ProMaxMeetings?.onTab();
  }
  function element(tag,text,className) { const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node; }
  function button(text,callback,className) { const b=element('button',text,className);b.type='button';b.onclick=callback;return b; }
  function fileButton(text,accept,handler,multiple=false) {
    return ProMaxFilePicker.create({text,accept,multiple,onFiles:handler});
  }
  async function persist(key,value) { await storedAsset('put',value,key); }
  function heading(title,help) {window.ProMaxVideoControls?.clear();window.ProMaxYouTube?.park(document);view.replaceChildren(element('h2',title),element('p',help,'feature-help'));}
  function ref(v) {return `${v.book} ${v.chapter}:${v.verse}`;}
  function cueText(text,label,biblePassage) {
    deck=null;activeVideo=null;stopTimer();state={text,black:false,pdf:null,biblePassage};$('live-label').textContent=label;paint();
  }
  async function importBible(file) {
    if (file.size>30*1024*1024) throw Error('Choose a Bible text file smaller than 30 MB.');
    const parsed=ProMaxBible.parse(await file.text(),file.name);
    await persist('bible',parsed);bible=parsed;chosen.clear();if(tab==='bible')renderBible();window.ProMaxControls?.changed();document.dispatchEvent(new Event('promax:bible-changed'));notify(`${bible.verses.length.toLocaleString()} verses imported for offline use`);
  }
  function renderBibleSettings(container){
    container.replaceChildren(element('h3','Bible library'),element('p','Import a Bible once to search and present verses offline. Replacing or removing it keeps passages already saved in your meetings.'));
    const status=element('p',bible?bible.name+' · '+bible.verses.length.toLocaleString()+' verses · Available offline':'No Bible imported.','bible-settings-status');status.setAttribute('role','status');container.append(status);
    const actions=element('div',null,'settings-actions');
    actions.append(fileButton(bible?'Replace Bible text':'Import Bible text','.json,.csv,.tsv,.txt,.xml',files=>importBible(files[0])));
    if(bible)actions.append(button('Remove Bible',async()=>{if(!confirm('Remove the imported Bible from this app?'))return;try{await storedAsset('delete',null,'bible');bible=null;chosen.clear();if(tab==='bible')renderBible();document.dispatchEvent(new Event('promax:bible-changed'));window.ProMaxControls?.changed();}catch{notify('Could not remove the Bible.');}},'subtle'));
    container.append(actions);
    const details=element('details');details.append(element('summary','Supported import formats'),element('p','JSON, CSV/TSV, plain text, OSIS XML and Zefania XML. PDF, EPUB and encrypted Bible apps are not supported.'));
    const example=element('pre','{"name":"My Bible","verses":[{"book":"Johannes","chapter":3,"verse":16,"text":"Verse text"}]}');details.append(example,element('p','CSV/TSV columns: book, chapter, verse, text. Plain text: one line per verse, for example Johannes 3:16 Verse text.'));container.append(details);
  }
  function renderBible(initialVerse=null) {
    window.ProMaxControls?.changed();
    heading('Bible','Search as you type: Mat, Mat 1.1, Joh 3:16–18, or words in the text.');
    view.append(element('p',bible?bible.name+' · Available offline':'No Bible imported. Add one in Settings → Bible.','feature-help'));
    if(!bible){view.append(button('Open Bible settings',()=>window.ProMaxSettings.open('bible')));return;}
    const form=element('form',null,'feature-actions');const input=document.createElement('input');input.placeholder='Reference or text…';input.id='bible-search';input.setAttribute('aria-label','Search Bible');
    input.value=bibleQuery;input.autocomplete='off';form.append(input);
    const results=element('div');results.id='bible-results';
    const focusContext=()=>{const target=results.querySelector('.bible-context-target');if(target){target.tabIndex=-1;target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});}};
    const selectActions=element('div',null,'feature-actions');
    const count=element('span','0 selected');
    count.setAttribute('aria-live','polite');
    selectActions.append(button('Show selected passage',()=>showPassage()),button('Add passage to meeting',()=>{const verses=passage();if(verses)window.ProMaxMeetings?.add({type:'bible',title:ProMaxBible.formatReference(verses),slides:buildPassage(verses)});}),button('Add passage to song library',()=>savePassage()),count);
    let context=null,contextHit=null,selectionAnchor=null;
    const clearSelection=button('Clear selection',()=>{chosen.clear();selectionAnchor=null;draw();},'subtle');selectActions.insertBefore(clearSelection,count);
    const contextBar=element('div',null,'bible-context-bar');contextBar.hidden=true;
    const updateCount=()=>{clearSelection.disabled=!chosen.size;count.textContent=`${bibleResults.length} ${context?'verses in chapter':'matches'} · ${chosen.size} selected`;};
    const draw=()=>{
      results.replaceChildren();results.classList.toggle("bible-chapter-results",!!context);contextBar.replaceChildren();contextBar.hidden=!context;updateCount();
      if(context){
        contextBar.append(button('← Back to search results',()=>{const verse=contextHit;context=null;contextHit=null;selectionAnchor=null;bibleResults=ProMaxBible.search(bible,input.value);draw();const index=bibleResults.indexOf(verse);results.querySelector(`[data-verse-index="${index}"] .bible-read-context`)?.focus();}),element('strong',`${context.book} ${context.chapter}`),element('span','Select nearby verses to build your passage.','feature-help'));
      }
      if(context){
        const navigation=element('div',null,'bible-chapter-navigation');
        for(const [label,delta] of [['← Previous chapter',-1],['Next chapter →',1]]){
          const chapter=ProMaxBible.adjacentChapter(bible,context,delta),b=button(label,()=>{context=chapter[0];bibleResults=chapter;selectionAnchor=null;draw();results.scrollTop=0;contextBar.querySelector('strong')?.focus({preventScroll:true});});b.disabled=!chapter.length;navigation.append(b);
        }
        contextBar.append(navigation);contextBar.querySelector('strong').tabIndex=-1;
      }
      for (const [index,v] of bibleResults.slice(0,context?undefined:250).entries()) {
        const row=element('div',null,'verse-row');row.dataset.verseIndex=String(index);const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label',`Select ${ref(v)}`);checkbox.checked=chosen.has(v);
        checkbox.onclick=e=>{if(e.shiftKey&&selectionAnchor!==null){const checked=checkbox.checked;for(let i=Math.min(selectionAnchor,index);i<=Math.max(selectionAnchor,index);i++){if(checked)chosen.add(bibleResults[i]);else chosen.delete(bibleResults[i]);}for(const row of results.children){const box=row.querySelector('input[type=checkbox]');if(box)box.checked=chosen.has(bibleResults[Number(row.dataset.verseIndex)]);}}selectionAnchor=index;updateCount();};
        checkbox.onchange=()=>{if(checkbox.checked)chosen.add(v);else chosen.delete(v);updateCount();};
        row.append(checkbox,button(`${ref(v)}\n${v.text}`,()=>cueText(`${v.verse} ${v.text}\n\n${ref(v)}`,ref(v),{verses:[v],reference:ref(v)}),'verse-button'));
        if(contextHit===v){row.classList.add('bible-context-target');row.setAttribute('aria-label','Search result: '+ref(v));}
        if(!context){const more=button('Read chapter',()=>{context=v;contextHit=v;selectionAnchor=null;bibleResults=ProMaxBible.chapterVerses(bible,v);draw();focusContext();},'bible-read-context');more.setAttribute('aria-label',`Read verses around ${ref(v)}`);row.append(more);}
        results.append(row);
      }
      if (!bibleResults.length)results.append(element('p',input.value.trim()?'No matching verses. Try a book name or a word.':'Start typing a book, reference or words to see verses.','feature-help'));
      if (!context&&bibleResults.length>250)results.append(element('p','Showing the first 250 matches. Refine your search to see more.','feature-help'));
    };
    const search=()=>{bibleQuery=input.value;context=null;contextHit=null;selectionAnchor=null;chosen.clear();bibleResults=ProMaxBible.search(bible,input.value);draw();};
    input.oninput=search;
    form.onsubmit=e=>{e.preventDefault();search();};
    view.append(form,selectActions,contextBar,results);
    search();
    if(initialVerse&&bible.verses.includes(initialVerse)){
      context=initialVerse;contextHit=initialVerse;bibleResults=ProMaxBible.chapterVerses(bible,initialVerse);draw();
      focusContext();
    }
  }
  function passage() {
    const verses=ProMaxBible.ordered([...chosen]);
    if(!verses.length){notify('Select one or more verses first.');return null;}
    if(verses.length>100){notify('Choose up to 100 verses per passage.');return null;}
    return verses;
  }
  function buildPassage(verses) {
    const slides=[];
    for(let i=0;i<verses.length;i+=2){const part=verses.slice(i,i+2);const label=ProMaxBible.formatReference(part);slides.push({text:part.map(v=>`${v.verse} ${v.text}`).join('\n\n')+`\n\n${label}`,label,biblePassage:{verses:part,reference:label}});}
    return slides;
  }
  function showPassage(){const verses=passage();if(!verses)return;bibleDeck=buildPassage(verses);showDeck({type:'bible',title:bible.name,slides:bibleDeck,index:0},0);}
  function savePassage(){const verses=passage();if(!verses)return;const slides=buildPassage(verses);const song={id:uid(),title:`${ref(verses[0])} · ${bible.name}`,lines:4,
    lyrics:slides.map(s=>`[${s.label}]\n${s.text}`).join('\n\n'),slides:slides.map(s=>({text:s.text,section:s.label,key:'',biblePassage:s.biblePassage}))};songs.push(song);showTab('songs');selectSong(song.id);notify('Passage saved to the song library');}
  function showDeck(value,index) {
    if(!value.slides.length)return;
    const meetingContext=Object.hasOwn(value,'meetingContext')?value.meetingContext:value.meetingItemId?window.ProMaxMeetings?.cueContext('prepared',value.meetingItemId):window.ProMaxMeetings?.cueContext('document',value.id);
    stopTimer();activeVideo=null;deck={...value,meetingContext};deck.index=Math.max(0,Math.min(value.slides.length-1,index));const slide=value.slides[deck.index];
    state=value.type==='bible'?{text:slide.text,biblePassage:slide.biblePassage,black:false,pdf:null}:{text:'',black:false,pdf:null,image:slide};
    window.ProMaxMeetings?.trackCue(meetingContext);
    $('live-label').textContent=`${value.title} · ${deck.index+1}/${value.slides.length}`;paint();
    window.ProMaxMeetings?.markSlide(value.meetingItemId,deck.index);
    if (tab==='presentations')renderDocuments();
  }
  function navigate(delta){if(deck){if(deck.slides.length)showDeck(deck,deck.index+delta);return true;}return false;}
  function handleKey(e){
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return false;
    if(deck && ['ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();navigate(e.key==='ArrowLeft'?-1:1);return true;}
    if(activeVideo && e.key===' '){e.preventDefault();videoCommand('pause');return true;}
    return false;
  }
  async function loadAsset(asset) {
    if(cache.has(asset.id))return cache.get(asset.id);
    const file=await storedAsset('get',null,`video:${asset.id}`);if(!file)throw Error(`The saved video “${asset.name}” is missing.`);
    const url=URL.createObjectURL(file);cache.set(asset.id,url);return url;
  }
  function addVideos(files) {return videoOperation(async()=>{
    let added=0;const imported=[];
    try{
      for (const file of files) {
        if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {notify(`Skipped ${file.name}: choose a video file.`);continue;}
        const asset={id:uid(),name:file.name,size:file.size,type:file.type || 'video/mp4'};
        await persist(`video:${asset.id}`,file);
        const next=[...assets,asset];try{await persist('video-list',next);}catch(error){await storedAsset('delete',null,`video:${asset.id}`);throw error;}
        assets=next;added++;imported.push(asset);await loadAsset(asset);
      }
    }finally{if(added){warmVideos();window.ProMaxControls?.changed();if(tab==='videos')renderVideos();}}
    if(added)notify(`${added} ${added===1?'video':'videos'} saved. Preparing playback…`);
    return imported;
  });}
  function videoUrls(){return [...new Set([state.video?.url,cache.get(focusedAsset),...assets.map(a=>cache.get(a.id))].filter(Boolean))].slice(0,3);}
  function warmVideos(){ProMaxPlayback.warm(document,videoUrls());paint();}
  async function playVideo(asset,options={}) {
    try {
      const url=await loadAsset(asset);const video=[...document.querySelectorAll('video')].find(v=>v.src===url);
      if(video?.error)throw Error('This video format cannot be played. Convert it to MP4 (H.264) or WebM.');
      stopTimer();deck=null;activeVideo=asset.id;
      state={text:'',black:false,pdf:null,video:{url,title:asset.name,paused:false,position:options.start||0,at:Date.now(),command:++command,loop:$('video-loop')?.checked || false,muted:$('video-muted')?.checked ?? true}};
      window.ProMaxMeetings?.trackCue(options.meetingContext!==undefined?options.meetingContext:ProMaxMeetings.cueContext('video',asset.id));
      $('live-label').textContent=asset.name;paint();
      const preview=$('preview').querySelector('video[data-cue]');
      const remember=()=>{if(Number.isFinite(preview?.duration)&&preview.duration>0)videoDurations.set(url,preview.duration);};remember();preview?.addEventListener('loadedmetadata',remember,{once:true});
      if(preview)preview.onended=()=>{if(!preview.ended||state.video?.url!==url||state.video.loop||state.video.ended||state.black)return;state.video={...state.video,position:preview.duration,at:Date.now(),paused:true,ended:true,command:++command};paint();updateVideoControls();};
      renderVideos();
    }catch(error){notify(error.message);}
  }
  function videoCommand(action) {
    if (!state.video || !activeVideo){notify('Play a video first.');return;}
    const video=$('preview').querySelector('video');const cue=state.video;
    const position=video?.currentTime ?? cue.position;
    const replay=action==='pause'&&cue.ended;
    state.video={...cue,position:action==='restart'||replay?0:position,paused:replay?false:action==='pause'?!cue.paused:cue.paused,ended:action==='restart'||replay?false:cue.ended,at:Date.now(),command:++command};
    paint();updateVideoControls();
  }
  function videoSnapshot(){
    const cue=state.video;if(!cue||!activeVideo)return null;
    const video=$('preview').querySelector('video[data-cue]');
    if(video&&Number.isFinite(video.duration)&&video.duration>0)videoDurations.set(cue.url,video.duration);
    const duration=videoDurations.get(cue.url)||0,position=state.black||!video?cue.position:video.currentTime;
    return {position:Math.max(0,Math.min(Number(position)||0,duration||Infinity)),duration,paused:cue.paused,ended:cue.ended===true,black:state.black};
  }
  function updateVideoControls(){const pause=$('video-pause');if(pause)pause.textContent=state.video?.ended?'Replay':state.video?.paused?'Resume':'Pause';}
  function seekVideo(value){
    const snapshot=videoSnapshot();if(!snapshot||!Number.isFinite(value)||!snapshot.duration)return false;
    const position=Math.max(0,Math.min(value,snapshot.duration)),ended=position>=snapshot.duration;
    state.video={...state.video,position,at:Date.now(),paused:ended||state.video.paused,ended,command:++command};paint();updateVideoControls();return true;
  }
  function renderVideos() {
    window.ProMaxControls?.changed();
    const focused=assets.find(a=>a.id===focusedAsset),youtube=window.ProMaxYouTubeLibrary?.focused();
    heading(focused?.name||youtube?.title||'Video library',focused||youtube?'Choose when to show this video on the presentation.':'Videos are copied into the app and prepared before playback. Audio is played only on the presentation display; preview stays muted.');
    if(!focused&&!youtube){const actions=element('div',null,'feature-actions');actions.append(fileButton('Add local videos','video/*,.mp4,.webm,.mov,.m4v',addVideos,true));view.append(actions);}
    const controls=element('div',null,'feature-actions');
    const selectedVideo=focused?.id||youtube?.localAssetId,matchingCue=!selectedVideo||activeVideo===selectedVideo;
    const pause=button(state.video?.ended?'Replay':state.video?.paused?'Resume':'Pause',()=>videoCommand('pause'));pause.id='video-pause';controls.append(pause,button('Restart',()=>videoCommand('restart')),button('Stop',()=>{cueText('','Nothing live');renderVideos();}));
    for(const [id,label,prop,defaultValue] of [['video-loop','Loop','loop',false],['video-muted','Mute audio','muted',true]]) {
      const wrapper=element('label',null,'check-label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=id;checkbox.checked=(matchingCue?state.video?.[prop]:undefined) ?? defaultValue;
      checkbox.onchange=()=>{if(state.video&&matchingCue){const position=videoSnapshot()?.position??state.video.position;state.video={...state.video,position,at:Date.now(),[prop]:checkbox.checked,command:++command};paint();}};wrapper.append(checkbox,document.createTextNode(label));controls.append(wrapper);
    }
    if(!state.video||!activeVideo||selectedVideo&&activeVideo!==selectedVideo)for(const b of controls.querySelectorAll('button'))b.disabled=true;
    if(!youtube||youtube.localAssetId)view.append(controls);
    if(state.video&&activeVideo&&matchingCue&&(!youtube||youtube.localAssetId))window.ProMaxVideoControls?.mount(view,{snapshot:videoSnapshot,seek:seekVideo});
    if(!assets.length&&!youtube)view.append(element('p','Add videos to prepare them for your service.','empty'));
    const list=element('div',null,'asset-list');
    for (const asset of assets.filter(a=>!youtube&&(!focusedAsset||a.id===focusedAsset))) {
      const row=element('div',null,'asset-row');row.dataset.assetId=asset.id;const status=element('small','Preparing…');const title=element('div',asset.name);title.append(status);
      const video=[...document.querySelectorAll('video')].find(v=>v.src===cache.get(asset.id));
      const update=()=>{status.textContent=video?.error?'Unsupported format':video?.readyState>=2?`Ready · ${(asset.size/1024/1024).toFixed(1)} MB`:video?'Preparing…':`Saved · ${(asset.size/1024/1024).toFixed(1)} MB · Prepares on play`;};update();
      if(video){video.addEventListener('loadeddata',update,{once:true});video.addEventListener('error',update,{once:true});}
      if(focused){const preview=document.createElement('video');preview.className='meeting-video-preview';preview.src=cache.get(asset.id)||'';preview.muted=true;preview.controls=true;preview.preload='auto';preview.playsInline=true;view.append(preview);}
      row.append(title);
      if(!focused)row.append(button('＋ Meeting',()=>window.ProMaxMeetings?.add({type:'video',assetId:asset.id,title:asset.name})));
      row.append(button(focused?'Show on presentation':activeVideo===asset.id?'Play from start':'Play',()=>playVideo(asset),'primary'));
      row.append(button('Use as background',async()=>{
        try {
          const file=await storedAsset('get',null,`video:${asset.id}`);
          if(!file)throw Error('The saved video is missing.');
          await storedAsset('put',file);setMedia(file);
          notify(`${asset.name} selected as offline background`);
        }catch(error){notify(error.message||'Could not select this background.');}
      }));
      if(!focused)row.append(button('Remove',async()=>{
        try{await removeVideo(asset.id);}catch{notify('Could not remove the saved video.');}
      }));list.append(row);
    }
    view.append(list);
    if(!focused)window.ProMaxYouTubeLibrary?.render(view);
  }
  async function importDocument() {
    if(!window.promaxDesktop){notify('PowerPoint import is available in the desktop app.');return;}
    const b=$('import-powerpoint');b.disabled=true;b.textContent='Importing…';
    try{const result=await window.promaxDesktop.importPowerPoint();if(result.error)throw Error(result.error);if(result.document){await saveDocument(result.document);notify(`${result.document.slides.length} slides imported for offline use`);}}
    catch(error){notify(error.message);}finally{renderDocuments();}
  }
  async function saveDocument(doc) {
    if (!doc?.id || typeof doc.title!=='string' || !Array.isArray(doc.slides) || !doc.slides.length || !doc.slides.every(s=>typeof s==='string' && s.startsWith('file:')))
      throw Error('This is not a valid imported presentation.');
    const next=documents.some(d=>d.id===doc.id)?documents.map(d=>d.id===doc.id?doc:d):[...documents,doc];await persist('presentations',next);documents=next;
    if(tab==='presentations')renderDocuments();
  }
  function renderDocuments() {
    window.ProMaxControls?.changed();
    const focused=documents.find(d=>d.id===focusedAsset);
    heading(focused?.title||'PowerPoint',focused?'Click a slide to show it on the presentation.':'Import and edit PowerPoint on this PC. Editable copies retain the PowerPoint content; presentation output uses slide images without animations, video or audio.');
    if(!focused){const actions=element('div',null,'feature-actions');const b=button('Import PowerPoint',importDocument,'primary');b.id='import-powerpoint';actions.append(b);view.append(actions);}
    if(!documents.length)view.append(element('p','Imported presentations will appear here and remain available after restarting.','empty'));
    for(const doc of documents.filter(d=>!focusedAsset||d.id===focusedAsset)){const section=element('section',null,'document-deck');section.dataset.documentId=doc.id;const top=element('div',null,'feature-actions');
      top.append(element('h3',`${doc.title} · ${doc.slides.length} slides`));
      top.append(button('Edit PowerPoint',()=>window.ProMaxPptxEditor.open(doc)));
      if(!focused)top.append(button('＋ Meeting',()=>window.ProMaxMeetings?.add({type:'document',assetId:doc.id,title:doc.title})),button('Remove from library',async()=>{
        try{await removeDocument(doc.id);}catch{notify('Could not remove the presentation.');}
      }));section.append(top);const grid=element('div',null,'document-grid');
      doc.slides.forEach((url,i)=>{const tile=button('',()=>showDeck({...doc,type:'document',index:i},i),'document-slide');tile.setAttribute('aria-label',`${doc.title}, slide ${i+1}`);tile.setAttribute('aria-pressed',String(deck?.id===doc.id && deck.index===i));
        tile.dataset.slideIndex=String(i);
        const image=document.createElement('img');image.src=url;image.alt=`Slide ${i+1}`;image.loading='lazy';tile.append(image,element('span',String(i+1)));grid.append(tile);});section.append(grid);view.append(section);
    }
  }
  const originalGoLive=goLive;
  goLive=function(index){if(!current()?.slides.length)return originalGoLive(index);deck=null;activeVideo=null;const result=originalGoLive(index);if(tab==='videos')renderVideos();return result;};
  const originalSelectSong=selectSong;
  selectSong=function(id){const result=originalSelectSong(id);showTab('songs');return result;};
  const previous=$('previous').onclick,next=$('next').onclick;
  $('previous').onclick=()=>{if(!navigate(-1))previous();};$('next').onclick=()=>{if(!navigate(1))next();};
  for(const id of ['clear','show-text','countdown','pdf']){
    const original=$(id)[id==='pdf'?'onchange':'onclick'];
    $(id)[id==='pdf'?'onchange':'onclick']=function(event){const before=state,result=original.call(this,event);if(state!==before){deck=null;activeVideo=null;if(tab==='videos')renderVideos();}return result;};
  }
  function openMeetingMedia(type,id){showTab(type);focusedAsset=id;if(type==='videos'){warmVideos();renderVideos();}else renderDocuments();}
  function externalCue(){deck=null;activeVideo=null;}
  async function keepTrash(ids){const trash=new Set(await storedAsset('get',null,'video-trash')||[]);ids.forEach(id=>trash.add(id));assets.forEach(a=>trash.delete(a.id));await persist('video-trash',[...trash]);}
  function removeVideo(id){return videoOperation(async()=>{const next=assets.filter(a=>a.id!==id);await persist('video-list',next);assets=next;await keepTrash([id]);window.ProMaxControls?.changed();if(tab==='videos')renderVideos();});}
  async function removeDocument(id){documents=documents.filter(d=>d.id!==id);await persist('presentations',documents);renderDocuments();}
  async function persistDocuments(){await persist('presentations',documents);window.ProMaxControls?.changed();}
  function captureDeck(){return deck?{id:deck.id,meetingItemId:deck.meetingItemId,slide:deck.slides[deck.index],index:deck.index}:null;}
  function syncDeck(previous){if(!deck||!previous)return;const source=previous.meetingItemId?meetingFolders.flatMap(f=>f.items).find(i=>i.id===previous.meetingItemId):documents.find(d=>d.id===previous.id);if(!source)return;deck.slides=source.slides;const index=source.slides.findIndex(s=>typeof s==='string'?s===previous.slide:s.id&&s.id===previous.slide?.id);deck.index=index>=0?index:Math.max(-1,Math.min(previous.index-1,source.slides.length-1));}
  const history={take:()=>({videos:structuredClone(assets),documents:structuredClone(documents),bible}),apply:value=>videoOperation(async()=>{
    const bibleChanged=bible!==value.bible;
    const removed=assets.filter(a=>!value.videos.some(v=>v.id===a.id)).map(a=>a.id);
    assets=structuredClone(value.videos);documents=structuredClone(value.documents);bible=value.bible;chosen.clear();
    await Promise.all([persist('video-list',assets),persist('presentations',documents),...(bibleChanged?[persist('bible',bible)]:[])]);await keepTrash(removed);if(bibleChanged)document.dispatchEvent(new Event('promax:bible-changed'));
    for(const asset of assets)if(!cache.has(asset.id))try{await loadAsset(asset);}catch{}
  })};
  window.ProMaxFeatures={renderBibleSettings,videoUrls,handleKey,importBible,addVideos,playVideo,showDeck,navigate,showTab,saveDocument,openMeetingMedia,externalCue,seekVideo,videoSnapshot,
    openBibleReference:verse=>{if(!bible?.verses.includes(verse))return false;bibleQuery=ProMaxBible.formatReference([verse]);showTab('bible',{bibleVerse:verse});return true;},
    receiveBible:async value=>{const parsed=ProMaxBible.parse(JSON.stringify(value),'shared-bible.json');await persist('bible',parsed);bible=parsed;chosen.clear();if(tab==='bible')renderBible();document.dispatchEvent(new Event('promax:bible-changed'));window.ProMaxControls?.changed();return parsed;},
    getBible:()=>bible,getVideos:()=>assets,getDocuments:()=>documents,focusedAsset:()=>focusedAsset,history,removeVideo,removeDocument,persistDocuments,captureDeck,syncDeck,
    passageForDrag:index=>{const v=bibleResults[index];if(!v)return null;const verses=chosen.has(v)?ProMaxBible.ordered([...chosen]):[v];return {type:'bible',title:ProMaxBible.formatReference(verses),slides:buildPassage(verses)};}};
  showTab('songs');
  window.ProMaxFeatures.ready=(async()=>{
    try{bible=await storedAsset('get',null,'bible') || null;assets=await storedAsset('get',null,'video-list') || [];documents=await storedAsset('get',null,'presentations') || [];
      if(!Array.isArray(assets))assets=[];if(!Array.isArray(documents))documents=[];
      const paths=window.promaxDesktop?.initialData;
      if(paths?.restoredPresentationRoot){let changed=false;const relocate=url=>{if(typeof url==='string'&&url.startsWith(paths.restoredPresentationRoot)){changed=true;return paths.presentationRoot+url.slice(paths.restoredPresentationRoot.length);}return url;};for(const doc of documents){doc.slides=doc.slides.map(relocate);if(doc.nativeSource)doc.nativeSource=relocate(doc.nativeSource);}if(changed)await persist('presentations',documents);}
      for(const asset of assets)try{await loadAsset(asset);}catch(error){notify(error.message);}
      for(const id of await storedAsset('get',null,'video-trash')||[])if(!assets.some(a=>a.id===id))await storedAsset('delete',null,`video:${id}`);
      await persist('video-trash',[]);
      warmVideos();if(tab!=='songs')showTab(tab);
    }catch{notify('Could not restore the local media library.');}
  })();
})();
