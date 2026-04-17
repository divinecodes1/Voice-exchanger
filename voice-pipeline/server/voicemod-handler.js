const { WebSocket } = require("ws");

function createVoicemodProvider({ onStatus }) {
  const clientKey = process.env.VOICEMOD_CLIENT_KEY;
  const voiceId = process.env.VOICEMOD_VOICE_ID;
  const ws = new WebSocket("ws://localhost:39272");

  ws.on("open", () => {
    onStatus("voicemod connected");

    if (clientKey) {
      sendPayload(ws, "registerClient", { clientKey });
    }

    if (voiceId) {
      sendPayload(ws, "selectVoice", { voiceId });
      sendPayload(ws, "setVoiceEnabled", { enabled: true });
    }
  });

  ws.on("message", (data) => {
    onStatus(`voicemod message: ${data.toString()}`);
  });

  ws.on("error", (error) => {
    onStatus(`voicemod error: ${error.message}`);
  });

  return {
    send() {
      // Voicemod transforms OS audio itself; browser PCM is intentionally ignored.
    },
    selectVoice(nextVoiceId) {
      sendPayload(ws, "selectVoice", { voiceId: nextVoiceId });
    },
    setVoiceEnabled(enabled) {
      sendPayload(ws, "setVoiceEnabled", { enabled });
    },
    close() {
      ws.close();
    }
  };
}

function sendPayload(ws, action, payload) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    action,
    payload
  }));
}

module.exports = { createVoicemodProvider };
