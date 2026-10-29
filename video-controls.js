/* One lightweight transport panel for the local video currently on presentation. */
(() => {
  let cleanup=null;
  const format=value=>{const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
  function clear(){const dispose=cleanup;cleanup=null;dispose?.();}
  function mount(parent,driver){
    clear();const root=document.createElement('section');root.className='video-transport';root.setAttribute('aria-label','Current video transport');
    root.innerHTML='<div class="video-transport-heading"><strong>Current video</strong><span class="video-transport-status" role="status"></span></div><div class="video-transport-position"><output class="video-elapsed">0:00</output><input type="range" min="0" max="0" step="0.1" value="0" aria-label="Current video position"><output class="video-duration">0:00</output></div><div class="video-transport-actions"><button type="button" aria-label="Back 10 seconds">−10 s</button><button type="button" aria-label="Forward 10 seconds">+10 s</button><span class="video-remaining"></span></div>';
    const range=root.querySelector('input'),elapsed=root.querySelector('.video-elapsed'),duration=root.querySelector('.video-duration'),status=root.querySelector('.video-transport-status'),remaining=root.querySelector('.video-remaining'),buttons=root.querySelectorAll('button');let dragging=false,last=null;
    const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
    function display(position,total){text(elapsed,format(position));text(duration,format(total));text(remaining,format(Math.max(0,total-position))+' remaining');range.setAttribute('aria-valuetext',format(position)+' of '+format(total));}
    function update(){
      if(!root.isConnected){clear();return;}
      const value=driver.snapshot();last=value;
      const available=!!value&&Number.isFinite(value.duration)&&value.duration>0;
      range.disabled=!available;for(const b of buttons)b.disabled=!available;
      text(status,!value?'No local video live':value.black?'Blackout':value.ended?'Ended':value.paused?'Paused':'Playing');
      if(!available){if(!dragging)display(0,0);return;}
      range.max=String(value.duration);if(!dragging){range.value=String(value.position);display(value.position,value.duration);}
    }
    range.oninput=()=>{dragging=true;display(Number(range.value),last?.duration||0);};
    range.onchange=()=>{dragging=false;driver.seek(Number(range.value));update();};
    range.onpointercancel=range.onblur=()=>{dragging=false;update();};
    buttons[0].onclick=()=>{if(last)driver.seek(last.position-10);update();};buttons[1].onclick=()=>{if(last)driver.seek(last.position+10);update();};
    parent.append(root);const timer=setInterval(update,250);cleanup=()=>{clearInterval(timer);root.remove();};update();return root;
  }
  window.ProMaxVideoControls={mount,clear,get active(){return cleanup!==null;}};
})();
