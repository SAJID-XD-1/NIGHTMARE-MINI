// Har WhatsApp number (session) ka apna context. Config / settings / AFK / SUDO sab isi se alag alag rehte hain.
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

module.exports = {
  als,
  run: (session, fn) => als.run(session, fn),
  current: () => als.getStore() || null
};
