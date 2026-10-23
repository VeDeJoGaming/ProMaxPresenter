const fs=require('node:fs/promises');const path=require('node:path');
const {pathToFileURL,fileURLToPath}=require('node:url');
// Only managed PowerPoint sources and slide previews, never arbitrary paths.
function target(root,name){
  if(typeof name!=='string'||! /^[a-f0-9-]{36}\/(?:slide-\d+\.png|source\.pptx)$/i.test(name))throw Error('Invalid private presentation path.');
  return path.join(root,...name.split('/'));
}
function createPrivateFiles(userData){
  const root=path.join(userData,'presentations');
  return {
    root:pathToFileURL(root+path.sep).href,
    async read(url){const absolute=fileURLToPath(url),relative=path.relative(root,absolute).split(path.sep).join('/');const file=target(root,relative);
      const dir=await fs.lstat(path.dirname(file)),info=await fs.lstat(file);if(dir.isSymbolicLink()||info.isSymbolicLink()||!info.isFile()||info.size>32*1024*1024)throw Error('Invalid presentation slide.');
      return {name:relative,data:(await fs.readFile(file)).toString('base64')};},
    async write(input){const file=target(root,input.name);if(typeof input.data!=='string'||input.data.length>44*1024*1024||! /^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw Error('Invalid slide data.');
      await fs.mkdir(path.dirname(file),{recursive:true});if((await fs.lstat(path.dirname(file))).isSymbolicLink())throw Error('Invalid presentation directory.');
      // Content-address the imported directory in the renderer; existing files must match.
      const bytes=Buffer.from(input.data,'base64');try{await fs.writeFile(file,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||(await fs.lstat(file)).isSymbolicLink()||!(await fs.readFile(file)).equals(bytes))throw Error('A local presentation file differs. Your local file was kept.');}
      return pathToFileURL(file).href;}
  };
}
module.exports={createPrivateFiles};
