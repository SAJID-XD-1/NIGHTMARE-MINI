// ffmpeg helpers (ffprobe ki zaroorat nahi: info ffmpeg -i se parse hoti hai)
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
}

const tmp = (ext = 'bin') => path.join(os.tmpdir(), `nm_${crypto.randomBytes(6).toString('hex')}.${ext}`);
const rm = (...files) => files.forEach((f) => { try { fs.unlinkSync(f); } catch {} });

function run(args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), ['-y', '-hide_banner', ...(capture ? [] : ['-loglevel', 'error']), ...args]);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 || capture ? resolve(err) : reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`))));
  });
}

// ffmpeg -i file se duration / audio / video size nikalo
async function probe(file) {
  const out = await run(['-i', file], { capture: true });
  const dur = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  const size = out.match(/Video:.*?,\s*(\d{2,5})x(\d{2,5})/);
  return {
    duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0,
    hasAudio: /Audio:/.test(out),
    hasVideo: /Video:/.test(out),
    width: size ? Number(size[1]) : 0,
    height: size ? Number(size[2]) : 0
  };
}

/**
 * buffer ko temp file banao, build(inputPath, outputPath) se ffmpeg args lo, output buffer wapas do.
 */
async function transform(buffer, outExt, build) {
  const input = tmp('bin');
  const output = tmp(outExt);
  fs.writeFileSync(input, buffer);
  try {
    await run(build(input, output));
    return fs.readFileSync(output);
  } finally { rm(input, output); }
}

module.exports = { ffmpegPath, run, probe, transform, tmp, rm };
