// JID helpers. Naye WhatsApp mein group participants ki id kabhi phone number hoti hai, kabhi @lid.
// Isliye har participant aur har user ki saari pehchaanein (id, jid, phoneNumber, lid) ek saath match karte hain.
const digits = (j = '') => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');

const isAdminParticipant = (p) => p.admin === 'admin' || p.admin === 'superadmin' || p.isAdmin === true || p.isSuperAdmin === true;

// Participant ki saari pehchaanein (digits)
const participantIds = (p) =>
  new Set([p.id, p.jid, p.phoneNumber, p.pn, p.lid, p.participant].filter(Boolean).map(digits).filter(Boolean));

// Bot ki apni saari pehchaanein (phone + lid)
function botIds(sock) {
  const me = sock.user || {};
  const credsMe = sock.authState?.creds?.me || {};
  return new Set([me.id, me.lid, me.jid, credsMe.id, credsMe.lid].filter(Boolean).map(digits).filter(Boolean));
}

// participants me se admin kaun hain? -> Set of digit-ids (har admin ki saari pehchaanein)
function adminIdSet(participants = []) {
  const set = new Set();
  for (const p of participants) if (isAdminParticipant(p)) for (const id of participantIds(p)) set.add(id);
  return set;
}

const anyIn = (ids, set) => [...ids].some((id) => set.has(id));

module.exports = { digits, isAdminParticipant, participantIds, botIds, adminIdSet, anyIn };
