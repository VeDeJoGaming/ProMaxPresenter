const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'promax-visuals-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{backgroundThrottling:false}});
  try{
    await win.loadFile(path.join(__dirname,'..','index.html'));
    const result=await win.webContents.executeJavaScript(`(async()=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const checks=[],differences=[];
      const pixels=()=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const compare=(a,b)=>{let total=0,changed=0;for(let i=0;i<a.length;i+=4){let delta=0;for(let j=0;j<3;j++)delta+=Math.abs(a[i+j]-b[i+j]);total+=delta;if(delta>54)changed++;}return {mean:Math.round(total/(a.length/4*3)*100)/100,changed:Math.round(changed/(a.length/4)*1000)/10};};
      for(const p of ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg'))for(const variant of ['a','b','c']){
        const preset={...p,variant};const frame=phase=>{ProMaxVisuals.draw(canvas,preset,phase);return canvas.toDataURL();};
        const start=frame(0),firstPixels=pixels();frame(.99999);const seam=compare(firstPixels,pixels()).mean;
        checks.push({name:p.name+' '+variant,loops:start===frame(1),moves:start!==frame(.173),seam});
      }
      for(const p of ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg')){const images=['a','b','c'].map(variant=>{ProMaxVisuals.draw(canvas,{...p,variant},.17);return pixels();});differences.push({name:p.name,ab:compare(images[0],images[1]),bc:compare(images[1],images[2])});}
      const scenes=ProMaxVisuals.presets.filter(p=>p.kind!=='bundled-svg');
      const sheets=[];canvas.width=480;canvas.height=270;
      for(let group=0;group<scenes.length;group+=4){
        const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=1200;
        const ctx=sheet.getContext('2d');ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,sheet.width,sheet.height);
        scenes.slice(group,group+4).forEach((p,row)=>['a','b','c'].forEach((variant,col)=>{
          ProMaxVisuals.draw(canvas,{...p,variant},.17);ctx.drawImage(canvas,col*480,row*300);
          ctx.fillStyle='#ffffff';ctx.font='16px Segoe UI';ctx.fillText(p.name+' · '+variant.toUpperCase(),col*480+12,row*300+291);
        }));sheets.push(sheet.toDataURL());
      }
      selectVisual('still-waters');settings.glassAuto=false;settings.glassVariant='a';paint();
      const live=document.querySelector('#preview canvas');
      settings.glassVariant='c';settings.visualPalette='custom';settings.visualColors=['#3fab79','#fff5cf','#102835'];paint();
      const reused=live===document.querySelector('#preview canvas');
      await new Promise(r=>setTimeout(r,5200));
      const custom=live.captureFrame();settings.visualPalette='original';paint();await new Promise(r=>setTimeout(r,5200));
      const colorsChanged=custom!==live.captureFrame();
      const timings=[];canvas.width=1920;canvas.height=1080;
      for(const p of scenes){const start=performance.now();ProMaxVisuals.draw(canvas,{...p,variant:'c'},.17);canvas.getContext('2d').getImageData(0,0,1,1);timings.push({name:p.name,ms:Math.round(performance.now()-start)});}
      document.getElementById('browse-visuals').click();
      const triptychs=document.querySelectorAll('.visual-triptych').length;
      const galleryFrames=document.querySelectorAll('.visual-triptych canvas').length;
      return {checks,reused,colorsChanged,sheets,differences,timings,triptychs,galleryFrames,count:scenes.length};
    })()`);
    assert.equal(result.count,24);for(const check of result.checks){assert.ok(check.loops,check.name+' loop');assert.ok(check.moves,check.name+' moves');assert.ok(check.seam<.5,check.name+' motion approaches loop boundary smoothly');}
    for(const check of result.differences)for(const pair of ['ab','bc']){
      assert.ok(check[pair].mean>2,check.name+' '+pair+' must visibly change composition');
      assert.ok(check[pair].changed>=2,check.name+' '+pair+' must change a meaningful image area');
    }
    assert.ok(result.reused,'Section changes retain animation canvas');assert.ok(result.colorsChanged,'Custom gradient changes image');
    // Visible thumbnail loading is covered by test/visual-library-desktop.cjs; this hidden window may defer intersection observers.
    assert.equal(result.triptychs,42);assert.ok(result.galleryFrames<=72,'Lazy thumbnails never exceed the procedural catalog');
    fs.mkdirSync(path.join(__dirname,'..','artifacts'),{recursive:true});
    result.sheets.forEach((data,index)=>fs.writeFileSync(path.join(__dirname,'..','artifacts','visuals-quality-'+(index+1)+'.png'),Buffer.from(data.split(',')[1],'base64')));
    fs.writeFileSync(path.join(__dirname,'..','artifacts','visuals-quality.json'),JSON.stringify(result.differences,null,2));
    await new Promise(resolve=>setTimeout(resolve,200));
    fs.writeFileSync(path.join(__dirname,'..','artifacts','visual-library-review.png'),(await win.webContents.capturePage()).toPNG());
    console.log(JSON.stringify({passed:result.checks.length,transition:result.reused,colors:result.colorsChanged,differences:result.differences,timings:result.timings}));app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});

