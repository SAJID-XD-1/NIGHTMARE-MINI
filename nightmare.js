// NIGHTMARE-MINI command registry
const commands = [];
const watchers = []; // har message par chalne wale hooks (anti-link, anti-bad, ...)

function cmd(info, func) {
  if (!info || typeof info !== 'object') throw new TypeError('Command information must be an object');
  if (typeof func !== 'function') throw new TypeError('Command handler must be a function');

  const data = { ...info, function: func };
  if (!data.pattern && data.cmdname) data.pattern = data.cmdname;
  if (!data.pattern) throw new Error('Command pattern is required');

  data.pattern = String(data.pattern).toLowerCase();
  data.alias = Array.isArray(data.alias) ? data.alias.map((a) => String(a).toLowerCase()) : [];
  data.desc = data.desc || '';
  data.category = String(data.category || 'misc').toUpperCase();

  commands.push(data);
  return data;
}

// fn(sock, msg, ctx) -> true return kare to message yahin ruk jata hai
function onMessage(fn) {
  watchers.push(fn);
}

function findCommand(name) {
  name = String(name || '').toLowerCase();
  if (!name) return undefined;
  return commands.find((c) => c.pattern === name || c.alias.includes(name));
}

module.exports = { cmd, AddCommand: cmd, Function: cmd, commands, watchers, onMessage, findCommand };
