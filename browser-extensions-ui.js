/* Local extension administration stays in Settings and uses the shared theme. */
(() => {
  const page=ProMaxSettings.page('presentation'),card=document.createElement('div');card.className='settings-card';card.id='browser-extensions-card';
  card.innerHTML='<h4>YouTube browser extensions</h4><p>Extensions run in the YouTube browser. Turn off Presentation before installing or changing them.</p><div class="settings-actions"><button id="install-ublock" class="primary">Install uBlock Origin</button><button id="add-browser-extension">Add extension folder</button></div><p>uBlock Origin is downloaded from its official GitHub project. Other unpacked Chrome extensions depend on compatibility. Changes apply when you prepare a video again.</p><p id="browser-extensions-status" role="status"></p><div id="browser-extensions-list"></div>';
  page.append(card);let busy=false;
  function render(value){
    const list=$('browser-extensions-list');list.replaceChildren();
    for(const item of value.items||[]){
      const row=document.createElement('div');row.className='settings-card';
      const name=document.createElement('strong');name.textContent=item.name+' · '+item.version;
      const status=document.createElement('p');status.textContent=item.error||(!item.enabled?'Disabled':item.loaded?'Enabled for YouTube':'Could not load');row.append(name,status);
      const actions=document.createElement('div');actions.className='settings-actions';
      for(const [label,action,input]of [[item.enabled?'Disable':'Enable','enabled',{key:item.key,enabled:!item.enabled}],['Extension settings','options',{key:item.key}],['Remove','remove',{key:item.key}]]){
        const button=document.createElement('button');button.textContent=label;button.disabled=busy||action==='options'&&!item.loaded;button.onclick=()=>run(action,input);actions.append(button);
      }
      row.append(actions);list.append(row);
    }
    $('install-ublock').disabled=busy||(value.items||[]).some(item=>item.name==='uBlock Origin');$('add-browser-extension').disabled=busy;
  }
  async function run(action,input){
    if(busy)return;busy=true;for(const button of card.querySelectorAll('button'))button.disabled=true;
    $('browser-extensions-status').textContent=action==='install-ublock'?'Downloading and verifying official uBlock Origin…':action==='add-folder'?'Choose the folder containing manifest.json…':'';
    try{const result=await window.promaxDesktop.browserExtensions(action,input);busy=false;render(result);$('browser-extensions-status').textContent=result.error?result.error:result.canceled||action==='list'?'':action==='options'?'Extension settings opened.':'Saved. Prepare the YouTube video again to apply changes.';}
    catch(error){busy=false;$('browser-extensions-status').textContent=error.message;for(const button of card.querySelectorAll('button'))button.disabled=false;}
  }
  $('install-ublock').onclick=()=>run('install-ublock');$('add-browser-extension').onclick=()=>run('add-folder');
  if(!window.promaxDesktop?.browserExtensions){for(const button of card.querySelectorAll('button'))button.disabled=true;$('browser-extensions-status').textContent='Browser extensions are available in the Windows desktop app.';return;}
  $('app-settings-dialog').addEventListener('settings-page',event=>{if(event.detail==='presentation')run('list');});
})();
