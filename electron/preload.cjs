const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAutoStart: (enable) => ipcRenderer.invoke('toggle-auto-start', enable),
  getAutoStartStatus: () => ipcRenderer.invoke('get-auto-start-status'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
