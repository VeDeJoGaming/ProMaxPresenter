(() => {
  const bridge = window.proMaxDesktop;
  const panel = document.getElementById('updates-panel');
  const button = document.getElementById('update-action');
  const message = document.getElementById('update-message');
  const progress = document.getElementById('update-progress');
  let state;
  if (!bridge) return;
  panel.hidden = false;
  function render(next) {
    state = next;
    document.getElementById('app-version').textContent = `v${state.version}`;
    message.textContent = state.message;
    const busy = ['checking', 'downloading', 'installing'].includes(state.status);
    const available = ['available', 'ready'].includes(state.status);
    button.textContent = busy ? (state.status === 'downloading' ? `Downloading ${state.percent}%` : state.status === 'installing' ? 'Restarting…' : 'Checking…') : available ? 'Update' : 'Check for updates';
    button.disabled = busy || state.status === 'disabled';
    button.classList.toggle('primary', available);
    progress.hidden = state.status !== 'downloading';
    progress.value = state.percent;
    if (available) document.title = 'Update available · ProMax Presenter';
    else document.title = 'ProMax Presenter';
  }
  bridge.onUpdateState(render);
  bridge.getUpdateState().then(render).catch(() => { message.textContent = 'Update service is unavailable. Restart ProMax and try again.'; });
  button.onclick = async () => {
    button.disabled = true;
    try { render(await (['available', 'ready'].includes(state.status) ? bridge.installUpdate() : bridge.checkForUpdates())); }
    catch { message.textContent = 'Could not update. Restart ProMax and try again.'; button.disabled = false; }
  };
})();
