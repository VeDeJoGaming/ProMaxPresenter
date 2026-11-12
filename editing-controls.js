/* Editing commands operate on saved content, never on the live cue. */
(() => {
  const clone=value=>structuredClone(value);
  const providers=[['features',ProMaxFeatures.history],['youtube',ProMaxYouTubeLibrary.history]];
  const undoStack=[],redoStack=[],bibleIds=new WeakMap(),backgroundIds=new WeakMap();let nextBible=1,nextBackground=1,backgroundFile=null;
  let baseline=null,baselineKey=null,enabled=false,restoring=false,busy=false,hold=0,choice=null,action=0,group='initial',drag=null,liveSong=null;const pendingHistory=[];
  const originalGoLive=goLive;goLive=function(index){const before=state,result=originalGoLive(index);if(state!==before){liveSong={songId:selected,slideId:current()?.slides[liveIndex]?.id,state};window.ProMaxMeetings?.markLive();}return result;};
  const editable=node=>!!node?.closest('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]),[contenteditable=true]');
  function normalize(){for(const song of songs)for(const slide of song.slides)slide.id||=uid();for(const f of meetingFolders)for(const item of f.items)for(const slide of item.slides||[])slide.id||=uid();}
  function take(copy=true){normalize();const content={songs,meetingFolders,settings,selected,meetingSelected},value=copy?clone(content):content;value.background=backgroundFile;for(const [name,p]of providers)value[name]=p.take();return value;}
  function setBaseline(value){baseline=value;baselineKey=key(value);}
  function key(value){const f=clone(value.meetingFolders);f.forEach(entry=>delete entry.selectedItem);const bible=value.features.bible,bg=value.background;if(bible&&!bibleIds.has(bible))bibleIds.set(bible,nextBible++);if(bg&&!backgroundIds.has(bg))backgroundIds.set(bg,nextBackground++);return JSON.stringify([value.songs,f,value.settings,value.features.videos,value.features.documents,bible?bibleIds.get(bible):0,value.youtube,bg?backgroundIds.get(bg):0]);}
  function changed(beforeChoice=choice){
    if(!enabled||restoring||hold)return;
    // Navigation is not a content edit. Compare before cloning the whole library,
    // and keep the last immutable snapshot's signature for the next comparison.
    const view=take(false),afterKey=key(view);
    if(afterKey===baselineKey){baseline={...baseline,selected,meetingSelected,meetingFolders:clone(meetingFolders)};return;}
    const after={...view,...clone({songs:view.songs,meetingFolders:view.meetingFolders,settings:view.settings})};
    const last=undoStack.at(-1),now=performance.now();
    if(last&&last.group===group&&(group.startsWith('action:')||now-last.at<900)){last.after=after;last.at=now;last.afterChoice=clone(choice);}
    else{undoStack.push({before:baseline,after,group,at:now,beforeChoice:clone(beforeChoice),afterChoice:clone(choice)});if(undoStack.length>100)undoStack.shift();}
    if(undoStack.at(-1)&&key(undoStack.at(-1).before)===afterKey)undoStack.pop();
    redoStack.length=0;baseline=after;baselineKey=afterKey;toolbar();
  }
  function descriptor(node){
    const e=node?.closest('[data-slide-id],[data-item-id],.document-slide,[data-youtube-id],[data-asset-id],[data-verse-index],.document-deck,[data-song-id],[data-folder-id]');if(!e)return null;
    const d=e.dataset;
    if(d.slideId&&d.itemId)return {type:'prepared-slide',folderId:d.folderId,itemId:d.itemId,slideId:d.slideId};
    if(d.slideId)return {type:'slide',songId:d.songId,slideId:d.slideId};
    if(d.itemId)return {type:'item',folderId:d.folderId,itemId:d.itemId};
    if(e.matches('.document-slide'))return {type:'document-slide',documentId:e.closest('.document-deck').dataset.documentId,index:Number(d.slideIndex)};
    if(d.youtubeId){const f=ProMaxMeetings.folder(),item=f?.items.find(i=>i.id===f.selectedItem&&i.assetId===d.youtubeId);if(item&&ProMaxYouTubeLibrary.focused()?.id===d.youtubeId)return {type:'item',folderId:f.id,itemId:item.id};return {type:'youtube',assetId:d.youtubeId};}
    if(d.assetId){const f=ProMaxMeetings.folder(),item=f?.items.find(i=>i.id===f.selectedItem&&i.assetId===d.assetId);if(item&&ProMaxFeatures.focusedAsset()===d.assetId)return {type:'item',folderId:f.id,itemId:item.id};return {type:'video',assetId:d.assetId};}
    if(d.verseIndex!==undefined)return {type:'passage',item:ProMaxFeatures.passageForDrag(Number(d.verseIndex))};
    if(e.matches('.document-deck')){const id=e.dataset.documentId,f=ProMaxMeetings.folder(),item=f?.items.find(i=>i.id===f.selectedItem&&i.assetId===id);if(item&&ProMaxFeatures.focusedAsset()===id)return {type:'item',folderId:f.id,itemId:item.id};return {type:'document',assetId:id};}
    if(d.songId)return {type:'song',songId:d.songId};
    if(d.folderId)return {type:'folder',folderId:d.folderId};return null;
  }
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function select(value){if(same(value,choice))return;choice=value;scan();}
  function scan(){
    document.querySelectorAll('.control-selected').forEach(e=>e.classList.remove('control-selected'));
    let visibleSelection=false;
    for(const e of document.querySelectorAll('.song,.slide-card,.meeting-folder,.meeting-item,.prepared-slide,.asset-row,.youtube-card,.document-slide,.document-deck,.verse-row')){
      const nativeDrag=!e.matches('.meeting-item');if(e.draggable!==nativeDrag)e.draggable=nativeDrag;if(!e.hasAttribute('tabindex'))e.tabIndex=0;
      for(const image of e.querySelectorAll('img'))if(image.draggable)image.draggable=false;
      const value=choice&&!e.matches('.verse-row')?descriptor(e):null;if(value&&same(value,choice)){e.classList.add('control-selected');if(e.getClientRects().length)visibleSelection=true;}
      if(e.matches('.slide-card,.meeting-item,.prepared-slide,.meeting-folder'))e.title='Drag to reorder · Delete to remove · Ctrl+D to duplicate';
    }
    if(choice&&!visibleSelection&&!busy)choice=null;
    const search=$('meeting-item-search');if(search){const q=search.value.trim().toLocaleLowerCase();for(const row of $('meeting-items').querySelectorAll('.meeting-item'))row.hidden=!!q&&!row.textContent.toLocaleLowerCase().includes(q);}
  }
  const songFor=value=>songs.find(s=>s.id===value.songId);
  const folderFor=value=>meetingFolders.find(f=>f.id===value.folderId);
  const itemFor=value=>folderFor(value)?.items.find(i=>i.id===value.itemId);
  function collection(value){if(value.type==='slide')return songFor(value)?.slides;if(value.type==='prepared-slide')return itemFor(value)?.slides;if(value.type==='document-slide')return ProMaxFeatures.getDocuments().find(d=>d.id===value.documentId)?.slides;return null;}
  function indexFor(value,list){return value.type==='document-slide'?value.index:list?.findIndex(s=>s.id===value.slideId);}
  function syncLyrics(song){song.lyrics=song.slides.map(s=>`[${s.section||s.label||'Slide'}]\n${s.text}`).join('\n\n');if(song.id===selected)$('lyrics').value=song.lyrics;}
  async function refresh(){
    const tab=document.querySelector('.workspace-tabs [aria-pressed=true]')?.dataset.tab||'songs';
    if($('slide-editor').open)$('slide-editor').close();
    $('color').value=settings.color;$('font-size').value=settings.fontSize;$('align').value=settings.align;
    $('quick-text').value=settings.quickText||'';$('minutes').value=settings.countdownMinutes||5;
    for(const [id,value]of [['glass-palette',settings.visualPalette||'original'],['glass-variant',settings.glassVariant||'a'],['visual-motion',settings.visualMotion||'auto'],['visual-color',settings.visualColor||'#5276f4']])$(id).value=value;
    $('glass-auto').checked=settings.glassAuto!==false;$('glass-variant').disabled=settings.glassAuto!==false;
    $('visual-solid').hidden=settings.visualPalette!=='solid';$('visual-gradient').hidden=settings.visualPalette!=='custom';
    (settings.visualColors||['#5276f4','#e0edff','#131c43']).forEach((v,i)=>$('visual-color-'+i).value=v);
    renderLibrary();renderSlides();
    if(meetingSelected&&tab!=='songs'&&!ProMaxFeatures.focusedAsset()&&!ProMaxYouTubeLibrary.focused()){ProMaxFeatures.showTab(tab);ProMaxMeetings.render();}
    else if(meetingSelected)await ProMaxMeetings.refresh();else if(tab!=='songs')ProMaxFeatures.showTab(tab);else selectSong(selected);
    if(liveSong?.state===state&&selected===liveSong.songId){liveIndex=current().slides.findIndex(s=>s.id===liveSong.slideId);renderSlides();}
    window.ProMaxScores?.sync();updateVisualName();paint();scan();
  }
  async function restore(value,selection){
    const live=ProMaxFeatures.captureDeck();restoring=true;
    try{
      songs=clone(value.songs);meetingFolders=clone(value.meetingFolders);settings=clone(value.settings);
      selected=songs.some(s=>s.id===value.selected)?value.selected:songs[0].id;
      meetingSelected=meetingFolders.some(f=>f.id===value.meetingSelected)?value.meetingSelected:null;liveIndex=-1;
      if(backgroundFile!==value.background){backgroundFile=value.background;if(media)URL.revokeObjectURL(media.url);media=backgroundFile?{url:URL.createObjectURL(backgroundFile),type:backgroundFile.type}:null;await storedAsset(backgroundFile?'put':'delete',backgroundFile,'background');}
      await Promise.all(providers.map(([name,p])=>p.apply(value[name])));ProMaxFeatures.syncDeck(live);
      choice=selection;save();await refresh();setBaseline(take());
    }finally{restoring=false;toolbar();}
  }
  async function history(direction){
    if(!enabled)return;if(busy){pendingHistory.push(direction);return;}changed();const from=direction==='undo'?undoStack:redoStack,to=direction==='undo'?redoStack:undoStack;
    const entry=from.pop();if(!entry){if(pendingHistory.length)queueMicrotask(()=>history(pendingHistory.shift()));return;}busy=true;toolbar();
    try{await restore(direction==='undo'?entry.before:entry.after,direction==='undo'?entry.beforeChoice:entry.afterChoice);to.push(entry);notify(direction==='undo'?'Undone':'Redone');}
    catch(error){from.push(entry);notify('Could not restore this change.');}
    finally{busy=false;toolbar();if(pendingHistory.length)history(pendingHistory.shift());}
  }
  async function mutate(label,operation){
    if(busy)return;changed();const before=enabled?take():null,live=ProMaxFeatures.captureDeck(),beforeChoice=clone(choice);group='action:'+ ++action;hold++;busy=true;toolbar();
    try{await operation();normalize();ProMaxFeatures.syncDeck(live);save();await refresh();}
    catch(error){if(before)await restore(before,choice);notify(error.message||'Could not complete this change.');}
    finally{hold--;busy=false;changed(beforeChoice);toolbar();scan();if(pendingHistory.length)history(pendingHistory.shift());}
  }
  async function remove(value=choice){
    if(!value||value.type==='passage')return;
    await mutate('Remove',async()=>{
      if(value.type==='item'){const f=folderFor(value);if(!f)return;f.items=f.items.filter(i=>i.id!==value.itemId);if(f.selectedItem===value.itemId)delete f.selectedItem;}
      else if(value.type==='folder'){meetingFolders=meetingFolders.filter(f=>f.id!==value.folderId);if(meetingSelected===value.folderId)meetingSelected=null;}
      else if(value.type==='song'){songs=songs.filter(s=>s.id!==value.songId);if(!songs.length)songs.push({id:uid(),title:'Untitled song',lyrics:'',lines:4,slides:[]});if(selected===value.songId)selected=songs[0].id;}
      else if(['slide','prepared-slide','document-slide'].includes(value.type)){
        const list=collection(value),i=indexFor(value,list);if(!list||i<0)return;list.splice(i,1);
        if(value.type==='slide'){if(value.songId===selected)liveIndex=liveIndex===i?-1:liveIndex>i?liveIndex-1:liveIndex;syncLyrics(songFor(value));}
        if(value.type==='document-slide')await ProMaxFeatures.persistDocuments();
      }else if(value.type==='video')await ProMaxFeatures.removeVideo(value.assetId);
      else if(value.type==='document')await ProMaxFeatures.removeDocument(value.assetId);
      else if(value.type==='youtube')await ProMaxYouTubeLibrary.remove(value.assetId);
    });select(null);notify('Removed · Ctrl+Z to undo');
  }
  async function duplicate(value=choice){
    if(!value||!['item','song','folder','slide','prepared-slide','document-slide'].includes(value.type))return;
    await mutate('Duplicate',()=>{
      if(value.type==='item'){const f=folderFor(value),source=itemFor(value);if(!source)return;const copy=clone(source);copy.id=uid();(copy.slides||[]).forEach(s=>s.id=uid());f.items.splice(f.items.indexOf(source)+1,0,copy);f.selectedItem=copy.id;choice={...value,itemId:copy.id};}
      else if(value.type==='song'){const source=songFor(value);if(!source)return;const copy=clone(source);copy.id=uid();copy.title+=' (copy)';copy.slides.forEach(s=>s.id=uid());songs.splice(songs.indexOf(source)+1,0,copy);selected=copy.id;choice={...value,songId:copy.id};}
      else if(value.type==='folder'){const source=folderFor(value);if(!source)return;const copy=clone(source);copy.id=uid();copy.name+=' (copy)';copy.items.forEach(i=>{i.id=uid();(i.slides||[]).forEach(s=>s.id=uid());});delete copy.selectedItem;meetingFolders.splice(meetingFolders.indexOf(source)+1,0,copy);choice={...value,folderId:copy.id};}
      else if(['slide','prepared-slide','document-slide'].includes(value.type)){const list=collection(value),index=indexFor(value,list);if(!list||index<0)return;const copy=clone(list[index]);if(typeof copy==='object')copy.id=uid();list.splice(index+1,0,copy);choice=value.type==='document-slide'?{...value,index:index+1}:{...value,slideId:copy.id};if(value.type==='slide')syncLyrics(songFor(value));if(value.type==='document-slide')return ProMaxFeatures.persistDocuments();}
    });notify('Duplicated');
  }
  function reorder(list,sourceIndex,targetIndex){if(!list||sourceIndex<0||targetIndex<0||sourceIndex===targetIndex)return;const [item]=list.splice(sourceIndex,1);list.splice(Math.min(targetIndex,list.length),0,item);}
  async function move(value,delta){if(!value)return;await mutate('Move',async()=>{
    if(value.type==='item'){const list=folderFor(value)?.items,i=list?.findIndex(v=>v.id===value.itemId);if(i+delta<0||i+delta>=list.length)return;reorder(list,i,i+delta);}
    else if(value.type==='folder'){const i=meetingFolders.findIndex(f=>f.id===value.folderId);if(i+delta<0||i+delta>=meetingFolders.length)return;reorder(meetingFolders,i,i+delta);}
    else if(value.type==='song'){if(settings.songOrder!=='manual')songs.sort(ProMaxSongSearch.compare);const i=songs.findIndex(s=>s.id===value.songId);if(i+delta<0||i+delta>=songs.length)return;settings.songOrder='manual';reorder(songs,i,i+delta);}
    else{const list=collection(value),i=indexFor(value,list);if(!list||i+delta<0||i+delta>=list.length)return;const liveSlide=current()?.slides[liveIndex];reorder(list,i,i+delta);if(value.type==='slide'){syncLyrics(songFor(value));if(value.songId===selected&&liveSlide)liveIndex=list.indexOf(liveSlide);}if(value.type==='document-slide')await ProMaxFeatures.persistDocuments();}
  });}
  function folderItem(value){
    if(value.type==='item')return itemFor(value);
    if(value.type==='song'){const s=songFor(value);return s?{type:'song',songId:s.id,title:s.title}:null;}
    if(value.type==='passage')return value.item;
    if(value.type==='video'){const a=ProMaxFeatures.getVideos().find(a=>a.id===value.assetId);return a?{type:'video',assetId:a.id,title:a.name}:null;}
    if(value.type==='document'){const d=ProMaxFeatures.getDocuments().find(d=>d.id===value.assetId);return d?{type:'document',assetId:d.id,title:d.title}:null;}
    if(value.type==='youtube'){const e=ProMaxYouTubeLibrary.list().find(e=>e.id===value.assetId);return e?{type:'youtube',assetId:e.id,title:e.title}:null;}return null;
  }
  async function drop(value,target,after=false,copy=false){
    if(!value||!target||!canDrop(value,target)||same(value,target)&&!(copy&&value.type==='item'))return;
    await mutate('Drag',async()=>{
      if(value.type===target.type&&['slide','prepared-slide','document-slide'].includes(value.type)&&collection(value)===collection(target)){
        const list=collection(value),i=indexFor(value,list),j=indexFor(target,list);const liveSlide=current()?.slides[liveIndex];
        reorder(list,i,Math.max(0,j+(after?1:0)-(i<j?1:0)));if(value.type==='slide'){syncLyrics(songFor(value));if(value.songId===selected&&liveSlide)liveIndex=list.indexOf(liveSlide);}if(value.type==='document-slide')await ProMaxFeatures.persistDocuments();return;
      }
      if(value.type==='folder'&&target.type==='folder'){const i=meetingFolders.findIndex(f=>f.id===value.folderId),j=meetingFolders.findIndex(f=>f.id===target.folderId);reorder(meetingFolders,i,j+(after?1:0)-(i<j?1:0));return;}
      if(value.type==='song'&&target.type==='song'){if(settings.songOrder!=='manual')songs.sort(ProMaxSongSearch.compare);settings.songOrder='manual';const i=songs.findIndex(s=>s.id===value.songId),j=songs.findIndex(s=>s.id===target.songId);reorder(songs,i,j+(after?1:0)-(i<j?1:0));return;}
      if(value.type===target.type&&['video','document','youtube'].includes(value.type)){
        if(value.type==='youtube')await ProMaxYouTubeLibrary.reorder(value.assetId,target.assetId,after);
        else await ProMaxFeatures.reorderAsset(value.type,value.assetId,target.assetId,after);
        return;
      }
      if(['folder','item'].includes(target.type)){
        const f=folderFor(target),source=folderItem(value);if(!f||!source)return;
        let index=target.type==='item'?f.items.findIndex(i=>i.id===target.itemId)+(after?1:0):f.items.length;
        const old=value.type==='item'?folderFor(value):null,oldIndex=old?.items.findIndex(i=>i.id===value.itemId);
        if((target.type==='item'&&index-(after?1:0)<0)||(old&&oldIndex<0))return;
        let item=clone(source);if(old&&!copy){old.items.splice(oldIndex,1);if(old===f&&oldIndex<index)index--;if(old!==f&&old.selectedItem===source.id)delete old.selectedItem;}
        else{item.id=uid();(item.slides||[]).forEach(s=>s.id=uid());}
        f.items.splice(Math.max(0,index),0,item);
        choice={type:'item',folderId:f.id,itemId:item.id};
      }
    });
  }
  function rename(){
    if(!choice)return;if(choice.type==='slide'){openSlideEditor(indexFor(choice,collection(choice)));return;}
    if(choice.type==='prepared-slide'){openPreparedSlideEditor(choice.folderId,choice.itemId,choice.slideId);return;}
    if(choice.type==='folder'){if(meetingSelected!==choice.folderId)ProMaxMeetings.select(choice.folderId);$('meeting-name').focus();$('meeting-name').select();return;}
    const item=choice.type==='item'?itemFor(choice):null;
    if(choice.type==='song'||item?.type==='song'){$('title').focus();$('title').select();return;}
    if(item){renameTarget=clone(choice);renameInput.value=item.title;renameDialog.showModal();renameInput.focus();renameInput.select();}
  }
  function find(){const input=[$('bible-search'),$('meeting-song-search'),meetingSelected?$('meeting-item-search'):$('search')].find(e=>e?.getClientRects().length);input?.focus();input?.select();}
  const tools=document.createElement('div');tools.id='editing-tools';
  const undo=document.createElement('button'),redo=document.createElement('button');undo.textContent='↶';redo.textContent='↷';
  undo.title='Undo · Ctrl+Z';undo.setAttribute('aria-label','Undo');redo.title='Redo · Ctrl+Shift+Z';redo.setAttribute('aria-label','Redo');undo.onclick=()=>history('undo');redo.onclick=()=>history('redo');
  tools.append(undo,redo);document.querySelector('.header-actions').prepend(tools);
  const dialog=document.createElement('dialog');dialog.id='editing-help';dialog.innerHTML='<h2>Editing shortcuts</h2><p>Click the bottom of a slide to select it. Click its preview to show it live.</p><dl><dt>F5</dt><dd>Presentation on / off</dd><dt>F6</dt><dd>Blackout / restore (also while typing)</dd><dt>Escape</dt><dd>Blackout / restore outside text fields and dialogs</dd><dt>Ctrl+Z</dt><dd>Undo</dd><dt>Ctrl+Shift+Z / Ctrl+Y</dt><dd>Redo</dd><dt>Delete</dt><dd>Remove selected content</dd><dt>Ctrl+D</dt><dd>Duplicate selected slide, song or folder item</dd><dt>Alt+↑ / Alt+↓</dt><dd>Move selected content</dd><dt>F2</dt><dd>Edit slide or rename song/folder</dd><dt>Ctrl+K</dt><dd>Quick open songs, meetings, Bible and media</dd><dt>Ctrl+F</dt><dd>Search the sidebar</dd><dt>Ctrl+S</dt><dd>Save now (changes also save automatically)</dd></dl><p>Drag to change order. Drop songs, passages or media on a folder to add them. Hold Ctrl while dragging a folder item to copy it. Undo history lasts until you close the app.</p><button>Close</button>';
  dialog.querySelector('button').remove();document.body.append(dialog);
  let renameTarget=null;const renameDialog=document.createElement('dialog');renameDialog.id='rename-item';renameDialog.innerHTML='<form><h2>Rename item</h2><input aria-label="Item name" required maxlength="200"><div><button type="button">Cancel</button><button type="submit" class="primary">Rename</button></div></form>';
  const renameInput=renameDialog.querySelector('input');renameDialog.querySelector('[type=button]').onclick=()=>renameDialog.close();renameDialog.querySelector('form').onsubmit=event=>{event.preventDefault();const target=renameTarget,name=renameInput.value.trim();if(!name)return;renameDialog.close();mutate('Rename',()=>{const item=itemFor(target);if(item)item.title=name;});};document.body.append(renameDialog);
  const search=document.createElement('input');search.id='meeting-item-search';search.placeholder='Find in folder…';search.setAttribute('aria-label','Find in folder');search.oninput=scan;$('meeting-items').before(search);
  const hints=document.createElement('small');hints.className='editing-hint';hints.textContent='Drag to reorder · Delete to remove';$('meeting-items').before(hints);
  function toolbar(){undo.disabled=busy||!undoStack.length;redo.disabled=busy||!redoStack.length;}
  document.addEventListener('pointerdown',event=>{
    // Native scrollbar drags navigate; do not serialize or scan the library.
    const pane=event.target;
    if(pane instanceof HTMLElement&&(pane.scrollHeight>pane.clientHeight||pane.scrollWidth>pane.clientWidth)){
      const r=pane.getBoundingClientRect(),x=event.clientX-r.left-pane.clientLeft,y=event.clientY-r.top-pane.clientTop;
      if(x>=pane.clientWidth||y>=pane.clientHeight)return;
    }
    flushPendingSave();
    if(event.target.closest('#editing-tools'))return;group=editable(event.target)?'input:'+event.target.id:'action:'+ ++action;select(descriptor(event.target));
  },true);
  document.addEventListener('click',event=>{if(!editable(event.target))group='action:'+ ++action;},true);
  document.addEventListener('focusin',event=>{if(!editable(event.target)&&!event.target.closest('#editing-tools')){const value=descriptor(event.target);if(value)select(value);}});
  document.addEventListener('input',event=>{const next='input:'+event.target.id;if(group!==next)flushPendingSave();group=next;},true);
  document.addEventListener('change',event=>{if(event.target.type==='file')group='action:'+ ++action;},true);
  document.addEventListener('keydown',event=>{
    if(pointerDrag&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancelPointerDrag();return;}
    if(window.ProMaxPptxEditor?.handleKey(event))return;
    const modifier=event.ctrlKey||event.metaKey,key=event.key.toLowerCase(),text=editable(event.target);
    if(modifier&&(key==='z'||key==='y')){
      event.preventDefault();event.stopImmediatePropagation();const redoCommand=key==='y'||event.shiftKey;
      if(text&&document.execCommand(redoCommand?'redo':'undo'))return;
      history(redoCommand?'redo':'undo');return;
    }
    if(document.querySelector('dialog[open]')){event.stopImmediatePropagation();return;}
    if(modifier&&key==='s'){event.preventDefault();event.stopImmediatePropagation();if(save())notify('All changes saved');return;}
    if(modifier&&key==='f'){event.preventDefault();event.stopImmediatePropagation();find();return;}
    if(text||event.target.matches('input,select'))return;
    if(!modifier&&!event.altKey&&['arrowup','arrowdown'].includes(key)&&choice&&['item','song'].includes(choice.type)){
      const nodes=[...document.querySelectorAll(choice.type==='item'?'.meeting-item:not([hidden]) .meeting-item-open':'.song')],i=nodes.findIndex(n=>same(descriptor(n),choice)),next=nodes[i+(key==='arrowup'?-1:1)];
      if(next){event.preventDefault();event.stopImmediatePropagation();next.focus();next.click();}return;
    }
    if(key==='enter'&&['slide','prepared-slide'].includes(choice?.type)&&!event.target.closest('button,a[href],[role=button],summary')){
      event.preventDefault();event.stopImmediatePropagation();
      if(choice.type==='slide')goLive(indexFor(choice,collection(choice)));
      else{const item=itemFor(choice);if(item)ProMaxFeatures.showDeck({type:'bible',meetingItemId:item.id,title:item.title,slides:item.slides},indexFor(choice,item.slides));}
      return;
    }
    if(key==='delete'){event.preventDefault();event.stopImmediatePropagation();remove();}
    else if(modifier&&key==='d'){event.preventDefault();event.stopImmediatePropagation();duplicate();}
    else if(event.altKey&&['arrowup','arrowdown'].includes(key)){event.preventDefault();event.stopImmediatePropagation();move(choice,key==='arrowup'?-1:1);}
    else if(key==='f2'){event.preventDefault();event.stopImmediatePropagation();rename();}
    else if(key==='f1'){event.preventDefault();event.stopImmediatePropagation();window.ProMaxSettings?.open('shortcuts');}
    else if(!modifier&&['arrowleft','arrowright',' '].includes(key))group='action:'+ ++action;
  },true);
  // Keep the source stable for the entire native drag. Resolve gaps and child
  // images to the same saved identities used by keyboard editing and undo.
  let dropMark=null,dragPoint=null,scrollFrame=0,scrollTime=0,pointerDrag=null,suppressPointerClick=false;
  const gridCard=node=>node.matches('.slide-card,.prepared-slide,.document-slide');
  function canDrop(value,target){
    if(!value||!target)return false;
    if(value.type===target.type){
      if(value.type==='song')return !!songFor(value)&&!!songFor(target);
      if(value.type==='folder')return !!folderFor(value)&&!!folderFor(target);
      if(['video','document','youtube'].includes(value.type))return !!folderItem(value)&&!!folderItem(target);
      const list=collection(value);if(list&&list===collection(target))return indexFor(value,list)>=0&&indexFor(target,list)>=0;
    }
    return ['folder','item'].includes(target.type)&&!!folderFor(target)&&(target.type!=='item'||!!itemFor(target))&&!!folderItem(value);
  }
  function insertionAfter(node,point){
    const r=node.getBoundingClientRect();
    if(gridCard(node)){if(point.clientY<r.top)return false;if(point.clientY>r.bottom)return true;return point.clientX>r.left+r.width/2;}
    return point.clientY>r.top+r.height/2;
  }
  function targetFor(node,point){
    if(!(node instanceof Element)||node.closest('dialog,input,textarea,select,[contenteditable=true]'))return null;
    const row=node.closest('.song,.slide-card,.meeting-folder,.meeting-item,.prepared-slide,.asset-row,.youtube-card,.document-slide,.document-deck,.folder-drop-target');
    const value=row&&descriptor(row);
    if(value&&canDrop(drag,value))return {value,node:row,after:insertionAfter(row,point)};
    // A list's padding and the spaces between tiles are also valid targets.
    const list=node.closest('#meeting-items,#slides,.prepared-slides,.document-grid,#library,#meeting-folders,.asset-list,.youtube-library');
    if(list){
      let nearest=null,distance=Infinity;
      for(const child of list.children){const target=descriptor(child);if(!target||!canDrop(drag,target)||!child.getClientRects().length||child.hidden)continue;
        const r=child.getBoundingClientRect(),dx=Math.max(r.left-point.clientX,0,point.clientX-r.right),dy=Math.max(r.top-point.clientY,0,point.clientY-r.bottom),d=dx*dx+dy*dy;
        if(d<distance){distance=d;nearest={value:target,node:child,after:insertionAfter(child,point)};}
      }
      if(nearest)return nearest;
      if(list.id==='meeting-items'&&folderItem(drag))return {value:{type:'folder',folderId:meetingSelected},node:list,after:true};
    }
    if(node.closest('#meeting-overview')&&folderItem(drag))return {value:{type:'folder',folderId:meetingSelected},node:$('meeting-overview'),after:true};
    return null;
  }
  function markDrop(target){
    const style=target?(target.value.type==='folder'&&drag.type!=='folder'?'drop-into':target.after?'drop-after':'drop-before'):null;
    if(dropMark?.node===target?.node&&dropMark?.style===style)return;
    if(dropMark)dropMark.node.classList.remove(dropMark.style);dropMark=target?{node:target.node,style}:null;
    if(dropMark)dropMark.node.classList.add(style);
  }
  function stopScroll(){cancelAnimationFrame(scrollFrame);scrollFrame=0;scrollTime=0;dragPoint=null;}
  function clearDropTargets(){stopScroll();markDrop(null);document.getElementById('folder-drop-targets')?.remove();document.getElementById('meeting-drag-preview')?.remove();document.querySelector('.pointer-drag-source')?.classList.remove('pointer-drag-source');document.body.classList.remove('content-dragging');}
  function showDropTargets(){
    document.body.classList.add('content-dragging');
    if(folderItem(drag)&&meetingSelected){const targets=document.createElement('div');targets.id='folder-drop-targets';const label=document.createElement('small');label.textContent='Drop into a folder · Ctrl to copy';targets.append(label);for(const f of meetingFolders){const b=document.createElement('button');b.dataset.folderId=f.id;b.className='folder-drop-target';b.textContent=f.name;targets.append(b);}const r=document.querySelector('aside').getBoundingClientRect();targets.style.left=r.left+8+'px';targets.style.width=r.width-24+'px';targets.style.bottom=innerHeight-r.bottom+8+'px';document.body.append(targets);}
  }
  function releasePointer(value){if(value?.row.hasPointerCapture(value.id))value.row.releasePointerCapture(value.id);}
  function cancelPointerDrag(){const value=pointerDrag;pointerDrag=null;releasePointer(value);if(value?.active){suppressPointerClick=true;drag=null;clearDropTargets();}}
  // Meeting rows use pointer capture instead of the Windows native drag loop.
  // This also keeps a short click as "open" and a real drag as one undoable move.
  document.addEventListener('pointerdown',event=>{
    suppressPointerClick=false;
    const row=event.target.closest('.meeting-item');
    if(!row||event.button!==0||busy||document.querySelector('dialog[open]')||event.target.closest('.meeting-item-actions,input,textarea,select'))return;
    const value=descriptor(row);if(!itemFor(value))return;
    pointerDrag={id:event.pointerId,row,value,x:event.clientX,y:event.clientY,active:false};
  },true);
  document.addEventListener('pointermove',event=>{
    const pending=pointerDrag;if(!pending||pending.id!==event.pointerId)return;
    if(!pending.active){
      if(Math.hypot(event.clientX-pending.x,event.clientY-pending.y)<6)return;
      if(!pending.row.isConnected||!itemFor(pending.value)){cancelPointerDrag();return;}
      pending.active=true;clearDropTargets();drag=pending.value;choice=drag;showDropTargets();pending.row.classList.add('pointer-drag-source');
      pending.row.setPointerCapture(event.pointerId);
      const preview=document.createElement('div');preview.id='meeting-drag-preview';preview.textContent=itemFor(drag).title;preview.setAttribute('aria-hidden','true');document.body.append(preview);
    }
    event.preventDefault();dragPoint={clientX:event.clientX,clientY:event.clientY};
    const preview=$('meeting-drag-preview');preview.style.left=event.clientX+14+'px';preview.style.top=event.clientY+14+'px';
    markDrop(targetFor(document.elementFromPoint(event.clientX,event.clientY),event));if(!scrollFrame)scrollFrame=requestAnimationFrame(autoScroll);
  },true);
  document.addEventListener('pointerup',event=>{
    const pending=pointerDrag;if(!pending||pending.id!==event.pointerId)return;pointerDrag=null;
    if(!pending.active)return;
    event.preventDefault();event.stopImmediatePropagation();suppressPointerClick=true;
    const target=targetFor(document.elementFromPoint(event.clientX,event.clientY),event);releasePointer(pending);drag=null;clearDropTargets();
    if(target)void drop(pending.value,target.value,target.after,event.ctrlKey);
  },true);
  document.addEventListener('pointercancel',event=>{if(pointerDrag?.id===event.pointerId)cancelPointerDrag();},true);
  document.addEventListener('lostpointercapture',event=>{if(pointerDrag?.id===event.pointerId)cancelPointerDrag();},true);
  document.addEventListener('click',event=>{if(suppressPointerClick&&event.detail){suppressPointerClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  function autoScroll(time){
    scrollFrame=0;if(!drag||!dragPoint)return;
    const node=document.elementFromPoint(dragPoint.clientX,dragPoint.clientY);let pane=node?.closest('#folder-drop-targets,main>aside,main>.workspace');
    if(pane?.id==='folder-drop-targets'&&pane.scrollHeight<=pane.clientHeight)pane=document.querySelector('main>aside');
    const elapsed=scrollTime?Math.min(40,time-scrollTime):16;scrollTime=time;
    if(pane){const r=pane.getBoundingClientRect(),edge=Math.min(64,r.height/4),y=dragPoint.clientY;
      const speed=y<r.top+edge?-Math.min(1,(r.top+edge-y)/edge):y>r.bottom-edge?Math.min(1,(y-r.bottom+edge)/edge):0;
      if(speed){pane.scrollTop+=speed*elapsed*.8;markDrop(targetFor(document.elementFromPoint(dragPoint.clientX,y),dragPoint));}
    }
    scrollFrame=requestAnimationFrame(autoScroll);
  }
  document.addEventListener('dragstart',event=>{
    if(pointerDrag){event.preventDefault();return;}
    if(busy||document.querySelector('dialog[open]')||editable(event.target)||event.target.closest('input,select,video,a[href],.slide-edit-button,.meeting-item-actions,.feature-actions button')){event.preventDefault();return;}
    clearDropTargets();drag=descriptor(event.target);if(!drag||!event.dataTransfer){event.preventDefault();drag=null;return;}
    choice=drag;event.dataTransfer.setData('application/x-promax',JSON.stringify(drag));event.dataTransfer.effectAllowed='copyMove';
    showDropTargets();
  });
  document.addEventListener('dragover',event=>{
    if(!drag)return;dragPoint={clientX:event.clientX,clientY:event.clientY};if(!scrollFrame)scrollFrame=requestAnimationFrame(autoScroll);
    const target=targetFor(event.target,event);markDrop(target);
    event.preventDefault(); // Reject invalid internal drops without browser navigation.
    if(event.dataTransfer)event.dataTransfer.dropEffect=target?(target.value.type==='folder'&&drag.type!=='folder'||target.value.type==='item'&&drag.type!=='item'||drag.type==='item'&&event.ctrlKey?'copy':'move'):'none';
  });
  document.addEventListener('drop',event=>{
    if(!drag)return;event.preventDefault();event.stopPropagation();
    const source=drag,target=targetFor(event.target,event);drag=null;clearDropTargets();
    if(target)void drop(source,target.value,target.after,event.ctrlKey);
  });
  document.addEventListener('dragend',()=>{drag=null;clearDropTargets();});
  document.addEventListener('dragleave',event=>{if(!event.relatedTarget){stopScroll();markDrop(null);}});
  window.addEventListener('blur',()=>{cancelPointerDrag();drag=null;clearDropTargets();});
  const order=document.createElement('select');order.id='song-order';order.setAttribute('aria-label','Song order');
  for(const [value,label]of [['alphabetical','Order: A–Z'],['manual','Order: Custom (drag to reorder)']]){const option=document.createElement('option');option.value=value;option.textContent=label;order.append(option);}
  order.onchange=()=>mutate('Song order',()=>{settings.songOrder=order.value;});$('search').before(order);
  const originalSave=save;save=function(){normalize();changed();return originalSave();};
  const originalSetMedia=setMedia;setMedia=function(file){backgroundFile=file;const result=originalSetMedia(file);changed();return result;};
  const originalSelectVisual=selectVisual;selectVisual=function(id){if(id&&!ProMaxVisuals.presets.some(p=>p.id===id))return;backgroundFile=null;return originalSelectVisual(id);};
  // Preview text/animation changes must not rescan every draggable library row.
  const selectable='.song,.slide-card,.meeting-folder,.meeting-item,.prepared-slide,.asset-row,.youtube-card,.document-slide,.document-deck,.verse-row';
  new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches(selectable)||node.querySelector(selectable)))))scan();
  }).observe(document.querySelector('main'),{childList:true,subtree:true});
  const ready=Promise.all([ProMaxFeatures.ready,ProMaxYouTubeLibrary.ready,storedAsset('get',null,'background')]).then(([, ,file])=>{if(!backgroundFile&&media&&!settings.visual)backgroundFile=file;normalize();originalSave();setBaseline(take());enabled=true;renderLibrary();renderSlides();scan();toolbar();});
  window.ProMaxControls={ready,changed,undo:()=>history('undo'),redo:()=>history('redo'),remove,duplicate,move,drop,select,refresh,mutate,liveSlide:()=>liveSong?.state===state?{songId:liveSong.songId,slideId:liveSong.slideId}:null,get busy(){return busy;}};toolbar();
})();
