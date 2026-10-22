const stage = document.getElementById('stage');
let previous = null;
addEventListener('resize',()=>{const text=stage.querySelector('.screen-text');if(text&&previous){text.style.fontSize=previous.settings.fontSize+'vw';ProMaxPlayback.fit(stage);}});
let performanceCanvas=null,lastFrames=0,lastSample=performance.now();
setInterval(()=>{
  const canvas=stage.querySelector('canvas[data-glass]'),stats=canvas?.getRenderStats?.(),now=performance.now();
  if(!stats||stats.preset==='solid'){if(performanceCanvas)window.promaxDesktop.performance(null);performanceCanvas=null;return;}
  if(performanceCanvas===canvas)window.promaxDesktop.performance({fps:Math.round((stats.frames-lastFrames)*1000/(now-lastSample)),width:stats.width,height:stats.height});
  performanceCanvas=canvas;lastFrames=stats.frames;lastSample=now;
},2000);
document.addEventListener('promax-youtube-status',event=>window.promaxDesktop.youtubeStatus(event.detail));
window.promaxDesktop.onState(value => {
  const finish=ProMaxVisuals.beginBackground(document,stage,value);renderOutput(value);finish();
});
function renderOutput(value) {
  ProMaxYouTube.warm(document,value.prepareYouTube);
  if(ProMaxYouTube.render(document,stage,value,true)){previous=value;return;}
  if(ProMaxVisuals.renderGlass(document,stage,value,true)){ProMaxPlayback.fit(stage);previous=value;return;}
  for(const canvas of stage.querySelectorAll('canvas[data-glass]'))canvas.stop?.();
  ProMaxPlayback.warm(document, value.warmVideos || []);
  if (ProMaxPlayback.render(document, stage, value, true)) { previous = value;return; }
  stage.style.background = value.black ? '#000' : value.settings.color;
  const rebuild = !previous || previous.youtube || previous.image || previous.video || previous.black !== value.black || previous.pdf !== value.pdf || previous.media?.url !== value.media?.url || previous.settings.visual !== value.settings.visual || !!stage.querySelector('canvas[data-glass]');
  const previousText=stage.querySelector('.screen-text');
  if (rebuild) {
    ProMaxPlayback.clear(document,stage);
    stage.replaceChildren();
    if (!value.black && value.pdf) {
      const frame = document.createElement('iframe'); frame.src = value.pdf; frame.title = 'PDF presentation'; stage.append(frame);
    } else if (!value.black) {
      if (value.settings.visual) { ProMaxVisuals.mount(stage,value.settings.visual,true); } else if (value.media) {
        const element = document.createElement(value.media.type.startsWith('video/') ? 'video' : 'img');
        element.className = 'media'; element.src = value.media.url;
        if (element.tagName === 'VIDEO') { element.muted = true; element.loop = true; element.autoplay = true; element.preload = 'auto'; }
        const shade = document.createElement('div'); shade.className = 'shade'; stage.append(element, shade);
      }
      const text = previousText || document.createElement('div'); text.className = 'screen-text'; stage.append(text);
    }
  }
  const text = stage.querySelector('.screen-text');
  if (text) { ProMaxPlayback.renderLiveText(text,value); text.style.textAlign = value.settings.align; text.style.fontSize = value.settings.fontSize + 'vw'; }
  ProMaxPlayback.fit(stage);
  previous = value;
}
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault(); window.promaxDesktop.key(event.key);
});

