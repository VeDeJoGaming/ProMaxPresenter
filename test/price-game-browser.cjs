/* Headless visual review and responsive controls, with synthetic content only. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
async function run(){
 const root=path.join(__dirname,'..'),evidence=path.join(root,'artifacts','test-results','price-game');await fs.mkdir(evidence,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!/^[\w.-]+\.(js|css|html)$/.test(relative)&&!/^visuals\/[\w.-]+\.(svg|png)$/.test(relative))throw Error();res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(relative)]);res.end(await fs.readFile(path.join(root,relative)));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PROMAX_BROWSER_PATH?{executablePath:process.env.PROMAX_BROWSER_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>ProMaxControls.ready);await page.locator('[data-tab="price-game"]').click();
  await page.locator('[data-price-field=name]').fill('Kaffe fra fjellbutikken');await page.locator('[data-price-field=price]').fill('149,90');await page.locator('[data-price-field=description]').fill('250 g hele bønner\nMørkbrent kaffe fra et lite brenneri.');
  const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=500;const x=c.getContext('2d');x.fillStyle='#b52822';x.fillRect(70,80,260,350);x.fillStyle='#ffe8ba';x.fillRect(90,200,220,150);x.fillStyle='#4b2a18';x.font='bold 36px Arial';x.fillText('KAFFE',138,285);return c.toDataURL('image/png').split(',')[1];}),'base64');
  await page.locator('.price-game-photo input').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:photo});await page.waitForSelector('.price-game-photo img');
  await page.locator('[data-price-add]').click();await page.locator('[data-price-field=name]').nth(1).fill('En stor sjokolade');await page.locator('[data-price-field=price]').nth(1).fill('39');
  await page.locator('[aria-label="Flytt vare opp"]').nth(1).click();assert.equal(await page.locator('[data-price-field=name]').first().inputValue(),'En stor sjokolade');
  await page.locator('[aria-label="Flytt vare ned"]').first().click();assert.equal(await page.locator('[data-price-field=name]').first().inputValue(),'Kaffe fra fjellbutikken');
  await page.locator('[aria-label="Forhåndsvis vare"]').selectOption('0');await page.evaluate(()=>document.querySelector('.workspace').scrollTop=0);await page.screenshot({path:path.join(evidence,'builder-wide.png')});
  await page.setViewportSize({width:850,height:750});await page.evaluate(()=>document.querySelector('.workspace').scrollTop=0);await page.screenshot({path:path.join(evidence,'builder-compact.png')});
  const geometry=await page.locator('.price-game').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert(geometry.scroll<=geometry.width+1,'Compact editor fits the workspace');
  await page.locator('[data-price-generate]').click();await page.waitForSelector('.prepared-slide');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.querySelector('.workspace').scrollTop=0);await page.screenshot({path:path.join(evidence,'prepared.png')});
  // Review full-size versions of the same SVGs used by native output.
  const stage=await browser.newPage({viewport:{width:1280,height:720}});
  for(const [i,name] of [[0,'question-output'],[1,'answer-output']]){
   const source=await page.evaluate(i=>{const item=ProMaxMeetings.folder().items[0];return ProMaxPriceGame.svg(item,item.slides[i]);},i);
   await stage.setContent('<style>body{margin:0;background:#000}svg{display:block;width:100vw;height:100vh}</style>'+source);await stage.screenshot({path:path.join(evidence,name+'.png')});
  }
  const stress=await page.evaluate(()=>{const item=structuredClone(ProMaxMeetings.folder().items[0]);item.priceGame.rounds[0].name='En veldig lang produktbetegnelse som også skal få plass sammen med beskrivelsen';item.priceGame.rounds[0].description='Dette er en lang beskrivelse som forklarer varen med størrelse, innhold, kvalitet og andre detaljer. Den skal være lett å lese og skal ikke overlappe prisen selv om varen også har et langt produktnavn.';return ProMaxPriceGame.svg(item,item.slides[0]);});
  await stage.setContent('<style>body{margin:0;background:#000}svg{display:block;width:100vw;height:100vh}</style>'+stress);
  const bounds=await stage.locator('svg').evaluate(svg=>[...svg.querySelectorAll('text')].filter(t=>[...t.querySelectorAll('tspan')].some(s=>s.getAttribute('x')==='810')).map(t=>{const b=t.getBBox();return {right:b.x+b.width,bottom:b.y+b.height};}));
  assert(bounds.every(b=>b.right<=1520&&b.bottom<600),'Long product text stays above the price and within the slide');
  await stage.screenshot({path:path.join(evidence,'description-long.png')});
  assert.deepEqual(errors,[]);console.log('PASS: responsive price editor, reorder, preview, generation and full-size slide visual evidence');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
