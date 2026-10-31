// 📊 Poll: .poll Sawal | Option 1 | Option 2 | ...   (aakhir mein -m = kai jawab allowed)
const { cmd } = require('../nightmare');

const MAX_OPTIONS = 12;      // WhatsApp ki hadd
const MAX_QUESTION = 255;
const MAX_OPTION = 100;

cmd({ pattern: 'poll', desc: 'Create a poll', category: 'group' },
  async (sock, mek, ctx) => {
    let input = ctx.q.trim();
    const multiple = /(^|\s)-m\s*$/i.test(input);
    input = input.replace(/(^|\s)-m\s*$/i, '').trim();

    const parts = (input.includes('|') ? input.split('|') : input.split(',')).map((p) => p.trim()).filter(Boolean);
    const [question, ...raw] = parts;

    if (!question) return ctx.reply(`Usage: ${ctx.prefix}poll Question | Option 1 | Option 2\nMultiple answers: end with -m`);
    if (raw.length < 2) return ctx.reply('Poll needs at least 2 options.');
    if (question.length > MAX_QUESTION) return ctx.reply(`Question is too long (max ${MAX_QUESTION} characters).`);

    const options = [...new Set(raw)];
    if (options.length < 2) return ctx.reply('Options must be different from each other.');
    if (options.length > MAX_OPTIONS) return ctx.reply(`Maximum ${MAX_OPTIONS} options allowed.`);
    if (options.some((o) => o.length > MAX_OPTION)) return ctx.reply(`Each option must be under ${MAX_OPTION} characters.`);

    // Poll ke andar ka text user ka apna hai - font nahi lagta
    await sock.sendMessage(ctx.from, { poll: { name: question, values: options, selectableCount: multiple ? options.length : 1 } }, { quoted: mek });
  });
