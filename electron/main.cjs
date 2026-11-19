const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = 5001;

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(startPort + 1));
  });
}

function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            retry();
          }
        })
        .on('error', retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Server failed to respond at ${url} within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

async function startBackendServer() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const targetDb = path.join(dbDir, 'rephonix.db');

  // Copy initial template DB if user DB does not exist yet
  const candidateTemplates = [
    path.join(__dirname, '../prisma/dev.db'),
    path.join(process.resourcesPath || '', 'prisma/dev.db'),
    path.join(__dirname, 'dev.db'),
  ];

  if (!fs.existsSync(targetDb)) {
    for (const tmpl of candidateTemplates) {
      if (fs.existsSync(tmpl)) {
        try {
          fs.copyFileSync(tmpl, targetDb);
          console.log(`Copied initial template database from ${tmpl} to ${targetDb}`);
          break;
        } catch (e) {
          console.error('Failed to copy template db:', e);
        }
      }
    }
  }

  process.env.DATABASE_URL = `file:${targetDb.replace(/\\/g, '/')}`;
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'production';

  // Import and launch the bundled server
  const serverEntry = path.join(__dirname, '../dist-server/index.mjs');
  console.log(`Starting background server from: ${serverEntry}`);

  try {
    const { pathToFileURL } = require('url');
    await import(pathToFileURL(serverEntry).href);
    console.log(`Server imported successfully, waiting for http://127.0.0.1:${PORT}/api/health`);
    await waitForServer(`http://127.0.0.1:${PORT}/api/health`, 15000);
    console.log('Backend server is healthy and responding!');
  } catch (err) {
    console.error('Error starting backend server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Rephonix',
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
