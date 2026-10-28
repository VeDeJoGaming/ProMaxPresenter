/* Navigation only: finding content never sends a new cue to the presentation. */
(() => {
  const dialog=document.createElement('dialog');dialog.id='quick-open';dialog.setAttribute('closedby','any');dialog.setAttribute('aria-labelledby','quick-open-title');
  dialog.innerHTML='<div class="quick-open-heading"><h2 id="quick-open-title">Quick open</h2><button type="button" aria-label="Close quick open">✕</button></div><p>Find a song or meeting. Opening it keeps the current presentation unchanged.</p><input id="quick-open-search" type="search" placeholder="Song title, lyrics or meeting name…" aria-label="Find songs and meetings" role="combobox" aria-expanded="true" aria-controls="quick-open-results" aria-autocomplete="list" autocomplete="off"><div id="quick-open-results" role="listbox" aria-label="Matching songs and meetings"></div><p id="quick-open-status" role="status"></p><small>↑ ↓ browse · Enter opens · Esc closes</small>';
  document.body.append(dialog);
  const input=$('quick-open-search'),list=$('quick-open-results'),status=$('quick-open-status');let matches=[],index=0,previousFocus=null;
  const launch=document.createElement('button');launch.id='quick-open-button';launch.textContent='Find · Ctrl+K';launch.onclick=open;document.querySelector('.header-actions').prepend(launch);
  dialog.querySelector('button').onclick=()=>dialog.close();
  function open(){if(document.querySelector('dialog[open]'))return;previousFocus=document.activeElement;input.value='';dialog.showModal();render();input.focus();}
  function choose(){const value=matches[index];if(!value)return;dialog.close('open');if(value.type==='song'){songFavoritesOnly=false;$('search').value='';ProMaxMeetings.select(null);selectSong(value.song.id);libraryRows.get(value.song.id)?.button.focus();}else{ProMaxMeetings.select(value.meeting.id);(document.querySelector('.meeting-item.active .meeting-item-open')||$('meeting-name')).focus();}}
  function mark(){for(const [i,b] of [...list.children].entries())b.setAttribute('aria-selected',String(i===index));const active=list.children[index];if(active){input.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
  function render(){
    const q=input.value.trim(),terms=ProMaxSongSearch.normalize(q).split(' ').filter(Boolean),favorites=songFavorites();
    let songMatches=ProMaxSongSearch.search(songs,q);if(!q)songMatches=songMatches.sort((a,b)=>Number(favorites.has(b.song.id))-Number(favorites.has(a.song.id))||ProMaxSongSearch.compare(a.song,b.song));
    const meetingMatches=meetingFolders.filter(f=>terms.every(t=>ProMaxSongSearch.normalize(f.name).includes(t))).sort((a,b)=>ProMaxSongSearch.compare({title:a.name},{title:b.name}));
    matches=[...songMatches.slice(0,30).map(r=>({...r,type:'song'})),...meetingMatches.slice(0,15).map(meeting=>({meeting,type:'meeting'}))];index=0;list.replaceChildren();
    for(const [i,value] of matches.entries()){
      const b=document.createElement('button');b.type='button';b.id='quick-result-'+i;b.setAttribute('role','option');b.tabIndex=-1;
      const title=document.createElement('strong'),detail=document.createElement('small');
      title.textContent=value.type==='song'?value.song.title||'Untitled song':value.meeting.name;
      detail.textContent=value.type==='song'?(favorites.has(value.song.id)?'★ Favorite · ':'')+(value.snippet||'Song · '+value.song.slides.length+' slides'):'Meeting · '+value.meeting.items.length+' items';b.append(title,detail);b.onclick=()=>{index=i;choose();};list.append(b);
    }
    const total=songMatches.length+meetingMatches.length;status.textContent=total?`${total} ${total===1?'match':'matches'}${total>matches.length?' · Showing '+matches.length+'. Refine your search for more.':''}`:'No matching songs or meetings.';mark();
  }
  input.oninput=render;
  dialog.addEventListener('close',()=>{input.removeAttribute('aria-activedescendant');if(dialog.returnValue!=='open'&&previousFocus?.isConnected)previousFocus.focus();dialog.returnValue='';});
  window.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.altKey){if(document.querySelector('dialog[open]')&&!dialog.open)return;event.preventDefault();event.stopImmediatePropagation();if(dialog.open)dialog.close();else open();return;}
    if(!dialog.open)return;
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.stopImmediatePropagation();return;}
    if(['ArrowDown','ArrowUp','Enter','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Escape')dialog.close();else if(event.key==='Enter')choose();else if(matches.length){index=(index+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;mark();}
    }
  },true);
})();
