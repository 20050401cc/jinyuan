// 烬渊 桌面版（Electron 主进程）
'use strict';
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 存档和设置固定放在 %APPDATA%/Jinyuan，便于配置 Steam 云存档
// 自检模式使用独立的数据目录，不碰玩家存档
app.setPath('userData', path.join(app.getPath('appData'), process.env.JY_SMOKE ? 'Jinyuan-smoke' : 'Jinyuan'));

// ---------- Steamworks（可选） ----------
// 拿到 Steam App ID 后：在本目录 `npm i steamworks.js`，并在 steam_appid.txt 里写入 App ID。
// 没装或 Steam 客户端没运行时，游戏照常运行，只是不会同步 Steam 成就。
let steam = null;
function initSteam() {
  try {
    const idFile = path.join(path.dirname(process.execPath), 'steam_appid.txt');
    const alt = path.join(__dirname, 'steam_appid.txt');
    const file = fs.existsSync(idFile) ? idFile : alt;
    if (!fs.existsSync(file)) return;
    const appId = parseInt(fs.readFileSync(file, 'utf8').trim(), 10);
    if (!appId) return;
    const sw = require('steamworks.js');
    steam = sw.init(appId);
    sw.electronEnableSteamOverlay();
  } catch (e) {
    steam = null;
  }
}

// ---------- 窗口状态（全屏 / 窗口大小）持久化 ----------
const cfgPath = () => path.join(app.getPath('userData'), 'window.json');
function readCfg() {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch (e) { return { fullscreen: true, width: 1280, height: 800 }; }
}
function writeCfg(c) { try { fs.writeFileSync(cfgPath(), JSON.stringify(c)); } catch (e) { /* 忽略 */ } }

// 自检模式：设置环境变量 JY_SMOKE=<输出路径前缀> 时，后台启动、试跑、截图并退出（发布流程里用来验证打包结果）
const SMOKE = process.env.JY_SMOKE || '';

let win = null;
function create() {
  const cfg = readCfg();
  if (SMOKE) cfg.fullscreen = false;
  win = new BrowserWindow({
    width: cfg.width || 1280, height: cfg.height || 800, minWidth: 800, minHeight: 500,
    fullscreen: cfg.fullscreen !== false,
    backgroundColor: '#060506', title: '烬渊', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, devTools: !app.isPackaged
    }
  });
  win.once('ready-to-show', () => { if (!SMOKE) win.show(); });
  if (SMOKE) smoke();
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  // 游戏内不允许打开新窗口或跳转外部页面
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  const save = () => {
    if (!win || win.isDestroyed()) return;
    const c = readCfg();
    c.fullscreen = win.isFullScreen();
    if (!c.fullscreen && !win.isMaximized()) { const b = win.getBounds(); c.width = b.width; c.height = b.height; }
    writeCfg(c);
  };
  win.on('enter-full-screen', save);
  win.on('leave-full-screen', save);
  win.on('resized', save);
  win.on('closed', () => { win = null; });
}

function smoke() {
  const logs = [];
  win.webContents.on('console-message', (e, level, message) => { if (level >= 2) logs.push(message); });
  win.webContents.once('did-finish-load', async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const run = js => win.webContents.executeJavaScript(js);
    try {
      await wait(1500);
      const r = await run(`(() => ({ hasGame: typeof G === 'object', desktop: !!G.desktop, W: G.W, pxk: G.pxk, version: G.VERSION, menuFps: Math.round(G.fps),
        sans: document.fonts.check('16px "JY Sans"'), brush: document.fonts.check('16px "JY Brush"'), state: G.game.state }))()`);
      await run('G.newRun(); G.debug.god = true; true');
      await wait(2500);
      r.afterStart = await run('({ state: G.game.state, floor: G.game.floor, fps: Math.round(G.fps), lang: G.lang })');
      await run('G.setLang("en"); true');
      await wait(3000);
      r.storyEn = await run('({ state: G.game.state, fps: Math.round(G.fps), title: G.tr(G.STORY.prologue.title) })');
      await run('G.ach.unlock("first_blood"); G.setFullscreen(true); true');
      await wait(800);
      r.fullscreenOn = win.isFullScreen();
      await run('G.setFullscreen(false); true');
      await wait(800);
      r.fullscreenOff = !win.isFullScreen();
      const img = await win.webContents.capturePage();
      fs.writeFileSync(SMOKE + '.png', img.toPNG());
      r.errors = logs;
      fs.writeFileSync(SMOKE + '.json', JSON.stringify(r, null, 1));
    } catch (err) {
      fs.writeFileSync(SMOKE + '.json', JSON.stringify({ fail: String(err), errors: logs }));
    }
    app.quit();
  });
}

ipcMain.on('jy:fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('jy:isFullscreen', e => { e.returnValue = win ? win.isFullScreen() : readCfg().fullscreen !== false; });
ipcMain.on('jy:quit', () => app.quit());
ipcMain.on('jy:achieve', (e, api) => {
  try { if (steam && typeof api === 'string') steam.achievement.activate(api); } catch (err) { /* Steam 不可用 */ }
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  Menu.setApplicationMenu(null);
  app.whenReady().then(() => { initSteam(); create(); });
  app.on('window-all-closed', () => app.quit());
}
