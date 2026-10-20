const { ipcMain, safeStorage, clipboard } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const { createUpdateController } = require('./update-controller.cjs');
const { backupLibrary } = require('./backup.cjs');
const { createSharedController } = require('./shared-controller.cjs');
const { createSharedVault } = require('./shared-vault.cjs');

async function initializeIntegrations({ app, getControl, hasPresentation, flush }) {
  const indexURL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
  const trusted = event => {
    const control = getControl();
    return control && !control.isDestroyed() && event.sender === control.webContents &&
      event.senderFrame === control.webContents.mainFrame && event.senderFrame.url === indexURL;
  };
  const log = error => {
    try { fs.appendFileSync(path.join(app.getPath('userData'), 'updates.log'), `${new Date().toISOString()} ${String(error)}\n`); } catch {}
  };
  autoUpdater.logger = { info: log, warn: log, error: log, debug() {} };
  const updates = createUpdateController({
    updater: autoUpdater, version: app.getVersion(),
    enabled: app.isPackaged && fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')),
    publishState: state => getControl()?.webContents.send('updates:changed', state),
    beforeInstall: async shouldBackup => {
      const assertIdle = () => {
        if (hasPresentation()) throw Object.assign(new Error('Close the presentation window, then press Update.'), { code: 'PRESENTATION_OPEN' });
      };
      assertIdle();
      if (shouldBackup) {
        try {
          const control = getControl();
          const data = await control.webContents.executeJavaScript('window.proMaxPrepareUpdate()');
          await backupLibrary(path.join(app.getPath('userData'), 'backups'), data, app.getVersion());
          await flush();
          await control.webContents.session.flushStorageData();
        } catch (error) {
          log(error);
          throw Object.assign(new Error('Could not save your library. Create a full backup in Settings and try again.'), { code: 'SAVE_FAILED' });
        }
        assertIdle();
      }
    }, log
  });
  for (const [channel, action] of Object.entries({ 'updates:state': updates.getState, 'updates:check': updates.check, 'updates:install': updates.install })) {
    ipcMain.handle(channel, event => { if (!trusted(event)) throw Error('Untrusted request'); return action(); });
  }
  const origin = !app.isPackaged && process.env.PROMAX_SHARED_TEST_URL || require('../shared-config.json').origin;
  const shared = createSharedController({ origin, clipboard,
    vault: createSharedVault(path.join(app.getPath('userData'), 'shared-access.enc'), safeStorage) });
  let sharedError;
  try { await shared.init(); } catch { sharedError = 'Your protected group access could not be opened. Restore your access key or reconnect to your group.'; }
  for (const action of ['getState','create','join','restore','setMode','sync','publish','unpublish','copyInvite','copyAccessKey','members','revoke','disconnect']) {
    ipcMain.handle('shared:' + action, async (event, input) => {
      if (!trusted(event)) throw Error('Untrusted request');
      try {
        if (sharedError && action === 'getState') return { ...shared.getState(), error: sharedError };
        const result = await shared[action](input); sharedError = null; return result;
      } catch (error) { return { error: error.message }; }
    });
  }
  return { start() {
    const timer = setTimeout(() => updates.check(), 8000); timer.unref();
    app.once('before-quit', () => clearTimeout(timer));
  } };
}
module.exports = { initializeIntegrations };
