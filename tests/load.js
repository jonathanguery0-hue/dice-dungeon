// Charge les scripts du jeu dans Node (ils s'attachent à globalThis.DD comme dans le navigateur).
globalThis.DD = {};
for (const f of ['data', 'art', 'engine', 'ai']) require(`../js/${f}.js`);
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
module.exports = {DD: globalThis.DD, seeded};
