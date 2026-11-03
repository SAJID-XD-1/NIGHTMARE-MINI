// AI providers (sab optional - jis ki key ho wahi chalega).
// Key do jagah se aati hai: is number ki apni (.setkey) ya Heroku Config Var (sab numbers ke liye).
// Models ke naam WhatsApp/AI companies badalti rehti hain, isliye ek model band ho to agla khud try hota hai.
const axios = require('axios');
const config = require('../config');

const KEY_NAME = { openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', gemini: 'GEMINI_API_KEY' };
const NAMES = { openai: 'ChatGPT', groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini' };
// Pehla model env se (OPENAI_MODEL, GROQ_MODEL ...), phir ye list
const DEFAULT_MODELS = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  openrouter: ['openai/gpt-4o-mini'],
  gemini: ['gemini-flash-latest']       // "latest" alias - purane model band hone par bhi chalta rehta hai
};
const modelsOf = (p) => [...new Set([process.env[`${p.toUpperCase()}_MODEL`], ...DEFAULT_MODELS[p]].filter(Boolean))];

const hasKey = (p) => !!config[KEY_NAME[p]];
const firstAvailable = () => ['groq', 'gemini', 'openrouter', 'openai'].find(hasKey);

class MissingKey extends Error {
  constructor(provider) {
    super(`${KEY_NAME[provider]} set nahi hai.\nOwner ye likhe: .setkey ${provider} <key>\n(ya Heroku Config Vars mein ${KEY_NAME[provider]} daalein)`);
    this.provider = provider;
  }
}

// Model band / naam galat ho to agla model try karo
async function withModels(provider, fn) {
  let lastErr;
  for (const model of modelsOf(provider)) {
    try { return await fn(model); }
    catch (e) {
      const st = e.response?.status;
      const body = JSON.stringify(e.response?.data || '').toLowerCase();
      if (st === 404 || (st === 400 && /model/.test(body))) { lastErr = e; continue; }
      throw e;
    }
  }
  throw lastErr;
}

async function openaiCompat(url, key, model, prompt, system, image, extraHeaders = {}) {
  const user = image
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${image.mimetype};base64,${image.buffer.toString('base64')}` } }]
    : prompt;
  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }];
  const { data } = await axios.post(url, { model, messages }, { headers: { Authorization: `Bearer ${key}`, ...extraHeaders }, timeout: 90000 });
  return data?.choices?.[0]?.message?.content?.trim() || '(khali jawab aaya)';
}

async function ask(provider, prompt, { system = '', image = null } = {}) {
  if (!hasKey(provider)) throw new MissingKey(provider);
  const key = config[KEY_NAME[provider]];
  return withModels(provider, async (model) => {
    if (provider === 'openai') return openaiCompat('https://api.openai.com/v1/chat/completions', key, model, prompt, system, image);
    if (provider === 'groq') return openaiCompat('https://api.groq.com/openai/v1/chat/completions', key, model, prompt, system, image);
    if (provider === 'openrouter') return openaiCompat('https://openrouter.ai/api/v1/chat/completions', key, model, prompt, system, image);
    if (provider === 'gemini') {
      const parts = [{ text: system ? `${system}\n\n${prompt}` : prompt }];
      if (image) parts.push({ inline_data: { mime_type: image.mimetype, data: image.buffer.toString('base64') } });
      const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { contents: [{ parts }] },
        { headers: { 'x-goog-api-key': key }, timeout: 90000 });
      return data?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('').trim() || '(khali jawab aaya)';
    }
    throw new Error('Unknown provider');
  });
}

async function image(prompt) {
  if (!hasKey('openai')) throw new MissingKey('openai');
  const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  const { data } = await axios.post('https://api.openai.com/v1/images/generations', { model, prompt, size: '1024x1024', n: 1 },
    { headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}` }, timeout: 120000 });
  const d = data?.data?.[0];
  if (d?.url) return { url: d.url };
  if (d?.b64_json) return { buffer: Buffer.from(d.b64_json, 'base64') };
  throw new Error('Image nahi mili');
}

// Key kahan se aa rahi hai: 'number' (.setkey) | 'heroku' (Config Var) | null
function keySource(p) {
  const k = KEY_NAME[p];
  const v = config[k];
  if (!v) return null;
  return v !== config.base[k] || !config.base[k] ? 'number' : 'heroku';
}
const mask = (v = '') => (v.length > 8 ? `${v.slice(0, 3)}****${v.slice(-4)}` : '****');

module.exports = { ask, image, hasKey, firstAvailable, MissingKey, KEY_NAME, NAMES, keySource, mask, modelsOf };
