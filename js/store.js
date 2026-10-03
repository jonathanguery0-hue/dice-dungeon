/* Dice Dungeon — sauvegardes locales et progression du joueur.
   Les clés reprennent celles des versions précédentes : niveau, deck et campagne sont conservés. */
(function (DD) {
'use strict';
const {LEVEL_XP, LEVEL_UNLOCKS, MAX_PLAYER_LEVEL, ALL, MONSTERS, EFFECTS, INVOCATORS, DEFAULT_DECK, copyLimitFor} = DD;
const KEYS = {profile: 'diceDungeonProfileV63', deck: 'diceDungeonDeck', campaign: 'diceDungeonCampaignV50', arena: 'diceDungeonArenaV54',
  invocator: 'diceDungeonInvocatorV60', audio: 'diceDungeonAudioV45', settings: 'diceDungeonSettingsV7', battle: 'diceDungeonBattleV7'};

function read(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch (e) { return fallback; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : on continue sans sauvegarde */ } }
function remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
function readRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

/* ---------- profil & déblocages ---------- */
const profile = Object.assign({xp: 0, matches: 0, wins: 0, losses: 0}, read(KEYS.profile, {}));
if (!Number.isFinite(profile.xp)) profile.xp = 0;
function level(xp = profile.xp) { let l = 1; for (let i = 2; i <= MAX_PLAYER_LEVEL; i++) { if (xp >= LEVEL_XP[i]) l = i; else break; } return l; }
function unlockLevelFor(id, type) {
  for (let l = 1; l <= MAX_PLAYER_LEVEL; l++) {
    const u = LEVEL_UNLOCKS[l] || {};
    if (type === 'invocator' ? (u.invocators || []).includes(id) : [...(u.monsters || []), ...(u.effects || [])].includes(id)) return l;
  }
  return 1;
}
const isUnlocked = id => level() >= unlockLevelFor(id);
const isInvocatorUnlocked = id => level() >= unlockLevelFor(id, 'invocator');
function unlocksAtLevel(l) {
  const u = LEVEL_UNLOCKS[l] || {};
  return [...(u.invocators || []).map(id => `Champion ${INVOCATORS[id].name}`), ...(u.monsters || []).map(id => `Monstre ${ALL[id].name}`),
    ...(u.effects || []).map(id => `Sort ${ALL[id].name}`)];
}
function nextUnlockLevel() { for (let l = level() + 1; l <= MAX_PLAYER_LEVEL; l++) if (unlocksAtLevel(l).length) return l; return null; }
function xpProgress() {
  const l = level(), base = LEVEL_XP[l] || 0;
  if (l >= MAX_PLAYER_LEVEL) return {level: l, cur: profile.xp - base, span: 0, pct: 100};
  const span = LEVEL_XP[l + 1] - base;
  return {level: l, cur: profile.xp - base, span, pct: Math.min(100, (profile.xp - base) / span * 100)};
}
function awardXp(win, mode, firstClear, turn) {
  const before = level();
  const base = mode === 'campaign' ? (win ? 170 : 85) : (win ? 140 : 70);
  const speed = win ? Math.max(0, 30 - Math.max(0, turn - 4) * 3) : 0;
  const gained = base + speed + (firstClear ? 50 : 0);
  profile.xp += gained; profile.matches++; if (win) profile.wins++; else profile.losses++;
  write(KEYS.profile, profile);
  const after = level(), unlocks = [];
  for (let l = before + 1; l <= after; l++) unlocks.push(...unlocksAtLevel(l));
  return {gained, before, after, unlocks};
}

/* ---------- deck ---------- */
function countBy(a) { return a.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {}); }
function deckIssues(d) {
  const out = [], m = d.filter(id => MONSTERS[id]).length, e = d.filter(id => EFFECTS[id]).length;
  if (m !== 12) out.push(`${m}/12 monstres`);
  if (e !== 8) out.push(`${e}/8 effets`);
  for (const [id, n] of Object.entries(countBy(d))) {
    if (!ALL[id]) out.push(`carte inconnue ${id}`);
    else if (n > copyLimitFor(id)) out.push(`${ALL[id].name} : ${copyLimitFor(id)} exemplaires max`);
    else if (!isUnlocked(id)) out.push(`${ALL[id].name} verrouillé`);
  }
  return out;
}
const validDeck = d => Array.isArray(d) && d.length === 20 && !deckIssues(d).length;
function loadDeck() { const d = read(KEYS.deck, null); return validDeck(d) ? d : [...DEFAULT_DECK]; }
function saveDeck(d) { write(KEYS.deck, d); }
function sameDeck(a, b) { if (a.length !== b.length) return false; const ca = countBy(a), cb = countBy(b); return Object.keys(ca).every(k => ca[k] === cb[k]); }
function detectPreset(d) { for (const [k, p] of Object.entries(DD.DECK_PRESETS)) if (sameDeck(d, p.deck)) return k; return 'custom'; }
function presetRequiredLevel(p) { return Math.max(1, ...p.deck.map(id => unlockLevelFor(id))); }

/* ---------- campagne ---------- */
const campaign = Object.assign({cleared: [], best: {}, wins: 0}, read(KEYS.campaign, {}));
if (!Array.isArray(campaign.cleared)) campaign.cleared = [];
const missionUnlocked = i => i === 0 || campaign.cleared.includes(i - 1) || campaign.cleared.includes(i);
function clearMission(i, turn) {
  const first = !campaign.cleared.includes(i);
  if (first) { campaign.cleared.push(i); campaign.cleared.sort((a, b) => a - b); campaign.wins = (campaign.wins || 0) + 1; }
  campaign.best[i] = Math.min(campaign.best[i] || 999, turn);
  write(KEYS.campaign, campaign);
  return first;
}
function resetCampaign() { campaign.cleared = []; campaign.best = {}; campaign.wins = 0; write(KEYS.campaign, campaign); }
const campaignRank = () => ['Novice', 'Tacticien', 'Gardien', 'Arcaniste', 'Seigneur', 'Maître', 'Champion', 'Légende'][Math.min(7, campaign.cleared.length)];

/* ---------- préférences & duel en cours ---------- */
const settings = Object.assign({arena: readRaw(KEYS.arena) || 'grand', invocator: readRaw(KEYS.invocator) || 'aegis', speed: 1, vibrate: true},
  read(KEYS.settings, {}));
if (!DD.ARENAS[settings.arena]) settings.arena = 'grand';
if (!INVOCATORS[settings.invocator] || !isInvocatorUnlocked(settings.invocator)) settings.invocator = 'aegis';
function saveSettings() { write(KEYS.settings, settings); }
const audioPref = Object.assign({muted: false, volume: .42}, read(KEYS.audio, {}));
function saveAudio() { write(KEYS.audio, audioPref); }
function saveBattle(S) { if (!S || S.over) return remove(KEYS.battle); write(KEYS.battle, {...S, fx: []}); }
function loadBattle() { const S = read(KEYS.battle, null); return S && S.v === 7 && !S.over ? S : null; }
function clearBattle() { remove(KEYS.battle); }

DD.store = {profile, level, unlockLevelFor, isUnlocked, isInvocatorUnlocked, unlocksAtLevel, nextUnlockLevel, xpProgress, awardXp,
  countBy, deckIssues, validDeck, loadDeck, saveDeck, detectPreset, presetRequiredLevel,
  campaign, missionUnlocked, clearMission, resetCampaign, campaignRank,
  settings, saveSettings, audioPref, saveAudio, saveBattle, loadBattle, clearBattle};
})(globalThis.DD = globalThis.DD || {});
