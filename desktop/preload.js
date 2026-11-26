// 只向网页暴露游戏需要的几个桌面功能
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jinyuanDesktop', {
  setFullscreen: on => ipcRenderer.send('jy:fullscreen', !!on),
  isFullscreen: () => ipcRenderer.sendSync('jy:isFullscreen'),
  quit: () => ipcRenderer.send('jy:quit'),
  achieve: api => ipcRenderer.send('jy:achieve', String(api))
});
