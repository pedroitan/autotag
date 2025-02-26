const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getImages: async (directoryPath) => {
    try {
      console.log('[DEBUG] Preload: Calling getImages with path:', directoryPath);
      const result = await ipcRenderer.invoke('directory:getImages', directoryPath);
      console.log('[DEBUG] Preload: Got result:', result);
      return result;
    } catch (error) {
      console.error('[DEBUG] Preload: Error in getImages:', error);
      throw error;
    }
  },
  selectDirectory: async () => {
    try {
      return await ipcRenderer.invoke('dialog:openDirectory');
    } catch (error) {
      console.error('[DEBUG] Error in selectDirectory:', error);
      throw error;
    }
  },
  processDirectory: async (directoryPath) => {
    try {
      console.log('[DEBUG] Preload: Processing directory:', directoryPath);
      const result = await ipcRenderer.invoke('process:directory', directoryPath);
      console.log('[DEBUG] Preload: Process result:', result);
      return result;
    } catch (error) {
      console.error('[DEBUG] Error in processDirectory:', error);
      throw error;
    }
  }
});
