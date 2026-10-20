const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL,fileURLToPath}=require('node:url');
const profile=process.argv[process.argv.indexOf('--profile')+1],verify=process.argv.includes('--verify');
app.setPath('userData',profile);
ipcMain.on('library:read',event=>{let from=null;try{from=JSON.parse(fs.readFileSync(path.join(profile,'restored-path.json'),'utf8')).from;}catch{}const root=dir=>pathToFileURL(path.join(dir,'presentations')+path.sep).href;event.returnValue={presentationRoot:root(profile),restoredPresentationRoot:from?root(from):null};});
ipcMain.on('library:save',()=>{});ipcMain.on('presentation:state',()=>{});
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'..','desktop','preload.js'),contextIsolation:true,sandbox:true}});
  try{
    await win.loadFile(path.join(__dirname,'..','index.html'));const run=code=>win.webContents.executeJavaScript(code);await run('ProMaxControls.ready');
    if(!verify){
      const slide=path.join(profile,'presentations','backup-deck','slide-0001.png');fs.mkdirSync(path.dirname(slide),{recursive:true});fs.writeFileSync(slide,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
      await run(`(async()=>{
        current().title='Backup round trip';current().lyrics='Saved lyrics';current().slides=[{id:uid(),text:'Restored slide',section:'Verse',key:'v'}];settings.quickText='Saved welcome';save();
        ProMaxMeetings.create('Restored meeting');ProMaxMeetings.addSong();
        await ProMaxFeatures.importBible(new File([JSON.stringify({name:'Offline test',verses:[{book:'John',chapter:3,verse:16,text:'Restored verse'}]})],'bible.json'));
        await ProMaxFeatures.addVideos([new File([new Uint8Array([0,1,42,255])],'backup-video.webm',{type:'video/webm'})]);
        await storedAsset('put',new File(['saved background'],'background.png',{type:'image/png'}),'background');
        await storedAsset('put',[{id:'saved-youtube',title:'Saved link',videoId:'M7lc1UVf-VE',start:0}],'youtube-list');
        await ProMaxFeatures.saveDocument({id:'backup-deck',title:'Saved deck',slides:[${JSON.stringify(pathToFileURL(slide).href)}]});save();
      })()`);
    }else{
      assert.equal(await run('current().title'),'Backup round trip');assert.equal(await run('settings.quickText'),'Saved welcome');assert.equal(await run('meetingFolders[0].name'),'Restored meeting');assert.equal(await run('meetingFolders[0].items[0].songId===current().id'),true);
      assert.equal(await run('ProMaxFeatures.getBible().verses[0].text'),'Restored verse');assert.equal(await run('ProMaxFeatures.getVideos()[0].name'),'backup-video.webm');
      assert.deepEqual(await run('(async()=>Array.from(new Uint8Array(await (await storedAsset("get",null,"video:"+ProMaxFeatures.getVideos()[0].id)).arrayBuffer())))()'),[0,1,42,255]);
      assert.equal(await run('(async()=>(await storedAsset("get",null,"background")).text())()'),'saved background');assert.equal(await run('ProMaxYouTubeLibrary.list()[0].title'),'Saved link');
      const slide=await run('ProMaxFeatures.getDocuments()[0].slides[0]');assert.ok(fileURLToPath(slide).startsWith(profile));assert.equal(fs.existsSync(fileURLToPath(slide)),true);
      assert.equal(await run(`(async()=>{const image=new Image();image.src=${JSON.stringify(slide)};await image.decode();return image.naturalWidth;})()`),1);
    }
    await run('dbPromise.then(db=>db.close())');session.defaultSession.flushStorageData();win.close();app.quit();
  }catch(error){console.error(error);app.exit(1);}
}).catch(error=>{console.error(error);app.exit(1);});
