(() => {
  const params=new URLSearchParams(location.search),id=params.get('videoId'),start=Number(params.get('start'))||0;
  if(!/^[\w-]{11}$/.test(id||''))return;
  let player,ready=false,pending=null;
  const send=(type,extra={})=>parent.postMessage({promaxYouTube:true,videoId:id,type,...extra},'*');
  function command(value){
    if(!ready){pending=value;return;}
    if(value.action==='pause'){player.pauseVideo();player.mute();return;}
    if(value.muted)player.mute();else player.unMute();
    if(Number.isFinite(value.position))player.seekTo(value.position,true);
    if(value.paused)player.pauseVideo();else player.playVideo();
  }
  window.addEventListener('message',event=>{if(event.source===parent&&event.data?.promaxYouTube&&event.data.videoId===id)command(event.data);});
  window.onYouTubeIframeAPIReady=()=>{
    player=new YT.Player('player',{width:'100%',height:'100%',videoId:id,playerVars:{autoplay:0,playsinline:1,rel:0,origin:location.origin},events:{
      onReady:()=>{ready=true;player.mute();player.cueVideoById({videoId:id,startSeconds:start});send('ready');if(pending){command(pending);pending=null;}},
      onStateChange:event=>{const labels={'-1':'ready',0:'ended',1:'playing',2:'paused',3:'buffering',5:'ready'};send(labels[event.data]||'loading',{position:player.getCurrentTime()});},
      onError:event=>send('error',{code:event.data}),onAutoplayBlocked:()=>send('blocked')
    }});
  };
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>send('error',{code:'network'});document.head.append(script);
  setInterval(()=>{if(ready)send('position',{position:player.getCurrentTime(),duration:player.getDuration()});},1000);
})();
