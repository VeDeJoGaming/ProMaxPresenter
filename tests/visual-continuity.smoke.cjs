const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'promax-continuity-')));
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{backgroundThrottling:false}});
  try{
    await win.loadFile(path.join(__dirname,'..','index.html'));
    const result=await win.webContents.executeJavaScript(`(()=>{
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;
      const preset=ProMaxVisuals.presets.find(p=>p.id==='still-waters');
      const strip=document.createElement('canvas');strip.width=2400;strip.height=300;
      const ctx=strip.getContext('2d');ctx.fillStyle='#08090c';ctx.fillRect(0,0,2400,300);
      const sun=[];
      [0,.5,1,1.5,2].forEach((look,index)=>{
        ProMaxVisuals.draw(canvas,{...preset,look},.17);ctx.drawImage(canvas,index*480,0);
        ctx.fillStyle='white';ctx.font='16px Segoe UI';ctx.fillText(['A','1.25 s','2.5 s','3.75 s','C'][index],index*480+12,291);
        const pixels=canvas.getContext('2d').getImageData(0,0,480,270).data;
        let minY=270,maxY=-1,count=0;
        for(let y=0;y<Math.floor(270*.67);y++)for(let x=180;x<300;x++){
          const i=(y*480+x)*4;if(pixels[i]>222&&pixels[i+1]>204&&pixels[i+2]>174){minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
        }
        sun.push({look,minY,maxY,count});
      });
      const raf=requestAnimationFrame,caf=cancelAnimationFrame,now=performance.now.bind(performance),date=Date.now;
      let clock=1000,callback;
      const holder=document.createElement('div');document.body.append(holder);
      let live;
      try{
        window.requestAnimationFrame=fn=>{callback=fn;return 123;};window.cancelAnimationFrame=()=>{};
        Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});Date.now=()=>16000;
        const options={glassAuto:false,glassVariant:'a',visualPalette:'original',visualMotion:'normal'};
        live=ProMaxVisuals.mount(holder,'still-waters',true,options);
        const before=live.getLookState();live.setLook({...options,glassVariant:'c'});
        clock=3500;callback(clock);const middle=live.getLookState();
        live.setLook(options);const interrupted=live.getLookState();
        clock=6000;callback(clock);const reverseMiddle=live.getLookState();
        clock=8500;callback(clock);const end=live.getLookState();
        const custom={...options,visualPalette:'custom',visualColors:['#000000','#000000','#000000']};
        live.setLook(custom);clock=13500;callback(clock);const black=live.toDataURL();
        custom.visualColors[0]='#ff0000';live.setLook(custom);callback(clock);
        const colorStartsFromCurrent=black===live.toDataURL();clock=16000;callback(clock);
        const colorsChangeGradually=black!==live.toDataURL();
        return {sun,before,middle,interrupted,reverseMiddle,end,colorStartsFromCurrent,colorsChangeGradually,strip:strip.toDataURL()};
      }finally{
        live?.stop();holder.remove();window.requestAnimationFrame=raf;window.cancelAnimationFrame=caf;
        Object.defineProperty(performance,'now',{configurable:true,value:now});Date.now=date;
      }
    })()`);
    assert.equal(result.middle.look,1,'A to C has one intermediate scene at the 5 s midpoint');
    assert.equal(result.interrupted.look,result.middle.look,'Reversing a transition keeps the current scene');
    assert.equal(result.interrupted.phase,result.middle.phase,'Reversing retains the motion phase');
    assert.equal(result.reverseMiddle.look,.5);assert.equal(result.end.look,0);
    assert.ok(result.colorStartsFromCurrent,'Editing a gradient retains the previous colors at the start');
    assert.ok(result.colorsChangeGradually,'Edited colors interpolate into the existing scene');
    assert.ok(result.middle.phase>result.before.phase&&result.middle.phase<result.before.phase+.1,'Speed changes advance the existing clock');
    assert.ok(result.sun[0].count>0);assert.ok(result.sun[1].minY>result.sun[0].minY,'The same sun moves down');
    assert.ok(result.sun[2].minY>result.sun[1].minY,'The sun continues toward the horizon');
    assert.equal(result.sun[4].count,0,'The sun is occluded behind the fixed horizon at C');
    fs.writeFileSync(path.join(__dirname,'..','artifacts','sunset-continuity.png'),Buffer.from(result.strip.split(',')[1],'base64'));
    console.log(JSON.stringify({passed:'single scene morph, interrupted reversal, continuous motion clock, descending sun',sun:result.sun}));app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
