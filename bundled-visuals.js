/* All eighteen SVG loops are installed with the app and need no download. */
(() => {
  const base = new URL('visuals/', document.currentScript.src);
  const entries = [
    ['nordlys','Nordlys','01-nordlys.svg','New loops',['#23cda4','#184dd1','#030e19'],'aurora green northern lights'],
    ['blaa-tide','Blå tide','02-blaa-tide.svg','New loops',['#1769b4','#39c6d6','#061225'],'blue ocean waves'],
    ['gyllent-lys','Gyllent lys','03-gyllent-lys.svg','New loops',['#c88633','#6c2638','#160e10'],'gold amber warm light'],
    ['purpurdis','Purpurdis','04-purpurdis.svg','New loops',['#6949c8','#bb488f','#100e25'],'purple violet veil'],
    ['prisme','Prisme','05-prisme.svg','New loops',['#126b73','#783e4d','#09151d'],'teal geometric glass'],
    ['etterklang','Etterklang','06-etterklang.svg','New loops',['#9a573c','#5c346a','#130f18'],'copper rings'],
    ['fjordlys','Fjordlys','07-fjordlys.svg','Nature',['#428a9b','#183c4a','#071522'],'fjord mountains moon blue water'],
    ['stjernebris','Stjernebris','08-stjernebris.svg','Space',['#564a9b','#244b82','#080c21'],'stars cosmos nebula orbit purple'],
    ['morgengry','Morgengry','09-morgengry.svg','Nature',['#de9c74','#80515a','#281d29'],'sunrise dawn dunes warm landscape'],
    ['skogro','Skogro','10-skogro.svg','Nature',['#3e7769','#14372e','#081e1c'],'forest mist trees green'],
    ['lyskapell','Lyskapell','11-lyskapell.svg','Architecture',['#d2aa7d','#705048','#211a1d'],'chapel window arch warm light'],
    ['stille-hav','Stille hav','12-stille-hav.svg','Nature',['#91b7d1','#1a3349','#0c182d'],'ocean sea moon reflection blue'],
    ['ildgloed','Ildglød','13-ildgloed.svg','Ambient',['#e89b59','#9e3a20','#1a1017'],'embers fire copper orange warm'],
    ['silkeloep','Silkeløp','14-silkeloep.svg','Ambient',['#d59aa8','#763f65','#211725'],'silk folds pink purple abstract'],
    ['fjellnatt','Fjellnatt','15-fjellnatt.svg','Nature',['#9daed5','#3e4662','#10152c'],'mountain snow stars night indigo'],
    ['regnglass','Regnglass','16-regnglass.svg','Nature',['#84b7c5','#356e7f','#101e2b'],'rain glass droplets blue'],
    ['kobberhvelv','Kobberhvelv','17-kobberhvelv.svg','Architecture',['#c99e82','#aa7459','#1b1924'],'vault arches copper architecture'],
    ['maaneskog','Måneskog','18-maaneskog.svg','Nature',['#8cb6b0','#527e7b','#101f2b'],'botanical leaves moon garden green']
  ];
  const presets = entries.map(([id,name,file,category,colors,tags]) => ({id,name,file,kind:'bundled-svg',category,mood:'Calm',colors,tags}));
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
      text ||= doc.createElement('div'); text.className = 'screen-text'; text.style.zIndex = 2;
      container.append(text);
    }
    container.dataset.mediaKey = preset.id; container.style.background = '#000';
    ProMaxPlayback.renderLiveText(text,value);
    text.style.textAlign = value.settings.align;
    text.style.fontSize = isOutput ? value.settings.fontSize+'vw' : container.clientWidth*value.settings.fontSize/100+'px';
    return true;
  }
  window.ProMaxBundledVisuals = { presets, mount, render };
})();
