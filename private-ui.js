(() => {
  const api=window.proMaxPrivate,content=window.ProMaxPrivateContent;
  const section=document.createElement('section');section.className='panel';
  section.innerHTML=`<h3>Private PC & laptop sync</h3><p class="sharing-help">Your songs, meetings, Bible, saved media, presentations and settings. This private library is separate from your song group. Only computers with your private key can open it.</p>
    <p id="private-message" role="status" aria-live="polite"></p>
    <div id="private-setup"><button id="private-create">Create private library</button><details><summary>Connect another computer</summary><input id="private-key" type="password" autocomplete="off" placeholder="PMXP-..." aria-label="Private sync key"><button id="private-restore">Connect private library</button></details></div>
    <div id="private-connected" hidden><label><input type="checkbox" id="private-enabled"> Enable private sync on this computer</label><p class="sharing-help">Sync runs when you press Sync private content. Close the presentation first. Conflicting versions are kept for review. Save the private key before switching computers; there is no key recovery.</p><div class="sharing-row"><button id="private-sync" class="primary">Sync private content</button><button id="private-copy">Copy private key</button><button id="private-disconnect">Disconnect private sync</button></div><div id="private-conflicts"></div></div>`;
  document.getElementById('sharing-dialog').append(section);
  const el=id=>document.getElementById('private-'+id);let state={connected:false},busy=false;
  function render(){el('setup').hidden=state.connected;el('connected').hidden=!state.connected;el('enabled').checked=!!state.enabled;el('sync').disabled=busy||!state.enabled;}
  async function run(task){if(busy||window.proMaxSharedBusy?.())return;busy=true;window.ProMaxPrivateBusy=true;section.inert=true;try{await task();}catch(error){el('message').textContent=error.message;}finally{document.body.inert=false;busy=false;window.ProMaxPrivateBusy=false;section.inert=false;render();}}
  async function conflicts(){const snapshot=await content.snapshot();el('conflicts').replaceChildren();const entries=Object.entries(snapshot.conflicts).filter(([,value])=>value);
    if(entries.length){const help=document.createElement('p');help.textContent=entries.length+' conflicting versions kept. Review which version to use, then sync again.';el('conflicts').append(help);}
    for(const [id,conflict]of entries){const row=document.createElement('details'),title=document.createElement('summary');title.textContent=conflict.key;row.append(title);
      // Preview text only. Media is retained in the protected local snapshot.
      for(const [label,key]of [['Keep current','local'],['Use incoming','incoming']]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>run(async()=>{
        const before=await content.snapshot(),latest=structuredClone(before);if(key==='incoming')latest.records[conflict.key]=conflict.incoming;latest.conflicts[id]=null;
        // Incoming is an explicit replacement; the other version remains in the pre-sync checkpoint.
        const result=await content.call('sync',latest);if(JSON.stringify(await content.snapshot())!==JSON.stringify(before))throw Error('Local content changed. Review the conflict again.');document.body.inert=true;await content.apply(result.snapshot);await content.call('applied',result.receipt);location.reload();
      });row.append(button);}
      const preview=document.createElement('pre');preview.textContent=JSON.stringify({current:conflict.local,incoming:conflict.incoming},(key,value)=>key==='$blob'?'[saved media]':typeof value==='string'?value.slice(0,1500):value,2).slice(0,5000);row.append(preview);el('conflicts').append(row);
    }
  }
  el('create').onclick=()=>run(async()=>{state=await content.call('create');el('message').textContent='Private library created. Copy your private key and enable sync when ready.';});
  el('restore').onclick=()=>run(async()=>{const key=el('key').value;el('key').value='';state=await content.call('restore',key);el('message').textContent='Private library connected. Enable sync to merge both computers.';});
  el('copy').onclick=()=>run(async()=>{await content.call('copyKey');el('message').textContent='Private key copied. Save it privately and use it only on your own computers.';});
  el('enabled').onchange=()=>run(async()=>{state=await content.call('setEnabled',el('enabled').checked);el('message').textContent=state.enabled?'Private sync enabled. Press Sync private content to begin.':'Private sync paused.';});
  el('disconnect').onclick=()=>run(async()=>{if(!confirm('Disconnect private sync? Save the private key first to reconnect. Local content is kept.'))return;state=await content.call('disconnect');el('message').textContent='Private sync disconnected. Local content kept.';});
  el('sync').onclick=()=>run(async()=>{
    el('message').textContent='Encrypting and syncing private content...';
    const before=await content.snapshot(),result=await content.call('sync',before);
    if(JSON.stringify(await content.snapshot())!==JSON.stringify(before))throw Error('Your local content changed during sync. Press Sync again to merge the latest edits.');
    document.body.inert=true;await content.apply(result.snapshot);await content.call('applied',result.receipt);location.reload();
  });
  if(api){content.call('getState').then(s=>{state=s;render();return conflicts();}).catch(error=>{el('message').textContent=error.message;});}
  else {section.inert=true;el('message').textContent='Private sync is available in the Windows app.';}
  render();
})();
