const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const { startVoiceServer } = require("../server/voice-handler");

let mainWindow;
let server;
let activePort = 8080;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    title: "In-House Voice Transformer",
    backgroundColor: "#111414",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "client", "index.html"), {
    query: { wsPort: String(port) }
  });
}

app.on("second-instance", () => {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
});

app.whenReady().then(() => {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  const port = Number(process.env.PORT || 8080);
  const started = startVoiceServerWithFallback(port);
  server = started.server;
  activePort = started.port;
  createWindow(activePort);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(activePort);
    }
  });
});

app.on("window-all-closed", () => {
  if (server && typeof server.close === "function") {
    server.close();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

function startVoiceServerWithFallback(preferredPort) {
  const maxAttempts = 10;
  let candidate = preferredPort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const startedServer = startVoiceServer({ port: candidate });
      if (attempt > 0) {
        console.warn(`Port ${preferredPort} busy, using ${candidate} instead`);
      }
      return { server: startedServer, port: candidate };
    } catch (error) {
      if (!isAddressInUse(error)) {
        throw error;
      }
      candidate += 1;
    }
  }

  throw new Error(`No free port found from ${preferredPort} to ${preferredPort + maxAttempts - 1}`);
}

function isAddressInUse(error) {
  if (!error) {
    return false;
  }
  return error.code === "EADDRINUSE" || String(error.message || "").includes("EADDRINUSE");
}
