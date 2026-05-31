const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Wait a bit for the server to start, then load the local URL
  // The Express server is hardcoded to use process.env.PORT || 5000 in your code
  const port = 5000;
  
  // We can load a loading screen, but for simplicity we'll just poll the server
  const checkServer = setInterval(() => {
    fetch(`http://localhost:${port}/health`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          clearInterval(checkServer);
          mainWindow.loadURL(`http://localhost:${port}`);
        }
      })
      .catch(() => {
        // Still waiting for server...
      });
  }, 500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start the backend Express server
  const serverPath = path.join(__dirname, 'backend', 'src', 'index.js');
  
  serverProcess = fork(serverPath, [], {
    cwd: path.join(__dirname, 'backend'),
    env: {
      ...process.env,
      PORT: 5000,
      NODE_ENV: 'production'
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server process.', err);
  });

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

app.on('before-quit', () => {
  // Clean up the server process when the app closes
  if (serverProcess) {
    serverProcess.kill();
  }
});
