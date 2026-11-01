require('dotenv').config();

const base = {
  BOT_NAME: process.env.BOT_NAME || 'NIGHTMARE-MINI',
  OWNER_NAME: process.env.OWNER_NAME || 'Hajsajd',
  OWNER_NUMBER: (process.env.OWNER_NUMBER || '923489890758').replace(/\D/g, ''),
  PREFIX: process.env.PREFIX || '.',
  VERSION: '2.0.0',

  REPO: process.env.REPO || '',
  SESSION_ID: process.env.SESSION_ID || '',

  // Toggles ('true' / 'false') - .settings se runtime par badal sakte hain (DB mein save hoti hain)
  AUTO_READ: process.env.AUTO_READ || 'false',
  AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || 'false',
  AUTO_STATUS_LIKE: process.env.AUTO_STATUS_LIKE || 'false',
  AUTO_TYPING: process.env.AUTO_TYPING || 'false',
  AUTO_RECORDING: process.env.AUTO_RECORDING || 'false',
  AUTO_BIO: process.env.AUTO_BIO || 'false',
  ANTI_CALL: process.env.ANTI_CALL || 'false',
  ANTIDELETE: process.env.ANTIDELETE || 'false',

  MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS || '5', 10),   // ek server par kitne numbers
  PORT: process.env.PORT || 8000
};

// ---- v3 extras (sab optional) ----
Object.assign(base, {
  VERSION: '3.2.0',
  TIMEZONE: process.env.TIMEZONE || 'Asia/Karachi',
  MENU_IMAGE: process.env.MENU_IMAGE || '',        // menu ke saath image (direct URL)
  WARN_LIMIT: Number(process.env.WARN_LIMIT || 4),
  ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || 'false',
  ANTIDELETE_DEST: process.env.ANTIDELETE_DEST || 'owner', // owner | chat | <jid>
  ANTIDELETE_SCOPE: process.env.ANTIDELETE_SCOPE || '',     // '' | pm | gm
  ANTI_EDIT: process.env.ANTI_EDIT || 'false',
  ANTI_EDIT_DEST: process.env.ANTI_EDIT_DEST || 'owner',
  ANTI_EDIT_SCOPE: process.env.ANTI_EDIT_SCOPE || '',
  // API keys (jo chahiye wahi daalein)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  RMBG_KEY: process.env.RMBG_KEY || '',
  OMDB_API_KEY: process.env.OMDB_API_KEY || '742b2d09',
  SUDO: (process.env.SUDO || '').split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean),   // .addsudo se bhi badhta hai (DB mein save)
  HEROKU_API_KEY: process.env.HEROKU_API_KEY || '',
  HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || ''
});

// ---- Multi-number: har session (paired number) ka apna config overlay hota hai ----
// Session ke andar config.PREFIX / config.SUDO / config.OWNER_NUMBER ... usi number ki values dete hain.
const { als } = require('./lib/context');
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

module.exports = new Proxy(base, {
  get(t, k) {
    const o = als.getStore()?.config;
    return o && has(o, k) ? o[k] : t[k];
  },
  set(t, k, v) {
    const o = als.getStore()?.config;
    if (o) o[k] = v; else t[k] = v;
    return true;
  },
  has: (t, k) => k in t,
  ownKeys: (t) => Reflect.ownKeys(t),
  getOwnPropertyDescriptor: (t, k) => Reflect.getOwnPropertyDescriptor(t, k)
});
module.exports.base = base;   // asli (global) values - proxy ke bina
