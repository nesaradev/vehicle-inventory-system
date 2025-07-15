const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    query: (type, query, params) => ipcRenderer.invoke('db-query', { type, query, params })
  },
  notification: {
    show: (title, body) => ipcRenderer.invoke('show-notification', { title, body })
  },
  onNavigateToLowStock: (callback) => {
    ipcRenderer.on('navigate-to-low-stock', callback);
  },
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_, path) => callback(path));
  },
  sync: {
    getStatus: () => ipcRenderer.invoke('sync-status'),
    triggerSync: () => ipcRenderer.invoke('trigger-sync')
  },
  saveJobCardImage: (imageData, jobNo) => {
    console.log('Calling save-job-card-image IPC', { jobNo });
    return ipcRenderer.invoke('save-job-card-image', { imageData, jobNo });
  },
  debug: {
    getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
    openLogLocation: () => ipcRenderer.invoke('open-log-location'),
    getDebugInfo: () => ipcRenderer.invoke('get-debug-info')
  }
});

console.log('ElectronAPI exposed to renderer');