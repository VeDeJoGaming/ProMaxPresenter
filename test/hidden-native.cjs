/* Test harness: synthetic profiles and windows that cannot take desktop focus. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
async function launch(profile,executable){
  const root=path.join(__dirname,'..'),env={...process.env,PROMAX_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(executable||require('electron'),['--inspect-brk=127.0.0.1:0','--remote-debugging-port=0',`--user-data-dir=${profile}`,...(executable?[]:[root])],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',data=>stderr+=data);child.stdout.on('data',data=>{if(process.env.PROMAX_DEBUG_EXTENSION)console.log(String(data));});
  async function endpoint(pattern){for(let n=0;n<600;n++){const match=stderr.match(pattern);if(match)return match[1];if(child.exitCode!==null)throw Error(stderr);await new Promise(r=>setTimeout(r,50));}throw Error('Debugger did not start: '+stderr);}
  const socket=new WebSocket(await endpoint(/Debugger listening on (ws:\/\/\S+)/));await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let seq=0;const pending=new Map(),events=new Map();
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(Error(msg.error.message));else p.resolve(msg.result);}else events.get(msg.method)?.(msg.params);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  await send('Debugger.enable');let paused=new Promise(resolve=>events.set('Debugger.paused',resolve));await send('Runtime.runIfWaitingForDebugger');let pause=await paused;
  if(!executable){await send('Debugger.setBreakpointByUrl',{lineNumber:0,urlRegex:'[/\\\\]desktop[/\\\\]main\\.js$'});paused=new Promise(resolve=>events.set('Debugger.paused',resolve));await send('Debugger.resume');pause=await paused;}
  const hook=await send('Debugger.evaluateOnCallFrame',{callFrameId:pause.callFrames[0].callFrameId,expression:"(()=>{globalThis.testRequire=require;const {BrowserWindow}=require('electron');for(const name of ['show','showInactive','focus','moveTop'])BrowserWindow.prototype[name]=function(){};return true;})()",returnByValue:true});assert.equal(hook.result?.value,true);
  await send('Debugger.resume');
  const browser=await chromium.connectOverCDP(await endpoint(/DevTools listening on (ws:\/\/\S+)/));const context=browser.contexts()[0];let page;
  for(let n=0;n<600;n++){page=context.pages().find(p=>p.url().endsWith('/index.html'));if(page)break;if(child.exitCode!==null)throw Error(stderr);await new Promise(r=>setTimeout(r,50));}
  assert(page,'Control page loaded');await page.waitForFunction(()=>window.ProMaxControls);await page.evaluate(()=>ProMaxControls.ready);
  async function main(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value;}
  assert.equal(path.resolve(await main("testRequire('electron').app.getPath('userData')")).toLowerCase(),path.resolve(profile).toLowerCase());
  async function close(){socket.close();await browser.close();if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}}
  return {page,context,main,close,child};
}
module.exports={launch};
