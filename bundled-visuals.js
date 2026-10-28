/* Original offline artwork. Only paper and textile motifs allow manual material colors. */
(() => {
  const base=typeof document==='undefined'?'':document.currentScript?.src||document.baseURI;
  const presets=[
    {id:'empty-tomb',name:'Empty Tomb',category:'Easter',src:'visuals/empty-tomb.png',tags:['Jesus','tomb','resurrection','stone','grave','grav','påske','pask','oppstandelse'],description:'The empty tomb · cinematic photography'},
    {id:'three-crosses',name:'Three Crosses',category:'Sacred',src:'visuals/three-crosses.png',tags:['Golgotha','cross','Jesus','three','kors','Calvary','Good Friday'],description:'Three crosses · fine-art landscape'},
    {id:'christmas-nativity',name:'Bethlehem Night',category:'Christmas',src:'visuals/christmas-nativity.png',tags:['Christmas','nativity','Bethlehem','jul','manger','Jesus','birth'],description:'Bethlehem · Christmas artwork'},
    {id:'easter-garden',name:'Easter Garden',category:'Easter',src:'visuals/easter-garden.png',tags:['Easter','garden','spring','påske','hope','flowers','new life'],description:'Easter garden · photographic still life'}
    ,{id:'fjord-sanctuary',name:'Fjord Sanctuary',category:'Nature',src:'visuals/fjord-sanctuary.png',tags:['fjord','Norway','mountains','landscape','norsk','fjell','stillhet'],description:'Norwegian fjord · landscape photography'}
    ,{id:'botanical-engraving',name:'Botanical Engraving',category:'Fine Art',src:'visuals/botanical-engraving.png',tags:['botanical','engraving','paper','illustration','botanikk','leaves','nature'],description:'Botanical engraving · crafted illustration'}
    ,{id:'stained-glass-dove',name:'Stained Glass Dove',category:'Sacred',src:'visuals/stained-glass-dove.png',tags:['dove','stained glass','Holy Spirit','kirke','due','glassmaleri','peace'],description:'Dove of peace · stained glass artwork'}
    ,{id:'desert-pilgrimage',name:'Desert Pilgrimage',category:'Fine Art',src:'visuals/desert-pilgrimage.png',tags:['desert','pilgrimage','journey','sand','ørken','vandring','watercolor'],description:'Desert pilgrimage · painterly landscape'}
    ,{id:'cloister-silence',name:'Cloister Silence',category:'Architecture',src:'visuals/cloister-silence.png',tags:['cloister','monochrome','architecture','arches','kloster','silence','stone'],description:'Quiet cloister · monochrome architectural photography'}
    ,{id:'covenant-weave',name:'Covenant Weave',category:'Fine Art',src:'visuals/covenant-weave.png',tags:['textile','woven','linen','weave','vev','fabric','craft'],description:'Covenant weave · tactile textile artwork'}
    ,{id:'communion-table',name:'Communion Table',category:'Sacred',src:'visuals/communion-table.png',tags:['communion','bread','wine','table','nattverd','still life','cup'],description:'Communion table · photographic still life'}
    ,{id:'ocean-linocut',name:'Ocean Linocut',category:'Fine Art',src:'visuals/ocean-linocut.png',tags:['ocean','linocut','printmaking','waves','hav','linotrykk','print'],description:'Ocean linocut · crafted printmaking'}
  ].map(p=>({...p,recolorable:['botanical-engraving','covenant-weave'].includes(p.id),kind:'still-image',fixedPalette:!['botanical-engraving','covenant-weave'].includes(p.id),static:true,colors:['#9b7955','#e8cf9c','#171a20'],mood:'Still',shade:({'empty-tomb':.24,'three-crosses':.18,'fjord-sanctuary':.24,'botanical-engraving':.10,'stained-glass-dove':.28,'desert-pilgrimage':.34}[p.id]??.14)}));
  function variant(preset,options={}){
    if(!preset.variants)return 'a';
    const chosen=options.glassAuto===false?options.glassVariant||'a':window.ProMaxVisuals.sectionLook(preset,options.section);
    return Object.hasOwn(preset.variants,chosen)?chosen:'a';
  }
  let nextFilter=0;
  function tint(image,preset,options){
    if(!preset.recolorable)return;
    const palette=options.visualPalette||'original';
    if(palette==='original'){image.style.filter='';return;}
    const hex=['solid','custom'].includes(palette)?options.visualColor||'#5276f4':window.ProMaxVisuals.palettes[palette]?.[0]||'#5276f4';
    if(!image.tintFilter){
      const doc=image.ownerDocument,ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg'),id='artwork-dye-'+ ++nextFilter;
      svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';svg.setAttribute('aria-hidden','true');
      // Isolate the warm engraving/thread from the colored paper or cloth.
      const mask=preset.id==='botanical-engraving'?'10 -10 0 0 0.2':'-6 12 0 0 0';
      svg.innerHTML='<defs><filter id="'+id+'" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="dyed"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 '+mask+'" result="ornamentMask"/><feComposite in="dyed" in2="ornamentMask" operator="out" result="paper"/><feComposite in="SourceGraphic" in2="ornamentMask" operator="in" result="ornament"/><feMerge><feMergeNode in="paper"/><feMergeNode in="ornament"/></feMerge></filter></defs>';
      image.after(svg);image.tintFilter={svg,id};
    }
    const {svg,id}=image.tintFilter,rgb=hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255);
    // Luminance remapping changes only the material's dye, retaining every fine mark.
    const rows=rgb.flatMap(c=>[.2126*c/.35,.7152*c/.35,.0722*c/.35,0,0]);
    svg.querySelector('[type=matrix]').setAttribute('values',[...rows,0,0,0,1,0].join(' '));
    image.style.filter='url("#'+id+'")';
  }
  function mount(container,preset,options={}){
    const doc=container.ownerDocument,image=doc.createElement('img');
    image.className='media visual-still';image.alt='';image.setAttribute('aria-hidden','true');image.dataset.stillVisual=preset.id;
    const look=variant(preset,options);image.dataset.stillVariant=look;
    image.style.objectPosition=({'three-crosses':'95% 50%','christmas-nativity':'85% 50%','stained-glass-dove':'85% 50%'}[preset.id]||'50% 50%');
    image.decoding='async';image.src=new URL(preset.variants?.[look]||preset.src,base).href;container.prepend(image);
    if(!container.closest('.visual-option')){const shade=doc.createElement('div');shade.className='shade';shade.style.background='rgba(0,0,0,'+preset.shade+')';image.after(shade);}
    tint(image,preset,options);image.stop=()=>image.tintFilter?.svg.remove();
    return image;
  }
  function render(doc,container,value,isOutput){
    if(value.black||value.pdf||value.video||value.image||value.youtube||value.media&&!value.settings.visual)return false;
    const preset=presets.find(p=>p.id===value.settings.visual);if(!preset)return false;
    let image=container.querySelector('img[data-still-visual]'),text=container.querySelector('.screen-text');
    const options={...value.settings,section:value.section},look=variant(preset,options);
    if(image?.dataset.stillVisual!==preset.id||image?.dataset.stillVariant!==look){
      ProMaxPlayback.clear(doc,container);container.replaceChildren();image=mount(container,preset,options);
      text||=doc.createElement('div');text.className='screen-text';text.style.zIndex=2;container.append(text);
    }
    tint(image,preset,options);
    container.dataset.mediaKey=preset.id;container.style.background='#000';
    ProMaxPlayback.renderLiveText(text,value);text.style.textAlign=value.settings.align;
    text.style.fontSize=isOutput?value.settings.fontSize+'vw':container.clientWidth*value.settings.fontSize/100+'px';
    return true;
  }
  window.ProMaxStillVisuals={presets,mount,render,variant};
  // Keep the retired SVG hook inert for older integrations.
  window.ProMaxBundledVisuals={presets:[],mount:()=>null,render:()=>false};
})();
