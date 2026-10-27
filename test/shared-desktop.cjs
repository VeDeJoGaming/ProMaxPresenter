const { _electron:electron }=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {startTestService}=require('../shared-service/local-test-server.cjs');
async function run(){
  const service=await startTestService();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'promax-shared-test-'));const processes=new Set(),errors=[];
  const watchdog=setTimeout(()=>{for(const app of processes){if(process.platform==='win32'){try{require('node:child_process').execFileSync('taskkill.exe',['/PID',String(app.process().pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{app.process().kill();}}else app.process().kill();}console.error('Shared desktop test timed out.');process.exit(1);},120000);watchdog.unref();
  async function launch(profile){const env={...process.env,PROMAX_TEST_DATA:path.join(directory,profile),PROMAX_SHARED_TEST_URL:service.url};delete env.ELECTRON_RUN_AS_NODE;
    const app=await electron.launch({args:[path.join(__dirname,'..')],env,timeout:30000});processes.add(app);const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.locator('.song').first().waitFor();await page.evaluate(()=>{document.getElementById('lyrics-fold').open=true;});return {app,page};}
  async function close(app){const child=app.process();const exited=child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));app.close().catch(()=>{});await exited;processes.delete(app);}
  async function open(page){await page.locator('#shared-open').click();await page.locator('#sharing-dialog').waitFor();}
  async function done(page,text){console.log('Shared check: '+text);await page.locator('#shared-message').filter({hasText:text}).waitFor();}
  try{
    let a=await launch('owner');const b=await launch('friend');
    await open(a.page);await a.page.locator('#shared-name').fill('Test Owner');await a.page.locator('#shared-choice').selectOption('share');
    await a.page.getByText('Create a group',{exact:true}).click();await a.page.locator('#shared-group-name').fill('Desktop test group');await a.page.locator('#shared-create').click();await done(a.page,'Connected.');
    assert.equal(service.sql.prepare('SELECT COUNT(*) n FROM songs').get().n,0,'joining must not upload');
    await a.page.locator('#shared-invite').click();await done(a.page,'Invitation copied.');const invitation=await a.app.evaluate(({clipboard})=>clipboard.readText());
    await open(b.page);await b.page.locator('#shared-name').fill('Test Friend');await b.page.locator('#shared-choice').selectOption('receive');await b.page.locator('#shared-code').fill(invitation);await b.page.locator('#shared-join').click();await done(b.page,'Connected.');
    await a.page.locator('#shared-close').click();await a.page.locator('#title').fill('Our group song');await a.page.locator('#lyrics').fill('First shared version');await a.page.locator('#build').click();await open(a.page);
    a.page.once('dialog',d=>d.accept());await a.page.locator('#shared-song').click();await done(a.page,'1 song shared');
    await b.page.locator('#shared-sync').click();await done(b.page,'1 added');await b.page.locator('#shared-close').click();assert.equal(await b.page.locator('.song').count(),2);
    await b.page.getByRole('button',{name:'Our group song',exact:false}).click();await b.page.locator('#lyrics').fill('My local edit');
    await a.page.locator('#shared-close').click();await a.page.locator('#lyrics').fill('Second shared version');await a.page.locator('#build').click();await open(a.page);await a.page.locator('#shared-sync').click();await done(a.page,'Your local songs are saved.');
    await open(b.page);await b.page.locator('#shared-sync').click();await done(b.page,'Your edits were kept');await b.page.locator('#shared-close').click();assert.equal(await b.page.locator('#lyrics').inputValue(),'My local edit');assert.equal(await b.page.locator('.song').count(),3);
    // Group Bible publication is explicit; receiving never overwrites an existing translation.
    await a.page.evaluate(async()=>{await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Synthetic shared Bible',verses:[{book:'Matt',chapter:6,verse:9,text:'Generated first verse'},{book:'Matt',chapter:6,verse:10,text:'Generated second verse'}]})],'test-bible.json'));});
    a.page.once('dialog',d=>d.accept());await a.page.locator('#shared-bible-publish').click();await done(a.page,'Bible shared with your group.');
    await open(b.page);await b.page.locator('#shared-sync').click();await done(b.page,'Your local songs are saved.');
    assert.equal(await b.page.evaluate(()=>ProMaxFeatures.getBible()?.name),'Synthetic shared Bible');
    await b.page.evaluate(()=>ProMaxFeatures.receiveBible({name:'Keep local translation',verses:[{book:'Matt',chapter:1,verse:1,text:'Generated local verse'}]}));
    await b.page.locator('#shared-sync').click();await done(b.page,'Your local songs are saved.');
    assert.equal(await b.page.evaluate(()=>ProMaxFeatures.getBible().name),'Keep local translation');
    b.page.once('dialog',d=>d.accept());await b.page.locator('#shared-bible-use').click();await done(b.page,'Shared Bible saved for offline use.');
    assert.equal(await b.page.evaluate(()=>ProMaxFeatures.getBible().verses.length),2);
    await a.page.locator('#shared-people').click();await a.page.locator('#shared-members').getByText('Test Friend',{exact:true}).waitFor();a.page.once('dialog',d=>d.accept());await a.page.locator('#shared-members').getByRole('button',{name:'Remove',exact:true}).click();await done(a.page,'Person removed.');
    await b.page.locator('#shared-sync').click();await done(b.page,'Your access has ended.');assert.equal(await b.page.locator('.song').count(),3);
    await a.page.getByText('Access & disconnect',{exact:true}).click();await a.page.locator('#shared-backup').click();await done(a.page,'Personal access key copied.');const key=await a.app.evaluate(({clipboard})=>clipboard.readText());
    const encrypted=await fs.readFile(path.join(directory,'owner','shared-access.enc'));assert.ok(!encrypted.includes(key.slice(5)),'access token is encrypted');assert.ok(!JSON.stringify(await a.page.evaluate(()=>proMaxPrepareUpdate())).includes(key.slice(5)),'backup contains no token');
    // A new computer with the same personal access key must receive this owner's songs too.
    const restored=await launch('restored-owner');await open(restored.page);
    await restored.page.getByText('Restore access on this computer',{exact:true}).click();
    await restored.page.locator('#shared-key').fill(key);await restored.page.locator('#shared-restore').click();await done(restored.page,'Access restored.');
    await restored.page.locator('#shared-sync').click();await done(restored.page,'1 added');await restored.page.locator('#shared-close').click();
    await restored.page.getByRole('button',{name:'Our group song',exact:false}).click();
    assert.equal(await restored.page.locator('#lyrics').inputValue(),'Second shared version');
    await open(restored.page);await restored.page.locator('#shared-sync').click();await done(restored.page,'0 added');
    assert.equal(await restored.page.locator('.song').count(),2,'Repeating sync cannot duplicate restored songs');await close(restored.app);
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});await a.page.screenshot({path:path.join(__dirname,'..','test-results','shared-library.png'),fullPage:true});
    await close(a.app);a=await launch('owner');await open(a.page);await a.page.locator('#shared-group').filter({hasText:'Desktop test group'}).waitFor();assert.equal((await a.page.evaluate(()=>proMaxShared.getState())).self.role,'owner');assert.deepEqual(errors,[]);
    console.log('Shared desktop passed: three independent profiles, restored owner receives its own songs, idempotent sync, explicit sharing, encrypted access, receive-only, automatic revisions, local conflict preservation, revocation and restart.');
  }finally{for(const app of [...processes])try{await close(app);}catch{app.process().kill();}await service.close();clearTimeout(watchdog);
    if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('promax-shared-test-'))throw Error('Unexpected test directory');
    if(!(process.env.CI==='true'&&process.platform==='win32'))await fs.rm(directory,{recursive:true,force:true,maxRetries:2,retryDelay:200}).catch(e=>{if(!['EBUSY','EPERM','ENOTEMPTY'].includes(e.code))throw e;});}
}
run().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
