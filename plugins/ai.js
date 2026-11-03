const { cmd, onMessage } = require('../nightmare');
const ai = require('../lib/ai');
const config = require('../config');
const settings = require('../lib/settings');
const { downloadFromMessage } = require('../lib/media');
const { box, ok, err, usage, onOff } = require('../lib/style');

const NO_KEY_HELP = 'Koi AI key set nahi.\n\n🆓 Free keys:\n• Groq: console.groq.com\n• Gemini: aistudio.google.com/apikey\n\nPhir owner ye likhe:\n.setkey groq <key>\n(ya Heroku Config Vars mein GROQ_API_KEY daalein)';

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

      // Jis AI ki key nahi, uski jagah jo key maujood ho us se jawab do
      let use = provider, note = '';
      if (!ai.hasKey(provider)) {
        const alt = ai.firstAvailable();
        if (!alt) return reply(err(NO_KEY_HELP), { noFont: true });
        use = alt; note = `${ai.NAMES[provider]} ki key nahi, ${ai.NAMES[alt]} se jawab\n\n`;
      }
      try {
        const out = await ai.ask(use, prompt || 'Is image ko describe karein.', { image: use === provider || ['openai', 'gemini', 'openrouter'].includes(use) ? image : null });
        await reply(box(label, [note + out]), { noFont: true });
      } catch (e) {
        await reply(err(e instanceof ai.MissingKey ? e.message : `AI error: ${e.response?.data?.error?.message || e.response?.data?.[0]?.error?.message || e.message}`), { noFont: true });
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
    if (!p) return reply(err(NO_KEY_HELP), { noFont: true });
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


/* ───────────── Is number ki apni AI keys ───────────── */
const PROVIDERS = Object.keys(ai.KEY_NAME);

cmd({ pattern: 'setkey', alias: ['setapikey'], desc: 'AI key save karein: .setkey groq <key>', category: 'ai', owner: true, react: '🔑' },
  async (sock, mek, m, { from, args, reply, prefix }) => {
    const p = (args[0] || '').toLowerCase().replace('chatgpt', 'openai');
    const key = (args[1] || '').trim();
    if (!PROVIDERS.includes(p) || key.length < 16 || /\s/.test(key))
      return reply(usage(prefix, 'setkey groq gsk_xxxxxxxx', `Providers: ${PROVIDERS.join(', ')}\nKey sirf is number ke liye save hoti hai.`));
    await settings.set(ai.KEY_NAME[p], key);
    await sock.sendMessage(from, { delete: mek.key }).catch(() => {});   // key wala message hata do (jahan mumkin ho)
    await reply(ok(`🔑 ${ai.NAMES[p]} key save ho gayi (${ai.mask(key)}).\nSecurity ke liye apna wo message delete kar dein jisme key likhi thi.`), { noFont: true });
  });

cmd({ pattern: 'delkey', alias: ['removekey'], desc: 'Is number ki AI key hatayein: .delkey groq', category: 'ai', owner: true, react: '🗑️' },
  async (sock, mek, m, { args, reply, prefix }) => {
    const p = (args[0] || '').toLowerCase().replace('chatgpt', 'openai');
    if (!PROVIDERS.includes(p)) return reply(usage(prefix, 'delkey groq', `Providers: ${PROVIDERS.join(', ')}`));
    await settings.unset(ai.KEY_NAME[p]);
    await reply(ok(`${ai.NAMES[p]} ki is number wali key hata di.${ai.keySource(p) === 'heroku' ? '\n(Ab Heroku Config Var wali key use hogi.)' : ''}`), { noFont: true });
  });

cmd({ pattern: 'keys', alias: ['apikeys'], desc: 'Kaun si AI keys set hain', category: 'ai', owner: true, react: '🔑' },
  async (sock, mek, m, { reply }) => {
    const rows = PROVIDERS.map((p) => {
      const src = ai.keySource(p);
      return [src ? '✅' : '❌', ai.NAMES[p], src ? `${ai.mask(config[ai.KEY_NAME[p]])} (${src === 'number' ? 'is number ki' : 'Heroku Config Var'})` : 'set nahi'];
    });
    rows.push('', 'Gemini default model: gemini-flash-latest', `Chalne wali AI (.ai): ${ai.firstAvailable() ? ai.NAMES[ai.firstAvailable()] : 'koi nahi'}`);
    await reply(box('ᴀɪ ᴋᴇʏꜱ', rows), { noFont: true });
  });
