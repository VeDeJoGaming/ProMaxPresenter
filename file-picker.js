/* Accessible file selection with one async handler and a stable focus target. */
(function(root){
  function bind(input,{text,key=input.id||input.accept,className='button'}){
    const wrapper=document.createElement('span');wrapper.className='file-picker';
    if(className.split(/\s+/).includes('wide'))wrapper.classList.add('file-picker-wide');
    const picker=document.createElement('button');picker.type='button';picker.className=className;picker.textContent=text;picker.dataset.filePicker=key;
    input.hidden=true;input.setAttribute('aria-label',text);picker.onclick=()=>input.click();
    const changed=input.onchange;
    input.onchange=async event=>{
      if(!input.files.length)return;
      const restoreFocus=document.activeElement===picker;picker.disabled=true;picker.textContent='Importing…';picker.setAttribute('aria-busy','true');
      try{await changed?.call(input,event);}catch(error){root.notify?.(error.message||'Could not import this file.');}
      finally{
        input.value='';picker.disabled=false;picker.textContent=text;picker.removeAttribute('aria-busy');
        if(restoreFocus&&document.activeElement===document.body){
          [...document.querySelectorAll('[data-file-picker]')].find(node=>node.dataset.filePicker===key&&node.getClientRects().length)?.focus({preventScroll:true});
        }
      }
    };
    wrapper.append(picker,input);return wrapper;
  }
  function create({text,accept,multiple=false,key=accept,onFiles,className='button'}){
    const input=document.createElement('input');input.type='file';input.accept=accept;input.multiple=multiple;input.onchange=()=>onFiles([...input.files]);
    return bind(input,{text,key,className});
  }
  function enhanceLabels(scope=document){
    for(const input of scope.querySelectorAll('label.button>input[type=file]')){
      const label=input.parentElement,text=[...label.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim();
      const picker=bind(input,{text,className:label.className});label.replaceWith(picker);
    }
  }
  root.ProMaxFilePicker={create,enhanceLabels};
})(window);
