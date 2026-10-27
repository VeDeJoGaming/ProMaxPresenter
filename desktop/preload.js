const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('proMaxPrivate', Object.fromEntries(
  ['getState','create','restore','copyKey','setEnabled','disconnect','sync','applied'].map(action=>[action,input=>ipcRenderer.invoke('private:'+action,input)])
  .concat(['read','write'].map(action=>[action+'File',input=>ipcRenderer.invoke('private-file:'+action,input)]))
));
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
  ['getState','create','join','restore','setMode','sync','publish','unpublish','bibleInfo','publishBible','downloadBible','unpublishBible','copyInvite','copyAccessKey','members','revoke','disconnect']
    .map(action => [action, input => ipcRenderer.invoke('shared:'+action,input)])
));
contextBridge.exposeInMainWorld('promaxDesktop', {
  initialData: ipcRenderer.sendSync('library:read'),
  saveLibrary: value => ipcRenderer.send('library:save',value),
  onLibraryError: callback => ipcRenderer.on('library:error',(_event,value)=>callback(value)),
  settingsInfo: () => ipcRenderer.invoke('settings:info'),
  openDataFolder: () => ipcRenderer.invoke('settings:open-data'),
  maintenance: kind => ipcRenderer.invoke('settings:maintenance',kind),
  onMaintenanceProgress: callback => ipcRenderer.on('settings:maintenance-progress',(_event,value)=>callback(value)),
  performance: value => ipcRenderer.send('presentation:performance',value),
  onPerformance: callback => ipcRenderer.on('presentation:performance',(_event,value)=>callback(value)),
  youtubeHost: () => ipcRenderer.invoke('youtube:host'),
  prepareYouTubeBrowser: value => ipcRenderer.invoke('youtube:browser-prepare',value),
  youtubeBrowserBounds: value => ipcRenderer.send('youtube:browser-bounds',value),
  youtubeStatus: value => ipcRenderer.send('youtube:status',value),
  onYouTubeStatus: callback => ipcRenderer.on('youtube:status',(_event,value)=>callback(value)),
  importPowerPoint: () => ipcRenderer.invoke('documents:powerpoint'),
  editPowerPoint: request => ipcRenderer.invoke('documents:edit',request),
  exportPowerPoint: request => ipcRenderer.invoke('documents:export',request),
  toggle: displayId => ipcRenderer.invoke('presentation:toggle',displayId),
  publish: value => ipcRenderer.send('presentation:state', value),
  key: value => ipcRenderer.send('presentation:key', value),
  onState: callback => ipcRenderer.on('presentation:state', (_event, value) => callback(value)),
  onActive: callback => ipcRenderer.on('presentation:active', (_event, value) => callback(value)),
  onKey: callback => ipcRenderer.on('presentation:key', (_event, value) => callback(value))
});
