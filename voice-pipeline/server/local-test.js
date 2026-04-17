require("dotenv").config();

const { startVoiceServer } = require("./voice-handler");

const port = Number(process.env.PORT || 8080);
startVoiceServer({ port });
