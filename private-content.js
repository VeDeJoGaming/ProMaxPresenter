/* Export live app objects through IndexedDB transactions, never database files. */
(() => {
  const api=window.proMaxPrivate;
  const lists=new Set(['video-list','presentations','youtube-list']);
  const allowed=key=>['background','bible',...lists].includes(key)||/^video:[\w-]+$/.test(key);
  const bytesTo64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);};
  const from64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
  async function assets(){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('assets','readonly'),store=tx.objectStore('assets');const keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>resolve(new Map(keys.result.map((key,i)=>[key,values.result[i]])));tx.onerror=()=>reject(tx.error);});}
  async function replaceAssets(values){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets');const keys=store.getAllKeys();keys.onsuccess=()=>{for(const key of keys.result)if(allowed(key)||key==='private-sync-conflicts')store.delete(key);for(const [key,value] of values)store.put(value,key);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function call(action,input){const result=await api[action](input);if(result?.error)throw Error(result.error);return result;}
  async function snapshot(){
    await window.ProMaxFeatures?.ready;await window.ProMaxYouTubeLibrary?.ready;
    if(!songs.length)throw Error('Wait for the local library to open.');
    const records={};let total=0;
    const presentationRoot=window.promaxDesktop?.initialData?.presentationRoot;
    async function encode(value){
      if(value instanceof Blob){total+=value.size;if(total>160*1024*1024)throw Error('Private content is above the current 160 MB media limit.');return {$blob:bytesTo64(new Uint8Array(await value.arrayBuffer())),type:value.type,name:value.name||'',lastModified:value.lastModified||0};}
      if(typeof value==='string'&&value.startsWith('file:')){
        if(!presentationRoot||!value.startsWith(presentationRoot))throw Error('A document refers to a file outside the ProMax presentation folder. Reimport it before syncing.');
        const file=await call('readFile',value),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',from64(file.data))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
        const directory=[digest.slice(0,8),digest.slice(8,12),digest.slice(12,16),digest.slice(16,20),digest.slice(20)].join('-');
        const name=directory+'/'+file.name.split('/').pop();records['file/'+name]=file.data;return 'promax-private-file:'+name;
      }
      if(Array.isArray(value))return Promise.all(value.map(encode));
      if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value))out[key]=await encode(item);return out;}
      if(typeof value==='string'&&value.startsWith('blob:'))throw Error('An unsaved media URL cannot be synced. Save the media first.');
      return value;
    }
    for(const song of songs)records['song/'+song.id]=await encode(song);
    for(const folder of meetingFolders)records['meeting/'+folder.id]=await encode(folder);
    for(const [key,value]of Object.entries(settings))records['setting/'+key]=await encode(value);
    const saved=await assets();
    for(const [key,value]of saved)if(allowed(key)){
      if(lists.has(key)){for(const item of value)records['asset/'+key+'/'+item.id]=await encode(item);}
      else records['asset/'+key]=await encode(value);
    }
    return {format:1,records,conflicts:saved.get('private-sync-conflicts')||{}};
  }
  async function apply(snapshot){
    const old=await assets(),oldRaw=localStorage.getItem('promax-library');
    const data={schemaVersion:1,savedAt:Date.now(),songs:[],meetingFolders:[],settings:{},selected,meetingSelected};
    const values=new Map(),files=new Map();
    for(const [key,value]of Object.entries(snapshot.records))if(key.startsWith('file/')&&value!==null)files.set(key.slice(5),await call('writeFile',{name:key.slice(5),data:value}));
    function decode(value){
      if(typeof value==='string'&&value.startsWith('promax-private-file:')){const url=files.get(value.slice(20));if(!url)throw Error('A synced presentation slide is missing.');return url;}
      if(value&&typeof value==='object'&&typeof value.$blob==='string'){const bytes=from64(value.$blob);return value.name?new File([bytes],value.name,{type:value.type,lastModified:value.lastModified}):new Blob([bytes],{type:value.type});}
      if(Array.isArray(value))return value.map(decode);
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)]));return value;
    }
    for(const [key,value]of Object.entries(snapshot.records)){
      if(value===null||key.startsWith('file/'))continue;const item=decode(value);
      if(key.startsWith('song/'))data.songs.push(item);
      else if(key.startsWith('meeting/'))data.meetingFolders.push(item);
      else if(key.startsWith('setting/'))data.settings[key.slice(8)]=item;
      else if(key.startsWith('asset/')){const [name,id]=key.slice(6).split('/');if(lists.has(name)&&id){const list=values.get(name)||[];list.push(item);values.set(name,list);}else if(allowed(name))values.set(name,item);}
    }
    if(!data.songs.length)data.songs.push({id:uid(),title:'Untitled song',lyrics:'',lines:4,slides:[]});
    const normalized=ProMaxLibraryData.normalize(data);values.set('private-sync-conflicts',snapshot.conflicts);
    // Save both stores with rollback on failure, and keep the native checkpoint.
    try{
      await replaceAssets(values);const raw=JSON.stringify(normalized);localStorage.setItem('promax-library',raw);
      songs=normalized.songs;settings=normalized.settings;meetingFolders=normalized.meetingFolders;selected=normalized.selected;meetingSelected=normalized.meetingSelected;lastSavedRaw=raw;
      clearTimeout(nativeSaveTimer);window.promaxDesktop?.saveLibrary(raw);
    }catch(error){await replaceAssets(old);if(oldRaw!==null)localStorage.setItem('promax-library',oldRaw);throw error;}
  }
  window.ProMaxPrivateContent={snapshot,apply,call};
})();
