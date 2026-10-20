const fs=require('node:fs'),path=require('node:path');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
module.exports=async({control,getPresentation})=>{
  const run=code=>control.webContents.executeJavaScript(code),output=getPresentation().webContents;
  const presets=await run('ProMaxVisuals.presets.map(p=>({id:p.id,name:p.name}))'),results=[];
  await run("settings.renderQuality='auto';ProMaxFeatures.showTab('songs');");
  for(const preset of presets){
    await run(`selectVisual(${JSON.stringify(preset.id)});goLive(0)`);await wait(3500);
    const result=await output.executeJavaScript(`new Promise(resolve=>{const canvas=document.querySelector('canvas[data-glass]'),start=canvas.getRenderStats(),at=performance.now();setTimeout(()=>{const end=canvas.getRenderStats();resolve({...end,fps:Math.round((end.frames-start.frames)*10000/(performance.now()-at))/10});},1500);})`);
    results.push({...preset,...result});console.log(`${preset.name}: ${result.fps} fps at ${result.width} × ${result.height}`);
  }
  const app=require('electron').app,artifacts=app.isPackaged?path.join(app.getPath('temp'),'promax-packaged-verification'):path.join(__dirname,'..','artifacts');fs.mkdirSync(artifacts,{recursive:true});fs.writeFileSync(path.join(artifacts,'motion-performance.json'),JSON.stringify({mode:'Automatic',results},null,2));
};
