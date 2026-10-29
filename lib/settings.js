// Settings ko restart ke baad bhi yaad rakhta hai (MongoDB mein; DB na ho to data/settings.json mein)
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');

const FILE = path.join(__dirname, '..', 'data', 'settings.json');
let store = { global: {}, groups: {} };

const Model = () =>
  mongoose.models.Setting ||
  mongoose.model('Setting', new mongoose.Schema({ _id: String, data: Object }, { versionKey: false, minimize: false }));

const useDB = () => mongoose.connection.readyState === 1;
const gkey = (jid) => String(jid).replace(/\./g, '_');

async function load() {
  try {
    if (useDB()) {
      const d = await Model().findById('main').lean();
      if (d?.data) store = d.data;
    } else if (fs.existsSync(FILE)) {
      store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Settings load error:', e.message);
  }
  store.global ||= {};
  store.groups ||= {};
  Object.assign(config, store.global);
}

async function save() {
  try {
    if (useDB()) await Model().updateOne({ _id: 'main' }, { data: store }, { upsert: true });
    else {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
    }
  } catch (e) {
    console.error('⚠️ Settings save error:', e.message);
  }
}

async function set(key, value) {
  store.global[key] = value;
  config[key] = value;
  await save();
}

const group = (jid) => store.groups[gkey(jid)] || {};
async function setGroup(jid, patch) {
  store.groups[gkey(jid)] = { ...group(jid), ...patch };
  await save();
}

module.exports = { load, set, group, setGroup };
