// Keep the update lifecycle separate from Electron so failure paths can be tested.
function createUpdateController({ updater, enabled, version, publishState, beforeInstall, log = () => {} }) {
  let state = { status: enabled ? 'idle' : 'disabled', version, availableVersion: null, percent: 0,
    message: enabled ? 'Check for updates when online.' : 'Updates will be enabled in a published release.' };
  let operation = null;
  const set = patch => { state = { ...state, ...patch }; publishState({ ...state }); };
  const failure = error => {
    log(error);
    set({ status: 'error', message: 'Could not update. Check your connection and try again. Your current version still works.' });
  };
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.on('checking-for-update', () => set({ status: 'checking', message: 'Checking for updates…' }));
  updater.on('update-available', info => set({ status: 'available', availableVersion: info.version, percent: 0,
    message: `Version ${info.version} is available. Update downloads, installs and restarts the app.` }));
  updater.on('update-not-available', () => set({ status: 'current', availableVersion: null, message: 'You have the latest version.' }));
  updater.on('download-progress', info => set({ status: 'downloading', percent: Math.max(0, Math.min(100, Math.round(info.percent))),
    message: 'Downloading update. Keep ProMax open…' }));
  updater.on('update-downloaded', info => set({ status: 'ready', availableVersion: info.version, percent: 100, message: 'Update downloaded. Preparing to restart…' }));
  updater.on('error', failure);

  async function check() {
    if (!enabled || operation || ['ready', 'installing'].includes(state.status)) return { ...state };
    operation = 'check';
    try { await updater.checkForUpdates(); } catch (error) { failure(error); }
    finally { operation = null; }
    return { ...state };
  }
  async function install() {
    if (!enabled || operation || !['available', 'ready'].includes(state.status)) return { ...state };
    operation = 'install';
    try {
      // Check both before downloading and immediately before restarting. A
      // presentation may have been opened while the download was running.
      await beforeInstall(false);
      if (state.status !== 'ready') {
        set({ status: 'downloading', percent: 0, message: 'Downloading update. Keep ProMax open…' });
        await updater.downloadUpdate();
        if (state.status !== 'ready') throw new Error('Download did not finish');
      }
      await beforeInstall(true);
      set({ status: 'installing', message: 'Installing update and restarting…' });
      updater.quitAndInstall(true, true);
    } catch (error) {
      if (error.code === 'PRESENTATION_OPEN' || error.code === 'SAVE_FAILED') {
        set({ status: state.percent === 100 ? 'ready' : 'available', message: error.message });
      } else { failure(error); }
    } finally { operation = null; }
    return { ...state };
  }
  return { check, install, getState: () => ({ ...state }) };
}
module.exports = { createUpdateController };
