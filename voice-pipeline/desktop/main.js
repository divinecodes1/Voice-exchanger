const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const { startVoiceServer } = require("../server/voice-handler");

let mainWindow;
let server;

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, "..", "client", "index.html"));
}

app.whenReady().then(() => {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  const port = Number(process.env.PORT || 8080);
  server = startVoiceServer({ port });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
