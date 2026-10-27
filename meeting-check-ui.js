/* Read-only preflight. Repairs are explicit, undoable library operations. */
(() => {
  const dialog=document.createElement('dialog');dialog.id='meeting-check';dialog.setAttribute('aria-labelledby','meeting-check-title');
  dialog.innerHTML='<div class="meeting-check-heading"><div><h2 id="meeting-check-title">Meeting check</h2><p id="meeting-check-name"></p></div><button id="meeting-check-close" aria-label="Close meeting check">✕</button></div><p class="feature-help">Checks saved content and local files without starting playback. YouTube availability, ads and buffering are not checked.</p><div id="meeting-check-summary" role="status" aria-live="polite"></div><div class="feature-actions"><button id="meeting-check-again">Check again</button><label class="check-label"><input id="meeting-check-issues" type="checkbox"> Only items to review</label></div><p id="meeting-check-message" role="status"></p><section id="meeting-check-repair" hidden><h3>Choose a replacement</h3><input id="meeting-repair-search" type="search" placeholder="Find replacement…" aria-label="Find replacement"><div id="meeting-repair-options"></div><button id="meeting-repair-cancel">Cancel replacement</button></section><div id="meeting-check-results"></div>';
  document.body.append(dialog);
  const el=id=>document.getElementById(id),launch=document.createElement('button');launch.id='meeting-check-open';launch.textContent='Check meeting';launch.type='button';el('meeting-banner').insertBefore(launch,el('meeting-notes'));
  let controller=null,epoch=0,meetingId=null,report=null,repairId=null,busy=false;
  const rows=new Map(),labels={ready:'Available offline',attention:'Needs attention',online:'Internet required',unverified:'Not verified',checking:'Checking…'};
  const catalog=()=>({songs,videos:ProMaxFeatures.getVideos(),documents:ProMaxFeatures.getDocuments(),youtube:ProMaxYouTubeLibrary.list()});
  const currentFolder=()=>meetingFolders.find(f=>f.id===meetingId);
  function text(tag,value){const n=document.createElement(tag);n.textContent=value;return n;}
  function button(label,action){const b=text('button',label);b.type='button';b.onclick=action;return b;}
  function filter(){const statuses=new Map(report?.rows.map(r=>[r.itemId,r.status])||[]);for(const[id,row]of rows)row.article.hidden=el('meeting-check-issues').checked&&statuses.get(id)==='ready';}
  function draw(value){
    report=value;const ids=new Set(value.rows.map(r=>r.itemId));for(const [id,row]of rows)if(!ids.has(id)){row.article.remove();rows.delete(id);}
    for(const result of value.rows){let row=rows.get(result.itemId);if(!row){const article=document.createElement('article');article.dataset.checkItem=result.itemId;article.className='meeting-check-row';const heading=text('h3',''),badge=text('span',''),detail=text('p',''),actions=document.createElement('div');actions.className='feature-actions';
      const open=button('Open item',()=>{const item=currentFolder()?.items.find(i=>i.id===result.itemId);if(item){dialog.close();ProMaxMeetings.open(item);}});
      const fix=button('Choose replacement',()=>showRepair(result.itemId)),generate=button('Generate slides',()=>generateSlides(result.itemId));actions.append(open,fix,generate);article.append(heading,badge,detail,actions);row={article,heading,badge,detail,fix,generate};rows.set(result.itemId,row);}
      row.heading.textContent=`${result.position+1}. ${result.title}`;row.badge.textContent=labels[result.status];row.badge.className='meeting-check-badge '+result.status;row.detail.textContent=result.message;row.fix.hidden=result.action!=='replace';row.generate.hidden=result.action!=='generate';const list=el('meeting-check-results');if(list.children[result.position]!==row.article)list.insertBefore(row.article,list.children[result.position]||null);
    }
    const c=value.counts;el('meeting-check-summary').textContent=value.total?`${c.ready} offline · ${c.attention} need attention · ${c.online} online · ${c.unverified+c.checking} not verified`:'This meeting is empty. Add content from the running order.';filter();
  }
  async function storedVideos(ids,signal){const db=await dbPromise;if(signal.aborted)throw new DOMException('Cancelled','AbortError');return new Promise((resolve,reject)=>{const values=new Map(),tx=db.transaction('assets','readonly');for(const id of ids){const request=tx.objectStore('assets').get('video:'+id);request.onsuccess=()=>values.set(id,request.result);}const abort=()=>{try{tx.abort();}catch{}};signal.addEventListener('abort',abort,{once:true});tx.oncomplete=()=>{signal.removeEventListener('abort',abort);resolve(values);};tx.onabort=tx.onerror=()=>{signal.removeEventListener('abort',abort);reject(Error('Video storage could not be read.'));};});}
  function probe(file,signal){return new Promise(resolve=>{
    if(signal.aborted)return resolve({status:'unverified',message:'Check cancelled.'});
    if(!(file instanceof Blob)||!file.size)return resolve({status:'attention',message:'The saved video file is missing or empty.'});
    const video=document.createElement('video'),url=URL.createObjectURL(file);let done=false;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);video.onloadedmetadata=video.onerror=null;video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);resolve(value);};
    const abort=()=>finish({status:'unverified',message:'Check cancelled.'}),timer=setTimeout(()=>finish({status:'unverified',message:'File exists, but video metadata timed out. Preview it before presenting.'}),5000);
    signal.addEventListener('abort',abort,{once:true});video.muted=true;video.volume=0;video.preload='metadata';
    video.onloadedmetadata=()=>finish(video.videoWidth&&video.videoHeight?{status:'ready',message:`Saved video found · ${Number.isFinite(video.duration)?Math.floor(video.duration/60)+':'+String(Math.floor(video.duration%60)).padStart(2,'0')+' · ':''}Playback has not been started.`}:{status:'attention',message:'The file has no readable video track.'});
    video.onerror=()=>finish({status:'attention',message:'The video format could not be read. Preview or replace the file.'});video.src=url;video.load();
  });}
  function fingerprint(folder,data){if(!folder)return '';const songIds=new Set(folder.items.map(i=>i.songId)),assetIds=new Set(folder.items.map(i=>i.assetId));return JSON.stringify([folder.items,data.songs.filter(s=>songIds.has(s.id)),data.videos.filter(v=>assetIds.has(v.id)),data.documents.filter(d=>assetIds.has(d.id)),data.youtube.filter(y=>assetIds.has(y.id))]);}
  async function scan(){
    controller?.abort();controller=new AbortController();const signal=controller.signal,token=++epoch;rows.clear();el('meeting-check-results').replaceChildren();el('meeting-check-repair').hidden=true;el('meeting-check-message').textContent='Checking…';el('meeting-check-again').disabled=true;
    try{
      await Promise.all([ProMaxFeatures.ready,ProMaxYouTubeLibrary.ready]);const folder=currentFolder();if(!folder||signal.aborted)return;
      const snapshot=structuredClone(folder),data=catalog(),stamp=fingerprint(snapshot,data),evidence={videos:new Map(),files:new Map()};let value=ProMaxMeetingChecks.assess(snapshot,data,evidence);draw(value);
      const videoIds=[...new Set(value.rows.map(r=>r.videoId).filter(Boolean))],urls=[...new Set(value.rows.flatMap(r=>r.urls||[]))];
      const update=()=>{if(signal.aborted||token!==epoch||!dialog.open)return;value=ProMaxMeetingChecks.assess(snapshot,data,evidence);draw(value);};
      await Promise.all([
        (async()=>{if(!videoIds.length)return;let files;try{files=await storedVideos(videoIds,signal);}catch{for(const id of videoIds)evidence.videos.set(id,{status:'unverified',message:'Saved video storage could not be read.'});update();return;}let next=0;await Promise.all(Array.from({length:Math.min(2,videoIds.length)},async()=>{while(next<videoIds.length&&!signal.aborted){const id=videoIds[next++];evidence.videos.set(id,await probe(files.get(id),signal));update();}}));})(),
        (async()=>{for(let i=0;i<urls.length&&!signal.aborted;i+=128){const batch=urls.slice(i,i+128);let result;try{result=await window.promaxDesktop?.checkPresentationFiles(batch);}catch{}for(const url of batch)evidence.files.set(url,result?.files?.find(f=>f.url===url)||{url,status:'unverified'});update();}})()
      ]);
      if(signal.aborted||token!==epoch)return;
      if(stamp!==fingerprint(currentFolder(),catalog())){el('meeting-check-message').textContent='Content changed during the check. Check again for current results.';return;}
      el('meeting-check-message').textContent='Checked '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'. Check again after changing or importing content.';
    }catch(error){if(!signal.aborted)el('meeting-check-message').textContent=error.message||'The meeting could not be checked.';}
    finally{if(token===epoch)el('meeting-check-again').disabled=false;}
  }
  function choices(type){const data=catalog();return type==='song'?data.songs.filter(s=>!ProMaxSongSearch.isEmpty(s)).map(s=>({id:s.id,title:s.title,lyrics:s.lyrics})):type==='video'?data.videos.map(v=>({id:v.id,title:v.name})):type==='document'?data.documents.filter(d=>d.slides?.length).map(d=>({id:d.id,title:d.title})):type==='youtube'?data.youtube.map(y=>({id:y.id,title:y.title})):[];}
  function renderChoices(){const item=currentFolder()?.items.find(i=>i.id===repairId),list=el('meeting-repair-options');list.replaceChildren();if(!item)return;const q=el('meeting-repair-search').value;const all=ProMaxSongSearch.search(choices(item.type),q);for(const {song:value}of all.slice(0,60))list.append(button(value.title||'Untitled',()=>replace(item.id,value.id)));if(!all.length)list.append(text('p','No matching replacements. Import content in the library first.'));if(all.length>60)list.append(text('p','Showing 60 matches. Refine your search for more.'));}
  function showRepair(id){repairId=id;el('meeting-check-repair').hidden=false;el('meeting-repair-search').value='';renderChoices();el('meeting-repair-search').focus();}
  async function change(label,operation){if(busy||ProMaxControls.busy)return;busy=true;controller?.abort();try{await ProMaxControls.mutate(label,operation);await scan();}catch(error){el('meeting-check-message').textContent=error.message;}finally{busy=false;}}
  async function replace(id,sourceId){await change('Replace meeting item',()=>{const item=currentFolder()?.items.find(i=>i.id===id),source=item&&choices(item.type).find(v=>v.id===sourceId);if(!item||!source)throw Error('This item changed. Check again.');if(item.type==='song')item.songId=sourceId;else item.assetId=sourceId;item.title=source.title;});}
  async function generateSlides(id){await change('Generate meeting song slides',()=>{const item=currentFolder()?.items.find(i=>i.id===id),song=songs.find(s=>s.id===item?.songId);if(!song||song.slides.length)throw Error('The song changed. Check again.');const slides=parseLyrics(song.lyrics,song.lines);if(!slides.length)throw Error('This song has no slide text to generate.');song.slides=slides;});}
  launch.onclick=()=>{const folder=ProMaxMeetings.folder();if(!folder)return;meetingId=folder.id;el('meeting-check-name').textContent=folder.name;el('meeting-check-issues').checked=false;dialog.showModal();scan();};
  el('meeting-check-close').onclick=()=>dialog.close();el('meeting-check-again').onclick=scan;el('meeting-check-issues').onchange=filter;el('meeting-repair-search').oninput=renderChoices;el('meeting-repair-cancel').onclick=()=>{el('meeting-check-repair').hidden=true;};
  dialog.addEventListener('close',()=>{controller?.abort();epoch++;rows.clear();report=null;repairId=null;el('meeting-check-results').replaceChildren();});
})();
