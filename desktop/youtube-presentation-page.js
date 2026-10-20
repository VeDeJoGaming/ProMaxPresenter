(() => {
  const key='__promaxPresentationPlayer';
  window.__promaxRestorePlayer=()=>{
    const saved=window[key];if(!saved)return;
    saved.style.remove();
    if(saved.parent.isConnected){
      const next=saved.next?.parentNode===saved.parent?saved.next:null;
      if(saved.parent.moveBefore)saved.parent.moveBefore(saved.player,next);
      else saved.parent.insertBefore(saved.player,next);
    }
    delete saved.player.dataset.promaxPresentation;
    delete window[key];
  };
  const player=window[key]?.player||document.querySelector('#movie_player');
  const video=player?.querySelector('video');
  if(!player||!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return {ready:false};
  if(!window[key]){
    const saved={player,parent:player.parentNode,next:player.nextSibling};
    // A fixed player inside YouTube's watch-page layout can still be clipped
    // by transformed/contained ancestors. Lift the SAME player to the page
    // root, preserving its media state and buffer with moveBefore.
    if(document.body.moveBefore)document.body.moveBefore(player,null);
    else document.body.append(player);
    player.dataset.promaxPresentation='true';
    const style=document.createElement('style');
    style.textContent=`
      html,body{margin:0!important;padding:0!important;width:100vw!important;height:100vh!important;background:#000!important;overflow:hidden!important}
      body> :not([data-promax-presentation]){visibility:hidden!important}
      [data-promax-presentation]{position:fixed!important;inset:0!important;margin:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;visibility:visible!important;display:block!important;background:#000!important;transform:none!important;z-index:2147483647!important}
      [data-promax-presentation] .html5-video-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;transform:none!important}
      [data-promax-presentation] video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;transform:none!important;visibility:visible!important}
    `;
    document.head.append(style);saved.style=style;window[key]=saved;
  }
  const rect=video.getBoundingClientRect();
  return {ready:rect.width>=innerWidth*.95&&rect.height>=innerHeight*.95,
    width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,
    pageHidden:!document.querySelector('ytd-app')||getComputedStyle(document.querySelector('ytd-app')).visibility==='hidden',
    rootPlayer:player.parentNode===document.body,quality:video.videoHeight};
})();
