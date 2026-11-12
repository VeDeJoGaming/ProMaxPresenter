/* Shared by control, output and the native YouTube browser. */
(function(root){
  const commands=['clear-text','blackout','presentation'];
  function command(event){
    if(event.altKey||event.metaKey)return null;
    const key=String(event.key||'').toLowerCase();
    if(event.ctrlKey){
      if(event.shiftKey)return key==='c'?'clear-text':null;
      if(key==='b')return 'blackout';
      if(key==='enter')return 'presentation';
      return null;
    }
    if(event.shiftKey)return null;
    return key==='f5'?'presentation':key==='f6'?'blackout':null;
  }
  const api={command,isCommand:value=>commands.includes(value)};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ProMaxPresentationKeys=api;
})(typeof window==='object'?window:globalThis);
