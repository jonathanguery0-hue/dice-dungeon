/* Dice Dungeon — méta-progression : XP par carte, dés améliorés, succès, skins de dés,
   défi du jour, expédition et progression du mode Histoire.
   Tout est sauvegardé sur l'appareil (localStorage), à côté du niveau du joueur. */
(function (DD) {
'use strict';
const {MONSTERS, EFFECTS, ALL, DECK_PRESETS, ARENAS, AI_PRESET_KEYS, INVOCATORS, CREST_KEYS} = DD;
const KEY = 'diceDungeonMetaV8';

function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
const data = Object.assign({cardXp: {}, faces: {}, achievements: {}, skin: 'ivory', story: {cleared: {}, stars: {}}, daily: {},
  expedition: null, expBest: 0, totals: {wins: 0, duels: 0}}, read());
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* stockage indisponible */ } }

/* ================= XP par carte ================= */
const CARD_LEVEL_XP = [0, 40, 120, 250, 450];        // seuils des niveaux 1 à 5
const MAX_CARD_LEVEL = 5;
function cardLevel(id) { const xp = data.cardXp[id] || 0; let l = 1; for (let i = 1; i < CARD_LEVEL_XP.length; i++) if (xp >= CARD_LEVEL_XP[i]) l = i + 1; return l; }
function cardProgress(id) {
  const xp = data.cardXp[id] || 0, l = cardLevel(id);
  if (l >= MAX_CARD_LEVEL) return {level: l, xp, cur: 0, span: 0, pct: 100};
  const base = CARD_LEVEL_XP[l - 1], next = CARD_LEVEL_XP[l];
  return {level: l, xp, cur: xp - base, span: next - base, pct: (xp - base) / (next - base) * 100};
}
const stars = l => '★'.repeat(l) + '☆'.repeat(MAX_CARD_LEVEL - l);
/* faces modifiables : 1 au niveau 2, 2 au niveau 4 (monstres seulement) */
function faceSlots(id) { if (!MONSTERS[id]) return 0; const l = cardLevel(id); return l >= 4 ? 2 : l >= 2 ? 1 : 0; }
function facesOf(id) {
  const base = [...MONSTERS[id].faces], mods = data.faces[id] || {};
  for (const [i, f] of Object.entries(mods)) base[+i] = f;
  return base;
}
function canSetFace(id, index, face) {
  const mods = data.faces[id] || {};
  if (!CREST_KEYS.includes(face) || index < 0 || index > 5) return 'Face invalide.';
  if (!(index in mods) && Object.keys(mods).length >= faceSlots(id)) return 'Plus de modification disponible : monte la carte de niveau.';
  const next = facesOf(id); next[index] = face;
  if (next.filter(f => f === face).length > 3) return 'Maximum 3 faces identiques sur un dé.';
  return null;
}
function setFace(id, index, face) {
  const err = canSetFace(id, index, face); if (err) return err;
  data.faces[id] = data.faces[id] || {};
  if (MONSTERS[id].faces[index] === face) delete data.faces[id][index]; else data.faces[id][index] = face;
  save(); return null;
}
function resetFaces(id) { delete data.faces[id]; save(); }
/* bonus appliqués en duel : dés modifiés, +1 PV (monstre ★5), -1 ✦ (effet ★5). flat = défi du jour */
function playerCards(deck, flat) {
  if (flat) return {};
  const out = {faces: {}, hpBonus: {}, costBonus: {}};
  for (const id of new Set(deck)) {
    if (MONSTERS[id] && data.faces[id] && Object.keys(data.faces[id]).length) out.faces[id] = facesOf(id);
    if (cardLevel(id) >= MAX_CARD_LEVEL) { if (MONSTERS[id]) out.hpBonus[id] = 1; else out.costBonus[id] = 1; }
  }
  return out;
}
function levelPerk(id, l) {
  if (MONSTERS[id]) return {2: 'Modifie 1 face de son dé', 3: 'Cadre argenté', 4: 'Modifie une 2e face', 5: 'Carte dorée · +1 PV max'}[l];
  return {2: 'Brille un peu plus', 3: 'Cadre argenté', 4: 'Lueur de maître', 5: 'Carte dorée · coûte 1 ✦ de moins'}[l];
}
/* XP gagnée par chaque carte du joueur à la fin d'un duel */
const CARD_XP_CAP = 60;                                   // maximum gagné par une carte en un duel
function cardXpFromDuel(S) {
  const st = S.stats.player, win = S.winner === 'player', out = {};
  for (const [id, c] of Object.entries(st.cards)) {
    if (!DD.store.isUnlocked(id)) continue;               // deck imposé (défi du jour) : seules tes cartes progressent
    let xp = 0;
    if (MONSTERS[id]) {
      xp = c.summoned * 4 + c.dmg + c.kills * 6 + c.coreDmg * 8 + c.combos * 4;
      if (win && S.units.some(u => u.side === 'player' && u.id === id)) xp += 6;
    } else xp = c.played * 5 + (win && c.played ? 3 : 0);
    xp = Math.min(CARD_XP_CAP, xp);
    if (xp > 0) out[id] = xp;
  }
  return out;
}
function addCardXp(gains) {
  const ups = [];
  for (const [id, xp] of Object.entries(gains)) {
    const before = cardLevel(id);
    data.cardXp[id] = (data.cardXp[id] || 0) + xp;
    const after = cardLevel(id);
    if (after > before) ups.push({id, before, after});
  }
  save(); return ups;
}

