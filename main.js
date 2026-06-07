const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

function updateStatus(msg) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`document.getElementById('status').innerText = ${JSON.stringify(msg)};`).catch(() => { });
  }
}

function appendLog(msg, isError = false) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      var logs = document.getElementById('logs');
      if (logs) {
        var l = document.createElement('div');
        l.innerText = ${JSON.stringify(msg)};
        if (${isError}) {
          l.style.color = '#ef4444';
          document.getElementById('spinner').style.borderTopColor = '#ef4444';
          document.getElementById('status').innerText = "An error occurred during startup.";
        }
        logs.appendChild(l);
        logs.scrollTop = logs.scrollHeight;
      }
    `).catch(() => { });
  }
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  const checkServer = setInterval(() => {
    fetch(`http://localhost:${port}/health`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          clearInterval(checkServer);
          updateStatus("Server ready. Loading application...");
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
  const port = 58302;
  createWindow(port);

  setTimeout(() => {
    try {
      updateStatus("Initializing database...");
      const userDataPath = app.getPath('userData');
      const dbDestPath = path.join(userDataPath, 'dev.db');

      const backendDir = app.isPackaged
        ? path.join(process.resourcesPath, 'backend')
        : path.join(__dirname, 'backend');

      if (!fs.existsSync(dbDestPath)) {
        updateStatus("Copying fresh database to AppData...");
        const dbSrcPath = path.join(backendDir, 'prisma', 'dev.db');

        if (fs.existsSync(dbSrcPath)) {
          fs.copyFileSync(dbSrcPath, dbDestPath);
          appendLog("Database copied successfully to: " + dbDestPath);
        } else {
          appendLog("Warning: Source database not found at " + dbSrcPath, true);
        }
      } else {
        appendLog("Using existing database at: " + dbDestPath);
      }

      updateStatus("Starting backend server...");
      const serverPath = path.join(backendDir, 'src', 'index.js');
      appendLog("Backend Path: " + serverPath);

      serverProcess = fork(serverPath, [], {
        cwd: backendDir,
        silent: true, // Capture stdout and stderr
        env: {
          ...process.env,
          PORT: port,
          NODE_ENV: 'production',
          DATABASE_URL: `file:${dbDestPath}`
        }
      });

      serverProcess.stdout.on('data', (data) => {
        appendLog(data.toString());
      });

      serverProcess.stderr.on('data', (data) => {
        appendLog(data.toString(), true);
      });

      serverProcess.on('error', (err) => {
        appendLog('Failed to start server process: ' + err.message, true);
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          appendLog('Backend server exited unexpectedly with code ' + code, true);
        }
      });

    } catch (e) {
      appendLog("Startup exception: " + e.message, true);
    }
  }, 1000); // Wait 1s so the loading screen renders first

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
