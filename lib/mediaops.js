// Audio / video operations (ffmpeg). Har op: (buffer, arg) -> { buffer, kind: 'video'|'audio'|'image'|'voice', mimetype }
const fs = require('fs');
const { transform, run, probe, tmp, rm } = require('./ffmpeg');

const V264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];
const A_AAC = ['-c:a', 'aac', '-b:a', '128k'];
const mp4 = (buffer, build) => transform(buffer, 'mp4', build).then((b) => ({ buffer: b, kind: 'video', mimetype: 'video/mp4' }));
const mp3 = (buffer, build) => transform(buffer, 'mp3', build).then((b) => ({ buffer: b, kind: 'audio', mimetype: 'audio/mpeg' }));

const ops = {
  rotate: (buf, mode) => {
    const vf = { right: 'transpose=1', left: 'transpose=2', flip: 'hflip' }[mode];
    if (!vf) throw new Error('right | left | flip likhein');
    return mp4(buf, (i, o) => ['-i', i, '-vf', vf, ...V264, '-c:a', 'copy', o]);
  },
  toVoice: (buf) => transform(buf, 'ogg', (i, o) => ['-i', i, '-vn', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', o]).then((b) => ({ buffer: b, kind: 'voice', mimetype: 'audio/ogg; codecs=opus' })),
  toMp3: (buf) => mp3(buf, (i, o) => ['-i', i, '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', o]),
  photo: (buf) => transform(buf, 'png', (i, o) => ['-i', i, '-frames:v', '1', o]).then((b) => ({ buffer: b, kind: 'image', mimetype: 'image/png' })),
  reverseVideo: (buf) => mp4(buf, (i, o) => ['-i', i, '-vf', 'reverse', '-af', 'areverse', ...V264, ...A_AAC, o]),
  reverseAudio: (buf) => mp3(buf, (i, o) => ['-i', i, '-vn', '-af', 'areverse', o]),
  cutAudio: (buf, start, dur) => mp3(buf, (i, o) => ['-ss', String(start), '-t', String(dur), '-i', i, '-vn', '-c:a', 'libmp3lame', o]),
  trimVideo: (buf, start, dur) => mp4(buf, (i, o) => ['-ss', String(start), '-t', String(dur), '-i', i, ...V264, ...A_AAC, o]),
  compress: (buf) => mp4(buf, (i, o) => ['-i', i, '-vf', 'scale=-2:480', ...V264, '-crf', '32', '-c:a', 'aac', '-b:a', '64k', o]),
  bass: (buf, g = 10) => mp3(buf, (i, o) => ['-i', i, '-vn', '-af', `bass=g=${Math.min(Math.max(+g || 10, 1), 30)}`, o]),
  treble: (buf, g = 10) => mp3(buf, (i, o) => ['-i', i, '-vn', '-af', `treble=g=${Math.min(Math.max(+g || 10, 1), 30)}`, o]),
  slow: (buf) => mp3(buf, (i, o) => ['-i', i, '-vn', '-af', 'asetrate=44100*0.8,aresample=44100', o]),
  pitch: (buf) => mp3(buf, (i, o) => ['-i', i, '-vn', '-af', 'asetrate=44100*1.25,aresample=44100', o]),
  histo: (buf) => mp4(buf, (i, o) => ['-i', i, '-filter_complex', '[0:a]showfreqs=mode=bar:s=720x480:fscale=log[v]', '-map', '[v]', '-map', '0:a', ...V264, ...A_AAC, '-shortest', o]),
  vector: (buf) => mp4(buf, (i, o) => ['-i', i, '-filter_complex', '[0:a]avectorscope=s=720x720:zoom=1.5[v]', '-map', '[v]', '-map', '0:a', ...V264, ...A_AAC, '-shortest', o]),
  avec: (buf) => mp4(buf, (i, o) => ['-i', i, '-filter_complex', '[0:a]showwaves=s=720x480:mode=cline:colors=white[v]', '-map', '[v]', '-map', '0:a', ...V264, ...A_AAC, '-shortest', o]),
  black: (buf) => mp4(buf, (i, o) => ['-f', 'lavfi', '-i', 'color=c=black:s=720x720:r=25', '-i', i, '-map', '0:v', '-map', '1:a', ...V264, ...A_AAC, '-shortest', o]),

  async crop(buf, vw, vh, x, y) {
    const input = tmp('bin'); fs.writeFileSync(input, buf);
    try {
      const info = await probe(input);
      if (vw > info.width || vh > info.height) throw new Error(`Video ka size ${info.width}x${info.height} hai, crop is se chhota rakhein.`);
    } finally { rm(input); }
    return mp4(buf, (i, o) => ['-i', i, '-vf', `crop=${vw}:${vh}:${x}:${y}`, ...V264, '-c:a', 'copy', o]);
  },

  // audio + video jod do (video ki awaaz badal do)
  avm: (video, audio) => {
    const a = tmp('bin'); fs.writeFileSync(a, audio);
    return transform(video, 'mp4', (i, o) => ['-i', i, '-i', a, '-map', '0:v', '-map', '1:a', ...V264, ...A_AAC, '-shortest', o])
      .then((b) => { rm(a); return { buffer: b, kind: 'video', mimetype: 'video/mp4' }; }, (e) => { rm(a); throw e; });
  },

  // kai videos ko ek mein jodo
  async merge(buffers) {
    const files = buffers.map((b) => { const f = tmp('bin'); fs.writeFileSync(f, b); return f; });
    const output = tmp('mp4');
    try {
      const infos = await Promise.all(files.map((f) => probe(f)));
      const args = []; const parts = []; let inputs = 0;
      files.forEach((f, idx) => {
        args.push('-i', f); inputs++;
        parts.push(`[${idx}:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${idx}]`);
        if (infos[idx].hasAudio) parts.push(`[${idx}:a]aresample=44100,aformat=channel_layouts=stereo[a${idx}]`);
        else parts.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${infos[idx].duration || 1}[a${idx}]`);
      });
      const chain = files.map((_, i) => `[v${i}][a${i}]`).join('');
      parts.push(`${chain}concat=n=${inputs}:v=1:a=1[v][a]`);
      await run([...args, '-filter_complex', parts.join(';'), '-map', '[v]', '-map', '[a]', ...V264, ...A_AAC, output]);
      return { buffer: fs.readFileSync(output), kind: 'video', mimetype: 'video/mp4' };
    } finally { rm(output, ...files); }
  },

  // audio metadata (title / artist)
  tag: (buf, title, artist) => mp3(buf, (i, o) => ['-i', i, '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', '-metadata', `title=${title || ''}`, '-metadata', `artist=${artist || ''}`, o]),

  // gif -> mp4
  gifToMp4: (buf) => mp4(buf, (i, o) => ['-i', i, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', o]),
  // koi bhi image -> jpg
  toJpg: (buf) => transform(buf, 'jpg', (i, o) => ['-i', i, '-frames:v', '1', '-q:v', '2', o])
};

module.exports = ops;
