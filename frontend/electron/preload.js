const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('directory:select'),
  getImages: (directoryPath) => ipcRenderer.invoke('directory:getImages', directoryPath),
  processDirectory: (directoryPath) => ipcRenderer.invoke('process:directory', directoryPath)
});
