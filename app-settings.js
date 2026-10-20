(() => {
  const trigger=document.createElement('button');trigger.id='app-settings';trigger.textContent='Settings';
  document.querySelector('.header-actions').insertBefore(trigger,$('open-output'));
  const dialog=document.createElement('dialog');dialog.id='app-settings-dialog';dialog.setAttribute('aria-labelledby','settings-title');
  dialog.innerHTML=`<div class="settings-heading"><div><h2 id="settings-title">Settings & recovery</h2><p id="app-version">ProMax Presenter</p></div><button id="settings-close" aria-label="Close settings">✕</button></div>
    <section><h3>Presentation display</h3><label class="settings-field" for="output-display">Output display<select id="output-display"><option value="">Choose automatically</option></select></label><p>Connect a second display and use Extend in Windows. A display change applies the next time you turn presentation on.</p><p id="display-help" role="status"></p></section>
    <section><h3>Smooth playback</h3><label class="settings-field" for="render-quality">Motion background quality<select id="render-quality"><option value="auto">Automatic · adapts to this computer</option><option value="performance">Smooth playback · lighter graphics</option><option value="quality">Maximum detail · more graphics power</option></select></label><p>Presentation backgrounds aim for 60 frames per second. Automatic lowers background resolution if playback falls behind. Text always uses the display’s full resolution. Operator previews use fewer resources.</p></section>
    <section><h3>Backup & recovery</h3><p>Songs, meetings and settings save automatically. Extra recovery copies are kept locally. A full backup also includes Bible text, backgrounds, videos and PowerPoint slides.</p><div class="settings-actions"><button id="full-backup" class="primary">Create full backup & restart</button><button id="restore-backup">Restore backup & restart</button><button id="open-data-folder">Open data folder</button></div><p>Backup and restore close the presentation and restart the app so files can be copied safely. Restoring also creates a safety backup of your current data. Keep backups on a separate drive when possible.</p><p id="backup-status" role="status"></p></section>
    <section><h3>Getting started</h3><ol><li>Create a meeting folder and add your songs, Bible passages or media.</li><li>Select an item to prepare it. Click a slide or Show on presentation when you are ready.</li><li>Turn presentation on to use the second display. Use ← / → to change slides and Escape for blackout.</li></ol><p>Local media works offline. YouTube needs internet. Importing PowerPoint needs Microsoft PowerPoint on this computer.</p></section>`;
  document.body.append(dialog);
  // Native light dismissal closes on the backdrop without clicking through to a cue.
  for(const menu of document.querySelectorAll('dialog'))menu.setAttribute('closedby','any');
  $('settings-close').onclick=()=>dialog.close();
  $('render-quality').onchange=()=>{settings.renderQuality=$('render-quality').value;save();paint();};
  $('output-display').onchange=()=>{settings.presentationDisplay=$('output-display').value||null;save();};
  trigger.onclick=async()=>{
    $('render-quality').value=settings.renderQuality||'auto';$('backup-status').textContent='';dialog.showModal();
    if(!window.promaxDesktop){$('output-display').disabled=true;$('display-help').textContent='Display selection and full backups are available in the Windows desktop app.';for(const id of ['full-backup','restore-backup','open-data-folder'])$(id).disabled=true;return;}
    try{
      const info=await window.promaxDesktop.settingsInfo();$('app-version').textContent='ProMax Presenter '+info.version;
      const select=$('output-display');select.replaceChildren(new Option('Choose automatically',''));
      for(const display of info.displays){const option=new Option(`${display.label} · ${display.width} × ${display.height}${display.isControl?' · Control display':''}`,String(display.id));option.disabled=display.isControl;select.append(option);}
      if(settings.presentationDisplay&&!info.displays.some(d=>String(d.id)===String(settings.presentationDisplay)))select.append(new Option('Saved display · disconnected',settings.presentationDisplay));
      select.value=settings.presentationDisplay||'';$('display-help').textContent=info.displays.length<2?'One display detected. Connect another display to present.':info.displays.length+' displays detected.';
    }catch(error){$('display-help').textContent='Could not read display information.';}
  };
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
