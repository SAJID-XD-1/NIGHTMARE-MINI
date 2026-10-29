const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../nightmare');
const { box, err, usage, wait, POWERED } = require('../lib/style');
const { tryRequest } = require('../lib/functions');

// ⚠️ Ye sab third-party free APIs hain. Koi band ho jaye to bas yahan URL badal dein.
const API = {
  ytmp4: 'https://arslan-apis-v2.vercel.app/download/ytmp4?url=',
  fb: 'https://movanest.xyz/v2/fbdown?url=',
  ig: [
    (u) => `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(u)}`,
    (u) => `https://rest-lily.vercel.app/api/downloader/igdl?url=${encodeURIComponent(u)}`,
    (u) => `https://bk9.fun/download/instagram?url=${encodeURIComponent(u)}`,
    (u) => `https://jawad-tech.vercel.app/downloader?url=${encodeURIComponent(u)}`
  ],
  apk: 'https://ws75.aptoide.com/api/7/apps/search/query='
};

const isYt = (s) => /youtu\.be|youtube\.com/i.test(s);

async function findVideo(q) {
  if (isYt(q)) {
    const id = (q.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1];
    if (id) return yts({ videoId: id });
  }
  const res = await yts(q);
  return res.videos?.[0];
}

async function ytLink(url) {
  let data;
  try {
    ({ data } = await tryRequest(() => axios.get(API.ytmp4 + encodeURIComponent(url), { timeout: 60000 }), 2));
  } catch {
    throw new Error('Download API abhi busy / band hai. Thori der baad try karein.');
  }
  const dl = data?.result?.download?.url;
  if (!data?.status || !dl) throw new Error('API ne download link nahi diya. Dusra gana try karein.');
  return { url: dl, title: data.result.metadata?.title, quality: data.result.download.quality };
}

cmd({ pattern: 'play', alias: ['song', 'mp3', 'ytmp3', 'music', 'audio'], desc: 'YouTube se gana (naam ya link)', category: 'download', react: '🎵' },
  async (sock, mek, m, { from, q, reply, react, prefix }) => {
    if (!q) return reply(usage(prefix, 'play Pasoori', 'Gane ka naam ya YouTube link likhein.'));
    await react('⏳');
    const v = await findVideo(q);
    if (!v) return reply(err('Koi result nahi mila.'));
    await sock.sendMessage(from, {
      image: { url: v.thumbnail },
      caption: box('ᴀᴜᴅɪᴏ ꜰᴏᴜɴᴅ', [['🎵', 'Title', v.title], ['⏱️', 'Time', v.timestamp], ['👁️', 'Views', v.views?.toLocaleString?.() ?? v.views], ['📺', 'Channel', v.author?.name || '-'], '', 'Audio bheji ja rahi hai... 🕸️'])
    }, { quoted: mek });
    const file = await ytLink(v.url);
    await sock.sendMessage(from, { audio: { url: file.url }, mimetype: 'audio/mpeg', fileName: `${v.title}.mp3` }, { quoted: mek });
    await react('✅');
  });

cmd({ pattern: 'video', alias: ['vid', 'ytv', 'ytmp4', 'playvideo'], desc: 'YouTube se video (naam ya link)', category: 'download', react: '🎬' },
  async (sock, mek, m, { from, q, reply, react, prefix }) => {
    if (!q) return reply(usage(prefix, 'video Pasoori', 'Video ka naam ya YouTube link likhein.'));
    await react('⏳');
    const v = await findVideo(q);
    if (!v) return reply(err('Koi result nahi mila.'));
    await sock.sendMessage(from, {
      image: { url: v.thumbnail },
      caption: box('ᴠɪᴅᴇᴏ ꜰᴏᴜɴᴅ', [['🎬', 'Title', v.title], ['⏱️', 'Time', v.timestamp], ['📺', 'Channel', v.author?.name || '-'], '', 'Video bheji ja rahi hai... 🕸️'])
    }, { quoted: mek });
    const file = await ytLink(v.url);
    await sock.sendMessage(from, { video: { url: file.url }, mimetype: 'video/mp4', caption: `🎬 *${v.title}*\n\n${POWERED}` }, { quoted: mek });
    await react('✅');
  });

