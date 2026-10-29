const axios = require('axios');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runtime = (seconds) => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`, `${s}s`].filter(Boolean).join(' ');
};

async function tryRequest(fn, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; await sleep(i * 1000); }
  }
  throw lastErr;
}

const getBuffer = async (url, options = {}) =>
  (await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, ...options })).data;

const isUrl = (s) => /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/i.test(s);

module.exports = { sleep, runtime, tryRequest, getBuffer, isUrl };
