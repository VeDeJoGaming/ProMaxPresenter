/* Native PowerPoint document editing. Slide previews and selection overlays share point coordinates. */
(() => {
  let dialog,doc,model,index=0,selected=null,busy=false,dirty=false,history=[];
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const $=id=>dialog.querySelector('#pptx-'+id);
  const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
  function status(text){$('status').textContent=text;}
  function canLeave(){if(busy)return false;if(dirty){status('Apply your changes or discard them before continuing.');return false;}return true;}
  function create(){
    dialog=el('dialog',null,'pptx-editor');dialog.id='pptx-editor';dialog.setAttribute('aria-labelledby','pptx-title');
    const header=el('header'),titles=el('div');titles.append(el('h2','Edit PowerPoint'));titles.firstChild.id='pptx-title';titles.append(el('p','Edit the library copy. Save a PPTX copy when you want to use it elsewhere.'));header.append(titles,button('Close',()=>{if(canLeave())dialog.close();}));
    const tools=el('div',null,'pptx-tools');
    const undoButton=button('Undo',undo);undoButton.id='pptx-undo';
    tools.append(button('Add text',()=>mutate('addText')),button('Add picture',()=>mutate('addImage')),button('Add shape',()=>mutate('addShape')),button('New slide',()=>mutate('addSlide')),button('Duplicate slide',()=>mutate('duplicateSlide')),button('Delete slide',()=>mutate('deleteSlide')),undoButton,button('Save PPTX copy',exportFile,'primary'));
    const body=el('div',null,'pptx-body'),rail=el('nav',null,'pptx-rail');rail.id='pptx-slides';rail.setAttribute('aria-label','PowerPoint slides');
    const center=el('section',null,'pptx-center'),canvas=el('div',null,'pptx-canvas');canvas.id='pptx-canvas';center.append(canvas);
    const inspector=el('aside',null,'pptx-inspector');inspector.id='pptx-inspector';body.append(rail,center,inspector);
    const footer=el('p','Opening editable PowerPoint…','pptx-status');footer.id='pptx-status';footer.setAttribute('role','status');
    dialog.append(header,tools,body,footer);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{if(!canLeave())event.preventDefault();});
    dialog.addEventListener('keydown',event=>event.stopPropagation());
  }
  function lock(value){busy=value;dialog.setAttribute('aria-busy',String(value));dialog.querySelectorAll('button,input,textarea,select').forEach(n=>n.disabled=value);if(!value)$('undo').disabled=!history.length;}
  async function request(action,extra={}){
    const result=await window.promaxDesktop.editPowerPoint({source:doc.nativeSource,action,slide:index+1,...extra});if(result.error)throw Error(result.error);return result;
  }
  async function open(value){
    if(!dialog)create();if(dialog.open)return;
    doc=value;model=null;index=0;selected=null;dirty=false;history=[];dialog.showModal();$('title').textContent='Edit PowerPoint · '+doc.title;
    $('slides').replaceChildren();$('canvas').replaceChildren();$('inspector').replaceChildren();
    if(!doc.nativeSource){status('This older import contains slide images only. Import the original PowerPoint again to enable editing.');return;}
    lock(true);status('Opening editable PowerPoint…');
    try{model=(await request('inspect')).model;render();status('Choose an object on the slide or in the object list.');}catch(error){status(error.message);}finally{lock(false);}
  }
  function field(label,id,value,type='text'){
    const wrap=el('label',label),input=el(type==='textarea'?'textarea':'input');input.id='pptx-'+id;if(type!=='textarea')input.type=type;input.value=value??'';input.oninput=()=>{dirty=true;status('Unsaved changes — Apply changes to save to the library copy.');};wrap.append(input);return wrap;
  }
  function render(){
    if(!model)return;index=Math.min(index,model.slides.length-1);dirty=false;
    const rail=$('slides');rail.replaceChildren();doc.slides.forEach((url,i)=>{const b=button('',()=>{if(canLeave()){index=i;selected=null;render();}});b.setAttribute('aria-label','Edit slide '+(i+1));b.setAttribute('aria-pressed',String(index===i));const img=el('img');img.src=url;img.alt='';b.append(img,el('span',String(i+1)));rail.append(b);});
    const canvas=$('canvas');canvas.replaceChildren();canvas.style.aspectRatio=model.width+'/'+model.height;
    const image=el('img');image.src=doc.slides[index];image.alt='Slide '+(index+1);canvas.append(image);
    const objects=model.slides[index].objects;
    objects.forEach(shape=>{
      const b=button('',()=>choose(shape.id),'pptx-object');b.title=shape.name;b.setAttribute('aria-label','Select '+shape.name);b.setAttribute('aria-pressed',String(selected===shape.id));
      Object.assign(b.style,{left:(100*shape.left/model.width)+'%',top:(100*shape.top/model.height)+'%',width:(100*shape.width/model.width)+'%',height:(100*shape.height/model.height)+'%'});canvas.append(b);
    });
    renderInspector();$('undo').disabled=!history.length;
  }
  function choose(id){if(!canLeave())return;selected=id;render();}
  function renderInspector(){
    const panel=$('inspector');panel.replaceChildren();const objects=model.slides[index].objects,shape=objects.find(s=>s.id===selected);
    panel.append(el('h3','Objects'));const list=el('select');list.id='pptx-object-list';list.setAttribute('aria-label','Choose slide object');list.append(new Option('Choose an object',''));objects.forEach(s=>list.append(new Option(s.name,s.id)));list.value=selected??'';list.onchange=()=>{if(canLeave())choose(Number(list.value));else list.value=selected??'';};panel.append(list);
    if(!shape){panel.append(el('p','Select text, a picture or a shape to edit its properties. Grouped objects move as a group.'));return;}
    panel.append(el('h3',shape.name));
    if(shape.text!==null){
      panel.append(field('Text','text',shape.text,'textarea'),field('Font','fontName',shape.fontName),field('Font size (pt)','fontSize',shape.fontSize>0?shape.fontSize:'','number'));
      const style=el('div',null,'pptx-fields');style.append(field('Text color','color',shape.color||'#ffffff','color'));const label=el('label','Bold'),bold=el('input');bold.type='checkbox';bold.id='pptx-bold';bold.checked=shape.bold;bold.onchange=()=>{dirty=true;};label.append(bold);style.append(label);panel.append(style);
      // Only send changed controls, preserving mixed formatting in untouched text.
      panel.querySelectorAll('input,textarea').forEach(n=>{n.dataset.initial=n.type==='checkbox'?String(n.checked):n.value;});
    }
    const geometry=el('div',null,'pptx-fields');for(const [key,label] of [['left','X (pt)'],['top','Y (pt)'],['width','Width (pt)'],['height','Height (pt)']])geometry.append(field(label,key,Number(shape[key].toFixed(1)),'number'));panel.append(geometry);
    panel.append(button('Apply changes',apply,'primary'),button('Discard changes',()=>{dirty=false;render();status('Changes discarded.');}),button('Delete object',()=>mutate('deleteObject',{shape:selected})));
  }
  async function apply(){
    const shape=model.slides[index].objects.find(s=>s.id===selected);if(!shape)return;const values={};
    for(const key of ['left','top','width','height']){const value=Number($(key).value);if(Math.abs(value-shape[key])>.11)values[key]=value;}
    if(shape.text!==null)for(const key of ['text','fontName','fontSize','bold','color']){const n=$(key),value=n.type==='checkbox'?n.checked:n.value;if(String(value)!==n.dataset.initial)values[key]=key==='fontSize'?Number(value):value;}
    if(!Object.keys(values).length){dirty=false;status('No changes to save.');return;}
    await mutate('update',{shape:selected,values},true);
  }
  async function mutate(action,extra={},allowDirty=false){
    if(!model||busy||(!allowDirty&&!canLeave()))return;lock(true);status('Saving PowerPoint and refreshing slides…');
    try{
      const result=await request(action,extra);if(result.canceled){status('Picture selection canceled.');return;}const previous={doc,model,index,selected};
      const updated={...doc,nativeSource:result.nativeSource,slides:result.slides};await ProMaxFeatures.saveDocument(updated);
      history.push(previous);doc=updated;model=result.model;dirty=false;
      if(action==='addSlide'||action==='duplicateSlide'){index++;selected=null;}if(action==='deleteObject'||action==='deleteSlide')selected=null;
      render();status('Saved to the library copy. The current live output stays unchanged until you show a slide.');
    }catch(error){status(error.message);}finally{lock(false);}
  }
  async function undo(){if(!history.length||!canLeave())return;lock(true);try{const previous=history.at(-1);await ProMaxFeatures.saveDocument(previous.doc);history.pop();({doc,model,index,selected}=previous);render();status('Previous edit restored.');}catch(error){status(error.message);}finally{lock(false);}}
  async function exportFile(){if(!model||!canLeave())return;lock(true);try{const result=await window.promaxDesktop.exportPowerPoint({source:doc.nativeSource,title:doc.title});if(result.error)throw Error(result.error);status(result.saved?'Editable PPTX copy saved.':'Save canceled.');}catch(error){status(error.message);}finally{lock(false);}}
  function handleKey(event){
    if(!dialog?.open)return false;event.stopImmediatePropagation();
    if(event.ctrlKey||event.metaKey){
      if(event.key.toLowerCase()==='s'){event.preventDefault();if(dirty&&!busy)apply();}
      if(event.key.toLowerCase()==='z'&&!event.target.matches('input,textarea')){event.preventDefault();undo();}
    }
    return true;
  }
  window.ProMaxPptxEditor={open,handleKey};
})();
