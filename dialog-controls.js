/* Consistent accept/cancel keys without intercepting multiline text or pickers. */
(() => {
  let held=null;
  function handleKey(event){
    if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return false;
    if(!['Enter','Escape'].includes(event.key))return false;
    if(event.repeat&&held===event.key){event.preventDefault();return true;}
    const dialog=event.target.closest?.('dialog[open]')||document.activeElement?.closest('dialog[open]')||[...document.querySelectorAll('dialog[open]')].at(-1);
    if(!dialog)return false;
    if(event.key==='Escape'){
      event.preventDefault();if(event.repeat)return true;held=event.key;
      if(dialog.dispatchEvent(new Event('cancel',{cancelable:true}))){
        const cancel=dialog.querySelector('[data-dialog-cancel]');
        if(cancel&&!cancel.disabled)cancel.click();else dialog.close('cancel');
      }
      return true;
    }
    if(event.target.closest?.('textarea,select,[contenteditable=true],[role=combobox]'))return false;
    const accept=[...dialog.querySelectorAll('[data-dialog-accept],button[type=submit],input[type=submit]')].find(button=>!button.disabled&&button.getClientRects().length);
    if(!accept)return false;
    event.preventDefault();if(!event.repeat){held=event.key;accept.click();}return true;
  }
  document.addEventListener('keyup',event=>{if(event.key===held)held=null;},true);
  window.addEventListener('blur',()=>{held=null;});
  window.ProMaxDialogs={handleKey};
})();
