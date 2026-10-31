const { cmd } = require('../nightmare');
const { fetchGif, gifToSticker } = require('../lib/sticker-utils');
const { err, usage, wait } = require('../lib/style');

cmd({ pattern: 'attp', alias: ['attptext', 'textsticker', 'namesticker', 'stickername'], desc: 'Text ka animated sticker', category: 'sticker', react: '✨' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'attp Nightmare', 'Jo likhenge uska animated sticker banega.'));
    await reply(wait('Aapka sticker ban raha hai...'));
    try {
      const gif = await fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(q)}`);
      const sticker = await gifToSticker(gif);
      await sock.sendMessage(from, { sticker }, { quoted: mek });
    } catch (e) {
      console.error('ATTP:', e.message);
      await reply(err('Sticker nahi ban saka (API ya ffmpeg ka masla).\nThori der baad dobara try karein.'));
    }
  });

// ---- sticker: image / video -> WebP sticker (ffmpeg) ----
const { transform } = require('../lib/ffmpeg');
const { downloadFromMessage } = require('../lib/media');
const { warn } = require('../lib/style');

const FIT = 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';

cmd({ pattern: 'sticker', alias: ['s', 'stic', 'tosticker'], desc: 'Image / video / gif ko sticker banayein (reply)', category: 'sticker', react: '✨' },
  async (sock, mek, m, { from, quoted, reply, prefix }) => {
    if (!quoted) return reply(usage(prefix, 'sticker', 'Kisi image ya chhoti video ko reply karein.'));
    const media = await downloadFromMessage(quoted.message).catch(() => null);
    if (!media || !['image', 'video'].includes(media.kind)) return reply(err('Sirf image ya video reply karein.'));
    if (media.kind === 'video' && (media.content.seconds || 0) > 15) return reply(warn('Video 15 second se chhoti rakhein.'));
    await reply(wait('Sticker ban raha hai...'));
    try {
      let webp;
      for (const q of media.kind === 'video' ? [50, 30, 15] : [70]) {
        webp = await transform(media.buffer, 'webp', (i, o) =>
          media.kind === 'video'
            ? ['-t', '8', '-i', i, '-vf', `${FIT},fps=15`, '-c:v', 'libwebp', '-q:v', String(q), '-loop', '0', '-an', '-vsync', '0', o]
            : ['-i', i, '-vf', FIT, '-c:v', 'libwebp', '-q:v', String(q), '-frames:v', '1', o]);
        if (webp.length < 950 * 1024) break;   // WhatsApp ki limit ~1MB
      }
      await sock.sendMessage(from, { sticker: webp }, { quoted: mek });
    } catch (e) {
      console.error('sticker:', e.message);
      await reply(err('Sticker nahi ban saka (ffmpeg ka masla).'));
    }
  });
