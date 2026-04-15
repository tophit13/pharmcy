const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false, // Hide the default Windows toolbar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    title: "صيدليتي - Pharmacy Manager"
  });

  win.setMenuBarVisibility(false);
  win.loadURL('http://localhost:3000');

  // Handle custom title bar actions
  ipcMain.on('window-minimize', () => {
    win.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    win.close();
  });
}

// Auto-Start IPC Handlers
ipcMain.handle('toggle-auto-start', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  });
  return enable;
});

ipcMain.handle('get-auto-start-status', () => {
  return app.getLoginItemSettings().openAtLogin;
});

app.whenReady().then(() => {
  if (app.isPackaged) {
    // In production, run the compiled server
    const serverPath = path.join(process.resourcesPath, 'server.cjs');
    serverProcess = spawn('node', [serverPath], { 
      cwd: process.resourcesPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        USER_DATA_PATH: app.getPath('userData'),
        APP_PATH: app.getAppPath()
      }
    });
    
    serverProcess.stdout.on('data', (data) => console.log(`Server: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`Server Error: ${data}`));
  }
  
  // Wait a moment for the Express server to start
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
});
