function updateVisualName(){
  document.getElementById('glass-controls').hidden=!ProMaxVisuals.presets.some(p=>p.id===settings.visual&&p.kind!=='bundled-svg');
  const preset=ProMaxVisuals.presets.find(p=>p.id===settings.visual);
  document.getElementById('visual-name').textContent=preset?preset.name:media?'Custom media':'Solid color';
}
function selectVisual(id){
  if(id&&!ProMaxVisuals.presets.some(p=>p.id===id))return;
  if(media){URL.revokeObjectURL(media.url);media=null;}
  settings.visual=id;
  // A solid-color choice must also remain solid after restarting.
  if(!id)storedAsset('delete').catch(()=>notify('Could not remove the saved background.'));
  save();paint();renderSlides();updateVisualName();
  for(const button of document.querySelectorAll('.visual-option'))button.setAttribute('aria-pressed',String(button.dataset.visualId===id));
  updateVisualSelection();
}
let visualFilter='All';
let visualFavoritesOnly=false;
let activeVisualPreview=null;
let visualPreviewObserver=null;
let visualStillFrame=0;
let visualStillQueue=[];
const visualPreviewCards=new Map();
const visualSearchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function updateVisualSelection(){
  const status=document.getElementById('visual-selection');
  if(status)status.textContent=`Selected: ${ProMaxVisuals.presets.find(p=>p.id===settings.visual)?.name||(media?'Custom media':'Solid color')}`;
}
function stopVisualPreviews(){
  visualPreviewObserver?.disconnect();visualPreviewObserver=null;
  cancelAnimationFrame(visualStillFrame);visualStillFrame=0;visualStillQueue=[];
  activeVisualPreview=null;
  for(const card of visualPreviewCards.values())card.dispose();
  visualPreviewCards.clear();
}
function queueVisualStill(card){
  if(card.queued)return;
  card.queued=true;visualStillQueue.push(card);
  const next=()=>{
    visualStillFrame=0;
    const queued=visualStillQueue.shift();
    if(queued){queued.queued=false;if(queued.visible)queued.preview();}
    if(visualStillQueue.length)visualStillFrame=requestAnimationFrame(next);
  };
  if(!visualStillFrame)visualStillFrame=requestAnimationFrame(next);
}
function renderVisualLibrary(){
  const grid=document.getElementById('visual-grid');stopVisualPreviews();grid.replaceChildren();
  const favorites=new Set(settings.visualFavorites);
  const terms=visualSearchText(document.getElementById('visual-search').value).trim().split(/\s+/).filter(Boolean);
  const presets=ProMaxVisuals.presets.filter(p=>{
    const text=visualSearchText([p.name,p.category,p.mood,p.kind,...(Array.isArray(p.tags)?p.tags:typeof p.tags==='string'?[p.tags]:[])].join(' '));
    return (visualFilter==='All'||p.category===visualFilter)&&(!visualFavoritesOnly||favorites.has(p.id))&&terms.every(term=>text.includes(term));
  });
  document.getElementById('visual-results').textContent=`${presets.length} of ${ProMaxVisuals.presets.length} backgrounds${visualFilter!=='All'?' · '+visualFilter:''}${visualFavoritesOnly?' · Favorites':''}`;
  document.getElementById('visual-empty').hidden=presets.length!==0;
  document.getElementById('visual-empty-message').textContent=visualFavoritesOnly&&!settings.visualFavorites.length?'Mark a background with a star to keep it here.':'Try another search or clear the filters to see every background.';
  grid.classList.toggle('visual-show-lyrics',document.getElementById('visual-sample-lyrics').checked);
  const motionAllowed=()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden;
  const requestMotion=card=>{
    if(activeVisualPreview!==card){activeVisualPreview?.still();activeVisualPreview=card;}
    card.visible=true;
    if(motionAllowed())card.animate();else card.still();
  };
  for(const preset of presets){
    const wrapper=document.createElement('div');wrapper.className='visual-card';
    const button=document.createElement('button');button.type='button';button.className='visual-option';button.dataset.visualId=preset.id;button.setAttribute('aria-pressed',String(settings.visual===preset.id));
    button.setAttribute('aria-label',`${preset.name}, ${preset.category}. Use background`);
    const preview=document.createElement('div');preview.className='visual-triptych'+(preset.kind==='bundled-svg'?' visual-triptych-loop':'');button.append(preview);
    const label=document.createElement('span');label.textContent=preset.name;button.append(label);
    const caption=document.createElement('small');caption.textContent=preset.category+' · '+(preset.kind==='bundled-svg'?'Seamless loop':(preset.mood||'Calm')+' · A / B / C');button.append(caption);
    let mounted=[],mode;
    const dispose=()=>{for(const surface of mounted)surface?.stop?.();mounted=[];mode=undefined;};
    const frames=animated=>{
      if(mode===animated)return;
      dispose();mode=animated;preview.replaceChildren();
      for(const variant of preset.kind==='bundled-svg'?['a']:['a','b','c']){
        const cell=document.createElement('div');cell.className='visual-option-preview';preview.append(cell);
        cell.style.background=`linear-gradient(135deg,${preset.colors?.[2]||'#100d0b'},${preset.colors?.[0]||'#241c1b'})`;
        if(animated!==null)mounted.push(ProMaxVisuals.mount(cell,preset.id,animated,{...settings,glassAuto:false,glassVariant:variant}));
        const lyrics=document.createElement('div');lyrics.className='visual-sample-lyrics';lyrics.textContent='Let every heart\nfind a place to sing';lyrics.setAttribute('aria-hidden','true');cell.append(lyrics);
        if(preset.kind!=='bundled-svg'){const letter=document.createElement('b');letter.className='visual-letter';letter.textContent=variant.toUpperCase();letter.setAttribute('aria-hidden','true');cell.append(letter);}
      }
    };
    const card={visible:false,queued:false,dispose,still:()=>frames(card.visible?false:null),animate:()=>frames(true),preview:()=>frames(activeVisualPreview===card&&motionAllowed())};
    visualPreviewCards.set(button,card);
    let hovered=false,focused=false;
    const releaseMotion=()=>{if(!hovered&&!focused){if(activeVisualPreview===card)activeVisualPreview=null;card.still();}};
    button.onpointerenter=()=>{hovered=true;requestMotion(card);};button.onpointerleave=()=>{hovered=false;releaseMotion();};
    button.onfocus=()=>{focused=true;requestMotion(card);};button.onblur=()=>{focused=false;releaseMotion();};
    button.onclick=()=>selectVisual(preset.id);wrapper.append(button);
    const favorite=document.createElement('button');favorite.type='button';favorite.className='visual-favorite';
    const updateFavorite=()=>{const saved=settings.visualFavorites.includes(preset.id);favorite.textContent=saved?'★':'☆';favorite.setAttribute('aria-pressed',String(saved));favorite.setAttribute('aria-label',`${saved?'Remove':'Add'} ${preset.name} ${saved?'from':'to'} favorites`);favorite.title=favorite.getAttribute('aria-label');};
    updateFavorite();favorite.onclick=()=>{
      const saved=settings.visualFavorites.includes(preset.id);
      settings.visualFavorites=saved?settings.visualFavorites.filter(id=>id!==preset.id):[...settings.visualFavorites,preset.id];save();updateFavorite();
      document.getElementById('visual-favorites').textContent=`★ Favorites (${settings.visualFavorites.length})`;
      if(visualFavoritesOnly){const index=presets.indexOf(preset);renderVisualLibrary();const buttons=grid.querySelectorAll('.visual-favorite');(buttons[Math.min(index,buttons.length-1)]||document.getElementById('visual-favorites')).focus();}
    };
    wrapper.append(favorite);grid.append(wrapper);frames(null);
  }
  if(typeof IntersectionObserver!=='undefined'){
    visualPreviewObserver=new IntersectionObserver(entries=>{for(const entry of entries){const card=visualPreviewCards.get(entry.target);if(!card)continue;card.visible=entry.isIntersecting;if(!card.visible)card.still();else if(activeVisualPreview===card&&motionAllowed())card.animate();else queueVisualStill(card);}},{root:document.getElementById('visual-library'),threshold:0});
    for(const button of visualPreviewCards.keys())visualPreviewObserver.observe(button);
  }else for(const card of visualPreviewCards.values()){card.visible=true;queueVisualStill(card);}
  updateVisualSelection();
}
function bindVisualLibrary(){
  settings.visual=ProMaxVisuals.resolveId(settings.visual);
  if(!settings.visualPalette)settings.visualPalette=['dynamic-glass','prismatic-glass'].includes(ProMaxVisuals.presets.find(p=>p.id===settings.visual)?.kind)?settings.glassPalette||'gold':'original';
  if(settings.visual&&!ProMaxVisuals.presets.some(p=>p.id===settings.visual))settings.visual=null;
  settings.visualFavorites=[...new Set((Array.isArray(settings.visualFavorites)?settings.visualFavorites:[]).filter(id=>typeof id==='string').map(id=>ProMaxVisuals.resolveId(id)).filter(id=>ProMaxVisuals.presets.some(p=>p.id===id)))];
  const dialog=document.getElementById('visual-library');
  dialog.querySelector('.visual-library-header p').textContent=`${ProMaxVisuals.presets.length} offline styles · Compare A / B / C · Hover or focus for motion`;
  document.getElementById('browse-visuals').onclick=()=>{dialog.showModal();renderVisualLibrary();document.getElementById('visual-search').focus();};
  document.getElementById('close-visuals').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{stopVisualPreviews();document.getElementById('visual-grid').replaceChildren();});
  document.getElementById('solid-background').onclick=()=>selectVisual(null);
  const search=document.getElementById('visual-search');search.oninput=renderVisualLibrary;
  const favoritesButton=document.getElementById('visual-favorites');favoritesButton.textContent=`★ Favorites (${settings.visualFavorites.length})`;
  favoritesButton.onclick=()=>{visualFavoritesOnly=!visualFavoritesOnly;favoritesButton.setAttribute('aria-pressed',String(visualFavoritesOnly));renderVisualLibrary();};
  document.getElementById('visual-sample-lyrics').onchange=e=>document.getElementById('visual-grid').classList.toggle('visual-show-lyrics',e.target.checked);
  const filters=document.getElementById('visual-filters');
  for(const category of ['All',...new Set(ProMaxVisuals.presets.map(p=>p.category))]){
    const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(category===visualFilter));
    button.onclick=()=>{visualFilter=category;for(const other of filters.children)other.setAttribute('aria-pressed',String(other===button));renderVisualLibrary();};filters.append(button);
  }
  document.getElementById('visual-reset').onclick=()=>{visualFilter='All';visualFavoritesOnly=false;search.value='';favoritesButton.setAttribute('aria-pressed','false');for(const button of filters.children)button.setAttribute('aria-pressed',String(button.textContent==='All'));renderVisualLibrary();search.focus();};
  // Run before the app's document-level shortcut guard for open dialogs.
  window.addEventListener('keydown',e=>{
    if(!dialog.open)return;
    if(e.target.classList.contains('visual-favorite')||e.ctrlKey||e.altKey||e.metaKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    const buttons=[...document.querySelectorAll('#visual-grid .visual-option')],index=buttons.indexOf(e.target);if(index<0)return;
    const columns=getComputedStyle(document.getElementById('visual-grid')).gridTemplateColumns.split(' ').length;
    const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:index+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key]);
    e.preventDefault();e.stopPropagation();buttons[Math.max(0,Math.min(buttons.length-1,next))]?.focus();
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)activeVisualPreview?.still();});
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>activeVisualPreview?.still());
  for(const [id,prop] of [['glass-palette','visualPalette'],['glass-auto','glassAuto'],['glass-variant','glassVariant']]){
    const input=document.getElementById(id);if(input.type==='checkbox')input.checked=settings[prop]!==false;else input.value=settings[prop]||(prop==='visualPalette'?'original':'a');
    input.onchange=()=>{settings[prop]=input.type==='checkbox'?input.checked:input.value;document.getElementById('glass-variant').disabled=settings.glassAuto!==false;save();renderSlides();paint();refreshColors();};
  }
  document.getElementById('glass-variant').disabled=settings.glassAuto!==false;
  function refreshColors(){document.getElementById('visual-solid').hidden=settings.visualPalette!=='solid';document.getElementById('visual-gradient').hidden=settings.visualPalette!=='custom';}
  settings.visualColors=settings.visualColors||['#5276f4','#e0edff','#131c43'];
  for(let i=0;i<3;i++){const input=document.getElementById('visual-color-'+i);input.value=settings.visualColors[i];input.oninput=()=>{settings.visualColors[i]=input.value;save();renderSlides();paint();};}
  const color=document.getElementById('visual-color');color.value=settings.visualColor||'#5276f4';color.oninput=()=>{settings.visualColor=color.value;save();renderSlides();paint();};
  const motion=document.getElementById('visual-motion');motion.value=settings.visualMotion||'auto';motion.onchange=()=>{settings.visualMotion=motion.value;save();renderSlides();paint();};
  refreshColors();updateVisualName();
}
