const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageIndex=process.argv.indexOf('--package-root'),root=packageIndex>=0?process.argv[packageIndex+1]:path.join(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'promax-background-fade-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  try{
    await win.loadFile(path.join(root,'index.html'));const run=code=>win.webContents.executeJavaScript(code);await run('ProMaxControls.ready');
    const result=await run(`(()=>{
      const originalNow=performance.now.bind(performance),raf=requestAnimationFrame,caf=cancelAnimationFrame;let clock=1000,live;
      const pixels=canvas=>{canvas.drawFrame();const gl=canvas.getContext('webgl'),data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
      const difference=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;};
      try{
        Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});window.requestAnimationFrame=()=>123;window.cancelAnimationFrame=()=>{};
        settings.glassAuto=false;settings.glassVariant='a';settings.visualPalette='original';settings.visualMotion='normal';goLive(0);selectVisual('molten-glass');live=document.querySelector('#preview canvas[data-glass]');clock+=1600;pixels(live);
        const text=document.querySelector('#preview .screen-text'),before=pixels(live);selectVisual('still-waters');const first=pixels(live),starts=difference(before,first);
        clock+=750;const middle=pixels(live),midProgress=live.getLookState().backgroundProgress;
        selectVisual('velocity-streams');const interrupted=pixels(live),interruption=difference(middle,interrupted),snapshotError=live.getContext('webgl').getError();
        const procedural=ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg');
        const jumps=[];for(let i=0;i<20;i++){clock+=100;const old=pixels(live);selectVisual(procedural[i%procedural.length].id);jumps.push(difference(old,pixels(live)));}
        const sameText=text===document.querySelector('#preview .screen-text');goLive(1);const changedText=document.querySelector('#preview .screen-text').textContent===state.text;
        clock+=1600;pixels(live);const ended=!live.getRenderStats().transitioning;
        selectVisual(null);const solidStart=live.getLookState().backgroundProgress;clock+=1600;const solid=pixels(live),solidPixel=Array.from(solid.slice(0,3));
        return {snapshotError,starts,midProgress,moves:difference(before,middle),interruption,maxJump:Math.max(...jumps),sameCanvas:live===document.querySelector('#preview canvas[data-glass]'),canvasCount:document.querySelectorAll('#preview canvas').length,sameText,changedText,ended,solidStart,solidPixel};
      }finally{live?.stop();Object.defineProperty(performance,'now',{configurable:true,value:originalNow});window.requestAnimationFrame=raf;window.cancelAnimationFrame=caf;document.getElementById('blackout').click();document.getElementById('blackout').click();}
    })()`);
    assert.equal(result.snapshotError,0,'GPU snapshots must copy the RGB presentation buffer without an error');
    assert.ok(result.starts<.01,'Selecting another style must start from the exact displayed frame');assert.equal(result.midProgress,.5);assert.ok(result.moves>1,'The midpoint contains a visible blend');assert.ok(result.interruption<.01,'Interrupting a transition must preserve the composite frame');assert.ok(result.maxJump<.01,'Rapid changes cannot introduce a cut or flip');assert.equal(result.sameCanvas,true);assert.equal(result.canvasCount,1);assert.equal(result.sameText,true);assert.equal(result.changedText,true);assert.equal(result.ended,true);assert.equal(result.solidStart,0);assert.deepEqual(result.solidPixel,[24,24,24]);
    await run(`selectVisual('golden-hour');setMedia(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="blue"/></svg>'],{type:'image/svg+xml'}))`);
    assert.equal(await run("document.querySelectorAll('#preview .background-fade').length"),1,'Custom images fade from the previous background');
    await new Promise(r=>setTimeout(r,700));const opacity=await run("Number(getComputedStyle(document.querySelector('#preview .background-fade')).opacity)");assert.ok(opacity>0&&opacity<1,'A real compositor fade runs between frames');
    await run("selectVisual('dynamic-glass');selectVisual('bloom-rays');setMedia(new Blob(['<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><rect width=\"8\" height=\"8\" fill=\"red\"/></svg>'],{type:'image/svg+xml'}))");
    assert.equal(await run("document.querySelectorAll('#preview .background-fade').length"),1,'Interrupted file transitions keep only one compositor snapshot');
    await new Promise(r=>setTimeout(r,1800));assert.equal(await run("document.querySelectorAll('#preview .background-fade').length"),0,'Finished transitions release the snapshot');
    await run(`(async()=>{const source=document.createElement('canvas');source.width=160;source.height=90;const stream=source.captureStream(15),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();let n=0;const timer=setInterval(()=>{const ctx=source.getContext('2d');ctx.fillStyle=n++%2?'blue':'orange';ctx.fillRect(0,0,160,90);},40);await new Promise(r=>setTimeout(r,1500));recorder.stop();await done;clearInterval(timer);stream.getTracks().forEach(track=>track.stop());window.transitionVideoBlob=new Blob(chunks,{type:'video/webm'});setMedia(transitionVideoBlob);})()`);
    await new Promise(r=>setTimeout(r,600));assert.equal(await run("document.querySelector('#preview video').readyState>=2"),true,'Video backgrounds decode while their transition runs');
    await run("window.outgoingBackgroundVideo=document.querySelector('#preview video');selectVisual('dynamic-glass')");assert.equal(await run("outgoingBackgroundVideo.paused&&!outgoingBackgroundVideo.getAttribute('src')"),true,'Outgoing video decoders are released after their frame is captured');
    await run("selectVisual('still-waters');document.getElementById('blackout').click()");assert.equal(await run("document.getElementById('preview').children.length"),0,'Blackout is immediate, including during a background fade');
    ipcMain.on('library:read',event=>{event.returnValue=null;});
    const output=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'desktop','preload.js'),contextIsolation:true,sandbox:true}});
    await output.loadFile(path.join(root,'desktop','output.html'));
    const outputRun=code=>output.webContents.executeJavaScript(code);
    const value={text:'Readable throughout',black:false,pdf:null,media:null,settings:{color:'#181818',fontSize:5,align:'center',visual:'golden-hour',glassAuto:false,glassVariant:'a',visualPalette:'original',renderQuality:'performance'}};
    output.webContents.send('presentation:state',value);await new Promise(r=>setTimeout(r,200));
    await outputRun("window.fadeCanvas=document.querySelector('canvas[data-glass]');window.fadeText=document.querySelector('.screen-text');window.frameStart=fadeCanvas.getRenderStats().frames;window.fadeStart=performance.now()");
    const choices=await run("ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg').map(p=>p.id)");
    for(const id of choices){value.settings.visual=id;output.webContents.send('presentation:state',value);await new Promise(r=>setTimeout(r,100));}
    value.text='Text changes immediately';output.webContents.send('presentation:state',value);await new Promise(r=>setTimeout(r,80));
    assert.equal(await outputRun("fadeCanvas===document.querySelector('canvas[data-glass]')&&fadeText===document.querySelector('.screen-text')&&fadeText.textContent==='Text changes immediately'"),true,'Native output retains its canvas and text node across styles');
    const fps=await outputRun('(fadeCanvas.getRenderStats().frames-frameStart)*1000/(performance.now()-fadeStart)');assert.ok(fps>45,`Crossfades must keep smooth output (observed ${fps.toFixed(1)} fps)`);
    value.settings.visual=null;value.media={url:await run('URL.createObjectURL(transitionVideoBlob)'),type:'video/webm'};output.webContents.send('presentation:state',value);await new Promise(r=>setTimeout(r,500));
    assert.equal(await outputRun("document.querySelector('#stage video').readyState>=2&&!!document.querySelector('#stage .background-fade')"),true,'Native output also fades into decoded video backgrounds');
    value.black=true;output.webContents.send('presentation:state',value);await new Promise(r=>setTimeout(r,50));assert.equal(await outputRun("document.getElementById('stage').children.length"),0);
    const report={passed:true,...result,mediaFadeOpacity:opacity,nativeCrossfadeFps:fps};
    fs.mkdirSync(path.join(__dirname,'..','artifacts'),{recursive:true});
    fs.writeFileSync(path.join(__dirname,'..','artifacts',packageIndex>=0?'packaged-background-transitions.json':'background-transitions.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
