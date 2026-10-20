const { _electron:electron }=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {startTestService}=require('../shared-service/local-test-server.cjs');
async function run(){
  const service=await startTestService();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'promax-shared-test-'));const processes=new Set(),errors=[];
  const watchdog=setTimeout(()=>{for(const app of processes)app.process().kill();console.error('Shared desktop test timed out.');process.exit(1);},120000);watchdog.unref();
  async function launch(profile){const env={...process.env,PROMAX_TEST_DATA:path.join(directory,profile),PROMAX_SHARED_TEST_URL:service.url};delete env.ELECTRON_RUN_AS_NODE;
    const app=await electron.launch({args:[path.join(__dirname,'..')],env,timeout:30000});processes.add(app);const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.locator('.song').first().waitFor();return {app,page};}
  async function close(app){const child=app.process();const exited=child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));await app.close();await exited;processes.delete(app);}
  async function open(page){await page.locator('#shared-open').click();await page.locator('#sharing-dialog').waitFor();}
  async function done(page,text){await page.locator('#shared-message').filter({hasText:text}).waitFor();}
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
    await a.page.locator('#shared-people').click();await a.page.locator('#shared-members').getByText('Test Friend',{exact:true}).waitFor();a.page.once('dialog',d=>d.accept());await a.page.locator('#shared-members').getByRole('button',{name:'Remove',exact:true}).click();await done(a.page,'Person removed.');
    await open(b.page);await b.page.locator('#shared-sync').click();await done(b.page,'Your access has ended.');assert.equal(await b.page.locator('.song').count(),3);
    await a.page.getByText('Access & disconnect',{exact:true}).click();await a.page.locator('#shared-backup').click();await done(a.page,'Personal access key copied.');const key=await a.app.evaluate(({clipboard})=>clipboard.readText());
    const encrypted=await fs.readFile(path.join(directory,'owner','shared-access.enc'));assert.ok(!encrypted.includes(key.slice(5)),'access token is encrypted');assert.ok(!JSON.stringify(await a.page.evaluate(()=>proMaxPrepareUpdate())).includes(key.slice(5)),'backup contains no token');
    await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});await a.page.screenshot({path:path.join(__dirname,'..','test-results','shared-library.png'),fullPage:true});
    await close(a.app);a=await launch('owner');await open(a.page);await a.page.locator('#shared-group').filter({hasText:'Desktop test group'}).waitFor();assert.equal((await a.page.evaluate(()=>proMaxShared.getState())).self.role,'owner');assert.deepEqual(errors,[]);
    console.log('Shared desktop passed: two independent profiles, explicit sharing, encrypted access, receive-only, automatic revisions, local conflict preservation, revocation and restart.');
  }finally{for(const app of [...processes])try{await close(app);}catch{app.process().kill();}await service.close();clearTimeout(watchdog);
    if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('promax-shared-test-'))throw Error('Unexpected test directory');
    await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(e=>{if(!['EBUSY','EPERM','ENOTEMPTY'].includes(e.code))throw e;});}
}
run().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
