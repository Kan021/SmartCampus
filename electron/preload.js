'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronBridge', {
  getVersion:  () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('app-platform'),
  onServerError: (cb) => ipcRenderer.on('server-error', (_e, msg) => cb(msg)),
});
