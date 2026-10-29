/* Planning and export never send a presentation cue. */
(() => {
  const $=id=>document.getElementById(id),api=ProMaxMeetingPlan;
  const dialog=document.createElement('dialog');dialog.id='meeting-plan-dialog';dialog.setAttribute('aria-labelledby','meeting-plan-title');dialog.setAttribute('closedby','any');
  dialog.innerHTML='<div class="running-sheet-heading"><div><span class="eyebrow">MEETING PLANNING</span><h2 id="meeting-plan-title">Running sheet</h2><p id="meeting-plan-name"></p></div><button id="meeting-plan-close" type="button" aria-label="Close running sheet">✕</button></div><div class="running-sheet-tools"><label>Meeting starts<input id="meeting-plan-start" type="time" aria-describedby="meeting-plan-help"></label><label class="check-label"><input id="meeting-plan-notes" type="checkbox"> Include operator notes</label><div class="feature-actions"><button id="meeting-plan-copy" type="button">Copy text</button><button id="meeting-plan-pdf" type="button" class="primary">Save PDF</button></div></div><p id="meeting-plan-help">Set a duration in minutes for each item. Times are a plan; they do not start playback or a countdown.</p><p id="meeting-plan-summary" role="status" aria-live="polite"></p><div id="meeting-plan-meeting-notes" class="running-sheet-notes" hidden></div><div class="running-sheet-table"><div class="running-sheet-labels" aria-hidden="true"><span>Start</span><span>Item</span><span>Minutes</span></div><div id="meeting-plan-rows"></div></div><p class="feature-help">Leave a duration empty if it is unknown. Later start times stay blank until every preceding item has a duration. Notes are excluded unless you choose to include them.</p><p id="meeting-plan-message" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const launch=document.createElement('button');launch.id='meeting-plan-open';launch.type='button';launch.textContent='Running sheet';$('meeting-banner').insertBefore(launch,$('meeting-notes'));
  let meetingId=null,busy=false;const rows=new Map();
  const folder=()=>meetingFolders.find(f=>f.id===meetingId);
  const catalog=()=>({songs,videos:ProMaxFeatures.getVideos(),documents:ProMaxFeatures.getDocuments(),youtube:ProMaxYouTubeLibrary.list()});
  const plan=()=>api.create(folder(),catalog(),$('meeting-plan-notes').checked);
  const node=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  function draw(){
    if(!dialog.open)return;
    const f=folder();if(!f){dialog.close();return;}
    const value=plan(),timing=api.schedule(value),ids=new Set(value.items.map(i=>i.id));
    $('meeting-plan-name').textContent=f.name||'Untitled meeting';$('meeting-plan-summary').textContent=value.items.length+' '+(value.items.length===1?'item':'items')+' · '+api.summary(value);
    $('meeting-plan-start').value=value.startTime;
    $('meeting-plan-meeting-notes').hidden=!value.notes;$('meeting-plan-meeting-notes').textContent=value.notes;
    for(const [id,row]of rows)if(!ids.has(id)){row.article.remove();rows.delete(id);}
    for(const [i,item]of timing.rows.entries()){
      let row=rows.get(item.id);
      if(!row){const article=node('article','');article.className='running-sheet-row';article.dataset.planItem=item.id;
        const time=node('span',''),content=node('div',''),title=node('h3',''),detail=node('small',''),note=node('p',''),input=document.createElement('input');time.className='running-sheet-time';note.className='running-sheet-notes';
        input.type='number';input.min='0';input.max='1440';input.step='1';input.placeholder='—';input.inputMode='numeric';
        input.onchange=()=>{const raw=input.value;if(!input.checkValidity()||(raw!==''&&api.minutes(Number(raw))===null)){$('meeting-plan-message').textContent='Use a whole number from 0 to 1,440 minutes.';input.value=folder()?.items.find(v=>v.id===item.id)?.plannedMinutes??'';return;}
          change('Set item duration',()=>{const target=folder()?.items.find(v=>v.id===item.id);if(!target)throw Error('This item was removed.');if(raw==='')delete target.plannedMinutes;else target.plannedMinutes=Number(raw);});};
        content.append(title,detail,note);article.append(time,content,input);row={article,time,title,detail,note,input};rows.set(item.id,row);
      }
      row.time.textContent=api.clock(item.start);row.title.textContent=(i+1)+'. '+item.title;row.detail.textContent=api.types[item.type]+(item.missing?' · Unavailable in library':'');row.detail.className=item.missing?'running-sheet-missing':'';
      row.note.textContent=item.notes;row.note.hidden=!item.notes;row.input.setAttribute('aria-label','Duration in minutes: '+item.title);
      row.input.value=item.plannedMinutes??'';
      const list=$('meeting-plan-rows');if(list.children[i]!==row.article)list.insertBefore(row.article,list.children[i]||null);
    }
    if(!timing.rows.length&&!$('meeting-plan-empty')){const empty=node('p','This meeting is empty. Add content to its running order first.');empty.id='meeting-plan-empty';$('meeting-plan-rows').append(empty);}else if(timing.rows.length)$('meeting-plan-empty')?.remove();
  }
  async function change(label,operation){
    if(busy||ProMaxControls.busy){$('meeting-plan-message').textContent='Another edit is completing. Try again.';draw();return;}busy=true;$('meeting-plan-message').textContent='';
    try{await ProMaxControls.mutate(label,operation);}catch(error){$('meeting-plan-message').textContent=error.message;}
    finally{busy=false;draw();}
  }
  $('meeting-plan-start').onchange=()=>{const value=$('meeting-plan-start').value;change('Set meeting start time',()=>{const f=folder();if(f){if(value&&!api.start(value))throw Error('Choose a valid start time.');if(value)f.plannedStart=value;else delete f.plannedStart;}});};
  $('meeting-plan-notes').onchange=()=>{$('meeting-plan-message').textContent='';draw();};
  $('meeting-plan-close').onclick=()=>dialog.close();
  $('meeting-plan-copy').onclick=async()=>{const button=$('meeting-plan-copy');if(button.disabled)return;button.disabled=true;$('meeting-plan-message').textContent='Copying…';try{await navigator.clipboard.writeText(api.toText(plan()));$('meeting-plan-message').textContent='Running sheet copied.';}catch{$('meeting-plan-message').textContent='Could not copy the running sheet. Try Save PDF.';}finally{button.disabled=false;}};
  $('meeting-plan-pdf').onclick=async()=>{
    const button=$('meeting-plan-pdf');if(button.disabled)return;button.disabled=true;$('meeting-plan-message').textContent='Preparing PDF…';
    try{const result=await window.promaxDesktop.exportMeetingPlan(plan());$('meeting-plan-message').textContent=result?.error|| (result?.saved?'PDF saved.':result?.canceled?'Export cancelled.':'Could not save the PDF.');}
    catch(error){$('meeting-plan-message').textContent=error.message||'Could not save the PDF.';}finally{button.disabled=false;}
  };
  if(!window.promaxDesktop?.exportMeetingPlan){$('meeting-plan-pdf').disabled=true;$('meeting-plan-pdf').title='PDF export is available in the desktop app.';}
  launch.onclick=async()=>{const f=ProMaxMeetings.folder();if(!f)return;meetingId=f.id;$('meeting-plan-notes').checked=false;$('meeting-plan-message').textContent='';dialog.showModal();
    try{await Promise.all([ProMaxFeatures.ready,ProMaxYouTubeLibrary.ready]);draw();}catch(error){$('meeting-plan-message').textContent=error.message;}
  };
  // History restores replace meeting objects. Refresh the sheet against the current model.
  document.addEventListener('promax:meetings-rendered',draw);
  dialog.addEventListener('close',()=>{meetingId=null;rows.clear();$('meeting-plan-rows').replaceChildren();$('meeting-plan-meeting-notes').textContent='';});
})();
