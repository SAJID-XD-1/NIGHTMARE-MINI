// AI providers (sab optional - jis ki key ho wahi chalega)
const axios = require('axios');
const config = require('../config');

const MODELS = {
  openai: () => process.env.OPENAI_MODEL || 'gpt-4o-mini',
  groq: () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  openrouter: () => process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  gemini: () => process.env.GEMINI_MODEL || 'gemini-1.5-flash'
};
const KEY_NAME = { openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', gemini: 'GEMINI_API_KEY' };
const hasKey = (p) => !!config[KEY_NAME[p]];
const firstAvailable = () => ['groq', 'openrouter', 'openai', 'gemini'].find(hasKey);

class MissingKey extends Error {
  constructor(provider) { super(`${KEY_NAME[provider]} set nahi hai. Heroku Config Vars mein ${KEY_NAME[provider]} daalein.`); this.provider = provider; }
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
  const model = MODELS[provider]();
  if (provider === 'openai') return openaiCompat('https://api.openai.com/v1/chat/completions', key, model, prompt, system, image);
  if (provider === 'groq') return openaiCompat('https://api.groq.com/openai/v1/chat/completions', key, model, prompt, system, image);
  if (provider === 'openrouter') return openaiCompat('https://openrouter.ai/api/v1/chat/completions', key, model, prompt, system, image);
  if (provider === 'gemini') {
    const parts = [{ text: system ? `${system}\n\n${prompt}` : prompt }];
    if (image) parts.push({ inline_data: { mime_type: image.mimetype, data: image.buffer.toString('base64') } });
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { contents: [{ parts }] }, { timeout: 90000 });
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || '(khali jawab aaya)';
  }
  throw new Error('Unknown provider');
}

async function image(prompt) {
  if (!hasKey('openai')) throw new MissingKey('openai');
  const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  const { data } = await axios.post('https://api.openai.com/v1/images/generations', { model, prompt, size: '1024x1024', n: 1 }, { headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}` }, timeout: 120000 });
  const d = data?.data?.[0];
  if (d?.url) return { url: d.url };
  if (d?.b64_json) return { buffer: Buffer.from(d.b64_json, 'base64') };
  throw new Error('Image nahi mili');
}

module.exports = { ask, image, hasKey, firstAvailable, MissingKey, KEY_NAME };
