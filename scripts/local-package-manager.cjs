const fs=require('node:fs'),path=require('node:path');
// CI uses npm ci. A local pnpm installation needs its own dependency collector,
// even though the repository intentionally keeps package-lock.json for CI.
function preparePackageManager(project,env=process.env){
  const internal=path.join(project,'node_modules','.pnpm','lock.yaml');
  if(!fs.existsSync(internal)||!fs.existsSync(path.join(project,'node_modules','.modules.yaml')))return ()=>{};
  const lock=path.join(project,'pnpm-lock.yaml'),source=fs.readFileSync(internal),previous=env.npm_config_user_agent;let created=false,cleaned=false;
  if(!fs.existsSync(lock)){fs.writeFileSync(lock,source,{flag:'wx'});created=true;}
  env.npm_config_user_agent='pnpm/local-promax-build';
  return ()=>{
    if(cleaned)return;cleaned=true;
    if(previous===undefined)delete env.npm_config_user_agent;else env.npm_config_user_agent=previous;
    // Never discard a lockfile edited by another process during the build.
    if(created&&fs.existsSync(lock)&&fs.readFileSync(lock).equals(source))fs.unlinkSync(lock);
  };
}
module.exports={preparePackageManager};
