const axios = require('axios');
const { cmd } = require('../nightmare');
const { box, err, usage, wait, mini } = require('../lib/style');

cmd({ pattern: 'calc', alias: ['calculate'], desc: 'Calculator: .calc 5*(3+2)', category: 'tools', react: '🧮' },
  async (sock, mek, m, { q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'calc 12*(5+3)/4'));
    const expr = q.replace(/\^/g, '**').replace(/[x×]/gi, '*').replace(/÷/g, '/');
    if (!/^[0-9+\-*/%().\s]+$/.test(expr)) return reply(err('Sirf numbers aur + - * / % ^ ( ) allowed hain.'));
    let result;
    try { result = Function(`"use strict"; return (${expr})`)(); } catch { return reply(err('Expression galat hai.')); }
    if (typeof result !== 'number' || !isFinite(result)) return reply(err('Result calculate nahi ho saka.'));
    await reply(box('ᴄᴀʟᴄᴜʟᴀᴛᴏʀ', [['🧮', 'Input', q], ['✨', 'Result', `*${result}*`]]));
  });

cmd({ pattern: 'time', alias: ['date'], desc: 'Waqt dekhein: .time Asia/Karachi', category: 'tools', react: '🕒' },
  async (sock, mek, m, { q, reply }) => {
    const tz = q || 'Asia/Karachi';
    try {
      const t = new Date().toLocaleString('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' });
      await reply(box('ᴛɪᴍᴇ', [['🌍', 'Zone', tz], ['🕒', 'Now', t]]));
    } catch { await reply(err('Timezone galat hai.\nExample: Asia/Karachi, Europe/London')); }
  });

cmd({ pattern: 'weather', alias: ['mausam'], desc: 'Mausam: .weather Karachi', category: 'tools', react: '🌦️' },
  async (sock, mek, m, { q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'weather Karachi'));
    const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(q)}`, {
      params: { format: '%l|%t|%f|%C|%h|%w' }, timeout: 15000
    });
    const [place, temp, feels, cond, hum, wind] = String(data).trim().split('|');
    await reply(box('ᴡᴇᴀᴛʜᴇʀ', [['📍', 'Place', place], ['🌡️', 'Temp', `${temp} (feels ${feels})`], ['☁️', 'Sky', cond], ['💧', 'Humidity', hum], ['💨', 'Wind', wind]]));
  });

cmd({ pattern: 'screenshot', alias: ['ss', 'fullss', 'webshot', 'sitepic'], desc: 'Website ka screenshot', category: 'tools', react: '🖥️' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'ss https://google.com'));
    const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    await reply(wait('Screenshot le raha hoon...'));
    const { data } = await axios.get(`https://movanest.xyz/v2/ssweb?url=${encodeURIComponent(url)}&width=1280&height=720&full_page=true`, { timeout: 60000 });
    if (!data?.status || !data.screenshot) return reply(err('Screenshot nahi mila / API busy hai.'));
    await sock.sendMessage(from, { image: { url: data.screenshot }, caption: box('ꜱᴄʀᴇᴇɴꜱʜᴏᴛ', [['🌐', 'Site', url]], 'NIGHTMARE-MINI') }, { quoted: mek });
  });

cmd({ pattern: 'online', alias: ['whosonline', 'onlinemembers'], desc: 'online on|off = hamesha online | group mein: kaun online hai', category: 'tools', react: '🟢' },
  async (sock, mek, m, { from, q, isGroup, isOwner, getAdminInfo, reply, getGroupMetadata, prefix }) => {
    const config = require('../config'); const settings = require('../lib/settings');
    if (['on', 'off'].includes(q.toLowerCase())) {
      if (!isOwner) return reply(err('Ye sirf owner ke liye hai.'));
      await settings.set('ALWAYS_ONLINE', q.toLowerCase() === 'on' ? 'true' : 'false');
      return reply(box('ᴀʟᴡᴀʏꜱ ᴏɴʟɪɴᴇ', [['🟢', 'Status', config.ALWAYS_ONLINE === 'true' ? '✅ ON' : '❌ OFF']]));
    }
    if (!isGroup) return reply(usage(prefix, 'online on | off', 'Group mein sirf `.online` likhein to online members ki list milegi.'));
    const info = await getAdminInfo();
    if (!info.isAdmin) return reply(err('Ye command sirf *group admins* ke liye hai.'));
    await reply(wait('Online members check ho rahe hain (15 sec)...'));
    const meta = await getGroupMetadata();
    const online = new Set();
    const handler = (json) => {
      for (const [id, p] of Object.entries(json.presences || {}))
        if (['available', 'composing', 'recording'].includes(p?.lastKnownPresence)) online.add(id);
    };
    sock.ev.on('presence.update', handler);
    await Promise.all(meta.participants.map((p) => sock.presenceSubscribe(p.id).catch(() => {})));
    await new Promise((r) => setTimeout(r, 15000));
    sock.ev.off('presence.update', handler);

    if (!online.size) return reply(mini('🟢 ᴏɴʟɪɴᴇ', 'Koi online detect nahi hua (log presence chhupa sakte hain).'));
    const list = [...online];
    await sock.sendMessage(from, {
      text: box('ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀꜱ', [...list.map((id, i) => `${i + 1}. @${id.split('@')[0].split(':')[0]}`), '', `🟢 ${list.length} / ${meta.participants.length}`]),
      mentions: list
    }, { quoted: mek });
  });
