const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {fileURLToPath,pathToFileURL}=require('node:url');
const run=require('node:util').promisify(require('node:child_process').execFile);
const actions=new Set(['inspect','update','addText','addShape','addImage','deleteObject','duplicateSlide','addSlide','deleteSlide']);
async function sourceFile(userData,url){
  if(typeof url!=='string'||!url.startsWith('file:'))throw Error('Reimport this presentation to enable editing.');
  const root=path.join(userData,'presentations'),file=fileURLToPath(url),relative=path.relative(root,file);
  if(!/^[a-f0-9-]{36}[\\/]source\.pptx$/i.test(relative))throw Error('Invalid editable presentation.');
  const [dir,info]=await Promise.all([fs.lstat(path.dirname(file)),fs.lstat(file)]);
  if(dir.isSymbolicLink()||info.isSymbolicLink()||!info.isFile()||info.size>256*1024*1024)throw Error('Invalid editable presentation.');
  return file;
}
function validate(request){
  if(!request||!actions.has(request.action))throw Error('Invalid edit.');
  if(request.action!=='inspect'&&(!Number.isInteger(request.slide)||request.slide<1||request.slide>10000))throw Error('Invalid slide.');
  if(['update','deleteObject'].includes(request.action)&&(!Number.isInteger(request.shape)||request.shape<1))throw Error('Invalid object.');
  if(request.action==='update'){
    const values=request.values;if(!values||typeof values!=='object')throw Error('Invalid object properties.');
    for(const [key,value] of Object.entries(values)){
      if(['left','top','width','height','fontSize'].includes(key)){
        if(!Number.isFinite(value)||Math.abs(value)>10000||(['width','height','fontSize'].includes(key)&&value<=0))throw Error('Invalid object size or position.');
      }else if(key==='text'){if(typeof value!=='string'||value.length>100000)throw Error('Invalid text.');}
      else if(key==='fontName'){if(typeof value!=='string'||value.length>100)throw Error('Invalid font.');}
      else if(key==='bold'){if(typeof value!=='boolean')throw Error('Invalid style.');}
      else if(key==='color'){if(!/^#[a-f0-9]{6}$/i.test(value))throw Error('Invalid color.');}
      else throw Error('Unsupported property.');
    }
  }
}
async function editPowerPoint(userData,request){
  validate(request);const source=await sourceFile(userData,request.source);
  const inspect=request.action==='inspect';
  const destination=inspect?await fs.mkdtemp(path.join(os.tmpdir(),'promax-pptx-')):path.join(userData,'presentations',require('node:crypto').randomUUID());
  await fs.mkdir(destination,{recursive:true});
  try{
    const requestFile=path.join(destination,'request.json');await fs.writeFile(requestFile,JSON.stringify(request));
    const script=path.join(__dirname,'edit-powerpoint.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
    await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Source',source,'-Destination',destination,'-Request',requestFile],{windowsHide:true,timeout:180000,maxBuffer:1024*1024});
    const model=JSON.parse(await fs.readFile(path.join(destination,'model.json'),'utf8'));
    if(inspect)return {model};
    await fs.unlink(requestFile);await fs.unlink(path.join(destination,'model.json'));
    return {model,nativeSource:pathToFileURL(path.join(destination,'source.pptx')).href,slides:model.slides.map(s=>pathToFileURL(path.join(destination,`slide-${String(s.index).padStart(4,'0')}.png`)).href)};
  }catch(error){await fs.rm(destination,{recursive:true,force:true});throw Error(error.killed?'PowerPoint took too long. Close any PowerPoint dialog and retry.':'Could not edit this presentation. '+(error.stderr?.trim()||error.message));}
  finally{if(inspect)await fs.rm(destination,{recursive:true,force:true});}
}
module.exports={editPowerPoint,sourceFile,validate};
