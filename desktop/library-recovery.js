const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const {parse}=require('../library-data');

function createLibraryRecovery(userData,onError=()=>{}){
  const directory=path.join(userData,'recovery'),file=path.join(directory,'library.json'),previous=path.join(directory,'library-previous.json');
  let pending=null,timer=null,queue=Promise.resolve(),lastSnapshot=0;
  function read(){
    for(const candidate of [file,previous])try{return {library:parse(fs.readFileSync(candidate,'utf8')),recovered:candidate===previous};}catch{}
    return null;
  }
  async function write(raw){
    await fsp.mkdir(directory,{recursive:true});
    // Preserve the last valid copy before atomically replacing the current file.
    try{const old=await fsp.readFile(file,'utf8');parse(old);await fsp.writeFile(previous,old);}catch{}
    const temporary=file+'.tmp';await fsp.writeFile(temporary,raw);await fsp.rename(temporary,file);
    if(Date.now()-lastSnapshot>600000){
      lastSnapshot=Date.now();await fsp.writeFile(path.join(directory,`library-${lastSnapshot}.json`),raw);
      const snapshots=(await fsp.readdir(directory)).filter(n=>/^library-\d+\.json$/.test(n)).sort().reverse();
      for(const name of snapshots.slice(12))await fsp.unlink(path.join(directory,name));
    }
  }
  function save(raw){
    if(typeof raw!=='string'||raw.length>32*1024*1024)return;
    parse(raw);pending=raw;clearTimeout(timer);
    timer=setTimeout(()=>{const value=pending;pending=null;queue=queue.then(()=>write(value)).catch(error=>{console.error('Library recovery:',error.message);onError(error.message);});},700);
  }
  async function flush(){clearTimeout(timer);await queue;if(pending){const raw=pending;pending=null;await write(raw);}}
  return {read,save,flush,directory};
}
module.exports={createLibraryRecovery};
