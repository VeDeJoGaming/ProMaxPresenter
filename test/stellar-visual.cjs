const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function run(){
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'promax-stellar-')),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.argv[2];let app;
  try{
    app=await _electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profile}`]:[path.join(__dirname,'..')],env,timeout:45000});
    const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>window.ProMaxVisuals&&window.ProMaxControls);
    const stats=await page.evaluate(()=>{
      const p=ProMaxVisuals.presets.find(p=>p.id==='stellar-awakening'),c=document.createElement('canvas');c.width=640;c.height=360;
      const sample=(phase,variant='b',colors=p.colors)=>{ProMaxVisuals.draw(c,{...p,variant,colors},phase);return c.getContext('2d').getImageData(0,0,c.width,c.height).data;};
      const diff=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
      const energy=a=>a.reduce((sum,v,i)=>sum+(i%4===3?0:v),0)/(a.length/4*3);
      const core=a=>{let total=0;for(let y=65;y<87;y++)for(let x=310;x<330;x++){const i=(y*640+x)*4;total+=a[i]+a[i+1]+a[i+2];}return total/(22*20*3);};
      const looks=['a','b','c'].map(variant=>{const start=sample(0,variant),quarter=sample(.25,variant),peak=sample(.5,variant);let max=0,center=[0,0];for(let y=50;y<100;y++)for(let x=290;x<350;x++){const i=(y*640+x)*4,v=peak[i]+peak[i+1]+peak[i+2];if(v>max){max=v;center=[x,y];}}return {variant,loop:diff(start,sample(1,variant)),near:diff(start,sample(.99999,variant)),energy:[energy(start),energy(quarter),energy(peak)],motion:diff(sample(.28,variant),sample(.32,variant)),center};});
      return {looks,dim:core(sample(0)),bright:core(sample(.5)),palette:diff(sample(.3,'c'),sample(.3,'c',ProMaxVisuals.palettes.gold)),mapping:['Verse 1','Chorus','Pre-chorus','Bridge','Bro'].map(section=>ProMaxVisuals.sectionLook(p,section)),otherPreChorus:ProMaxVisuals.sectionLook({id:'dynamic-glass'},'Pre-chorus')};
    });
    console.log('Stellar metrics: '+JSON.stringify(stats));
    for(const r of stats.looks){assert.equal(r.loop,0);assert.ok(r.near<1);assert.ok(Math.abs(r.center[0]-320)<4&&Math.abs(r.center[1]-76)<4,'source stays anchored');}
    const [a,b,c]=stats.looks;
    for(let i=0;i<3;i++){assert.ok(b.energy[i]>a.energy[i]*1.3,'chorus builds on verse');assert.ok(c.energy[i]>b.energy[i]*1.3,'bridge has the strongest light throughout the loop');}
    assert.ok(c.motion>b.motion*1.3&&b.motion>a.motion*1.3,'bridge has the most outward action');
    assert.ok(stats.bright>stats.dim*1.4,'smooth star swell');assert.ok(stats.palette>1,'palette controls remain effective');
    assert.deepEqual(stats.mapping,['a','b','b','c','c']);assert.equal(stats.otherPreChorus,'c','other visuals retain their mapping');
    await page.evaluate(()=>{settings.glassAuto=true;settings.visualMotion='normal';selectVisual('stellar-awakening');current().slides=['Verse 1','Pre-chorus','Bridge'].map((section,i)=>({id:'stellar-'+i,text:'Generated cue '+i,section,key:''}));renderSlides();goLive(0);});
    await page.waitForFunction(()=>document.querySelector('#preview canvas[data-glass]')?.getRenderStats().preset==='stellar-awakening');
    await page.evaluate(()=>{window.stellarCanvas=document.querySelector('#preview canvas');goLive(1);});
    await page.waitForFunction(()=>{stellarCanvas.drawFrame();return Math.abs(stellarCanvas.getLookState().look-1)<.01;},{},{timeout:8000});
    const chorus=await page.evaluate(()=>stellarCanvas.getLookState());
    await page.evaluate(()=>goLive(2));await page.waitForFunction(()=>{stellarCanvas.drawFrame();return stellarCanvas.getLookState().look>1.99;},{},{timeout:8000});
    const bridge=await page.evaluate(()=>({same:stellarCanvas===document.querySelector('#preview canvas'),...stellarCanvas.getLookState()}));assert.ok(bridge.same);assert.ok(bridge.period<chorus.period*.6,'bridge moves faster without restarting the canvas');
    await page.evaluate(()=>{state.text='Light rises\nHope remains';paint();});assert.equal(await page.evaluate(()=>stellarCanvas===document.querySelector('#preview canvas')),true);
    await page.waitForTimeout(700);await fs.mkdir(path.join(__dirname,'..','test-results'),{recursive:true});await page.screenshot({path:path.join(__dirname,'..','test-results','stellar-bridge.png')});
    await page.reload();await page.waitForFunction(()=>settings.visual==='stellar-awakening');assert.deepEqual(errors,[]);
    console.log('PASS: anchored star, verse/chorus/bridge energy and motion, exact/near seamless loops, palettes, pre-chorus restraint, automatic live bridge speed, continuous lyrics and saved selection.');
  }finally{await app?.close();await fs.rm(profile,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
