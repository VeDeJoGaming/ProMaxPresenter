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
}
let visualFilter='All';
function renderVisualLibrary(){
  const grid=document.getElementById('visual-grid');for(const canvas of grid.querySelectorAll('canvas'))canvas.stop?.();grid.replaceChildren();
  for(const preset of ProMaxVisuals.presets.filter(p=>visualFilter==='All'||p.category===visualFilter)){
    const button=document.createElement('button');button.className='visual-option';button.dataset.visualId=preset.id;button.setAttribute('aria-pressed',String(settings.visual===preset.id));
    const preview=document.createElement('div');preview.className='visual-triptych';button.append(preview);
    const label=document.createElement('span');label.textContent=preset.name;button.append(label);
    const caption=document.createElement('small');caption.textContent=preset.kind==='bundled-svg'?'Bundled · Seamless loop':(preset.mood||'Calm')+' · A / B / C';button.append(caption);
    const frames=animated=>{
      for(const canvas of preview.querySelectorAll('canvas'))canvas.stop?.();preview.replaceChildren();
      for(const variant of preset.kind==='bundled-svg'?['a']:['a','b','c']){
        const cell=document.createElement('div');cell.className='visual-option-preview';preview.append(cell);
        ProMaxVisuals.mount(cell,preset.id,animated,{...settings,glassAuto:false,glassVariant:variant});
        if(preset.kind!=='bundled-svg'){const letter=document.createElement('b');letter.className='visual-letter';letter.textContent=variant.toUpperCase();cell.append(letter);}
      }
    };
    const still=()=>frames(false),animate=()=>frames(true);
    button.onpointerenter=animate;button.onpointerleave=still;button.onfocus=animate;button.onblur=still;
    button.onclick=()=>{selectVisual(preset.id);};grid.append(button);still();
  }
}
function bindVisualLibrary(){
  settings.visual=ProMaxVisuals.resolveId(settings.visual);
  if(!settings.visualPalette)settings.visualPalette=['dynamic-glass','prismatic-glass'].includes(ProMaxVisuals.presets.find(p=>p.id===settings.visual)?.kind)?settings.glassPalette||'gold':'original';
  if(settings.visual&&!ProMaxVisuals.presets.some(p=>p.id===settings.visual))settings.visual=null;
  const dialog=document.getElementById('visual-library');
  dialog.querySelector('.visual-library-header p').textContent=`${ProMaxVisuals.presets.length} styles · Compare A / B / C · Hover for motion`;
  document.getElementById('browse-visuals').onclick=()=>{renderVisualLibrary();dialog.showModal();};
  document.getElementById('close-visuals').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{const grid=document.getElementById('visual-grid');for(const canvas of grid.querySelectorAll('canvas'))canvas.stop?.();grid.replaceChildren();});
  document.getElementById('solid-background').onclick=()=>selectVisual(null);
  const filters=document.getElementById('visual-filters');
  for(const category of ['All',...new Set(ProMaxVisuals.presets.map(p=>p.category))]){
    const button=document.createElement('button');button.textContent=category;button.setAttribute('aria-pressed',String(category===visualFilter));
    button.onclick=()=>{visualFilter=category;for(const other of filters.children)other.setAttribute('aria-pressed',String(other===button));renderVisualLibrary();};filters.append(button);
  }
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
