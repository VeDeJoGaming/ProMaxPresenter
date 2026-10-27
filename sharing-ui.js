(() => {
  const api=window.proMaxShared,host=window.proMaxSharedHost;
  const dialog=document.createElement('dialog');dialog.id='sharing-dialog';
  dialog.innerHTML=`<div class="sharing-heading"><div><span class="eyebrow">YOUR GROUP</span><h2>Shared library</h2></div><button id="shared-close" aria-label="Close shared library">✕</button></div>
    <p class="sharing-intro">Bring your group's songs together. Your local library works offline.</p>
    <p id="shared-message" role="status" aria-live="polite"></p>
    <div id="shared-setup"><label>Your name <input id="shared-name" maxlength="80" autocomplete="off" placeholder="Name shown to your friends"></label>
      <label>My choice <select id="shared-choice"><option value="none">Off — keep everything local</option><option value="receive">Receive only</option><option value="share">Receive & share</option></select></label>
      <p class="sharing-help">Joining never uploads your songs. You choose what to share afterwards.</p>
      <div class="sharing-row"><input id="shared-code" aria-label="Invitation code" placeholder="Paste invitation code or link" autocomplete="off"><button id="shared-join" class="primary">Join group</button></div>
      <details><summary>Create a group</summary><div class="sharing-row"><input id="shared-group-name" maxlength="80" aria-label="Group name" placeholder="Your group's name"><button id="shared-create">Create group</button></div></details>
      <details><summary>Restore access on this computer</summary><p class="sharing-help">Use your own access key. An owner's access key also restores group management.</p><div class="sharing-row"><input id="shared-key" type="password" aria-label="Personal access key" placeholder="PMXA-…" autocomplete="off"><button id="shared-restore">Restore</button></div></details>
    </div>
    <div id="shared-connected" hidden><h3 id="shared-group"></h3><p id="shared-person" class="sharing-help"></p>
      <label>My choice <select id="shared-mode"><option value="none">Off — keep everything local</option><option value="receive">Receive only</option><option value="share">Receive & share</option></select></label>
      <div class="sharing-row"><button id="shared-sync" class="primary">Sync now</button><span id="shared-last" class="sharing-help">Syncs every minute when enabled.</span></div>
      <div id="shared-publishing"><h3>Choose what to share</h3><p class="sharing-help">Share only songs you have permission to share. Songs received from others and backgrounds are excluded. Changes to songs you share are synced automatically.</p><div class="sharing-row"><button id="shared-song">Share selected song</button><button id="shared-all">Share my library…</button><button id="shared-remove">Stop sharing selected song</button></div></div>
      <section id="shared-bible-panel"><h3>Shared Bible</h3><p id="shared-bible-status" class="sharing-help">Sync to check your group's Bible.</p><div class="sharing-row"><button id="shared-bible-publish">Share imported Bible</button><button id="shared-bible-use" disabled>Use shared Bible</button><button id="shared-bible-remove">Stop sharing Bible</button></div><p class="sharing-help">Only share a translation you have permission to share. Replacing a local Bible requires your choice.</p></section>
      <div id="shared-owner" hidden><h3>Invitations & people</h3><p class="sharing-help">Invitations last 30 days. Anyone with the invitation can join. Removing someone also replaces all invitations.</p><div class="sharing-row"><button id="shared-invite">Copy invitation</button><button id="shared-rotate">Replace invitation…</button><button id="shared-people">Manage people</button></div><div id="shared-members"></div></div>
      <details><summary>Access & disconnect</summary><p class="sharing-help">Save your personal access key somewhere private. There is no account or password reset. Anyone with this key can use your group access. Keep the owner's key to recover group management.</p><div class="sharing-row"><button id="shared-backup">Copy my access key</button><button id="shared-disconnect">Disconnect…</button></div></details>
    </div>`;
  document.body.append(dialog);
  const el=id=>document.getElementById(id);let state={connected:false},busy=false,epoch=0,sharedBible=null;
  window.proMaxSharedBusy=()=>busy;
  function message(text){el('shared-message').textContent=text;}
  function render(){el('shared-setup').hidden=state.connected;el('shared-connected').hidden=!state.connected;
    if(state.connected){el('shared-group').textContent=state.group.name;el('shared-person').textContent=state.self.name+(state.self.role==='owner'?' · Group owner':'');el('shared-mode').value=state.self.mode;
      el('shared-owner').hidden=state.self.role!=='owner';el('shared-publishing').hidden=state.self.mode!=='share';el('shared-sync').disabled=state.self.mode==='none';el('shared-bible-publish').hidden=state.self.mode!=='share';el('shared-bible-remove').hidden=state.self.mode!=='share';el('shared-bible-use').disabled=!sharedBible||state.self.mode==='none';
      const canReplace=!sharedBible||sharedBible.authorId===state.self.id||state.self.role==='owner';el('shared-bible-publish').disabled=!canReplace;el('shared-bible-remove').disabled=!sharedBible||!canReplace;}
  }
  async function call(action,input){const result=await api[action](input);if(result.error)throw Error(result.error);return result;}
  async function run(task){if(busy||window.ProMaxPrivateBusy)return;busy=true;dialog.setAttribute('aria-busy','true');
    for(const b of dialog.querySelectorAll('button'))if(!['shared-close','shared-disconnect'].includes(b.id))b.disabled=true;
    try{await task();}catch(e){message(e.message);}finally{busy=false;dialog.removeAttribute('aria-busy');for(const b of dialog.querySelectorAll('button'))b.disabled=false;render();}}
  async function sync(){if(busy||!state.connected||state.self.mode==='none')return;const requestEpoch=epoch;
    await run(async()=>{message('Syncing…');const result=await call('sync',host.snapshot());
      if(requestEpoch!==epoch)return;
      const latest=await call('getState');if(latest.generation!==result.generation||latest.self?.mode==='none')return;
      state=latest;const merged=await host.receive(result.songs,state.group.id,()=>requestEpoch===epoch&&state.self?.mode!=='none');
      if(!merged)return;await refreshBible();await useBible(true);const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});el('shared-last').textContent='Last synced '+time;
      const failures=result.publishFailures||[];
      message(`${merged.added} added · ${merged.updated} updated`+(merged.conflicts?' · Your edits were kept; newer shared versions were added separately.':'. Your local songs are saved.')+(failures.length?` ${failures.length} shared update${failures.length===1?'':'s'} could not upload: ${failures[0].message} Incoming songs were still received.`:''));
    });
  }
  async function refreshBible(){
    if(!state.connected||state.self.mode==='none')return;
    const result=await call('bibleInfo');sharedBible=result.bible;
    el('shared-bible-status').textContent=sharedBible?`${sharedBible.name} · ${sharedBible.verseCount.toLocaleString()} verses`:'No Bible shared with this group yet.';render();
  }
  async function useBible(automatic=false){
    if(!sharedBible)return;
    await ProMaxFeatures.ready;const local=ProMaxFeatures.getBible();
    if(automatic&&local)return;
    if(local&&!confirm(`Replace your imported Bible with “${sharedBible.name}”? Saved passages in songs and meetings are kept.`))return;
    const requestEpoch=epoch,result=await call('downloadBible',sharedBible.id),latest=await call('getState');
    if(requestEpoch!==epoch||latest.generation!==result.generation||latest.self?.mode==='none')return;
    // A local import made while downloading wins. Keep it until the user explicitly retries.
    if(ProMaxFeatures.getBible()!==local)throw Error('The local Bible changed during download. Try again.');
    await ProMaxFeatures.receiveBible(result.bible);message('Shared Bible saved for offline use.');
  }
  el('shared-bible-publish').onclick=()=>run(async()=>{
    await ProMaxFeatures.ready;const bible=ProMaxFeatures.getBible();if(!bible)throw Error('Import a Bible in the Bible tab first.');
    if(!confirm(`Share “${bible.name}” with everyone in “${state.group.name}”? This replaces the group’s shared Bible. Only share a translation you have permission to share.`))return;
    message('Uploading Bible… Keep the app open.');await call('publishBible',bible);await refreshBible();message('Bible shared with your group.');
  });
  el('shared-bible-use').onclick=()=>run(()=>useBible());
  el('shared-bible-remove').onclick=()=>run(async()=>{if(!confirm('Stop sharing the group Bible? Downloaded local copies are kept.'))return;await call('unpublishBible');await refreshBible();message('Bible removed from Shared library. Local copies are kept.');});
  el('shared-open').onclick=async()=>{dialog.showModal();if(!api){el('shared-setup').hidden=true;message('Shared groups are available in the installed Windows app. You can still import and export libraries here.');return;}
    await run(async()=>{state=await call('getState');render();if(state.connected&&state.self.mode!=='none')await refreshBible();});};
  el('shared-close').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  for(const action of ['create','join'])el('shared-'+action).onclick=()=>run(async()=>{
    const input={displayName:el('shared-name').value,mode:el('shared-choice').value,...(action==='create'?{groupName:el('shared-group-name').value}:{code:el('shared-code').value})};
    state=await call(action,input);sharedBible=null;epoch++;el('shared-code').value='';message('Connected. No songs have been uploaded. Choose Sync now to receive songs.');render();
  });
  el('shared-restore').onclick=()=>run(async()=>{const key=el('shared-key').value;el('shared-key').value='';state=await call('restore',key);sharedBible=null;epoch++;message('Access restored. Check your sharing choice below.');render();});
  el('shared-mode').onchange=async()=>{const choice=el('shared-mode').value;epoch++;state.self.mode=choice;render();
    // Mode changes must interrupt even an in-flight sync; they never wait for the UI busy lock.
    try{state=await call('setMode',choice);message(choice==='none'?'Sync paused. Your local songs are kept.':'Choice saved. Existing songs are only uploaded when you choose to share them.');}
    catch(e){state=await api.getState();message(e.message);}render();};
  el('shared-sync').onclick=sync;
  for(const action of ['song','all'])el('shared-'+action).onclick=()=>run(async()=>{
    const snapshot=host.snapshot().filter(s=>!s.shared&&!ProMaxSongSearch.isEmpty(s)&&(action==='all'||s.id===host.selected()));
    if(!snapshot.length)throw Error('Choose one of your own songs. Received songs are kept local.');
    if(!confirm(`Share ${snapshot.length} song${snapshot.length===1?'':'s'} with everyone in “${state.group.name}”? Only share songs you have permission to share.`))return;
    const result=await call('publish',snapshot);message(`${result.count} song${result.count===1?'':'s'} shared with your group.`);
  });
  el('shared-remove').onclick=()=>run(async()=>{if(!confirm('Stop sharing this song? Copies already received by others will be kept.'))return;await call('unpublish',host.selected());message('Song removed from the shared library. Local copies are kept.');});
  el('shared-invite').onclick=()=>run(async()=>{await call('copyInvite',false);message('Invitation copied. Send it privately to your friends.');});
  el('shared-rotate').onclick=()=>run(async()=>{if(!confirm('Replace all current invitations? People already in the group keep their access.'))return;await call('copyInvite',true);message('New invitation copied. Old invitations no longer work.');});
  el('shared-backup').onclick=()=>run(async()=>{await call('copyAccessKey');message('Personal access key copied. Save it privately; do not send it as an invitation.');});
  el('shared-disconnect').onclick=async()=>{if(!confirm('Disconnect from this group? Local songs will be kept. Save your personal access key first if you want to return with the same access.'))return;epoch++;sharedBible=null;state={connected:false};render();try{state=await call('disconnect');message('Disconnected. Your local library is kept.');}catch(e){message(e.message);}render();};
  el('shared-people').onclick=()=>run(async()=>{const {members}=await call('members');el('shared-members').replaceChildren();
    for(const person of members){const row=document.createElement('div');row.className='sharing-row';const label=document.createElement('span');label.textContent=person.name+(person.role==='owner'?' · Owner':'');row.append(label);
      if(person.role!=='owner'){const remove=document.createElement('button');remove.textContent='Remove';remove.onclick=()=>run(async()=>{if(!confirm(`Remove ${person.name} and replace all invitations? Their local copies will be kept.`))return;await call('revoke',person.id);row.remove();message('Person removed. Copy a new invitation for future members.');});row.append(remove);}el('shared-members').append(row);}
  });
  if(api){call('getState').then(s=>{state=s;render();}).catch(e=>message(e.message));setInterval(()=>sync(),60000);}
})();
