// Settings + chhota key-value store. Restart ke baad bhi yaad rehta hai
// (MongoDB mein; DB na ho to data/settings.json mein).
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');

const FILE = path.join(__dirname, '..', 'data', 'settings.json');
let store = { global: {}, groups: {}, data: {} };
let timer = null;

const Model = () =>
  mongoose.models.Setting ||
  mongoose.model('Setting', new mongoose.Schema({ _id: String, json: String, data: Object }, { versionKey: false, minimize: false }));

const useDB = () => mongoose.connection.readyState === 1;

async function load() {
  try {
    if (useDB()) {
      const d = await Model().findById('main').lean();
      if (d?.json) store = JSON.parse(d.json);
      else if (d?.data) store = d.data;      // purana format
    } else if (fs.existsSync(FILE)) {
      store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Settings load error:', e.message);
  }
  store.global ||= {};
  store.groups ||= {};
  store.data ||= {};
  Object.assign(config, store.global);
}

async function save() {
  clearTimeout(timer);
  try {
    const json = JSON.stringify(store);
    if (useDB()) await Model().updateOne({ _id: 'main' }, { json, $unset: { data: 1 } }, { upsert: true });
    else {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, json);
    }
  } catch (e) {
    console.error('⚠️ Settings save error:', e.message);
  }
}
const saveSoon = () => { clearTimeout(timer); timer = setTimeout(save, 2500); };

async function set(key, value) {
  store.global[key] = value;
  config[key] = value;
  await save();
}

const group = (jid) => store.groups[jid] || {};
async function setGroup(jid, patch) {
  store.groups[jid] = { ...group(jid), ...patch };
  await save();
}

// Generic data (filters, warns, tasks, ...). Value kuch bhi JSON ho sakti hai
const getData = (key, def) => (store.data[key] !== undefined ? store.data[key] : def);
function setData(key, value) { store.data[key] = value; saveSoon(); }
function delData(key) { delete store.data[key]; saveSoon(); }

module.exports = { load, save, set, group, setGroup, getData, setData, delData };
