const fs=require('node:fs/promises'),path=require('node:path');
const {fileURLToPath}=require('node:url');
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
// Inspect headers only, within managed slide directories. Never open arbitrary renderer paths.
async function checkPresentationFiles(userData,urls){
  if(!Array.isArray(urls)||urls.length>256||urls.some(v=>typeof v!=='string'||v.length>4096))throw Error('Invalid slide check.');
  const root=path.join(userData,'presentations'),results=new Array(urls.length);let next=0;
  async function inspect(url){
    let file;try{const parsed=new URL(url);if(parsed.protocol!=='file:'||parsed.hostname||parsed.search||parsed.hash)throw Error();file=fileURLToPath(parsed);
      if(!/^[a-f0-9-]{36}[\\/]slide-\d+\.png$/i.test(path.relative(root,file)))throw Error();
    }catch{return {url,status:'unsupported'};}
    let handle;
    try{
      const [directory,info]=await Promise.all([fs.lstat(path.dirname(file)),fs.lstat(file)]);
      if(directory.isSymbolicLink()||info.isSymbolicLink()||!info.isFile())return {url,status:'unsupported'};
      const [realRoot,realFile]=await Promise.all([fs.realpath(root),fs.realpath(file)]),relative=path.relative(realRoot,realFile);
      if(relative.startsWith('..')||path.isAbsolute(relative))return {url,status:'unsupported'};
      if(info.size<45)return {url,status:'invalid'};
      handle=await fs.open(file,'r');const header=Buffer.alloc(24),tail=Buffer.alloc(12);
      await Promise.all([handle.read(header,0,24,0),handle.read(tail,0,12,info.size-12)]);
      const width=header.readUInt32BE(16),height=header.readUInt32BE(20);
      if(!header.subarray(0,8).equals(PNG)||header.toString('ascii',12,16)!=='IHDR'||tail.toString('ascii',4,8)!=='IEND'||!width||!height||width>32768||height>32768)return {url,status:'invalid'};
      return {url,status:'available',width,height};
    }catch(error){return {url,status:['ENOENT','ENOTDIR'].includes(error.code)?'missing':'unverified'};}
    finally{await handle?.close();}
  }
  await Promise.all(Array.from({length:Math.min(4,urls.length)},async()=>{while(next<urls.length){const index=next++;results[index]=await inspect(urls[index]);}}));
  return {files:results};
}
module.exports={checkPresentationFiles};
