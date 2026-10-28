/* Settings owns administration; the workspaces stay focused on presenting. */
(() => {
  const trigger=document.createElement('button');trigger.id='app-settings';trigger.textContent='Settings';trigger.setAttribute('aria-haspopup','dialog');
  document.querySelector('.header-actions').insertBefore(trigger,$('open-output'));
  const dialog=document.createElement('dialog');dialog.id='app-settings-dialog';dialog.setAttribute('aria-labelledby','settings-title');dialog.setAttribute('closedby','any');
  dialog.innerHTML=`<div class="settings-heading"><div><h2 id="settings-title">Settings</h2><p id="settings-version">ProMax Presenter</p></div><button id="settings-close" aria-label="Close settings">✕</button></div>
  <div class="settings-layout"><nav class="settings-nav" aria-label="Settings categories"></nav><div class="settings-content">
    <section data-settings-page="presentation" aria-labelledby="settings-presentation-title"><h3 id="settings-presentation-title">Presentation & playback</h3><p>Choose the output display and motion quality for this computer.</p>
      <div class="settings-card"><h4>Presentation display</h4><label class="settings-field" for="output-display">Output display<select id="output-display"><option value="">Choose automatically</option></select></label><p>Use Extend in Windows. A display change applies next time you turn presentation on.</p><p id="display-help" role="status"></p></div>
      <div class="settings-card"><h4>Motion backgrounds</h4><label class="settings-field" for="render-quality">Motion background quality<select id="render-quality"><option value="auto">Automatic · adapts to this computer</option><option value="performance">Smooth playback · lighter graphics</option><option value="quality">Maximum detail · more graphics power</option></select></label><p>Automatic adjusts background resolution for smooth playback. Text uses the display’s full resolution.</p></div></section>
    <section data-settings-page="bible" aria-label="Bible settings" hidden></section>
    <section data-settings-page="sharing" aria-label="Shared library settings" hidden></section>
    <section data-settings-page="shortcuts" aria-label="Keyboard shortcuts" hidden></section>
    <section data-settings-page="backup" aria-labelledby="settings-backup-title" hidden><h3 id="settings-backup-title">Backup & recovery</h3><p>Songs, meetings and settings save automatically. A full backup also includes Bible text, backgrounds, videos and PowerPoint slides.</p><div class="settings-actions"><button id="full-backup" class="primary">Create full backup & restart</button><button id="restore-backup">Restore backup & restart</button><button id="open-data-folder">Open data folder</button></div><p>Backup and restore restart the app. Restore creates a safety backup of your current data first.</p><p id="backup-status" role="status"></p></section>
    <section data-settings-page="updates" aria-label="App updates" hidden><h3>App updates</h3><p>Check for a new version of ProMax Presenter.</p></section>
    <section data-settings-page="help" aria-label="Getting started" hidden><h3>Getting started</h3><ol><li>Create a meeting and add songs, Bible passages or media.</li><li>Select an item to prepare it, then click a slide to send it live.</li><li>Use F5 to turn presentation on or off and F6 for blackout.</li></ol><p>Local media works offline. YouTube needs internet. Importing PowerPoint needs Microsoft PowerPoint.</p></section>
  </div></div>`;
  document.body.append(dialog);
  const page=id=>dialog.querySelector('[data-settings-page="'+id+'"]');
  const labels=[['presentation','Presentation'],['bible','Bible'],['sharing','Shared library'],['shortcuts','Shortcuts'],['backup','Backup & recovery'],['updates','Updates'],['help','Getting started']];
  let currentPage='presentation';
  for(const [id,label]of labels){const button=document.createElement('button');button.type='button';button.id=id==='sharing'?'shared-open':'settings-nav-'+id;button.dataset.settingsTarget=id;button.textContent=label;button.setAttribute('aria-controls','settings-page-'+id);page(id).id='settings-page-'+id;button.onclick=()=>open(id);dialog.querySelector('.settings-nav').append(button);}
  page('updates').append($('updates-panel'));
  // Reuse the existing shortcut reference in the Settings hierarchy.
  const shortcuts=$('editing-help'),content=document.createElement('div');content.id='editing-help';content.append(...shortcuts.childNodes);shortcuts.remove();content.querySelector('h2').textContent='Keyboard shortcuts';page('shortcuts').append(content);
  function renderBible(){ProMaxFeatures.renderBibleSettings(page('bible'));}
  document.addEventListener('promax:bible-changed',renderBible);
  ProMaxFeatures.ready.then(renderBible);
  async function displayInfo(){
    $('render-quality').value=settings.renderQuality||'auto';
    if(!window.promaxDesktop){$('output-display').disabled=true;$('display-help').textContent='Display selection and full backups are available in the Windows desktop app.';for(const id of ['full-backup','restore-backup','open-data-folder'])$(id).disabled=true;return;}
    try{
      const info=await window.promaxDesktop.settingsInfo();$('settings-version').textContent='ProMax Presenter '+info.version;
      const select=$('output-display');select.replaceChildren(new Option('Choose automatically',''));
      for(const display of info.displays){const option=new Option(display.label+' · '+display.width+' × '+display.height+(display.isControl?' · Control display':''),String(display.id));option.disabled=display.isControl;select.append(option);}
      if(settings.presentationDisplay&&!info.displays.some(d=>String(d.id)===String(settings.presentationDisplay)))select.append(new Option('Saved display · disconnected',settings.presentationDisplay));
      select.value=settings.presentationDisplay||'';$('display-help').textContent=info.displays.length<2?'One display detected. Connect another display to present.':info.displays.length+' displays detected.';
    }catch{$('display-help').textContent='Could not read display information.';}
  }
  function open(id=currentPage){
    if(!page(id))return;
    if(!dialog.open){if(document.querySelector('dialog[open]'))return;dialog.showModal();displayInfo();}
    currentPage=id;
    for(const section of dialog.querySelectorAll('[data-settings-page]'))section.hidden=section!==page(id);
    for(const button of dialog.querySelectorAll('[data-settings-target]')){if(button.dataset.settingsTarget===id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    dialog.querySelector('.settings-content').scrollTop=0;
    if(id==='bible')renderBible();
    dialog.dispatchEvent(new CustomEvent('settings-page',{detail:id}));
  }
  window.ProMaxSettings={open,page};
  trigger.onclick=()=>open();$('settings-close').onclick=()=>dialog.close();
  // Other dialogs created before Settings retain the same safe backdrop dismissal.
  for(const menu of document.querySelectorAll('dialog'))menu.setAttribute('closedby','any');
  $('render-quality').onchange=()=>{settings.renderQuality=$('render-quality').value;save();paint();};
  $('output-display').onchange=()=>{settings.presentationDisplay=$('output-display').value||null;save();};
  $('open-data-folder').onclick=async()=>{try{const error=await window.promaxDesktop.openDataFolder();if(error)notify(error);}catch{notify('Could not open the app data folder.');}};
  async function maintenance(kind){
    if(!save())return;window.promaxDesktop.saveLibrary(lastSavedRaw);
    $('full-backup').disabled=true;$('restore-backup').disabled=true;
    $('backup-status').textContent='Choose a folder in the file dialog…';
    try{const result=await window.promaxDesktop.maintenance(kind);if(result.error)throw Error(result.error);$('backup-status').textContent=result.canceled?'Canceled.':result.restarting?'Restarting to copy your data…':'';}
    catch(error){$('backup-status').textContent=error.message;}
    finally{$('full-backup').disabled=false;$('restore-backup').disabled=false;}
  }
  $('full-backup').onclick=()=>maintenance('backup');$('restore-backup').onclick=()=>maintenance('restore');
  window.promaxDesktop?.onMaintenanceProgress?.(message=>{$('backup-status').textContent=message;});
  const stats=document.createElement('small');stats.id='presentation-performance';stats.setAttribute('aria-live','off');$('live-label').after(stats);
  window.promaxDesktop?.onPerformance?.(value=>{stats.textContent=value?.fps?`Motion · ${value.fps} fps · ${value.width} × ${value.height}`:'';});
})();
