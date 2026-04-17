const { spawn } = require("child_process");
const path = require("path");

const electronBin = require("electron");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, ["."], {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code == null ? 1 : code);
});

child.on("error", (error) => {
  console.error("Failed to launch Electron:", error.message);
  process.exit(1);
});
