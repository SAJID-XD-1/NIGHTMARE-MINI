// 🎞️ Audio / video tools (ffmpeg): rotate, mp3, voice, photo, reverse, cut, trim, compress, bass, treble, pitch, low,
// histo, vector, avec, black, crop, avm, merge
const { cmd } = require('../nightmare');
const ops = require('../lib/mediaops');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, warn, usage, wait } = require('../lib/style');

const MAX_BYTES = 60 * 1024 * 1024;
let busy = false;  // Heroku par ek waqt mein ek hi ffmpeg kaam (RAM bachane ke liye)

const toContent = (r) => ({
  video: { video: r.buffer, mimetype: r.mimetype },
  audio: { audio: r.buffer, mimetype: r.mimetype },
  voice: { audio: r.buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true },
  image: { image: r.buffer }
}[r.kind]);

/** wanted: ['video','audio','image','sticker'] - quoted media in me se koi ek hona chahiye */
async function job(sock, mek, ctx, wanted, hint, work) {
  if (!ctx.quoted) return ctx.reply(usage(ctx.prefix, ctx.command, hint));
  const media = await downloadFromMessage(ctx.quoted.message).catch(() => null);
  if (!media || !wanted.includes(media.kind)) return ctx.reply(err(`Ye command sirf *${wanted.join(' / ')}* par chalti hai.\n${hint}`));
  if (media.buffer.length > MAX_BYTES) return ctx.reply(err('File 60MB se badi hai.'));
  if (busy) return ctx.reply(warn('Ek aur media kaam chal raha hai, thori der baad try karein.'));
  busy = true;
  try {
    await ctx.reply(wait('Processing... (badi file mein 1-2 minute lag sakte hain)'));
    const res = await work(media.buffer, media);
    await sock.sendMessage(ctx.from, toContent(res), { quoted: mek });
  } catch (e) {
    console.error(`media/${ctx.command}:`, e.message);
    await ctx.reply(err(`Process nahi ho saka:\n${String(e.message).slice(0, 300)}`));
  } finally { busy = false; }
}

const num = (v, d) => (isNaN(parseFloat(v)) ? d : parseFloat(v));
const C = (pattern, alias, desc, wanted, hint, work, react = '🎞️') =>
  cmd({ pattern, alias, desc, category: 'media', react }, (sock, mek, m, ctx) => job(sock, mek, ctx, wanted, hint, (buf, media) => work(buf, ctx, media)));

C('rotate', [], 'Video ghumayein: right | left | flip', ['video'], 'Video ko reply karein: .rotate right', (b, c) => ops.rotate(b, (c.args[0] || '').toLowerCase()), '🔄');
C('mp3', ['tomp3'], 'Video / audio ko MP3 banayein', ['video', 'audio', 'document'], 'Video ya audio ko reply karein.', (b) => ops.toMp3(b), '🎵');
C('voice', ['ptt', 'tovoice'], 'Audio ko voice note banayein', ['video', 'audio'], 'Audio ko reply karein.', (b) => ops.toVoice(b), '🎙️');
C('photo', ['toimg', 'toimage'], 'Sticker / video se photo', ['sticker', 'video', 'image'], 'Sticker ya video ko reply karein.', (b) => ops.photo(b), '🖼️');
C('reverse', ['rev'], 'Video / audio ulta chalayein', ['video', 'audio'], 'Video ya audio ko reply karein.', (b, c, m) => (m.kind === 'video' ? ops.reverseVideo(b) : ops.reverseAudio(b)), '⏪');
C('cut', ['cutaudio'], 'Audio kaatein: .cut <start sec> <muddat sec>', ['audio'], 'Audio ko reply karein: .cut 10 30', (b, c) => ops.cutAudio(b, num(c.args[0], 0), num(c.args[1], 30)), '✂️');
C('trim', ['cutvideo'], 'Video kaatein: .trim <start sec> <muddat sec>', ['video'], 'Video ko reply karein: .trim 5 20', (b, c) => ops.trimVideo(b, num(c.args[0], 0), num(c.args[1], 30)), '✂️');
C('compress', ['comp'], 'Video ka size kam karein', ['video'], 'Video ko reply karein.', (b) => ops.compress(b), '🗜️');
C('bass', [], 'Audio mein bass barhayein (1-30)', ['audio'], 'Audio ko reply karein: .bass 15', (b, c) => ops.bass(b, c.args[0]), '🔊');
C('treble', [], 'Audio mein treble barhayein (1-30)', ['audio'], 'Audio ko reply karein: .treble 15', (b, c) => ops.treble(b, c.args[0]), '🔔');
C('pitch', ['chipmunk'], 'Awaaz patli / tez karein', ['audio'], 'Audio ko reply karein.', (b) => ops.pitch(b), '🐿️');
C('low', ['slow'], 'Awaaz bhaari / dheemi karein', ['audio'], 'Audio ko reply karein.', (b) => ops.slow(b), '🐢');
C('histo', [], 'Audio ka frequency video', ['audio'], 'Audio ko reply karein.', (b) => ops.histo(b), '📊');
C('vector', [], 'Audio ka vectorscope video', ['audio'], 'Audio ko reply karein.', (b) => ops.vector(b), '🌀');
C('avec', ['waves'], 'Audio ka waveform video', ['audio'], 'Audio ko reply karein.', (b) => ops.avec(b), '🌊');
C('black', ['blackvideo'], 'Audio ko black screen video banayein', ['audio'], 'Audio ko reply karein.', (b) => ops.black(b), '⬛');
C('crop', ['cropvideo'], 'Video crop: .crop <w> <h> <x> <y>', ['video'], 'Video ko reply karein: .crop 480 480 0 0', (b, c) => {
  const [w, h, x, y] = [num(c.args[0]), num(c.args[1]), num(c.args[2], 0), num(c.args[3], 0)];
  if (!w || !h) throw new Error('Width aur height likhein: .crop 480 480');
  return ops.crop(b, w, h, x, y);
}, '📐');

