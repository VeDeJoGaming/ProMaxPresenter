const { normalizeLibrary } = require('../library.js');
const { createHash } = require('node:crypto');
const fingerprint = song => createHash('sha256').update(JSON.stringify(song)).digest('hex');
function createSharedController({origin,vault,fetchImpl=fetch,clipboard}) {
  const base=new URL(origin);
  if(base.protocol!=='https:' && !(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname))) throw Error('Invalid service origin');
  let access=null, generation=0, pending=Promise.resolve(), paused=false; const requests=new Set();
  const state=()=>({connected:!!access,...(access?{group:access.group,self:access.self}:{}),generation});
  const persist=()=>vault.write(access);
  function cancel() { generation++; for(const c of requests)c.abort(); }
  function serial(fn) { const result=pending.then(fn); pending=result.catch(()=>{});return result; }
  async function api(route,method='GET',data,token=access?.token) {
    const controller=new AbortController(); requests.add(controller); const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetchImpl(new URL('/api/v1'+route,base),{method,redirect:'error',signal:controller.signal,
        headers:{...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
      const reader=response.body.getReader();let size=0;const chunks=[];
      while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error('Shared library response is too large.');}chunks.push(value);}
      const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!response.ok)throw Error(typeof result.error==='string'?result.error:'The shared library is unavailable.');return result;
    } catch(error) { if(error.name==='AbortError')throw Error('Connection interrupted. Your local songs are safe.');
      if(error instanceof TypeError||error instanceof SyntaxError)throw Error('Could not reach the shared library. You can keep working offline.');throw error;
    } finally {clearTimeout(timeout);requests.delete(controller);}
  }
  function payload(s) {const {id,title,lyrics,lines,slides}=normalizeLibrary({songs:[s]}).songs[0];return {id,song:{title,lyrics,lines,slides}};}
  function code(value) {
    if(typeof value!=='string'||value.length>1000)throw Error('Invalid invitation.');
    let input=value.trim();if(input.startsWith(base.origin+'/')){const link=new URL(input);input=new URLSearchParams(link.hash.slice(1)).get('invite')||'';}
    if(!/^PMX-[A-Za-z0-9_-]{32}$/.test(input))throw Error('Paste the invitation code from your group owner.');return input;
  }
  function ensure(choice) {if(!access)throw Error('Connect to a group first.');if(choice&&access.self.mode!==choice)throw Error('Choose Receive & share first.');}
  async function publish(s,explicit,expectedGeneration) {
    ensure('share');if(s.shared) return false;
    const p=payload(s), previous=access.publications[p.id];if(!explicit&&!previous)return false;
    if(!explicit&&previous.hash===fingerprint(p.song))return false;
    if(expectedGeneration!==generation)return false;
    const result=await api('/songs/'+p.id,'PUT',{song:p.song,revision:previous?.revision||0,restore:!!explicit});
    if(expectedGeneration!==generation)return false;
    access.publications[p.id]={id:result.publication.id,revision:result.publication.revision,hash:fingerprint(p.song)};
    await persist();return true;
  }
  return {
    async init(){ const saved=await vault.read(); if(saved&&(!saved.token||!saved.self||!saved.group))throw Error('Group access could not be opened.');access=saved;return state(); },
    getState:state,
    create: input=>serial(async()=>{if(access)throw Error('Disconnect before creating another group.');const result=await api('/groups','POST',input,null);access={...result,publications:{}};await persist();generation++;return state();}),
    join: input=>serial(async()=>{if(access)throw Error('Disconnect before joining another group.');const result=await api('/join','POST',{...input,code:code(input.code)},null);access={...result,publications:{}};await persist();generation++;return state();}),
    restore: key=>serial(async()=>{if(access)throw Error('Disconnect first.');if(typeof key!=='string'||!/^PMXA-[A-Za-z0-9_-]{43}$/.test(key.trim()))throw Error('Invalid access key.');const token=key.trim().slice(5);const result=await api('/me','GET',undefined,token);access={...result,token,publications:{}};await persist();generation++;return state();}),
    setMode: choice=>{paused=true;cancel();return serial(async()=>{try{ensure();if(!['none','receive','share'].includes(choice))throw Error('Invalid mode.');
      // Persist local opt-out before any network operation. Failed connections never resume sharing.
      access.self.mode=choice;await persist();access.modePending=true;await persist();
      const result=await api('/me','PATCH',{mode:choice});access.self=result.self;delete access.modePending;await persist();return state();}finally{paused=false;}});},
    sync: songs=>serial(async()=>{ensure();const epoch=generation;if(paused||access.self.mode==='none')return {songs:[],...state()};
      if(access.modePending){const r=await api('/me','PATCH',{mode:access.self.mode});access.self=r.self;delete access.modePending;await persist();}
      const me=await api('/me');if(epoch!==generation)return {songs:[],...state()};
      // Local consent is authoritative; never accept a remote escalation of sharing mode.
      if(me.self.mode!==access.self.mode)throw Error('Sharing settings changed. Choose your mode again.');
      const publishFailures=[];
      if(access.self.mode==='share')for(const s of songs.slice(0,10000)){
        if(epoch!==generation)break;
        try{await publish(s,false,epoch);}catch(error){
          if(epoch!==generation)throw error;
          // A rejected local edit must not prevent this member from receiving songs.
          publishFailures.push({id:s.id,message:error.message});
        }
      }
      const incoming=[];let after=0;
      for(let page=0;page<101;page++) {if(epoch!==generation)return {songs:[],...state()};const r=await api('/songs?after='+after);
        // Restoring the same access key on another computer must also receive
        // this member's own songs. The merge already avoids identical local copies.
        for(const row of r.songs){normalizeLibrary({songs:[row.song]});incoming.push(row);}
        if(incoming.length>1000)throw Error('The shared library is too large.');if(r.nextAfter===null)break;if(!Number.isSafeInteger(r.nextAfter)||r.nextAfter<=after)throw Error('Invalid shared library page.');after=r.nextAfter;
      }
      return {songs:epoch===generation?incoming:[],publishFailures,...state()};}),
    publish: songs=>serial(async()=>{ensure('share');if(paused)throw Error('Sharing settings are changing. Try again.');if(access.modePending)throw Error('Sync your sharing settings before publishing.');if(!Array.isArray(songs)||songs.length>1000)throw Error('Share up to 1,000 songs at a time.');const epoch=generation;let count=0;
      for(const s of songs){if(epoch!==generation)break;if(await publish(s,true,epoch))count++;}return {count,...state()};}),
    unpublish: localId=>serial(async()=>{ensure();const publication=access.publications[localId];if(!publication)throw Error('This song has not been shared from this computer.');await api('/songs/'+publication.id,'DELETE');delete access.publications[localId];await persist();return state();}),
    copyInvite: rotate=>serial(async()=>{ensure();if(access.self.role!=='owner')throw Error('Only the owner can invite people.');
      if(rotate||!access.invite||access.invite.expiresAt<Date.now()){access.invite=await api(rotate?'/invites/rotate':'/invites','POST',{});await persist();}
      clipboard.writeText(base.origin+'/#invite='+access.invite.code);return {ok:true};}),
    copyAccessKey: ()=>serial(async()=>{ensure();clipboard.writeText('PMXA-'+access.token);return {ok:true};}),
    members: ()=>serial(async()=>{ensure();return api('/members');}),
    revoke: id=>serial(async()=>{ensure();if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid person.');await api('/members/'+id,'DELETE');delete access.invite;await persist();return {ok:true};}),
    disconnect: ()=>{paused=true;cancel();return serial(async()=>{try{ensure();access.self.mode='none';access.modePending=true;await persist();
      try{await api('/me','PATCH',{mode:'none'});}catch{}await vault.clear();access=null;return state();}finally{paused=false;}});}
  };
}
module.exports={createSharedController};
