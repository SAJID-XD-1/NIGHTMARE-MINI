const { cmd } = require('../nightmare');
const config = require('../config');
const settings = require('../lib/settings');
const { box, ok, usage, onOff, err } = require('../lib/style');

// Global on/off toggles (sirf owner)
const TOGGLES = [
  ['autoread', ['aread'], 'AUTO_READ', 'Messages auto read', '👁️'],
  ['autostatusseen', ['avs', 'statusseen', 'autoviewstatus'], 'AUTO_STATUS_SEEN', 'Status auto seen', '👀'],
  ['autostatuslike', ['als', 'autolikestatus'], 'AUTO_STATUS_LIKE', 'Status auto like 🖤', '🖤'],
  ['autotyping', ['autotype', 'atyping'], 'AUTO_TYPING', 'Typing indicator', '⌨️'],
  ['autorecording', ['autorec', 'arecording'], 'AUTO_RECORDING', 'Recording indicator', '🎙️'],
  ['anticall', ['anti-call', 'acall'], 'ANTI_CALL', 'Calls auto reject', '📵'],
  ['antidelete', ['ad', 'antidel'], 'ANTIDELETE', 'Deleted msgs owner ko bhejo', '🗑️']
];

for (const [pattern, alias, key, desc, icon] of TOGGLES) {
  cmd({ pattern, alias, desc: `${desc} on/off`, category: 'settings', owner: true, react: icon },
    async (sock, mek, m, { q, reply, prefix }) => {
      const v = q.toLowerCase();
      if (!['on', 'off'].includes(v)) return reply(usage(prefix, `${pattern} on | off`, `Abhi: ${onOff(config[key])}`));
      await settings.set(key, v === 'on' ? 'true' : 'false');
      await reply(ok(`${icon} ${desc}: ${onOff(config[key])}`));
    });
}

cmd({ pattern: 'setprefix', desc: 'Prefix badlein (jaise . ! #)', category: 'settings', owner: true, react: '🔰' },
  async (sock, mek, m, { args, reply, prefix }) => {
    const p = args[0];
    if (!p || p.length > 3 || /\s/.test(p)) return reply(usage(prefix, 'setprefix !', 'Prefix 1-3 characters ka ho.'));
    await settings.set('PREFIX', p);
    await reply(ok(`Prefix ab *${p}* hai.\nExample: ${p}menu`));
  });

cmd({ pattern: 'settings', alias: ['setting', 'config'], desc: 'Saari settings dekhein', category: 'settings', owner: true, react: '⚙️' },
  async (sock, mek, m, { reply, prefix }) => {
    const rows = [['🔰', 'Prefix', config.PREFIX], ['🔄', 'Auto Bio', onOff(config.AUTO_BIO)]];
    for (const [pattern, , key, desc, icon] of TOGGLES) rows.push([icon, desc, onOff(config[key])]);
    rows.push('', `Badalne ke liye: ${prefix}<command> on | off`);
    await reply(box('ꜱᴇᴛᴛɪɴɢꜱ', rows));
  });
