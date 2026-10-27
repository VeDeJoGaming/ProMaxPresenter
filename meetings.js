(() => {
  let activeItem=null;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const button=(text,action,label)=>{const b=node('button',text);b.type='button';b.onclick=action;if(label)b.setAttribute('aria-label',label);return b;};
  const folder=()=>meetingFolders.find(f=>f.id===meetingSelected);
  function create(name) {
    const f={id:uid(),name:name.trim()||'Untitled meeting',items:[]};
    meetingFolders.push(f);meetingSelected=f.id;activeItem=null;save();render();showOverview();return f;
  }
  function select(id) {
    meetingSelected=id;activeItem=null;save();render();
    const f=folder(),item=f?.items.find(i=>i.id===f.selectedItem)||f?.items[0];
    if(item)open(item);else showOverview();
  }
  function add(item) {
    const f=folder();if(!f){notify('Choose or create a meeting folder first.');return;}
    f.items.push({...item,id:uid()});save();render();notify('Added to '+f.name);
  }
  function addSong(song=current()) {add({type:'song',songId:song.id,title:song.title});}
  function title(item) {
    if(item.type==='song')return songs.find(s=>s.id===item.songId)?.title||item.title+' (unavailable)';
    return item.title;
  }
  async function open(item,live=false) {
    const f=folder();if(!f?.items.some(i=>i.id===item.id))return;
    activeItem=item.id;f.selectedItem=item.id;save();render();
    if(['video','document','youtube'].includes(item.type)){
      await ProMaxFeatures.ready;if(item.type==='youtube')await ProMaxYouTubeLibrary.ready;
      if(activeItem!==item.id||folder()!==f)return;
    }
    if(item.type==='song'){
      const song=songs.find(s=>s.id===item.songId);if(!song){showMissing(item);return;}
      selectSong(song.id);if(live)goLive(0);
    } else if(item.type==='bible'||item.type==='text'){
      // Presenting is explicit; selecting the entry only previews its prepared slides.
      showPrepared(item,live);
    } else if(item.type==='video'){
      const asset=ProMaxFeatures.getVideos().find(a=>a.id===item.assetId);
      if(!asset){showMissing(item);return;}
      ProMaxFeatures.openMeetingMedia('videos',asset.id);if(live)await ProMaxFeatures.playVideo(asset);
    } else if(item.type==='document'){
      const doc=ProMaxFeatures.getDocuments().find(d=>d.id===item.assetId);
      if(!doc){showMissing(item);return;}
      ProMaxFeatures.openMeetingMedia('presentations',doc.id);if(live)ProMaxFeatures.showDeck({...doc,type:'document'},0);
    } else if(item.type==='youtube'){
      const entry=ProMaxYouTubeLibrary.list().find(e=>e.id===item.assetId);
      if(!entry){showMissing(item);return;}
      ProMaxYouTubeLibrary.open(entry);if(live)await ProMaxYouTubeLibrary.play(entry);
    }
    if(['video','document','youtube'].includes(item.type)){const heading=$('feature-view').querySelector('h2');if(heading)heading.textContent=item.title;}
    render();
  }
  function showPrepared(item,live=false){
    ProMaxFeatures.showTab('songs');
    const view=$('feature-view');
    for(const child of document.querySelector('.workspace').children)if(child!==view&&child.id!=='meeting-banner'&&!child.classList.contains('workspace-tabs'))child.hidden=true;
    view.hidden=false;view.replaceChildren(node('h2',item.title),node('p','Prepared for this meeting · Click a slide to show it live'));
    const grid=node('div');grid.className='prepared-slides';
    item.slides.forEach((slide,index)=>{
      const b=button('',()=>ProMaxFeatures.showDeck({type:'bible',meetingItemId:item.id,title:item.title,slides:item.slides},index));
      b.className='prepared-slide';b.dataset.folderId=folder().id;b.dataset.itemId=item.id;b.dataset.slideId=slide.id;b.setAttribute('aria-label',item.title+', slide '+(index+1));b.setAttribute('aria-pressed','false');
      const thumbnail=node('div');thumbnail.className='thumbnail';thumbnail.style.background=settings.color;addMedia(thumbnail,true,slide.section);
      const text=node('div');text.className='caption';ProMaxPlayback.renderText(text,slide);thumbnail.append(text);
      const label=node('span',`${index+1} · ${slide.label||'Text'}`);label.className='prepared-slide-label';b.append(thumbnail,label);grid.append(b);
    });grid.dataset.meetingItem=item.id;view.append(grid);
    if(live)ProMaxFeatures.showDeck({type:'bible',meetingItemId:item.id,title:item.title,slides:item.slides},0);
  }
  function showMissing(item){
    ProMaxFeatures.showTab('songs');const view=$('feature-view');
    for(const child of document.querySelector('.workspace').children)if(child!==view&&child.id!=='meeting-banner'&&!child.classList.contains('workspace-tabs'))child.hidden=true;
    view.hidden=false;view.replaceChildren(node('h2',item.title),node('p','This item is no longer in your library. Add a replacement or remove it from the folder.'));
  }
  function move(index,delta){const f=folder(),target=index+delta;if(!f||target<0||target>=f.items.length)return;[f.items[index],f.items[target]]=[f.items[target],f.items[index]];save();render();}
  function remove(index){const f=folder();if(!f)return;const [removed]=f.items.splice(index,1);if(!removed)return;const wasActive=activeItem===removed.id;if(wasActive){activeItem=null;delete f.selectedItem;}save();render();if(wasActive){const next=f.items[Math.min(index,f.items.length-1)];if(next)open(next);else showOverview();}}
  function showOverview(){
    ProMaxFeatures.showTab('songs');
    const overview=$('meeting-overview');
    $('meeting-banner').hidden=!folder();
    if(!folder()){overview.hidden=true;return;}
    for(const child of document.querySelector('.workspace').children)if(child!==overview&&child.id!=='meeting-banner'&&!child.classList.contains('workspace-tabs'))child.hidden=true;
    overview.hidden=false;overview.replaceChildren(node('h2',folder().name),node('p',folder().items.length?'Choose an item in the left sidebar to open its slides or video.':'This folder is empty. Add songs, Bible passages, videos or presentations using the left sidebar.'));
  }
  function render(){
    const f=folder();$('meeting-folders').replaceChildren();
    $('meeting-folder-browser').hidden=!!f;
    document.querySelector('.workspace-tabs').hidden=!!f;
    meetingFolders.forEach(entry=>{const b=button('',()=>select(entry.id));b.className='meeting-folder';b.dataset.folderId=entry.id;b.setAttribute('aria-pressed',String(entry===f));b.append(node('span','▱ '+entry.name),node('small',String(entry.items.length)));$('meeting-folders').append(b);});
    $('all-library').setAttribute('aria-pressed',String(!f));
    document.querySelector('[data-tab="songs"]').textContent=f?'Meeting':'Songs';
    $('song-library-area').hidden=!!f;$('meeting-plan').hidden=!f;$('meeting-banner').hidden=!f;
    $('add-song-meeting').hidden=!f||f.items.some(item=>item.type==='song'&&item.songId===selected);
    if(!f)return;
    updateNotes();
    $('meeting-folder-title').textContent=f.name;
    if(document.activeElement!==$('meeting-name'))$('meeting-name').value=f.name;
    $('meeting-items').replaceChildren();$('meeting-count').textContent=`${f.items.length} items`;
    for(const [index,item] of f.items.entries()){
      const row=node('div');row.className='meeting-item'+(activeItem===item.id?' active':'');row.dataset.folderId=f.id;row.dataset.itemId=item.id;
      const selectButton=button('',()=>open(item));selectButton.className='meeting-item-open';selectButton.setAttribute('aria-pressed',String(activeItem===item.id));selectButton.append(node('small',`${index+1} · ${item.type==='document'?'PowerPoint':item.type}`),node('span',title(item)));
      const noteFlag=node('small','✎ Operator note');noteFlag.className='meeting-item-note';noteFlag.hidden=!item.operatorNotes?.trim();selectButton.append(noteFlag);
      const actions=node('div');actions.className='meeting-item-actions';
      actions.append(button('×',()=>remove(index),'Remove '+title(item)+' from this meeting'));
      row.append(selectButton,actions);$('meeting-items').append(row);
    }
    if(!f.items.length)$('meeting-items').append(node('p','Add only what you need for this meeting.'));
  }
  function renderPicker(){
    const q=$('meeting-song-search').value;const list=$('meeting-song-options');list.replaceChildren();
    ProMaxSongSearch.search(songs,q).forEach(({song,snippet})=>{const option=button(song.title,()=>addSong(song));if(snippet){const excerpt=node('small',snippet);excerpt.className='song-search-excerpt';option.append(excerpt);}list.append(option);});
    if(!list.children.length)list.append(node('p','No matching songs.'));
  }
  const workspace=document.querySelector('.workspace');
  const aside=document.querySelector('aside'),browser=node('div');browser.id='meeting-folder-browser';
  const folderHeading=aside.querySelector('.section-title');browser.append(folderHeading,$('meeting-folders'),$('all-library'));aside.prepend(browser);
  $('meeting-plan').prepend(button('← Meetings',()=>select(null),'Back to meeting folders'));
  const planHeading=$('meeting-plan').querySelector('.section-title'),count=$('meeting-count');
  const folderTitle=node('span');folderTitle.id='meeting-folder-title';planHeading.replaceChildren(folderTitle,count);
  const addMenu=node('details');addMenu.id='meeting-add-content';addMenu.append(node('summary','＋ Add content'));
  for(const [label,tab] of [['Bible passages','bible'],['Videos & YouTube','videos'],['PowerPoint','presentations']])addMenu.append(button(label,()=>{addMenu.open=false;ProMaxFeatures.showTab(tab);render();}));
  addMenu.append(button('Text',()=>{addMenu.open=false;$('quick-text').closest('details').open=true;$('quick-text').focus();}));
  $('meeting-plan').append(addMenu);
  const banner=node('div');banner.id='meeting-banner';banner.hidden=true;
  const name=node('input');name.id='meeting-name';name.setAttribute('aria-label','Meeting name');
  name.oninput=()=>{const f=folder();if(f){f.name=name.value;scheduleSave();render();}};
  banner.append(name,button('Delete folder',()=>{const f=folder();if(!f)return;if(window.ProMaxControls){ProMaxControls.remove({type:'folder',folderId:f.id});return;}if(!confirm(`Delete the folder “${f.name}”? Songs and media remain in your library.`))return;meetingFolders=meetingFolders.filter(entry=>entry!==f);meetingSelected=null;activeItem=null;save();ProMaxFeatures.showTab('songs');render();}));
  const notes=node('details');notes.id='meeting-notes';const noteHeading=node('summary','Operator notes'),noteInput=node('textarea');noteInput.id='meeting-operator-note';noteInput.rows=3;noteInput.maxLength=8000;noteInput.setAttribute('aria-label','Operator notes');noteInput.placeholder='Reminders for the operator…';
  notes.append(noteHeading,node('p','Saved with this meeting. These notes never appear on the presentation screen.'),noteInput);banner.append(notes);
  function noteTarget(){const f=folder();return f?.items.find(item=>item.id===activeItem)||f;}
  function updateNotes(){const target=noteTarget();if(!target)return;const key=folder().id+':'+target.id;
    if(noteInput.dataset.target!==key){noteInput.dataset.target=key;noteInput.value=target.operatorNotes||'';notes.open=!!target.operatorNotes?.trim();}
    else if(document.activeElement!==noteInput)noteInput.value=target.operatorNotes||'';
    noteHeading.textContent='Operator notes · '+(target===folder()?'Meeting':title(target));
  }
  noteInput.oninput=()=>{const target=noteTarget();if(!target)return;target.operatorNotes=noteInput.value;scheduleSave();
    const row=[...$('meeting-items').children].find(row=>row.dataset.itemId===target.id),flag=row?.querySelector('.meeting-item-note');if(flag)flag.hidden=!noteInput.value.trim();
  };
  workspace.insertBefore(banner,workspace.firstChild);
  const overview=node('section');overview.id='meeting-overview';overview.hidden=true;workspace.append(overview);
  const lyrics=document.querySelector('.editor');const fold=node('details');fold.id='lyrics-fold';fold.open=false;fold.append(node('summary','Edit lyrics & slide settings'));lyrics.replaceWith(fold);fold.append(lyrics);
  for(const panel of document.querySelectorAll('.control .panel')){
    const fold=node('details');fold.className='control-fold';const title=panel.querySelector('.section-title');fold.append(node('summary',title.textContent));title.remove();panel.replaceWith(fold);fold.append(panel);
  }
  $('new-meeting').onclick=()=>{$('meeting-new-name').value='';$('meeting-new').showModal();$('meeting-new-name').focus();};
  $('meeting-new-form').onsubmit=e=>{e.preventDefault();create($('meeting-new-name').value);$('meeting-new').close();};
  $('meeting-new-close').onclick=()=>$('meeting-new').close();
  $('all-library').onclick=()=>{select(null);};
  $('meeting-add-song').onclick=()=>{renderPicker();$('meeting-song-picker').showModal();};
  $('meeting-song-search').oninput=renderPicker;$('meeting-song-close').onclick=()=>$('meeting-song-picker').close();
  $('meeting-new-song').onclick=()=>{$('new-song').click();addSong();open(folder().items.at(-1));};
  const newSong=$('new-song').onclick;$('new-song').onclick=()=>{newSong();$('lyrics-fold').open=true;};
  $('add-song-meeting').onclick=()=>addSong();
  const originalLibrary=renderLibrary;renderLibrary=function(){originalLibrary();render();};
  const originalSelect=selectSong;selectSong=function(id){const result=originalSelect(id);$('meeting-banner').hidden=!folder();return result;};
  // Feature tabs hide other workspace content; the meeting context remains visible.
  document.querySelector('.workspace-tabs').addEventListener('click',()=>{$('meeting-banner').hidden=!folder();});
  $('quick-add-meeting').onclick=()=>{const text=$('quick-text').value.trim();if(!text){notify('Write the text you want to add first.');return;}add({type:'text',title:text.split('\n')[0].slice(0,80),slides:[{text,label:'Text'}]});};
  function onTab(){overview.hidden=true;banner.hidden=!folder();document.querySelector('.workspace-tabs').hidden=!!folder();}
  function markSlide(id,index){const grid=$('feature-view').querySelector('.prepared-slides');if(!grid||grid.dataset.meetingItem!==id)return;[...grid.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
  window.ProMaxMeetings={create,select,add,addSong,open,move,remove,render,folder,onTab,markSlide,refresh:()=>{const f=folder();const item=f?.items.find(i=>i.id===f.selectedItem);render();if(item)open(item);else if(f)showOverview();else selectSong(selected)}};
  render();if(folder())select(meetingSelected);
})();
