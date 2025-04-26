const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onHostIP: (callback) => ipcRenderer.on('host-ip', (_, ip) => callback(ip)),
  onRole: (callback) => ipcRenderer.on('role', (_, role) => callback(role)),
});
