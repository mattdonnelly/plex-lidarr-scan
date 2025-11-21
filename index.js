const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const axios = require("axios");

const configPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".config/plex-lidarr-scan/config.yml"
);
let config = {};

try {
  const file = fs.readFileSync(configPath, "utf8");
  config = yaml.load(file);
} catch (err) {
  console.error("Failed to load config file:", err);
  process.exit(1);
}

const { plex, port = 15033 } = config;
if (!plex || !plex.ip || !plex.sectionId || !plex.token) {
  console.error(
    "Invalid Plex config. Expected keys: plex.ip, plex.sectionId, plex.token"
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  try {
    if (!payload.trackFiles || payload.trackFiles.length === 0) {
      return res.status(200).send("No track files in payload");
    }

    const firstFile = payload.trackFiles[0];
    const folderPath = path.dirname(firstFile.path);

    const url = `http://${plex.ip}:32400/library/sections/${plex.sectionId}/refresh`;

    console.log(`Triggering Plex scan for folder: ${folderPath}`);

    const response = await axios.get(url, {
      params: {
        path: folderPath,
        "X-Plex-Token": plex.token,
      },
    });

    console.log("Plex scan triggered:", response.status);
    res.status(200).send("Plex scan triggered");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Error triggering Plex scan");
  }
});

app.listen(port, () => {
  console.log(`plex-lidarr-scan listening on port ${PORT}`);
});