/* ================= skins de dés ================= */
const SKINS = {
  ivory: {name: 'Ivoire', desc: 'Les dés de départ.'},
  obsidian: {name: 'Obsidienne', desc: 'Défi du jour : 3 jours d’affilée.'},
  jade: {name: 'Jade', desc: 'Termine l’Acte I de l’Histoire.'},
  crystal: {name: 'Cristal', desc: '10 victoires.'},
  ember: {name: 'Braise', desc: 'Termine une Expédition.'},
  gold: {name: 'Or', desc: '12 étoiles sur l’Acte I.'}
};
const skinUnlocked = s => s === 'ivory' || Object.values(ACHIEVEMENTS).some(a => a.skin === s && data.achievements[a.id]);
function setSkin(s) { if (SKINS[s] && skinUnlocked(s)) { data.skin = s; save(); } }

/* ================= succès ================= */
const ACH = [
  {id: 'first_win', icon: '⚔', name: 'Premier sang', desc: 'Gagne un duel.', duel: c => c.win},
  {id: 'builder', icon: '◇', name: 'Architecte', desc: 'Invoque 5 monstres dans un même duel.', duel: c => c.st.summons >= 5},
  {id: 'slayer', icon: '✖', name: 'Chasseur', desc: 'Détruis 5 monstres dans un même duel.', duel: c => c.st.kills >= 5},
  {id: 'flawless', icon: '◆', name: 'Intouchable', desc: 'Gagne sans perdre un seul monstre.', duel: c => c.win && c.st.summons > 0 && c.st.lost === 0},
  {id: 'blitz', icon: 'ϟ', name: 'Éclair', desc: 'Gagne en 8 tours ou moins.', duel: c => c.win && c.S.turn <= 8},
  {id: 'combo', icon: '✦', name: 'Virtuose', desc: 'Utilise 3 combos dans un même duel.', duel: c => c.st.combos >= 3},
  {id: 'relay', icon: '✧', name: 'Maître du Relais', desc: 'Gagne en contrôlant le Relais.', duel: c => c.win && c.S.relicOwner === 'player'},
  {id: 'underdog', icon: '♥', name: 'Sur le fil', desc: 'Gagne avec ton Invocateur à 1 ou 2 PV.', duel: c => c.win && c.S.cores.player.hp <= 2},
  {id: 'mage', icon: '📖', name: 'Grimoire', desc: 'Joue 4 cartes Effet dans un même duel.', duel: c => c.st.effects >= 4},
  {id: 'veteran', icon: '🏅', name: 'Vétéran', desc: 'Gagne 10 duels.', skin: 'crystal', check: () => data.totals.wins >= 10},
  {id: 'master', icon: '★', name: 'Maîtrise', desc: 'Monte une carte au niveau ★★★★★.', check: () => Object.keys(data.cardXp).some(id => cardLevel(id) >= 5)},
  {id: 'act1', icon: '🐸', name: 'Roi des Marais', desc: 'Termine l’Acte I de l’Histoire.', skin: 'jade', check: () => storyActCleared('act1')},
  {id: 'act1_stars', icon: '🌟', name: 'Perfectionniste', desc: 'Obtiens les 12 étoiles de l’Acte I.', skin: 'gold', check: () => storyStars('act1') >= 12},
  {id: 'streak3', icon: '🔥', name: 'Fidèle au poste', desc: 'Joue le Défi du jour 3 jours d’affilée.', skin: 'obsidian', check: () => dailyStreak() >= 3},
  {id: 'exp_win', icon: '🗺', name: 'Explorateur', desc: 'Termine une Expédition (6 étages).', skin: 'ember', check: () => data.expBest >= 6},
  {id: 'campaign', icon: '👑', name: 'Champion', desc: 'Termine les 7 duels de la Campagne.', check: () => DD.store.campaign.cleared.length >= 7}
];
const ACHIEVEMENTS = Object.fromEntries(ACH.map(a => [a.id, a]));
function checkAchievements(ctx) {
  const got = [];
  for (const a of ACH) {
    if (data.achievements[a.id]) continue;
    const ok = a.duel ? (ctx && a.duel(ctx)) : a.check();
    if (ok) { data.achievements[a.id] = new Date().toISOString().slice(0, 10); got.push(a); }
  }
  if (got.length) save();
  return got;
}