/* ---- Do-qadam wale: avm (video + audio), merge (kai videos) ---- */
const stash = new Map();           // `${chat}:${user}` -> { video } / { videos: [] }
const skey = (c) => `${c.from}:${c.number}`;

cmd({ pattern: 'avm', desc: 'Video par nayi audio lagayein (pehle video, phir audio par reply)', category: 'media', react: '🎬' },
  async (sock, mek, m, ctx) => {
    if (!ctx.quoted) return ctx.reply(usage(ctx.prefix, 'avm', '1) Video ko reply karke .avm\n2) Phir audio ko reply karke .avm'));
    const media = await downloadFromMessage(ctx.quoted.message).catch(() => null);
    if (!media) return ctx.reply(err('Video ya audio ko reply karein.'));
    const st = stash.get(skey(ctx)) || {};
    if (media.kind === 'video') { stash.set(skey(ctx), { video: media.buffer }); return ctx.reply(ok('🎬 Video mil gayi. Ab audio ko reply karke `.avm` likhein.')); }
    if (media.kind !== 'audio') return ctx.reply(err('Sirf video ya audio.'));
    if (!st.video) return ctx.reply(err('Pehle video ko reply karke `.avm` likhein.'));
    if (busy) return ctx.reply(warn('Ek aur media kaam chal raha hai.'));
    busy = true;
    try {
      await ctx.reply(wait());
      const r = await ops.avm(st.video, media.buffer);
      stash.delete(skey(ctx));
      await sock.sendMessage(ctx.from, toContent(r), { quoted: mek });
    } catch (e) { await ctx.reply(err(`Merge nahi hua: ${e.message}`)); } finally { busy = false; }
  });

cmd({ pattern: 'merge', desc: 'Kai videos jodein: har video par .merge, phir .merge done', category: 'media', react: '🧩' },
  async (sock, mek, m, ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const st = stash.get(skey(ctx)) || { videos: [] };
    if (sub === 'clear') { stash.delete(skey(ctx)); return ctx.reply(ok('Merge list khali.')); }
    if (sub === 'done') {
      if ((st.videos || []).length < 2) return ctx.reply(err('Kam az kam 2 videos chahiye.'));
      if (busy) return ctx.reply(warn('Ek aur media kaam chal raha hai.'));
      busy = true;
      try {
        await ctx.reply(wait(`${st.videos.length} videos jod raha hoon...`));
        const r = await ops.merge(st.videos);
        stash.delete(skey(ctx));
        await sock.sendMessage(ctx.from, toContent(r), { quoted: mek });
      } catch (e) { await ctx.reply(err(`Merge nahi hua: ${e.message}`)); } finally { busy = false; }
      return;
    }
    if (!ctx.quoted) return ctx.reply(usage(ctx.prefix, 'merge', 'Har video ko reply karke .merge likhein, aakhir mein .merge done'));
    const media = await downloadFromMessage(ctx.quoted.message).catch(() => null);
    if (!media || media.kind !== 'video') return ctx.reply(err('Sirf video reply karein.'));
    if ((st.videos || []).length >= 6) return ctx.reply(err('Zyada se zyada 6 videos.'));
    st.videos = [...(st.videos || []), media.buffer];
    stash.set(skey(ctx), st);
    await ctx.reply(ok(`🧩 Video ${st.videos.length} add hui. Khatam hone par \`${ctx.prefix}merge done\`.`));
  });
