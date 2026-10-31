require('dotenv').config();

module.exports = {
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

  PORT: process.env.PORT || 8000
};

// ---- v3 extras (sab optional) ----
Object.assign(module.exports, {
  VERSION: '3.1.0',
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
