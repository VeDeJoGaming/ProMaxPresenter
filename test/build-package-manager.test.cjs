const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {preparePackageManager}=require('../scripts/local-package-manager.cjs');
function project(t,pnpm=true){const root=fs.mkdtempSync(path.join(os.tmpdir(),'promax-pm-'));t.after(()=>{if(path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith('promax-pm-'))throw Error('Unexpected test path');fs.rmSync(root,{recursive:true,force:true});});fs.writeFileSync(path.join(root,'package-lock.json'),'keep npm lock');if(pnpm){fs.mkdirSync(path.join(root,'node_modules','.pnpm'),{recursive:true});fs.writeFileSync(path.join(root,'node_modules','.pnpm','lock.yaml'),'local pnpm lock');fs.writeFileSync(path.join(root,'node_modules','.modules.yaml'),'local pnpm layout');}return root;}
test('local pnpm builds choose the actual install layout and clean up after success or failure',t=>{
  const root=project(t),env={npm_config_user_agent:'npm/11'};const cleanup=preparePackageManager(root,env);
  assert.equal(env.npm_config_user_agent,'pnpm/local-promax-build');assert.equal(fs.readFileSync(path.join(root,'pnpm-lock.yaml'),'utf8'),'local pnpm lock');cleanup();cleanup();assert.equal(env.npm_config_user_agent,'npm/11');assert.equal(fs.existsSync(path.join(root,'pnpm-lock.yaml')),false);assert.equal(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'),'keep npm lock');
  const second=preparePackageManager(root,env);try{throw Error('simulated failure');}catch{}finally{second();}assert.equal(fs.existsSync(path.join(root,'pnpm-lock.yaml')),false);
});
test('existing or concurrently changed pnpm locks are preserved',t=>{
  const root=project(t),env={};const lock=path.join(root,'pnpm-lock.yaml');fs.writeFileSync(lock,'existing root lock');preparePackageManager(root,env)();assert.equal(fs.readFileSync(lock,'utf8'),'existing root lock');assert.equal(env.npm_config_user_agent,undefined);
  fs.unlinkSync(lock);const cleanup=preparePackageManager(root,env);fs.writeFileSync(lock,'changed by another process');cleanup();assert.equal(fs.readFileSync(lock,'utf8'),'changed by another process');
});
test('normal npm installations need no override or extra lockfile',t=>{
  const root=project(t,false),env={npm_config_user_agent:'npm/11'};preparePackageManager(root,env)();assert.equal(env.npm_config_user_agent,'npm/11');assert.equal(fs.existsSync(path.join(root,'pnpm-lock.yaml')),false);
});
