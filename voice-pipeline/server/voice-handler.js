const { WebSocket, WebSocketServer } = require("ws");
const { createVoiceProvider } = require("./provider");

let nextConnectionId = 1;

function startVoiceServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 8080);
  const sessions = new Map();
  const wss = new WebSocketServer({ port });

  wss.on("connection", async (browserSocket) => {
    const connectionId = String(nextConnectionId);
    nextConnectionId += 1;

    let provider;

    try {
      provider = await createVoiceProvider({
        connectionId,
        onAudio: (chunk) => {
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(chunk);
          }
        },
        onStatus: (message) => {
          console.log(`[${connectionId}] ${message}`);
        }
      });

      sessions.set(connectionId, provider);
      console.log(`[${connectionId}] browser connected`);
    } catch (error) {
      console.error(`[${connectionId}] provider failed:`, error.message);
      browserSocket.close(1011, error.message);
      return;
    }

    browserSocket.on("message", (data, isBinary) => {
      if (!isBinary) {
        return;
      }

      const session = sessions.get(connectionId);
      if (session) {
        session.send(Buffer.from(data));
      }
    });

    browserSocket.on("close", () => {
      const session = sessions.get(connectionId);
      if (session && typeof session.close === "function") {
        session.close();
      }
      sessions.delete(connectionId);
      console.log(`[${connectionId}] browser disconnected`);
    });

    browserSocket.on("error", (error) => {
      console.error(`[${connectionId}] browser error:`, error.message);
    });
  });

  wss.on("listening", () => {
    console.log(`Voice server listening on ws://localhost:${port}`);
  });

  wss.sessions = sessions;
  return wss;
}

module.exports = { startVoiceServer };
