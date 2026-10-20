const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('proMaxDesktop', {
  getUpdateState: () => ipcRenderer.invoke('updates:state'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('updates:changed', listener);
    return () => ipcRenderer.removeListener('updates:changed', listener);
  }
});

contextBridge.exposeInMainWorld('proMaxShared', Object.fromEntries(
  ['getState','create','join','restore','setMode','sync','publish','unpublish','copyInvite','copyAccessKey','members','revoke','disconnect']
    .map(action => [action, input => ipcRenderer.invoke('shared:'+action,input)])
));
