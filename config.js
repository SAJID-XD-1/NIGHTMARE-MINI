require('dotenv').config();

module.exports = {
  BOT_NAME: process.env.BOT_NAME || 'NIGHTMARE-MINI',
  OWNER_NAME: process.env.OWNER_NAME || 'Hajsajd',
  OWNER_NUMBER: (process.env.OWNER_NUMBER || '923489890758').replace(/\D/g, ''),
  PREFIX: process.env.PREFIX || '.',
  MODE: (process.env.MODE || 'public').toLowerCase(), // public | private
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
