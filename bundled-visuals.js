/* The six published SVG loops are installed with the app and need no download. */
(() => {
  const base = new URL('visuals/', document.currentScript.src);
  const entries = [
    ['nordlys','Nordlys','01-nordlys.svg'],
    ['blaa-tide','Blå tide','02-blaa-tide.svg'],
    ['gyllent-lys','Gyllent lys','03-gyllent-lys.svg'],
    ['purpurdis','Purpurdis','04-purpurdis.svg'],
    ['prisme','Prisme','05-prisme.svg'],
    ['etterklang','Etterklang','06-etterklang.svg']
  ];
  const presets = entries.map(([id,name,file]) => ({id,name,file,kind:'bundled-svg',category:'New loops',mood:'Calm',colors:['#ef5349','#ff8a3d','#151111']}));
  function mount(container, preset, animated) {
    const image = container.ownerDocument.createElement('img');
    image.className = 'media bundled-visual'; image.alt = '';
    image.dataset.bundledVisual = preset.id;
    image.src = new URL(animated ? preset.file : preset.file.replace('.svg','.poster.svg'), base).href;
    container.prepend(image);
    return image;
  }
  function render(doc, container, value, isOutput) {
    const preset = presets.find(p => p.id === value.settings.visual);
    if (!preset || value.black || value.pdf || value.video || value.image || value.youtube) return false;
    let image = container.querySelector('img[data-bundled-visual]');
    let text = container.querySelector('.screen-text');
    if (!image || image.dataset.bundledVisual !== preset.id) {
      for (const canvas of container.querySelectorAll('canvas')) canvas.stop?.();
      ProMaxPlayback.clear(doc,container); container.replaceChildren();
      image = mount(container,preset,true);
      text = doc.createElement('div'); text.className = 'screen-text'; text.style.zIndex = 2;
      container.append(text);
    }
    container.dataset.mediaKey = preset.id; container.style.background = '#000';
    if (ProMaxPlayback.renderText(text,value)) {
      text.getAnimations?.().forEach(a => a.cancel());
      text.animate?.([{opacity:0},{opacity:1}],{duration:180});
    }
    text.style.textAlign = value.settings.align;
    text.style.fontSize = isOutput ? value.settings.fontSize+'vw' : container.clientWidth*value.settings.fontSize/100+'px';
    return true;
  }
  window.ProMaxBundledVisuals = { presets, mount, render };
})();
