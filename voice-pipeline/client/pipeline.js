(function () {
  const SAMPLE_RATE = 16000;
  const FRAME_SIZE = 320;
  const DEFAULT_WS_URL = "ws://localhost:8080";

  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const statusEl = document.getElementById("status");
  const latencyEl = document.getElementById("latency");
  const chunksEl = document.getElementById("chunks");
  const streamStateEl = document.getElementById("streamState");

  let audioContext;
  let micStream;
  let source;
  let worklet;
  let silenceGain;
  let socket;
  let jitterBuffer;
  let outputDestination;
  let startedAt = 0;
  let chunkCount = 0;

  class JitterBuffer {
    constructor(context, destination, scheduleAheadSeconds) {
      this.context = context;
      this.destination = destination;
      this.scheduleAheadSeconds = scheduleAheadSeconds;
      this.nextTime = context.currentTime + scheduleAheadSeconds;
    }

    push(int16Pcm) {
      const audioBuffer = this.context.createBuffer(1, int16Pcm.length, SAMPLE_RATE);
      const channel = audioBuffer.getChannelData(0);

      for (let i = 0; i < int16Pcm.length; i += 1) {
        channel[i] = Math.max(-1, Math.min(1, int16Pcm[i] / 32768));
      }

      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.context.destination);
      sourceNode.connect(this.destination);

      const now = this.context.currentTime;
      if (this.nextTime < now + this.scheduleAheadSeconds * 0.5) {
        this.nextTime = now + this.scheduleAheadSeconds;
      }

      sourceNode.start(this.nextTime);
      this.nextTime += audioBuffer.duration;
      return Math.max(0, Math.round((this.nextTime - now) * 1000));
    }
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function floatToInt16Buffer(floatBuffer) {
    const floats = new Float32Array(floatBuffer);
    const int16 = new Int16Array(floats.length);

    for (let i = 0; i < floats.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, floats[i]));
      int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }

    return int16.buffer;
  }

  function stop() {
    if (worklet) {
      worklet.port.onmessage = null;
      worklet.disconnect();
      worklet = null;
    }

    if (source) {
      source.disconnect();
      source = null;
    }

    if (silenceGain) {
      silenceGain.disconnect();
      silenceGain = null;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, "client stopped");
    }
    socket = null;

    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }

    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
    }
    audioContext = null;
    outputDestination = null;
    jitterBuffer = null;

    startButton.disabled = false;
    stopButton.disabled = true;
    setStatus("Idle");
  }

  async function start() {
    startButton.disabled = true;
    stopButton.disabled = false;
    chunkCount = 0;
    chunksEl.textContent = "0";
    latencyEl.textContent = "0";
    startedAt = performance.now();

    try {
      setStatus("Opening microphone");
      audioContext = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: "interactive" });
      outputDestination = audioContext.createMediaStreamDestination();
      window._voiceOutputStream = outputDestination.stream;
      streamStateEl.textContent = "Ready";

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      setStatus("Loading processor");
      await audioContext.audioWorklet.addModule("./pcm-processor.js");

      setStatus("Connecting server");
      socket = new WebSocket(DEFAULT_WS_URL);
      socket.binaryType = "arraybuffer";

      await new Promise((resolve, reject) => {
        socket.onopen = resolve;
        socket.onerror = () => reject(new Error("Could not connect to local voice server"));
      });

      jitterBuffer = new JitterBuffer(audioContext, outputDestination, 0.06);

      socket.onmessage = (event) => {
        const pcm = new Int16Array(event.data);
        const latencyMs = jitterBuffer.push(pcm);
        latencyEl.textContent = String(latencyMs);
      };

      socket.onclose = () => {
        if (stopButton.disabled === false) {
          setStatus("Server disconnected");
        }
      };

      source = audioContext.createMediaStreamSource(micStream);
      worklet = new AudioWorkletNode(audioContext, "pcm-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      silenceGain = audioContext.createGain();
      silenceGain.gain.value = 0;

      worklet.port.onmessage = (event) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        const pcmBuffer = floatToInt16Buffer(event.data);
        socket.send(pcmBuffer);
        chunkCount += 1;
        chunksEl.textContent = String(chunkCount);
        latencyEl.textContent = String(Math.round(performance.now() - startedAt));
      };

      source.connect(worklet);
      worklet.connect(silenceGain);
      silenceGain.connect(audioContext.destination);

      setStatus(`Live (${FRAME_SIZE} samples/frame)`);
    } catch (error) {
      console.error(error);
      setStatus(error.message);
      stop();
    }
  }

  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", stop);
})();