/* ================= Histoire ================= */
function storyMissionCleared(id) { return !!data.story.cleared[id]; }
function storyActCleared(actId) { const act = DD.STORY?.acts.find(a => a.id === actId); return !!act && act.missions.every(m => data.story.cleared[m.id]); }
function storyStars(actId) { const act = DD.STORY?.acts.find(a => a.id === actId); return act ? act.missions.reduce((n, m) => n + (data.story.stars[m.id] || 0), 0) : 0; }
function storyUnlocked(act, i) { return i === 0 || !!data.story.cleared[act.missions[i - 1].id]; }
function storyResult(m, S) {
  const win = S.winner === 'player';
  const got = [win, win && m.bonus.check(S), win && S.turn <= m.fastTurns];
  const n = got.filter(Boolean).length;
  const first = win && !data.story.cleared[m.id];
  if (win) data.story.cleared[m.id] = true;
  data.story.stars[m.id] = Math.max(data.story.stars[m.id] || 0, n);
  save();
  return {got, n, first};
}
function storyNext() {
  for (const act of DD.STORY?.acts || []) {
    if (act.soon) continue;
    const i = act.missions.findIndex(m => !data.story.cleared[m.id]);
    if (i >= 0) return {act, i};
  }
  return null;
}

/* ================= Défi du jour ================= */
function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/* même défi pour tout le monde le même jour : tiré d'une graine calculée depuis la date */
function dailySetup(key = dayKey()) {
  const seed = hash('dice-dungeon:' + key), r = DD.engine.seeded(seed), pickOne = a => a[Math.floor(r() * a.length)];
  const presets = Object.keys(DECK_PRESETS).filter(k => k !== 'starter');
  const playerPreset = pickOne(presets);
  const enemyPreset = pickOne(AI_PRESET_KEYS.filter(k => k !== playerPreset));
  return {key, seed, arenaId: pickOne(Object.keys(ARENAS)), playerPreset, enemyPreset, invocatorId: pickOne(Object.keys(INVOCATORS))};
}
function dailyScore(S) {
  const st = S.stats.player, win = S.winner === 'player';
  if (win) return 1000 + Math.max(0, 20 - S.turn) * 40 + S.cores.player.hp * 30 + st.kills * 15 - st.lost * 10;
  return st.kills * 15 + (S.cores.enemy.maxHp - S.cores.enemy.hp) * 40;
}
function dailyRecord(key, score, win, turn) {
  const prev = data.daily[key];
  const best = !prev || score > prev.score;
  if (best) data.daily[key] = {score, win, turn};
  save(); return {best, prev: prev ? prev.score : null};
}
function dailyStreak() {
  let n = 0; const d = new Date();
  if (!data.daily[dayKey(d)]) d.setDate(d.getDate() - 1);          // la série tient jusqu'à ce soir
  while (data.daily[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ================= Expédition ================= */
const EXP_FLOORS = [
  {hp: 4, hand: 2, name: 'Couloir des Rats'}, {hp: 5, hand: 3, name: 'Salle des Échos'}, {hp: 5, hand: 3, name: 'Pont Branlant'},
  {hp: 6, hand: 4, name: 'Crypte Humide'}, {hp: 7, hand: 4, name: 'Antre du Trésor'}, {hp: 8, hand: 5, name: 'Trône du Gardien', boss: true}
];
const EXP_START = ['ember_whelp', 'steel_wolf_knight', 'mystic_sage', 'goblin_raider', 'shadow_imp', 'storm_lynx', 'storm_lynx', 'goblin_raider',
  'mystic_heal', 'guard_sigil', 'summon_surge', 'treasure_sense'];
function expStart(invocatorId) {
  const maxHp = INVOCATORS[invocatorId].hp;
  data.expedition = {floor: 0, hp: maxHp, maxHp, deck: [...EXP_START], invocatorId, picks: null};
  save(); return data.expedition;
}
function expFloor() { return data.expedition ? EXP_FLOORS[data.expedition.floor] : null; }
function expOffer() {
  const pool = Object.keys(ALL).filter(id => DD.store.isUnlocked(id) && id !== 'dragon_gate');
  const out = new Set(); let guard = 0;
  while (out.size < 3 && guard++ < 200) {
    const wantMonster = out.size < 2;
    const cand = pool.filter(id => !!MONSTERS[id] === wantMonster);
    out.add(cand[Math.floor(Math.random() * cand.length)]);
  }
  return [...out];
}
/* après un combat : victoire = étage suivant + soin + choix de carte ; défaite = fin */
function expAfterBattle(S) {
  const e = data.expedition; if (!e) return null;
  const win = S.winner === 'player';
  if (!win) { const reached = e.floor; data.expBest = Math.max(data.expBest, reached); data.expedition = null; save(); return {over: true, win: false, reached}; }
  e.floor++;
  data.expBest = Math.max(data.expBest, e.floor);
  if (e.floor >= EXP_FLOORS.length) { data.expedition = null; save(); return {over: true, win: true, reached: e.floor}; }
  e.hp = Math.min(e.maxHp, S.cores.player.hp + 2);
  e.picks = expOffer();
  save(); return {over: false, win: true, floor: e.floor, hp: e.hp, picks: e.picks};
}
function expPick(id) {
  const e = data.expedition; if (!e) return;
  if (id && e.picks && e.picks.includes(id)) e.deck.push(id);
  e.picks = null; save();
}
function expAbandon() { if (data.expedition) data.expBest = Math.max(data.expBest, data.expedition.floor); data.expedition = null; save(); }

function recordDuel(win) { data.totals.duels++; if (win) data.totals.wins++; save(); }

DD.meta = {data, save, CARD_LEVEL_XP, MAX_CARD_LEVEL, cardLevel, cardProgress, stars, faceSlots, facesOf, canSetFace, setFace, resetFaces,
  playerCards, levelPerk, cardXpFromDuel, addCardXp, SKINS, skinUnlocked, setSkin, ACH, ACHIEVEMENTS, checkAchievements,
  storyMissionCleared, storyActCleared, storyStars, storyUnlocked, storyResult, storyNext,
  dayKey, dailySetup, dailyScore, dailyRecord, dailyStreak,
  EXP_FLOORS, expStart, expFloor, expOffer, expAfterBattle, expPick, expAbandon, recordDuel};
})(globalThis.DD = globalThis.DD || {});
