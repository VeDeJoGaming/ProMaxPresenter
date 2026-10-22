/* Synthetic browser profile: input responsiveness, persistence and history. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
async function run(){
  const root=path.join(__dirname,'..'),errors=[];
  const server=http.createServer(async(req,res)=>{
    try{
      const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
      if(!/^[\w.-]+\.(js|css|html)$/.test(relative)&&!/^visuals\/[\w.-]+\.svg$/.test(relative))throw Error();
      const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'};
      res.setHeader('Content-Type',types[path.extname(relative)]);res.end(await fs.readFile(path.join(root,relative)));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});
    const page=await browser.newPage({viewport:{width:1440,height:940}});page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>ProMaxControls.ready);
    const seed=await page.evaluate(async()=>{
      await ProMaxControls.mutate('Synthetic library',()=>{
        songs=Array.from({length:1000},(_,i)=>({id:'synthetic-'+i,title:'Synthetic song '+i,lyrics:'Synthetic line\n'.repeat(50),lines:4,
          slides:Array.from({length:8},(_,j)=>({id:'slide-'+i+'-'+j,text:'Synthetic verse',section:'Verse',key:'v'}))}));
        selected=songs[0].id;
      });
      window.testWrites=0;const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='promax-library')testWrites++;return original.call(this,key,value);};
      window.originalRow=$('library').firstElementChild;window.beforeLyrics=current().lyrics;
      const at=performance.now();for(let i=0;i<20;i++){$('lyrics').value+='x';$('lyrics').dispatchEvent(new Event('input',{bubbles:true}));}
      return {writes:testWrites,inputMs:performance.now()-at,lyrics:current().lyrics};
    });
    assert.equal(seed.writes,0,'typing must not synchronously serialize or write the full library');
    await page.waitForFunction(()=>testWrites===1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')).songs[0].lyrics),seed.lyrics);
    await page.evaluate(()=>ProMaxControls.undo());
    assert.equal(await page.evaluate(()=>current().lyrics===beforeLyrics),true,'deferred typing remains undoable');
    await page.evaluate(()=>ProMaxControls.redo());
    assert.equal(await page.evaluate(()=>current().lyrics),seed.lyrics);
    assert.equal(await page.evaluate(()=>{renderLibrary();renderLibrary();return $('library').firstElementChild===originalRow;}),true,'unchanged rows retain identity');
    await page.evaluate(()=>{$('search').value='song 999';$('search').dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>$('library').children.length===1);
    assert.equal(await page.evaluate(()=>$('library').firstElementChild.dataset.songId),'synthetic-999');
    await page.evaluate(()=>{$('search').value='';renderLibrary();songs.reverse();renderLibrary();});
    assert.equal(await page.evaluate(()=>$('library').firstElementChild.dataset.songId),'synthetic-999');
    await page.evaluate(()=>{songs=songs.filter(s=>s.id!=='synthetic-999');renderLibrary();});
    assert.equal(await page.evaluate(()=>$('library').querySelector('[data-song-id="synthetic-999"]')),null);
    await page.evaluate(()=>{$('title').value='Renamed synthetic song';$('title').dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>$('library').querySelector('[data-song-id="synthetic-0"]').textContent.startsWith('Renamed synthetic song'));
    await page.evaluate(()=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')).songs.find(s=>s.id===selected).title),'Renamed synthetic song');
    await page.evaluate(()=>{$('quick-text').value='Saved on blur';$('quick-text').dispatchEvent(new Event('input',{bubbles:true}));$('quick-text').dispatchEvent(new FocusEvent('focusout',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('promax-library')).settings.quickText),'Saved on blur');
    // The one-second maximum wait also persists during uninterrupted typing.
    await page.evaluate(()=>{testWrites=0;window.testTyping=setInterval(()=>{$('quick-text').value+='.';$('quick-text').dispatchEvent(new Event('input',{bubbles:true}));},60);});
    await page.waitForFunction(()=>testWrites>0,{},{timeout:3000});
    await page.evaluate(()=>{clearInterval(testTyping);flushPendingSave();});
    // Reload immediately after a pending edit: beforeunload must flush it.
    await page.evaluate(()=>{$('quick-text').value='Saved at exit';$('quick-text').dispatchEvent(new Event('input',{bubbles:true}));});
    await page.reload();await page.evaluate(()=>ProMaxControls.ready);
    assert.equal(await page.evaluate(()=>settings.quickText),'Saved at exit');
    // A failed write must remain visible instead of reporting success.
    const failure=await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Test quota','QuotaExceededError');};const saved=save();Storage.prototype.setItem=original;return {saved,status:$('status').textContent};});
    assert.deepEqual(failure,{saved:false,status:'Save failed'});
    assert.deepEqual(errors,[]);
    console.log(`PASSED: 1000-song input burst (${seed.inputMs.toFixed(1)} ms), one deferred write, undo/redo, keyed rows, search/reorder/delete, explicit save, blur, bounded autosave, exit/reload and storage failure.`);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
