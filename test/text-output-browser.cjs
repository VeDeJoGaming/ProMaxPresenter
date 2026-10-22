/* Synthetic profiles only: exercise the actual output renderer and control preview. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
async function run(){
  const root=path.resolve(__dirname,'..');
  const server=http.createServer(async(req,res)=>{
    try{
      const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
      if(!/^(desktop\/)?[\w.-]+\.(js|html|css)$/.test(name)&&!/^visuals\/[\w.-]+\.svg$/.test(name))throw Error();
      res.setHeader('content-type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html');
      res.end(await fs.readFile(path.join(root,name)));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});
    const errors=[];
    for(const output of [false,true]){
      const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
      if(output)await page.addInitScript(()=>{window.promaxDesktop={onState(fn){window.sendState=fn;},performance(){},youtubeStatus(){},key(){}};});
      await page.goto('http://127.0.0.1:'+server.address().port+(output?'/desktop/output.html':'/'));
      if(!output)await page.evaluate(()=>ProMaxControls.ready);
      const checks=await page.evaluate(async output=>{
        const stage=document.getElementById(output?'stage':'preview'),checks=[];
        const style={color:'#000000',fontSize:5,align:'center',glassPalette:'gold',glassAuto:false,glassVariant:'a'};
        const cue=(text,extra={})=>{
          const value={text,black:false,settings:{...style},...extra};
          if(output)sendState(value);else{state=value;settings={...style};paintScreen(document,stage,false);ProMaxPlayback.fit(stage);}
        };
        const node=()=>stage.querySelector('.screen-text');
        for(const visual of [null,'golden-hour','nordlys']){
          style.visual=visual;cue('',{black:true});cue('Initial lyric');
          const entrance=node().getAnimations()[0];
          checks.push(!!entrance&&entrance.effect.getTiming().duration===650);
          entrance.pause();entrance.currentTime=325;
          const halfway=Number(getComputedStyle(node()).opacity);
          checks.push(halfway>.4&&halfway<.6);
          cue('Fast advance during entrance');
          checks.push(node().getAnimations()[0]===entrance&&Number(getComputedStyle(node()).opacity)===halfway);
          entrance.finish();
          const background=stage.querySelector('.media');
          for(const text of ['Next lyric','Fast advance','Last lyric']){
            cue(text);
            for(let frame=0;frame<3;frame++){
              checks.push(node().textContent===text&&getComputedStyle(node()).opacity==='1'&&node().getAnimations().length===0&&background===stage.querySelector('.media'));
              await new Promise(resolve=>requestAnimationFrame(resolve));
            }
          }
          cue('');checks.push(node().textContent===''&&node().getAnimations().length===0);
          cue('After clear');checks.push(node().getAnimations().length===1);
          const resumed=node().getAnimations()[0];cue('After clear');checks.push(node().getAnimations()[0]===resumed);resumed.finish();
          cue('',{black:true});checks.push(!node());cue('After blackout');checks.push(node().getAnimations().length===1);node().getAnimations()[0].finish();
          cue('',{biblePassage:{verses:[{verse:1,text:'Synthetic verse'}],reference:'Test 1:1'}});
          checks.push(node().textContent.includes('Synthetic verse')&&node().getAnimations().length===0);
        }
        // Changing background under visible lyrics must not replay the entrance.
        for(const visual of ['nordlys','golden-hour',null]){style.visual=visual;cue('Background changed');checks.push(node().getAnimations().length===0);}
        return checks;
      },output);
      assert.ok(checks.every(Boolean),`${output?'Output':'Preview'} transition checks: ${JSON.stringify(checks)}`);
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASSED: preview and actual desktop renderer; gentle entrance, uninterrupted rapid advance, no dimming between lyrics, clear/blackout/restore, Bible and background changes.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
