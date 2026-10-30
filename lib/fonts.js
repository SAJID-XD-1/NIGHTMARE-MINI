const letters = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ',
    e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ',
    i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ',
    m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴩ',
    q: 'q', r: 'ʀ', s: 'ꜱ', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
    y: 'ʏ', z: 'ᴢ'
};

function nightmareFont(text) {
    return String(text).replace(/[A-Za-z]+/g, word => {
        return word[0].toUpperCase() +
            word.slice(1).toLowerCase()
                .split('')
                .map(char => letters[char] || char)
                .join('');
    });
}

module.exports = { nightmareFont };
