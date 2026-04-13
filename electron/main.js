'use strict';

const { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// ─── Environment ──────────────────────────────────────────────────
const isDev = !app.isPackaged;
const PORT   = 5000;
const DEV_CLIENT_URL = `http://localhost:5173`;
const PROD_URL       = `http://localhost:${PORT}`;

let mainWindow   = null;
let splashWindow = null;
let serverProcess = null;
let tray = null;

// ─── Wait for HTTP server ─────────────────────────────────────────
function waitForServer(url, maxAttempts = 45) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) { resolve(); }
        else retry();
      });
      req.on('error', retry);
      req.setTimeout(1500, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (attempts < maxAttempts) setTimeout(check, 1000);
      else reject(new Error(`Server at ${url} did not respond after ${maxAttempts}s`));
    };
    check();
  });
}

// ─── Launch Express backend (production only) ─────────────────────
function startBackend() {
  if (isDev) {
    // Dev: backend already running via `npm run dev` in /server
    return waitForServer(`http://localhost:${PORT}/api/health`);
  }

  const serverEntry = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      // Database URL and secrets are read from environment / .env in resources
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  serverProcess.on('exit', (code) => {
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.send('server-error', `Backend exited with code ${code}`);
    }
  });

  return waitForServer(`http://localhost:${PORT}/api/health`);
}

// ─── Splash Screen ────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

// ─── Main Window ──────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Smart Campus — BBDU',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#0a0f1a',
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Custom menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'Smart Campus',
      submenu: [
        { label: 'About Smart Campus', role: 'about' },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() },
        { label: 'Toggle DevTools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Quit Smart Campus', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In',  accelerator: 'CmdOrCtrl+=', role: 'zoomIn'  },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  const url = isDev ? DEV_CLIENT_URL : PROD_URL;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.fadeOut && splashWindow.fadeOut();
      setTimeout(() => {
        splashWindow?.close();
        splashWindow = null;
      }, 300);
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── System Tray ──────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('Smart Campus — BBDU');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Smart Campus', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── App Lifecycle ────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();

  try {
    if (!isDev) await startBackend();
    createWindow();
    createTray();
  } catch (err) {
    console.error('Startup error:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On Windows/Linux, keep running in tray (don't quit)
  if (process.platform === 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  tray?.destroy();
});

// ─── IPC Handlers ─────────────────────────────────────────────────
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('app-platform', () => process.platform);
