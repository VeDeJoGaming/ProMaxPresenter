/* Synthetic profiles only: exercise the actual output renderer and control preview. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
async function run(){
  const root=path.resolve(__dirname,'..');
  const server=http.createServer(async(req,res)=>{
    try{
      const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
      if(!/^(desktop\/)?[\w.-]+\.(js|html|css)$/.test(name)&&!/^visuals\/[\w.-]+\.(svg|png)$/.test(name))throw Error();
      res.setHeader('content-type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html');
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
        for(const visual of [null,'golden-hour','paint-sweeps']){
          style.visual=visual;cue('',{black:true});cue('Initial lyric');
          const entrance=node().getAnimations()[0];checks.push(entrance.effect.getTiming().duration===650);entrance.finish();
          const background=stage.querySelector('.media');cue('Second lyric');
          let fade=node().getAnimations()[0];checks.push(fade.effect.getTiming().duration===450);
          checks.push(stage.querySelector('.text-outgoing')?.textContent==='Initial lyric');
          fade.pause();fade.currentTime=225;checks.push(Number(getComputedStyle(node()).opacity)>.4&&Number(getComputedStyle(node()).opacity)<.6);
          cue('Rapid third lyric');checks.push(node().textContent==='Rapid third lyric'&&stage.querySelectorAll('.text-outgoing').length===2);
          checks.push(background===stage.querySelector('.media'));
          fade=node().getAnimations()[0];cue('Rapid third lyric');checks.push(node().getAnimations()[0]===fade);
          cue('');checks.push(!stage.querySelector('.text-outgoing')&&node().getAnimations().length===0);
          cue('After clear');node().getAnimations()[0].finish();cue('',{black:true});checks.push(!node());
          cue('',{biblePassage:{verses:[{verse:1,text:'Synthetic verse'}],reference:'Test 1:1'}});node().getAnimations()[0].finish();
          cue('',{biblePassage:{verses:[{verse:2,text:'Second verse'}],reference:'Test 1:2'}});
          checks.push(node().textContent.includes('Second verse')&&stage.querySelector('.text-outgoing')?.textContent.includes('Synthetic verse'));
          node().getAnimations()[0].finish();for(const old of stage.querySelectorAll('.text-outgoing'))old.getAnimations().forEach(a=>a.finish());
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          checks.push(stage.querySelectorAll('.text-outgoing').length===0);
        }
        return checks;
      },output);
      assert.ok(checks.every(Boolean),`${output?'Output':'Preview'} transition checks: ${JSON.stringify(checks)}`);
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASSED: preview and actual desktop renderer; gentle entrance, text crossfades, rapid advance without losing outgoing layers, clear/blackout/restore, Bible and background changes.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
