const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {parse}=require('../library-data');
const {createLibraryRecovery}=require('../desktop/library-recovery');
const {createBackup,inspectBackup,restoreBackup,runMaintenance}=require('../desktop/backups');
const library=title=>({songs:[{id:'song',title,lyrics:'Text',slides:[{text:'Text',section:'Verse',key:'v'}]}],settings:{color:null,fontSize:100,visualColors:['broken']},meetingFolders:[]});
test('Saved libraries normalize legacy values and reject damaged content',()=>{
  const value=parse(library('Legacy'));assert.equal(value.settings.color,'#181818');assert.equal(value.settings.fontSize,9);assert.equal(value.settings.visualColors.length,3);assert.ok(value.songs[0].slides[0].id);assert.equal(value.selected,'song');
  assert.throws(()=>parse('{broken'));assert.throws(()=>parse({songs:[{slides:null}]}));assert.throws(()=>parse({...library('Future'),schemaVersion:2}));
});
test('Atomic recovery retains the previous valid version and coalesces edits',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-recovery-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const recovery=createLibraryRecovery(root);recovery.save(JSON.stringify(library('First')));await recovery.flush();
  recovery.save(JSON.stringify(library('Intermediate')));recovery.save(JSON.stringify(library('Latest')));await recovery.flush();assert.equal(recovery.read().library.songs[0].title,'Latest');
  await fs.writeFile(path.join(root,'recovery','library.json'),'{truncated');assert.equal(recovery.read().library.songs[0].title,'First');assert.equal(recovery.read().recovered,true);
  assert.throws(()=>recovery.save('{bad'));assert.equal(recovery.read().library.songs[0].title,'First');
});
test('Full backups verify every file, restore media and keep the replaced data',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-backup-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const data=path.join(root,'data'),backup=path.join(root,'backup');
  for(const name of ['Local Storage','IndexedDB','presentations'])await fs.mkdir(path.join(data,name),{recursive:true});
  await fs.writeFile(path.join(data,'Local Storage','library'),'original songs');await fs.writeFile(path.join(data,'IndexedDB','video'),Buffer.from([0,1,255,64]));await fs.writeFile(path.join(data,'IndexedDB','LOCK'),'');await fs.writeFile(path.join(data,'presentations','slide.png'),'image');
  await createBackup(data,backup,'1.0.0');const manifest=await inspectBackup(backup);assert.equal(manifest.files.length,3);assert.ok(manifest.files.every(f=>f.sha256.length===64));
  await fs.writeFile(path.join(data,'Local Storage','library'),'newer songs');const safety=await restoreBackup(data,backup,'1.0.0');
  assert.equal(await fs.readFile(path.join(data,'Local Storage','library'),'utf8'),'original songs');assert.equal(await fs.readFile(path.join(safety,'Local Storage','library'),'utf8'),'newer songs');assert.deepEqual(await fs.readFile(path.join(data,'IndexedDB','video')),Buffer.from([0,1,255,64]));
  await fs.writeFile(path.join(backup,'IndexedDB','video'),'damaged');await assert.rejects(()=>restoreBackup(data,backup,'1.0.0'),/incomplete|changed/);assert.equal(await fs.readFile(path.join(data,'Local Storage','library'),'utf8'),'original songs');
  await assert.rejects(()=>createBackup(data,path.join(data,'nested'),'1.0.0'),/outside/);
});
test('Damaged maintenance requests cannot prevent the app from opening',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'promax-maintenance-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'pending-maintenance.json'),'{bad');
  const result=await runMaintenance(root,'1.0.0');assert.equal(result.error,true);assert.match(result.message,/failed/);assert.equal(await runMaintenance(root,'1.0.0'),null);
  const recorded=JSON.parse(await fs.readFile(path.join(root,'maintenance-result.json'),'utf8'));assert.equal(recorded.error,true);assert.equal(recorded.message,result.message);assert.ok(recorded.completedAt);
});
