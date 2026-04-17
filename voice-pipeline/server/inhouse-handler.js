const path = require("path");

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 320;

async function createInhouseProvider({ connectionId, onAudio, onStatus }) {
  const model = await loadModel();
  onStatus(`inhouse provider ready for ${connectionId}`);

  return {
    async send(chunk) {
      try {
        const input = new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / 2));
        const output = await model.process(input, {
          sampleRate: SAMPLE_RATE,
          frameSize: FRAME_SIZE,
          connectionId
        });

        onAudio(toBuffer(output));
      } catch (error) {
        onStatus(`inhouse model error: ${error.message}`);
      }
    },
    close() {
      if (typeof model.close === "function") {
        model.close();
      }
    }
  };
}

async function loadModel() {
  const configuredPath = process.env.INHOUSE_MODEL_PATH;
  const modelPath = configuredPath
    ? path.resolve(configuredPath)
    : path.join(__dirname, "..", "models", "example-model.js");

  const moduleExports = require(modelPath);

  if (typeof moduleExports.createModel === "function") {
    return moduleExports.createModel({
      sampleRate: SAMPLE_RATE,
      frameSize: FRAME_SIZE,
      gain: Number(process.env.INHOUSE_MODEL_GAIN || 1)
    });
  }

  if (typeof moduleExports.process === "function") {
    return moduleExports;
  }

  throw new Error("In-house model must export createModel() or process()");
}

function toBuffer(output) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (output instanceof Int16Array) {
    return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  }

  if (ArrayBuffer.isView(output)) {
    return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  }

  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }

  throw new Error("In-house model must return Buffer, ArrayBuffer, or Int16Array");
}

module.exports = { createInhouseProvider };
