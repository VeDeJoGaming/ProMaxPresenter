const { app, BrowserWindow, ipcMain, Menu, session, dialog, safeStorage, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const { createUpdateController } = require('./update-controller.cjs');
const { backupLibrary } = require('./backup.cjs');
const { createSharedController } = require('./shared-controller.cjs');
const { createSharedVault } = require('./shared-vault.cjs');

// The stable application ID and user-data directory must survive every update.
app.setName('ProMax Presenter');
app.setAppUserModelId('com.promax.presenter');
if (!app.isPackaged && process.env.PROMAX_TEST_DATA) app.setPath('userData', process.env.PROMAX_TEST_DATA);
const indexURL = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
let mainWindow;
let updates;
let checkTimer;
const presentationWindows = new Set();
const trusted = event => mainWindow && !mainWindow.isDestroyed() &&
  event.sender === mainWindow.webContents && event.senderFrame === mainWindow.webContents.mainFrame && event.senderFrame.url === indexURL;

function log(error) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'updates.log'), `${new Date().toISOString()} ${String(error)}\n`); } catch {}
}
function blockNavigation(contents) {
  contents.on('will-navigate', event => event.preventDefault());
  contents.on('will-redirect', event => event.preventDefault());
  contents.on('will-attach-webview', event => event.preventDefault());
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480, height: 960, minWidth: 820, minHeight: 620, show: false,
    backgroundColor: '#101318', title: 'ProMax Presenter', icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  mainWindow.removeMenu();
  blockNavigation(mainWindow.webContents);
  mainWindow.webContents.setWindowOpenHandler(({ url, frameName }) => {
    if (url !== 'about:blank' || frameName !== 'promax-output' || presentationWindows.size) return { action: 'deny' };
    return { action: 'allow', overrideBrowserWindowOptions: {
      autoHideMenuBar: true, backgroundColor: '#000000',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: undefined }
    } };
  });
  mainWindow.webContents.on('did-create-window', child => {
    presentationWindows.add(child);
    child.removeMenu();
    blockNavigation(child.webContents);
    child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    child.on('closed', () => presentationWindows.delete(child));
  });
  mainWindow.on('close', () => { for (const child of presentationWindows) child.close(); });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(indexURL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    const canFullscreen = (contents, permission) => permission === 'fullscreen' &&
      [...presentationWindows].some(window => !window.isDestroyed() && window.webContents === contents);
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(canFullscreen(contents, permission)));
    session.defaultSession.setPermissionCheckHandler((contents, permission) => canFullscreen(contents, permission));
    autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
    updates = createUpdateController({
      updater: autoUpdater, version: app.getVersion(),
      enabled: app.isPackaged && fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')),
      publishState: state => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updates:changed', state); },
      beforeInstall: async shouldBackup => {
        if (presentationWindows.size) {
          const error = new Error('Close the presentation window, then press Update.');
          error.code = 'PRESENTATION_OPEN'; throw error;
        }
        if (!mainWindow || mainWindow.isDestroyed()) throw new Error('Main window is closed');
        if (shouldBackup) {
          try {
            const data = await mainWindow.webContents.executeJavaScript('window.proMaxPrepareUpdate()');
            await backupLibrary(path.join(app.getPath('userData'), 'backups'), data, app.getVersion());
            // Flush localStorage and IndexedDB before handing control to NSIS.
            mainWindow.webContents.session.flushStorageData();
          } catch (cause) {
            log(cause);
            const error = new Error('Could not save your library. Export a backup and try again.');
            error.code = 'SAVE_FAILED'; throw error;
          }
          if (presentationWindows.size) {
            const error = new Error('Close the presentation window, then press Update.');
            error.code = 'PRESENTATION_OPEN'; throw error;
          }
        }
      }, log
    });
    for (const [channel, action] of Object.entries({ 'updates:state': updates.getState, 'updates:check': updates.check, 'updates:install': updates.install })) {
      ipcMain.handle(channel, event => { if (!trusted(event)) throw new Error('Untrusted request'); return action(); });
    }
    const origin = !app.isPackaged && process.env.PROMAX_SHARED_TEST_URL || require('../shared-config.json').origin;
    const shared = createSharedController({ origin, clipboard,
      vault: createSharedVault(path.join(app.getPath('userData'), 'shared-access.enc'), safeStorage) });
    let sharedError;
    try { await shared.init(); } catch { sharedError='Your protected group access could not be opened. Restore your access key or reconnect to your group.'; }
    for (const action of ['getState','create','join','restore','setMode','sync','publish','unpublish','copyInvite','copyAccessKey','members','revoke','disconnect']) {
      ipcMain.handle('shared:'+action, async (event, input) => {
        if(!trusted(event)) throw new Error('Untrusted request');
        try { if(sharedError&&action==='getState') return {...shared.getState(),error:sharedError};
          const result=await shared[action](input);sharedError=null;return result;
        } catch(error) { return {error:error.message}; }
      });
    }
    createWindow();
    mainWindow.webContents.once('did-finish-load', () => {
      checkTimer = setTimeout(() => updates.check(), 8000);
      checkTimer.unref();
    });
  }).catch(error => { log(error); dialog.showErrorBox('ProMax could not start', 'Please reinstall ProMax Presenter. Your library is kept in your user profile.'); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => clearTimeout(checkTimer));
