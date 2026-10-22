const {createHash,createHmac,randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
const {gzipSync,gunzipSync}=require('node:zlib');
const fs=require('node:fs/promises');const path=require('node:path');
const {merge}=require('../private-sync');
const hash=value=>createHash('sha256').update(value).digest('hex');
const MAX=256*1024*1024;
function validate(snapshot){
  if(!snapshot||snapshot.format!==1||!snapshot.records||typeof snapshot.records!=='object'||Array.isArray(snapshot.records)||!snapshot.conflicts||typeof snapshot.conflicts!=='object'||Array.isArray(snapshot.conflicts))throw Error('Invalid private content.');
  if(Object.keys(snapshot.records).length>50000||Object.keys(snapshot.records).some(k=>! /^(song|meeting|setting|asset|file)\/.{1,512}$/.test(k)||k.includes('__proto__')))throw Error('Invalid private record.');
  if(Buffer.byteLength(JSON.stringify(snapshot))>MAX)throw Error('Private content exceeds the 256 MB transfer limit.');
  return snapshot;
}
function hashes(snapshot,keys=[]){const out={};for(const key of new Set([...Object.keys(snapshot.records),...keys]))out[key]=hash(JSON.stringify(snapshot.records[key]??null));return out;}
function createPrivateController({origin,vault,clipboard,checkpointDir,fetchImpl=fetch}){
  const base=new URL(origin);if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('Invalid private service origin.');
  let access=null,pending=Promise.resolve(),epoch=0,prepared=null;const requests=new Set();
  const state=()=>({connected:!!access,enabled:!!access?.enabled});
  const serial=fn=>{const p=pending.then(fn);pending=p.catch(()=>{});return p;};
  const persist=()=>vault.write(access);
  const key=()=>createHmac('sha256',Buffer.from(access.seed,'base64url')).update('ProMax private content v1').digest();
  const token=()=>createHmac('sha256',Buffer.from(access.seed,'base64url')).update('ProMax private access v1').digest('base64url');
  function stop(){epoch++;prepared=null;for(const c of requests)c.abort();}
  async function api(route,method='GET',data){
    const abort=new AbortController();requests.add(abort);const timer=setTimeout(()=>abort.abort(),30000);
    try{
      const response=await fetchImpl(new URL('/api/v1/private'+route,base),{method,redirect:'error',signal:abort.signal,headers:{authorization:'Bearer '+token(),...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
      const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>1000000)throw Error('Invalid private sync response.');chunks.push(chunk);}
      const result=JSON.parse(Buffer.concat(chunks));if(!response.ok)throw Object.assign(Error(result.error||'Private sync failed.'),{status:response.status});return result;
    }catch(error){if(error.name==='AbortError')throw Error('Private sync interrupted. Your local content is kept.');throw error;}finally{clearTimeout(timer);requests.delete(abort);}
  }
  function seal(bytes){const iv=createHmac('sha256',key()).update('chunk nonce v1').update(bytes).digest().subarray(0,12),cipher=createCipheriv('aes-256-gcm',key(),iv);return Buffer.concat([iv,cipher.update(bytes),cipher.final(),cipher.getAuthTag()]).toString('base64');}
  function open(data){const bytes=Buffer.from(data,'base64');if(bytes.length<28)throw Error('Invalid encrypted content.');const decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(-16));return Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]);}
  async function checkpoint(snapshot){
    await fs.mkdir(checkpointDir,{recursive:true});const file=path.join(checkpointDir,Date.now()+'-'+randomBytes(4).toString('hex')+'.json');
    await fs.writeFile(file,JSON.stringify(snapshot),{flag:'wx'});
    const files=(await fs.readdir(checkpointDir)).filter(n=>/^\d+-[a-f0-9]+\.json$/.test(n)).sort().reverse();
    for(const name of files.slice(5))await fs.unlink(path.join(checkpointDir,name));
  }
  return {
    async init(){access=await vault.read();if(access&&!/^[\w-]{43}$/.test(access.seed))throw Error('Private sync key could not be opened.');return state();},
    getState:state,
    create:()=>serial(async()=>{if(access)throw Error('Disconnect private sync first.');access={seed:randomBytes(32).toString('base64url'),enabled:false,baseline:{}};try{await api('','POST',{});await persist();}catch(error){access=null;throw error;}return state();}),
    restore:input=>serial(async()=>{if(access)throw Error('Disconnect private sync first.');if(typeof input!=='string'||!/^PMXP-[\w-]{43}$/.test(input.trim()))throw Error('Enter your private PMXP key.');access={seed:input.trim().slice(5),enabled:false,baseline:{}};try{await api('/state');await persist();}catch(error){access=null;throw error;}return state();}),
    copyKey:()=>serial(async()=>{if(!access)throw Error('Create or restore private sync first.');clipboard.writeText('PMXP-'+access.seed);return {ok:true};}),
    setEnabled:value=>{if(typeof value!=='boolean')return Promise.reject(Error('Invalid private sync choice.'));stop();return serial(async()=>{if(!access)throw Error('Connect private sync first.');access.enabled=value;await persist();return state();});},
    disconnect:()=>{stop();return serial(async()=>{await vault.clear();access=null;return state();});},
    sync:input=>serial(async()=>{
      if(!access?.enabled)throw Error('Enable private sync first.');const generation=epoch;const local=validate(input);
      await checkpoint(local);
      const remoteState=await api('/state');let remote={format:1,records:{},conflicts:{}};
      if(remoteState.chunks.length){
        if(remoteState.chunks.length>4096)throw Error('Private library is too large.');
        const chunks=[];let bytes=0;
        for(const id of remoteState.chunks){if(generation!==epoch)throw Error('Private sync paused.');if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid private chunk.');const r=await api('/blobs/'+id);if(hash(r.data)!==id)throw Error('Private content verification failed.');const chunk=open(r.data);bytes+=chunk.length;if(bytes>MAX)throw Error('Private library is too large.');chunks.push(chunk);}
        remote=validate(JSON.parse(gunzipSync(Buffer.concat(chunks),{maxOutputLength:MAX})));
      }
      local.hashes=hashes(local,Object.keys(access.baseline));remote.hashes=hashes(remote,Object.keys(access.baseline));
      const merged=merge(local,remote,access.baseline);const packed=gzipSync(JSON.stringify(merged));const chunks=[];
      if(JSON.stringify(merged.records)!==JSON.stringify(remote.records)||JSON.stringify(merged.conflicts)!==JSON.stringify(remote.conflicts)){
        for(let offset=0;offset<packed.length;offset+=128*1024){if(generation!==epoch)throw Error('Private sync paused.');const data=seal(packed.subarray(offset,offset+128*1024)),id=hash(data);await api('/blobs/'+id,'PUT',{data});chunks.push(id);}
        if(generation!==epoch)throw Error('Private sync paused.');await api('/state','PUT',{revision:remoteState.revision,chunks});
      }
      if(generation!==epoch)throw Error('Private sync paused.');
      const receipt=randomBytes(16).toString('hex');prepared={receipt,hashes:hashes(merged),epoch:generation};return {snapshot:merged,receipt};
    }),
    applied:receipt=>serial(async()=>{if(!prepared||receipt!==prepared.receipt||prepared.epoch!==epoch||!access?.enabled)throw Error('Private sync changed. Sync again.');access.baseline=prepared.hashes;await persist();prepared=null;return {ok:true};})
  };
}
module.exports={createPrivateController,validate,hashes};
