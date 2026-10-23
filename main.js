const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let serverProcess = null;
const port = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Fastbill — AN General Trading',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Poll local server until ready, then load URL
  const pollServer = setInterval(() => {
    http.get(`http://localhost:${port}`, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404) {
        clearInterval(pollServer);
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    }).on('error', () => {
      // Server not ready yet, continue polling
    });
  }, 200);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Ensure the SQLite database exists in userData.
 * On first launch, runs `prisma db push` to create tables.
 */
function ensureDatabase(dbPath, databaseUrl) {
  const dbExists = fs.existsSync(dbPath);

  if (!dbExists) {
    console.log('[Fastbill] First launch — creating database at:', dbPath);

    // Determine where the prisma schema lives
    const schemaInResources = app.isPackaged
      ? path.join(process.resourcesPath, 'prisma', 'schema.prisma')
      : path.join(__dirname, 'prisma', 'schema.prisma');

    try {
      // Run prisma db push to create the database and tables
      execSync(
        `npx prisma db push --schema="${schemaInResources}" --skip-generate`,
        {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          cwd: __dirname,
          stdio: 'pipe',
        }
      );
      console.log('[Fastbill] Database created successfully.');
    } catch (err) {
      console.error('[Fastbill] Failed to create database:', err.message);
      // Create an empty file as fallback so the app doesn't crash on next attempt
      fs.writeFileSync(dbPath, '');
    }
  }
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'fastbill.db').replace(/\\/g, '/');
  const databaseUrl = `file:${dbPath}`;

  // Ensure the database exists before starting the server
  ensureDatabase(dbPath, databaseUrl);

  const isPackaged = app.isPackaged;

  // Standalone server location
  const serverPath = isPackaged
    ? path.join(process.resourcesPath, 'standalone', 'server.js')
    : path.join(__dirname, '.next', 'standalone', 'server.js');

  if (!fs.existsSync(serverPath)) {
    console.error('[Fastbill] Server not found at:', serverPath);
    console.error('[Fastbill] Run "npm run build" first to generate the standalone server.');
    app.quit();
    return;
  }

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      DATABASE_URL: databaseUrl,
    },
    silent: false,
  });

  serverProcess.on('error', (err) => {
    console.error('[Fastbill] Server process error:', err);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