cmd({ pattern: 'yts', alias: ['ytsearch'], desc: 'YouTube search (top 10)', category: 'search', react: '🔍' },
  async (sock, mek, m, { q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'yts Tajdar e Haram'));
    const videos = (await yts(q)).videos.slice(0, 10);
    if (!videos.length) return reply(err('Koi video nahi mili.'));
    const rows = [];
    videos.forEach((v, i) => rows.push(`*${i + 1}. ${v.title}*\n⏱️ ${v.timestamp}  👁️ ${v.views?.toLocaleString?.() ?? v.views}\n🔗 ${v.url}`, ''));
    await reply(box('ʏᴏᴜᴛᴜʙᴇ ꜱᴇᴀʀᴄʜ', rows));
  });

cmd({ pattern: 'apk', alias: ['app', 'playstore'], desc: 'APK download (Aptoide)', category: 'download', react: '📦' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'apk whatsapp'));
    const { data } = await axios.get(API.apk + encodeURIComponent(q) + '/limit=1', { timeout: 30000 });
    const app = data?.datalist?.list?.[0];
    if (!app) return reply(err('APK nahi mili.'));
    const mb = (app.size / 1048576).toFixed(2);
    await sock.sendMessage(from, {
      image: { url: app.icon },
      caption: box('ᴀᴘᴋ ɪɴꜰᴏ', [['📦', 'Name', app.name], ['💾', 'Size', `${mb} MB`], ['🆔', 'Package', app.package], ['🔖', 'Version', app.file?.vername], '', 'APK bheji ja rahi hai... 🕸️'])
    }, { quoted: mek });
    if (app.size > 300 * 1048576) return reply(err('APK 300MB se badi hai, WhatsApp par nahi jayegi.'));
    await sock.sendMessage(from, {
      document: { url: app.file.path || app.file.path_alt },
      mimetype: 'application/vnd.android.package-archive',
      fileName: `${app.name}.apk`
    }, { quoted: mek });
  });

cmd({ pattern: 'fb', alias: ['facebook', 'fbdl'], desc: 'Facebook video download', category: 'download', react: '📘' },
  async (sock, mek, m, { from, q, reply, react, prefix }) => {
    if (!q) return reply(usage(prefix, 'fb <facebook video link>'));
    await react('⏳');
    const { data } = await tryRequest(() => axios.get(API.fb + encodeURIComponent(q), { timeout: 60000 }), 2);
    const r = data?.results?.[0];
    if (data?.status !== true || !r) return reply(err('Facebook video nahi mili. Link sahi hai? (video public honi chahiye)'));
    const url = r.hdQualityLink || r.normalQualityLink;
    if (!url) return reply(err('Download link nahi mila.'));
    await sock.sendMessage(from, {
      video: { url }, mimetype: 'video/mp4',
      caption: box('ꜰʙ ᴠɪᴅᴇᴏ', [['⏱️', 'Time', r.duration || '-'], ['✨', 'Quality', r.hdQualityLink ? 'HD' : 'SD']], 'NIGHTMARE-MINI')
    }, { quoted: mek });
    await react('✅');
  });

cmd({ pattern: 'igdl', alias: ['instagram', 'insta', 'ig', 'reel'], desc: 'Instagram reel / post download', category: 'download', react: '📸' },
  async (sock, mek, m, { from, q, quoted, reply, react, prefix }) => {
    const link = (q || quoted?.text || '').trim();
    if (!/instagram\.com/i.test(link)) return reply(usage(prefix, 'igdl <instagram link>', 'Ya link wale message ko reply karein.'));
    await react('⏳');

    let media = null;
    for (const build of API.ig) {   // ek API na chale to agli try hoti hai
      try {
        const { data } = await axios.get(build(link), { timeout: 45000 });
        const items =
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data?.BK9) && data.BK9) ||
          (Array.isArray(data?.result) && data.result.map((u) => (typeof u === 'string' ? { url: u, type: 'video' } : u)));
        if (items?.length) { media = items; break; }
      } catch { /* agli API */ }
    }
    if (!media) return reply(err('Download nahi hua. Link private ho sakta hai ya APIs busy hain.'));

    for (const item of media.slice(0, 6)) {
      const isVideo = (item.type || 'video') === 'video' || /\.mp4/i.test(item.url);
      await sock.sendMessage(from, { [isVideo ? 'video' : 'image']: { url: item.url }, caption: box('ɪɴꜱᴛᴀɢʀᴀᴍ', [['📸', 'Status', 'Downloaded']], 'NIGHTMARE-MINI') }, { quoted: mek });
    }
    await react('✅');
  });
