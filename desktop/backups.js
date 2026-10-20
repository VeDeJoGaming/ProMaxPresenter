/* Copy closed Chromium stores before any app window opens. Media stays on disk. */
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {createHash}=require('node:crypto');
const {createReadStream}=require('node:fs');
const components=['Local Storage','IndexedDB','presentations','recovery'];
const manifestName='promax-backup.json';
function inside(root,target){const relative=path.relative(path.resolve(root),path.resolve(target));return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
async function inventory(root,names){
  const files=[];
  async function visit(relative){
    const absolute=path.join(root,relative);if(!inside(root,absolute))throw Error('Invalid backup path.');
    const info=await fs.lstat(absolute);if(info.isSymbolicLink())throw Error('Backup folders cannot contain symbolic links.');
    if(info.isDirectory()){for(const entry of (await fs.readdir(absolute)).sort())await visit(path.join(relative,entry));}
    else if(info.isFile()){const hash=createHash('sha256');for await(const chunk of createReadStream(absolute))hash.update(chunk);files.push({name:relative.split(path.sep).join('/'),bytes:info.size,sha256:hash.digest('hex')});}
    else throw Error('Unsupported file in backup.');
  }
  for(const name of [...names].sort())await visit(name);return files;
}
async function copy(source,destination){
  await fs.cp(source,destination,{recursive:true,errorOnExist:true,force:false,filter:async file=>{
    if((await fs.lstat(file)).isSymbolicLink())throw Error('Backup folders cannot contain symbolic links.');
    return !['LOCK','SingletonLock','SingletonCookie','SingletonSocket'].includes(path.basename(file));
  }});
}
async function createBackup(userData,destination,version){
  if(inside(userData,destination)||inside(destination,userData))throw Error('Choose a backup folder outside the app data folder.');
  if(await exists(destination))throw Error('The backup destination already exists.');
  const staging=destination+'.partial-'+randomUUID();await fs.mkdir(staging,{recursive:true});
  try{
    const included=[];
    for(const name of components){const source=path.join(userData,name);if(await exists(source)){await copy(source,path.join(staging,name));included.push(name);}}
    const files=await inventory(staging,included);
    await fs.writeFile(path.join(staging,manifestName),JSON.stringify({format:'promax-full-backup',version:1,appVersion:version,createdAt:new Date().toISOString(),userData,components:included,files},null,2));
    await fs.rename(staging,destination);return destination;
  }catch(error){await fs.rm(staging,{recursive:true,force:true});throw error;}
}
async function inspectBackup(source){
  const manifest=JSON.parse(await fs.readFile(path.join(source,manifestName),'utf8'));
  if(manifest.format!=='promax-full-backup'||manifest.version!==1||typeof manifest.userData!=='string'||!Array.isArray(manifest.files)||!Array.isArray(manifest.components)||new Set(manifest.components).size!==manifest.components.length||manifest.components.some(n=>!components.includes(n))||!manifest.components.includes('Local Storage'))throw Error('Choose a complete ProMax backup folder.');
  for(const name of manifest.components)if(!(await fs.lstat(path.join(source,name))).isDirectory())throw Error('The backup is missing required data.');
  const files=await inventory(source,manifest.components);
  if(JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('The backup is incomplete or a file has changed. No app data was replaced.');
  return manifest;
}
async function restoreBackup(userData,source,version){
  if(inside(userData,source)||inside(source,userData))throw Error('Choose a backup outside the app data folder.');
  const manifest=await inspectBackup(source),safety=path.join(path.dirname(userData),`ProMax-before-restore-${Date.now()}`);
  await createBackup(userData,safety,version);
  const staging=path.join(userData,'restore-'+randomUUID());await fs.mkdir(staging);
  const moved=[],installed=[];
  try{
    for(const name of manifest.components)await copy(path.join(source,name),path.join(staging,'new-'+name));
    const copied=(await inventory(staging,manifest.components.map(n=>'new-'+n))).map(f=>({...f,name:f.name.replace(/^new-/, '')}));
    if(JSON.stringify(copied)!==JSON.stringify(manifest.files))throw Error('Backup verification failed. No app data was replaced.');
    for(const name of components){const target=path.join(userData,name);if(!inside(userData,target))throw Error('Invalid restore target.');if(await exists(target)){await fs.rename(target,path.join(staging,'old-'+name));moved.push(name);}if(manifest.components.includes(name)){await fs.rename(path.join(staging,'new-'+name),target);installed.push(name);}}
    // Converted slides use absolute file URLs. Remap them after opening the restored store.
    await fs.writeFile(path.join(userData,'restored-path.json'),JSON.stringify({from:manifest.userData,to:userData}));
  }catch(error){
    for(const name of installed)await fs.rm(path.join(userData,name),{recursive:true,force:true});
    for(const name of moved)await fs.rename(path.join(staging,'old-'+name),path.join(userData,name));
    throw error;
  }finally{await fs.rm(staging,{recursive:true,force:true});}
  return safety;
}
async function runMaintenance(userData,version){
  const pending=path.join(userData,'pending-maintenance.json');if(!await exists(pending))return null;
  let result;
  try{
    const raw=await fs.readFile(pending,'utf8');await fs.unlink(pending);const operation=JSON.parse(raw);
    if(operation.kind==='backup'){await createBackup(userData,operation.path,version);result={message:'Full backup created.',path:operation.path};}
    else if(operation.kind==='restore'){const safety=await restoreBackup(userData,operation.path,version);result={message:'Backup restored. Your previous data is kept in a safety backup.',path:safety};}
    else throw Error('Unknown maintenance operation.');
  }catch(error){result={message:'Backup operation failed: '+error.message,error:true};}
  // Keep the outcome available to transfer helpers after the startup toast fades.
  result.completedAt=new Date().toISOString();
  try{await fs.writeFile(path.join(userData,'maintenance-result.json'),JSON.stringify(result,null,2));}catch{}
  return result;
}
module.exports={createBackup,restoreBackup,inspectBackup,runMaintenance,inside};
