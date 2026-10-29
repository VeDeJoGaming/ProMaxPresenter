/* Duration-based countdown: pausing retains milliseconds and ticks never accumulate drift. */
(function(root){
  function format(seconds){const value=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
  function create({onChange=()=>{},now=()=>performance.now(),schedule=setInterval,cancel=clearInterval}={}){
    let phase='idle',remaining=0,started=0,timer=null,lastKey='';
    function snapshot(){const remainingMs=phase==='running'?Math.max(0,remaining-Math.max(0,now()-started)):remaining;return {phase,remainingMs,seconds:Math.ceil(remainingMs/1000)};}
    function halt(){if(timer!==null){cancel(timer);timer=null;}}
    function emit(){const value=snapshot(),key=value.phase+':'+value.seconds;if(key!==lastKey){lastKey=key;onChange(value);}return value;}
    function tick(){if(phase==='running'&&snapshot().remainingMs===0){phase='finished';remaining=0;halt();}emit();}
    function start(milliseconds){
      if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>10800000)throw Error('Choose a duration between 0 and 180 minutes.');
      halt();phase='running';remaining=milliseconds;started=now();timer=schedule(tick,200);lastKey='';emit();
    }
    function pause(){if(phase!=='running')return false;remaining=snapshot().remainingMs;phase=remaining>0?'paused':'finished';halt();emit();return true;}
    function resume(){if(phase!=='paused')return false;phase='running';started=now();timer=schedule(tick,200);emit();return true;}
    function stop(){halt();phase='idle';remaining=0;emit();}
    return {start,pause,resume,stop,snapshot};
  }
  const api={create,format};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxCountdown=api;
})(globalThis);
