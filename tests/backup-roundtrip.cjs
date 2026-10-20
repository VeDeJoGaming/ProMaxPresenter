const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const {createBackup,restoreBackup}=require('../desktop/backups');
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-full-roundtrip-')),source=path.join(root,'original'),target=path.join(root,'restored'),backup=path.join(root,'backup');await fs.mkdir(source);await fs.mkdir(path.join(target,'Local Storage'),{recursive:true});
  const environment={...process.env};delete environment.ELECTRON_RUN_AS_NODE;
  const probe=mode=>promisify(execFile)(require('electron'),[path.join(__dirname,'backup-probe.cjs'),'--profile',mode==='seed'?source:target,...(mode==='seed'?[]:['--verify'])],{cwd:path.join(__dirname,'..'),env:environment,windowsHide:true,timeout:45000});
  try{
    await probe('seed');await createBackup(source,backup,'1.0.0');await fs.rename(source,source+'-retired');await restoreBackup(target,backup,'1.0.0');await probe('verify');
    console.log('PASSED: closed-profile backup and restore into a different data folder; songs, meetings, Bible, binary video, background, YouTube links, remapped PowerPoint images.');
  }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error.stack,error.stderr||'');process.exitCode=1;});
