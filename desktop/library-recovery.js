const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const {parse}=require('../library-data');

function createLibraryRecovery(userData,onError=()=>{},options={}){
  const io=options.io||fsp,debounceMs=options.debounceMs??700;
  const directory=path.join(userData,'recovery'),file=path.join(directory,'library.json'),previous=path.join(directory,'library-previous.json');
  let pending=null,timer=null,queue=Promise.resolve(),lastSnapshot=0;
  const snapshotTime=name=>Number(name.slice(8,-5));
  const snapshots=names=>names.filter(name=>/^library-\d+\.json$/.test(name)&&Number.isSafeInteger(snapshotTime(name))).sort((a,b)=>snapshotTime(b)-snapshotTime(a));
  function read(){
    for(const candidate of [file,previous])try{return {library:parse(fs.readFileSync(candidate,'utf8')),recovered:candidate===previous};}catch{}
    // Retained snapshots are useful even when both rolling copies are damaged.
    let retained=[];try{retained=snapshots(fs.readdirSync(directory));}catch{}
    for(const name of retained)try{return {library:parse(fs.readFileSync(path.join(directory,name),'utf8')),recovered:true};}catch{}
    return null;
  }
  async function write(raw){
    await io.mkdir(directory,{recursive:true});
    // Preserve the last valid copy before atomically replacing the current file.
    try{const old=await io.readFile(file,'utf8');parse(old);await io.writeFile(previous,old);}catch{}
    const temporary=file+'.tmp';await io.writeFile(temporary,raw);await io.rename(temporary,file);
    if(Date.now()-lastSnapshot>600000){
      const at=Date.now();await io.writeFile(path.join(directory,`library-${at}.json`),raw);lastSnapshot=at;
      for(const name of snapshots(await io.readdir(directory)).slice(12))await io.unlink(path.join(directory,name));
    }
  }
  function drain(){
    // Every write path, including overlapping flushes, joins this same queue.
    const operation=queue.catch(()=>{}).then(async()=>{
      while(pending!==null){
        const raw=pending;pending=null;
        try{await write(raw);}catch(error){
          if(pending===null)pending=raw; // A newer save always wins over a retry.
          try{onError(error.message);}catch(notificationError){console.error('Library recovery notification:',notificationError.message);}
          throw error;
        }
      }
    });
    queue=operation;operation.catch(()=>{});return operation;
  }
  function save(raw){
    if(typeof raw!=='string'||raw.length>32*1024*1024)return false;
    parse(raw);pending=raw;clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;drain().catch(error=>console.error('Library recovery:',error.message));},debounceMs);
    return true;
  }
  function flush(){clearTimeout(timer);timer=null;return drain();}
  return {read,save,flush,directory};
}
module.exports={createLibraryRecovery};
