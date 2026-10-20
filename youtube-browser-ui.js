(() => {
  if(!window.promaxDesktop?.youtubeBrowserBounds)return;
  let frame=0,last='';
  function update(){
    frame=0;const preview=document.querySelector('[data-native-youtube-preview]');
    const rect=preview?.getBoundingClientRect();
    const visible=preview&&!document.querySelector('dialog[open]')&&preview.offsetParent!==null&&rect.bottom>0&&rect.top<innerHeight;
    const value=visible?{x:rect.x,y:Math.max(0,rect.y),width:rect.width,height:Math.min(rect.height,innerHeight-Math.max(0,rect.y))}:null;
    const key=JSON.stringify(value);if(key!==last){last=key;window.promaxDesktop.youtubeBrowserBounds(value);}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
  addEventListener('resize',schedule);addEventListener('scroll',schedule,true);
  window.ProMaxYouTubeBrowserUI={update:schedule};
})();
