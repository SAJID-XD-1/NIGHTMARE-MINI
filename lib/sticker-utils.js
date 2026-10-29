// ffmpeg sirf tab load hota hai jab sticker banana ho (taake dependency na ho to bot na ruke)
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const crypto = require('crypto');

const fetchGif = async (url) => (await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })).data;

async function gifToSticker(gifBuffer) {
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

  const id = crypto.randomBytes(6).toString('hex');
  const input = path.join(tmpdir(), `${id}.gif`);
  const output = path.join(tmpdir(), `${id}.webp`);
  fs.writeFileSync(input, gifBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(input)
        .on('error', reject)
        .on('end', resolve)
        .addOutputOptions([
          '-vcodec', 'libwebp',
          '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
          '-loop', '0', '-preset', 'default', '-an', '-vsync', '0'
        ])
        .toFormat('webp')
        .save(output);
    });
    return fs.readFileSync(output);
  } finally {
    for (const f of [input, output]) try { fs.unlinkSync(f); } catch {}
  }
}

module.exports = { fetchGif, gifToSticker };
