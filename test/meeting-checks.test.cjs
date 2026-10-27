const test=require('node:test'),assert=require('node:assert/strict');
const {assess}=require('../meeting-checks');
const {checkPresentationFiles}=require('../desktop/meeting-files.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
test('meeting check distinguishes missing content, generation, offline passages and online YouTube',()=>{
  const folder={items:[{id:'a',type:'song',songId:'missing'},{id:'b',type:'song',songId:'draft'},{id:'c',type:'bible',slides:[{text:'Saved passage'}]},{id:'d',type:'youtube',assetId:'link'},{id:'e',type:'video',assetId:'clip'}]};
  const data={songs:[{id:'draft',title:'Draft',lyrics:'Words',slides:[]}],youtube:[{id:'link'}],videos:[{id:'clip'}]};
  const report=assess(folder,data,{videos:new Map([['clip',{status:'attention',message:'Missing file'}]]),files:new Map()});
  assert.deepEqual(report.rows.map(r=>[r.status,r.action]),[['attention','replace'],['attention','generate'],['ready',null],['online',null],['attention','replace']]);
  assert.deepEqual(report.counts,{ready:1,attention:3,online:1,unverified:0,checking:0});
});
test('managed slide checks reject outside paths and truncated files while reading valid PNG metadata',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-check-files-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const dir=path.join(root,'presentations','11111111-1111-1111-1111-111111111111');await fs.mkdir(dir,{recursive:true});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZ0AAAAASUVORK5CYII=','base64');
  await fs.writeFile(path.join(dir,'slide-0001.png'),png);await fs.writeFile(path.join(dir,'slide-0002.png'),png.subarray(0,30));
  const urls=[1,2,3].map(i=>pathToFileURL(path.join(dir,`slide-000${i}.png`)).href);urls.push(pathToFileURL(path.join(root,'secret.png')).href,'https://example.com/slide.png');
  assert.deepEqual((await checkPresentationFiles(root,urls)).files.map(f=>f.status),['available','invalid','missing','unsupported','unsupported']);
  await assert.rejects(checkPresentationFiles(root,Array(257).fill(urls[0])),/Invalid/);
});
