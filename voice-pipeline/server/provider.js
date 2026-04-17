const { WebSocket } = require("ws");
const { createInhouseProvider } = require("./inhouse-handler");
const { createVoicemodProvider } = require("./voicemod-handler");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function createVoiceProvider(options) {
  const provider = (process.env.VOICE_PROVIDER || "inhouse").toLowerCase();

  if (provider === "inhouse") {
    return createInhouseProvider(options);
  }

  if (provider === "resemble") {
    return createResembleProvider(options);
  }

  if (provider === "voicemod") {
    return createVoicemodProvider(options);
  }

  throw new Error(`Unsupported VOICE_PROVIDER: ${provider}`);
}

function createResembleProvider({ connectionId, onAudio, onStatus }) {
  const apiKey = requireEnv("RESEMBLE_API_KEY");
  const voiceUuid = requireEnv("RESEMBLE_VOICE_UUID");
  const rawStreamUrl = process.env.RESEMBLE_STREAM_URL || "https://f.cluster.resemble.ai/stream";
  const streamUrl = toWebSocketUrl(rawStreamUrl);
  const ws = new WebSocket(streamUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  ws.on("open", () => {
    onStatus(`resemble connected for ${connectionId} (${streamUrl})`);
    ws.send(JSON.stringify({
      voice_uuid: voiceUuid,
      sample_rate: 16000,
      precision: "PCM_16"
    }));
  });

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      onAudio(Buffer.from(data));
      return;
    }

    onStatus(`resemble message: ${data.toString()}`);
  });

  ws.on("error", (error) => {
    onStatus(`resemble error: ${error.message}`);
  });

  ws.on("close", () => {
    onStatus("resemble closed");
  });

  return {
    send(chunk) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    },
    close() {
      ws.close();
    }
  };
}

function toWebSocketUrl(value) {
  if (!value) {
    throw new Error("RESEMBLE_STREAM_URL is empty");
  }

  if (value.startsWith("wss://") || value.startsWith("ws://")) {
    return value;
  }

  if (value.startsWith("https://")) {
    return `wss://${value.slice("https://".length)}`;
  }

  if (value.startsWith("http://")) {
    return `ws://${value.slice("http://".length)}`;
  }

  throw new Error("RESEMBLE_STREAM_URL must start with https://, http://, wss://, or ws://");
}

module.exports = { createVoiceProvider };
