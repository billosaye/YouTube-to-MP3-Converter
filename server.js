const express = require('express');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/convert', async (req, res) => {
    const url = req.body.url;

    if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const outputDir = path.join(__dirname, 'output');
        const outputFile = path.join(outputDir, `${videoTitle}.mp3`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        ffmpeg(ytdl(url, { quality: 'highestaudio' }))
            .audioBitrate(128)
            .save(outputFile)
            .on('end', () => {
                res.json({ downloadUrl: `/download/${videoTitle}.mp3` });
            })
            .on('error', (err) => {
                res.status(500).json({ error: 'Error during conversion' });
            });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching video information' });
    }
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'output', filename);

    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});