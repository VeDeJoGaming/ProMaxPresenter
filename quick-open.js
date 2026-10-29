/* Navigation only: finding content never sends a new cue to the presentation. */
(() => {
  const dialog=document.createElement('dialog');dialog.id='quick-open';dialog.setAttribute('closedby','any');dialog.setAttribute('aria-labelledby','quick-open-title');
  dialog.innerHTML='<div class="quick-open-heading"><h2 id="quick-open-title">Quick open</h2><button type="button" aria-label="Close quick open">✕</button></div><p>Find songs, meetings, Bible verses or media. Opening a result keeps the current presentation unchanged.</p><input id="quick-open-search" type="search" placeholder="Title, lyrics, Bible reference or words…" aria-label="Find songs, meetings, Bible and media" role="combobox" aria-expanded="true" aria-controls="quick-open-results" aria-autocomplete="list" autocomplete="off"><div id="quick-open-filters" role="group" aria-label="Search content type"></div><div id="quick-open-results" role="listbox" aria-label="Matching content"></div><p id="quick-open-status" role="status" aria-live="polite"></p><small>↑ ↓ browse · Enter opens · Esc closes</small>';
  document.body.append(dialog);
  const input=$('quick-open-search'),list=$('quick-open-results'),status=$('quick-open-status');let matches=[],index=0,previousFocus=null,group='all';
  const launch=document.createElement('button');launch.id='quick-open-button';launch.textContent='Find · Ctrl+K';launch.onclick=open;document.querySelector('.header-actions').prepend(launch);
  dialog.querySelector('button').onclick=()=>dialog.close();
  const filters=new Map();for(const [id,label]of [['all','All'],['songs','Songs'],['meetings','Meetings'],['bible','Bible'],['media','Media']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.quickFilter=id;b.onclick=()=>{group=id;render();input.focus();};filters.set(id,b);$('quick-open-filters').append(b);
  }
  function catalog(){return {songs,meetings:meetingFolders,bible:ProMaxFeatures.getBible(),videos:ProMaxFeatures.getVideos(),documents:ProMaxFeatures.getDocuments(),youtube:ProMaxYouTubeLibrary.list()};}
  function open(){
    if(document.querySelector('dialog[open]'))return;previousFocus=document.activeElement;input.value='';group='all';dialog.showModal();render();input.focus();
    Promise.all([ProMaxFeatures.ready,ProMaxYouTubeLibrary.ready]).then(()=>{if(dialog.open)render();}).catch(()=>{if(dialog.open)status.textContent='Some saved content could not be loaded. Close and try again.';});
  }
  function choose(){
    const value=matches[index];if(!value)return;dialog.close('open');
    if(value.type==='song'){
      if(!songs.some(s=>s.id===value.source.id)){notify('This song is no longer available. Search again.');return;}
      songFavoritesOnly=false;$('search').value='';ProMaxMeetings.select(null);selectSong(value.source.id);libraryRows.get(value.source.id)?.button.focus();
    }else if(value.type==='meeting'){
      if(!meetingFolders.some(f=>f.id===value.source.id)){notify('This meeting is no longer available. Search again.');return;}
      ProMaxMeetings.select(value.source.id);(document.querySelector('.meeting-item.active .meeting-item-open')||$('meeting-name')).focus();
    }else{
      ProMaxMeetings.select(null);
      if(value.type==='bible'){if(!ProMaxFeatures.openBibleReference(value.source))notify('This Bible was replaced. Search again.');}
      else if(value.type==='youtube'){
        const entry=ProMaxYouTubeLibrary.list().find(e=>e.id===value.source.id);if(!entry){notify('This YouTube entry is no longer available. Search again.');return;}
        ProMaxYouTubeLibrary.open(entry);document.querySelector('.youtube-card')?.focus();
      }else{
        const values=value.type==='video'?ProMaxFeatures.getVideos():ProMaxFeatures.getDocuments();if(!values.some(v=>v.id===value.source.id)){notify('This media is no longer available. Search again.');return;}
        ProMaxFeatures.openMeetingMedia(value.type==='video'?'videos':'presentations',value.source.id);const heading=$('feature-view').querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus();}
      }
    }
  }
  function mark(){for(const [i,b]of [...list.children].entries())b.setAttribute('aria-selected',String(i===index));const active=list.children[index];if(active){input.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
  function render(){
    for(const [id,b]of filters)b.setAttribute('aria-pressed',String(id===group));
    const data=catalog(),found=ProMaxQuickOpenSearch.find(data,input.value,group,[...songFavorites()]);matches=found.results;index=0;list.replaceChildren();
    for(const [i,value]of matches.entries()){
      const b=document.createElement('button');b.type='button';b.id='quick-result-'+i;b.setAttribute('role','option');b.tabIndex=-1;b.dataset.quickType=value.type;
      const title=document.createElement('strong'),detail=document.createElement('small');title.textContent=value.title;detail.textContent=value.detail;b.append(title,detail);b.onclick=()=>{index=i;choose();};list.append(b);
    }
    status.textContent=group==='bible'&&!data.bible?'No Bible imported. Add one in Settings → Bible.':group==='bible'&&input.value.trim().length<2?'Type a Bible reference or at least two characters to search.':found.total?found.total+' '+(found.total===1?'match':'matches')+(found.total>matches.length?' · Showing '+matches.length+'. Refine your search for more.':''):'No matching content.';mark();
  }
  input.oninput=render;document.addEventListener('promax:bible-changed',()=>{if(dialog.open)render();});
  dialog.addEventListener('close',()=>{input.removeAttribute('aria-activedescendant');if(dialog.returnValue!=='open'&&previousFocus?.isConnected)previousFocus.focus();dialog.returnValue='';});
  window.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.altKey){if(document.querySelector('dialog[open]')&&!dialog.open)return;event.preventDefault();event.stopImmediatePropagation();if(dialog.open)dialog.close();else open();return;}
    if(!dialog.open)return;
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.stopImmediatePropagation();return;}
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dialog.close();return;}
    if(event.target!==input&&!list.contains(event.target))return;
    if(['ArrowDown','ArrowUp','Enter'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();if(event.key==='Enter')choose();else if(matches.length){index=(index+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;mark();}
    }
  },true);
})();