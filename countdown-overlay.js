/* The same overlay is used by preview, output and the native YouTube player. */
(function(root){
  const positions=['top-left','top-center','top-right','middle-left','center','middle-right','bottom-left','bottom-center','bottom-right'];
  const position=value=>positions.includes(value)?value:'center';
  function render(doc,container,value){
    let overlay=container.querySelector('[data-promax-countdown]');
    const cue=value.countdown,visible=!!cue&&!value.black;
    // Standalone countdown keeps its text state for recovery/status consumers.
    const text=container.querySelector('.screen-text');
    if(text)text.hidden=visible&&!value.youtube&&!value.video;
    if(!visible){overlay?.remove();return;}
    if(!overlay){overlay=doc.createElement('div');overlay.dataset.promaxCountdown='true';container.append(overlay);}
    overlay.setAttribute('aria-label',cue.mode==='stopwatch'?'Stopwatch':'Countdown');
    const place=position(cue.position),row=place.startsWith('top')?0:place.startsWith('bottom')?2:1,col=place.endsWith('left')?0:place.endsWith('right')?2:1;
    const seconds=Math.max(0,Math.ceil(Number(cue.seconds)||0));
    overlay.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    overlay.dataset.position=place;
    overlay.style.cssText=`position:absolute!important;z-index:2147483647!important;pointer-events:none!important;visibility:visible!important;display:block!important;margin:0!important;inset:auto!important;top:${[5,50,95][row]}%!important;left:${[5,50,95][col]}%!important;transform:translate(${[0,-50,-100][col]}%,${[0,-50,-100][row]}%)!important;font:${Math.max(12,container.clientWidth*.065)}px/1.1 Segoe UI,Arial,sans-serif!important;font-weight:650!important;font-variant-numeric:tabular-nums!important;letter-spacing:.02em!important;color:white!important;background:rgba(12,9,9,.78)!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:.18em!important;padding:.16em .36em!important;white-space:nowrap!important;text-shadow:0 2px 4px #000!important;box-sizing:border-box!important`;
  }
  const api={render,position,positions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxCountdownOverlay=api;
})(globalThis);
