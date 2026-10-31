const { cmd, onMessage } = require('../nightmare');
const ai = require('../lib/ai');
const settings = require('../lib/settings');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, onOff } = require('../lib/style');

function aiCommand(pattern, alias, provider, label, vision) {
  cmd({ pattern, alias, desc: `${label} se sawal poochein`, category: 'ai', react: '🤖' },
    async (sock, mek, m, { q, quoted, reply, prefix }) => {
      const prompt = q || quoted?.text;
      let image = null;
      if (vision && quoted?.type === 'imageMessage') {
        const media = await downloadFromMessage(quoted.message);
        image = { buffer: media.buffer, mimetype: media.content.mimetype || 'image/jpeg' };
      }
      if (!prompt && !image) return reply(usage(prefix, `${pattern} Pakistan ka capital kya hai?`, vision ? 'Image reply karke bhi pooch sakte hain.' : ''));
      try {
        const out = await ai.ask(provider, prompt || 'Is image ko describe karein.', { image });
        await reply(box(label, [out]), { noFont: true });
      } catch (e) {
        await reply(err(e instanceof ai.MissingKey ? e.message : `AI error: ${e.response?.data?.error?.message || e.message}`));
      }
    });
}
aiCommand('gpt', ['chatgpt', 'openai'], 'openai', 'ᴄʜᴀᴛɢᴘᴛ', true);
aiCommand('gemini', ['bard'], 'gemini', 'ɢᴇᴍɪɴɪ', true);
aiCommand('groq', [], 'groq', 'ɢʀᴏǫ', false);
aiCommand('or', ['openrouter'], 'openrouter', 'ᴏᴘᴇɴʀᴏᴜᴛᴇʀ', true);

cmd({ pattern: 'ai', alias: ['ask'], desc: 'Jo AI key set hai us se jawab (auto)', category: 'ai', react: '🧠' },
  async (sock, mek, m, { q, quoted, reply, prefix }) => {
    const prompt = q || quoted?.text;
    if (!prompt) return reply(usage(prefix, 'ai mujhe 3 productivity tips do'));
    const p = ai.firstAvailable();
    if (!p) return reply(err('Koi AI key set nahi. Config Vars mein GROQ_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY mein se koi daalein.'));
    try { await reply(box('ᴀɪ', [await ai.ask(p, prompt)]), { noFont: true }); } catch (e) { await reply(err(`AI error: ${e.response?.data?.error?.message || e.message}`)); }
  });

cmd({ pattern: 'dall', alias: ['imagine', 'aiimg'], desc: 'AI se image banayein (OpenAI key chahiye)', category: 'ai', react: '🎨' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    if (!q) return reply(usage(prefix, 'dall a white siamese cat, studio portrait'));
    try {
      const r = await ai.image(q);
      await sock.sendMessage(from, { image: r.url ? { url: r.url } : r.buffer, caption: box('ᴀɪ ɪᴍᴀɢᴇ', [['🎨', 'Prompt', q]]) }, { quoted: mek });
    } catch (e) { await reply(err(e instanceof ai.MissingKey ? e.message : `Image error: ${e.response?.data?.error?.message || e.message}`)); }
  });

// Lydia: chatbot jo chat mein khud jawab de
cmd({ pattern: 'lydia', alias: ['chatbot'], desc: 'Chat mein AI chatbot on/off', category: 'ai', owner: true, react: '💬' },
  async (sock, mek, m, { from, q, reply, prefix }) => {
    const list = settings.getData('lydia', []);
    if (!['on', 'off'].includes(q.toLowerCase())) return reply(usage(prefix, 'lydia on | off', `Is chat mein: ${onOff(String(list.includes(from)))}`));
    if (q.toLowerCase() === 'on' && !ai.firstAvailable()) return reply(err('Pehle koi AI key set karein (GROQ_API_KEY recommended, free tier hai).'));
    settings.setData('lydia', q.toLowerCase() === 'on' ? [...new Set([...list, from])] : list.filter((j) => j !== from));
    await reply(ok(`Chatbot: ${q.toUpperCase()}`));
  });

const history = new Map();
onMessage(async (sock, msg, ctx) => {
  if (!ctx.body || ctx.body.startsWith(ctx.prefix) || !settings.getData('lydia', []).includes(ctx.from)) return;
  const p = ai.firstAvailable(); if (!p) return;
  const h = history.get(ctx.from) || [];
  h.push(`User: ${ctx.body}`); if (h.length > 8) h.shift();
  try {
    const out = await ai.ask(p, h.join('\n'), { system: 'Tum NIGHTMARE naam ka dostana WhatsApp chatbot ho. Chhote, natural jawab do, usi zubaan mein jis mein user likhe (Roman Urdu/English).' });
    h.push(`Bot: ${out}`); history.set(ctx.from, h.slice(-8));
    await sock.sendMessage(ctx.from, { text: out }, { quoted: msg, noFont: true });
  } catch (e) { console.error('lydia:', e.message); }
});
