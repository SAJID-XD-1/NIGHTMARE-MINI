// Plugins load karta hai aur multi-number manager export karta hai.
const fs = require('fs');
const path = require('path');
const { commands } = require('./nightmare');
const manager = require('./lib/sessions');

function loadPlugins() {
  const folder = path.join(__dirname, 'plugins');
  if (!fs.existsSync(folder)) return;
  for (const file of fs.readdirSync(folder)) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    try {
      require(path.join(folder, file));
      console.log(`🔌 Plugin loaded: ${file}`);
    } catch (e) {
      console.error(`❌ Plugin load FAILED (${file}):`, e.message);
    }
  }
  console.log(`📦 Total commands: ${commands.length}`);
}
loadPlugins();

module.exports = { startBot: manager.bootAll, ...manager };
