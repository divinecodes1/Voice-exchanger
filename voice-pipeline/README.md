# In-House Voice Transformer

Desktop real-time voice transformation tool for a local, in-house AI model. The app captures microphone audio, sends 16 kHz mono Int16 PCM frames to a local Node.js WebSocket server, runs each 20 ms chunk through a local model adapter, and plays the transformed stream back through the desktop UI.

## Prerequisites

- Node.js 18+
- A local voice-conversion model exposed as a CommonJS module
- VB-Cable on Windows or BlackHole on macOS when another app needs the transformed voice as a virtual microphone
- Optional: Resemble AI credentials if you switch to the Resemble provider
- Optional: Voicemod desktop app and client key if you switch to the Voicemod provider

## Quick Start

```powershell
cd voice-pipeline
copy .env.example .env
npm install
npm start
```

By default the app uses the bundled example model, which passes audio through with optional gain. Replace it with your in-house model by setting `INHOUSE_MODEL_PATH`.

## Environment

```env
VOICE_PROVIDER=inhouse
PORT=8080
INHOUSE_MODEL_PATH=C:\absolute\path\to\your-model.js
INHOUSE_MODEL_GAIN=1.0
```

Your model module should export either `createModel()` or `process()`.

```js
function createModel() {
  return {
    async process(int16Frame, context) {
      return int16Frame;
    }
  };
}

module.exports = { createModel };
```

The `process()` function receives an `Int16Array` frame with 320 samples at 16 kHz mono and must return a `Buffer`, `ArrayBuffer`, or `Int16Array`.

## Provider Switching

Use the in-house model provider:

```env
VOICE_PROVIDER=inhouse
INHOUSE_MODEL_PATH=C:\models\voice-model.js
```

Use Resemble AI:

```env
VOICE_PROVIDER=resemble
RESEMBLE_API_KEY=your_key
RESEMBLE_VOICE_UUID=your_voice_uuid
RESEMBLE_API_BASE=https://app.resemble.ai/api/v2
RESEMBLE_CALLBACK_URI=https://your-domain.com/resemble-webhook
RESEMBLE_STREAM_URL=https://f.cluster.resemble.ai/stream
RESEMBLE_SYNTHESIS_URL=https://f.cluster.resemble.ai/synthesize
```

## Resemble Method 2 (Create, Upload, Build)

Create an empty voice:

```powershell
python .\scripts\resemble_create_voice.py --name "Alex" --voice-type rapid --callback-uri "https://your-domain.com/resemble-webhook"
```

Upload recordings one-by-one:

```powershell
python .\scripts\resemble_upload_recording.py --file ".\sample_01.wav" --name "sample_01" --text "Transcript of the audio"
```

Start training/build:

```powershell
python .\scripts\resemble_build_voice.py
```

Wait until training finishes:

```powershell
python .\scripts\resemble_build_voice.py --wait --poll-interval 10 --timeout 1800
```

Optional fill mode:

```powershell
python .\scripts\resemble_build_voice.py --fill
```

List voices and recordings:

```powershell
python .\scripts\resemble_list_voices.py
python .\scripts\resemble_list_recordings.py --voice-uuid "YOUR_VOICE_UUID"
```

Recommended data volume:
- Rapid: at least 3 active recordings (about 10+ seconds total)
- Professional: at least 20 active recordings (about 10+ minutes total)

Use Voicemod:

```env
VOICE_PROVIDER=voicemod
VOICEMOD_CLIENT_KEY=your_client_key
VOICEMOD_VOICE_ID=your_voice_id
```

Voicemod transforms OS audio directly, so browser PCM frames are ignored by that provider.

## Latency Budget

| Stage | Target |
| --- | ---: |
| Microphone capture frame | 20 ms |
| Worklet to renderer transfer | 1-3 ms |
| Renderer to local WebSocket | 1-5 ms |
| In-house model inference | 20-90 ms |
| Return WebSocket frame | 1-5 ms |
| Jitter buffer scheduling | 60 ms |
| Total target | under 200 ms |

The real limit is your model inference time. For live voice, keep each 320-sample frame under about 40 ms when possible.

## Troubleshooting

- If the app cannot hear the mic, check OS microphone permissions for Electron.
- If playback is delayed, reduce model inference time before shrinking the jitter buffer.
- If another app cannot use the transformed voice, route system audio through VB-Cable or BlackHole.
- If `INHOUSE_MODEL_PATH` fails, use an absolute path and make sure the module exports `createModel()` or `process()`.
- If port 8080 is busy, change `PORT` in `.env`.
- If Resemble fails, confirm `RESEMBLE_API_KEY` and `RESEMBLE_VOICE_UUID`.
- If Voicemod fails, confirm the Voicemod app is running and listening on `ws://localhost:39272`.
