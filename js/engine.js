/* Dice Dungeon — moteur de règles.
   Tout l'état d'un duel tient dans un objet JSON (sauvegardable) ; aucune dépendance au DOM.
   Les deux camps (joueur et IA) passent par les mêmes fonctions : mêmes règles pour tout le monde.
   Chaque action renvoie {ok:true} ou {ok:false,msg} et pousse des évènements visuels dans S.fx. */
(function (DD) {
'use strict';
const {MONSTERS, EFFECTS, SKILLS, ARENAS, INVOCATORS, DECK_PRESETS, CAMPAIGN_MISSIONS, FACE,
  BIOME_BY_MONSTER, CREST_KEYS, ENEMY_INVOCATOR_BY_PRESET, AI_PRESET_KEYS, MAX_CORE, summonCost, summonTier} = DD;

const HAND_LIMIT = 5, START_HAND = 3, CREST_CAP = 9, SIEGE_CAP = 2, COLLAPSE_TURN = 15;
const rng = () => (DD.rng || Math.random)();
/* hasard reproductible : même graine, même suite de nombres (défi du jour) */
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = a => a[Math.floor(rng() * a.length)];
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const key = (r, c) => r + ',' + c;
const unkey = k => k.split(',').map(Number);
const opp = side => side === 'player' ? 'enemy' : 'player';
const dist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
const ok = (extra = {}) => ({ok: true, ...extra});
const fail = msg => ({ok: false, msg});
const who = side => side === 'player' ? 'you' : 'foe';

/* ---------- création d'un duel ---------- */
function newPlayer(deck, invId, extra = {}) {
  const monsters = deck.filter(id => MONSTERS[id]), effects = deck.filter(id => EFFECTS[id]);
  return {faces: extra.faces || {}, hpBonus: extra.hpBonus || {}, costBonus: extra.costBonus || {}, monsterDeck: monsters, monsterBag: shuffle(monsters), effectDeck: shuffle(effects), discard: [], hand: [],
    crests: {summon: 0, move: 0, attack: 0, magic: 0, guard: 0}, dice: [], rolled: false, combosUsed: [], reaction: 0,
    concentrationUsed: false, magicPlayed: false, forcedMarchUsed: false, invId, invPassiveUsed: false,
    firstSummonDone: false, nextAttackBoost: 0, arcaneDiscount: 0, relayDiscount: 0, bonusDieNext: false};
}

function newBattle(opts) {
  const mode = opts.mode || 'quick';
  const mission = mode === 'campaign' ? CAMPAIGN_MISSIONS[opts.missionIndex] : null;
  const arena = ARENAS[mission ? mission.arena : opts.arenaId] || ARENAS.grand;
  const enemyPresetKey = mission ? mission.preset : (opts.enemyPresetKey || pick(AI_PRESET_KEYS));
  const pInv = INVOCATORS[opts.invocatorId] || INVOCATORS.aegis;
  const eInv = INVOCATORS[ENEMY_INVOCATOR_BY_PRESET[enemyPresetKey] || 'aegis'];
  const eHp = opts.enemyHp || (mission ? mission.core : eInv.hp);
  const pHp = opts.playerMaxHp || pInv.hp;
  const S = {
    v: 7, mode, missionIndex: mission ? opts.missionIndex : null, rivalName: opts.rivalName || (mission ? mission.rival.split(' — ')[0] : null),
    meta: opts.meta || null, stats: {player: newStats(), enemy: newStats()}, _src: null, arenaId: arena.id, rows: arena.rows, cols: arena.cols,
    enemyPresetKey, phase: 1, turn: 1, side: 'player', over: false, winner: null,
    relay: {r: arena.relay[0], c: arena.relay[1]}, blocked: arena.blocked.map(([r, c]) => key(r, c)), tiles: {},
    units: [], nextUid: 1, relicOwner: null, activeBiome: 'citadel', eventsDone: [], suddenDeath: false,
    cores: {
      player: {side: 'player', r: arena.coreRow, c: arena.playerCoreCol, hp: Math.min(pHp, opts.playerHp || pHp), maxHp: pHp, barrier: true, invId: pInv.id},
      enemy: {side: 'enemy', r: arena.coreRow, c: arena.enemyCoreCol, hp: eHp, maxHp: eHp, barrier: true, invId: eInv.id}
    },
    player: newPlayer(opts.playerDeck, pInv.id, opts.playerCards),
    enemy: newPlayer(opts.enemyDeck || DECK_PRESETS[enemyPresetKey].deck, eInv.id),
    log: [], fx: []
  };
  for (const [r, c, b] of arena.neutral) addFloor(S, r, c, 'neutral', b || 'citadel');
  addFloor(S, S.relay.r, S.relay.c, 'neutral', 'arcane');
  S.tiles[key(S.relay.r, S.relay.c)].special = 'relic';
  for (let i = 0; i < START_HAND; i++) { drawEffect(S, 'player'); drawEffect(S, 'enemy'); }
  if (opts.enemyDice) S.enemy.diceCount = opts.enemyDice;
  const enemyHand = opts.enemyHand || mission?.mods?.hand || START_HAND;
  while (S.enemy.hand.length < enemyHand && drawEffect(S, 'enemy'));
  if (opts.intro) log(S, opts.intro, 'event');
  else if (mission) {
    log(S, `<b>Campagne — Duel ${S.missionIndex + 1} :</b> ${mission.name}. ${mission.rule}`, 'event');
  } else log(S, `Le rival joue <b>${DECK_PRESETS[enemyPresetKey].name}</b> — ${DECK_PRESETS[enemyPresetKey].subtitle}.`, 'event');
  log(S, `<b>${arena.name}</b> (${arena.size}) — ${arena.desc}`, 'event');
  startTurn(S, 'player');
  return S;
}

/* ---------- statistiques du duel (XP par carte, succès, étoiles) ---------- */
function newStats() { return {cards: {}, summons: 0, kills: 0, lost: 0, combos: 0, coreDmg: 0, effects: 0}; }
function cardStat(S, side, id) {
  const c = S.stats[side].cards;
  return c[id] || (c[id] = {summoned: 0, dmg: 0, kills: 0, coreDmg: 0, combos: 0, played: 0});
}
/* source des dégâts en cours (carte qui agit), pour attribuer l'XP */
function withSource(S, side, id, fn) { const prev = S._src; S._src = {side, id}; try { return fn(); } finally { S._src = prev; } }

/* ---------- accès au plateau ---------- */
function inBounds(S, r, c) { return r >= 0 && r < S.rows && c >= 0 && c < S.cols; }
function isBlocked(S, r, c) { return S.blocked.includes(key(r, c)); }
function tileAt(S, r, c) { return S.tiles[key(r, c)] || null; }
function unitAt(S, r, c) { return S.units.find(u => u.r === r && u.c === c) || null; }
function unitById(S, uid) { return S.units.find(u => u.uid === uid) || null; }
function coreAt(S, r, c) { for (const s of ['player', 'enemy']) { const k = S.cores[s]; if (k.r === r && k.c === c) return k; } return null; }
function biomeAt(S, r, c) { return tileAt(S, r, c)?.biome || 'citadel'; }
function neighbors(S, r, c) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [r + a, c + b]).filter(([a, b]) => inBounds(S, a, b)); }
function adjacent(a, b) { return dist(a, b) === 1; }
function element(u) { return MONSTERS[u.id].element; }
function family(u) { return MONSTERS[u.id].family; }
function isStealthed(S, u) { return u.stealthUntil >= S.phase; }
function isFrozen(S, u) { return u.frozenUntil >= S.phase; }
function unitAtk(S, u) { return u.atk + (S.suddenDeath ? 1 : 0); }
function invocator(S, side) { return INVOCATORS[S.cores[side].invId]; }
/* furtivité / gel : durent jusqu'à la fin du prochain tour de leur propriétaire */
function untilOwnerNextTurn(S, u) { return S.side === u.side ? S.phase + 2 : S.phase + 1; }
function setStealth(S, u) { u.stealthUntil = Math.max(u.stealthUntil, untilOwnerNextTurn(S, u)); }
function setFrozen(S, u) { u.frozenUntil = Math.max(u.frozenUntil, untilOwnerNextTurn(S, u)); }

function addFloor(S, r, c, owner, biome) {
  if (!inBounds(S, r, c) || isBlocked(S, r, c) || coreAt(S, r, c) || S.tiles[key(r, c)]) return false;
  S.tiles[key(r, c)] = {owner, biome, special: null};
  return true;
}

function log(S, msg, cls = '') { S.log.unshift({msg, cls, turn: S.turn}); if (S.log.length > 80) S.log.length = 80; }
function fx(S, e) { S.fx.push(e); }
function float(S, r, c, text, kind) { fx(S, {t: 'float', r, c, text, kind}); }

/* ---------- cartes ---------- */
function canDraw(S, side) { const P = S[side]; return P.hand.length < HAND_LIMIT && (P.effectDeck.length > 0 || P.discard.length > 0); }
function drawEffect(S, side) {
  const P = S[side];
  if (P.hand.length >= HAND_LIMIT) return false;
  if (!P.effectDeck.length) { P.effectDeck = shuffle(P.discard); P.discard = []; }
  if (!P.effectDeck.length) return false;
  P.hand.push(P.effectDeck.shift());
  return true;
}
function controlsBiome(S, side, biome) { return S.units.some(u => u.side === side && biomeAt(S, u.r, u.c) === biome); }
function concentrationCost(S, side) {
  const P = S[side];
  let cost = controlsBiome(S, side, 'arcane') ? 1 : 2;
  if (P.arcaneDiscount) cost = Math.max(1, cost - 1);
  if (P.invId === 'nova' && !P.invPassiveUsed) cost = Math.max(1, cost - 1);
  return cost;
}
function concentrate(S, side) {
  const P = S[side], cost = concentrationCost(S, side);
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (P.concentrationUsed) return fail('Concentration déjà utilisée ce tour.');
  if (!canDraw(S, side)) return fail('Main pleine ou plus aucune carte à piocher.');
  if (P.crests.magic < cost) return fail(`Concentration demande ${cost} ✦.`);
  P.crests.magic -= cost; P.concentrationUsed = true; P.arcaneDiscount = 0;
  if (P.invId === 'nova') P.invPassiveUsed = true;
  drawEffect(S, side);
  log(S, `${side === 'player' ? 'Tu te concentres' : 'Le rival se concentre'} : -${cost} ✦, pioche 1 carte.`, who(side));
  return ok();
}

/* ---------- dés ---------- */
function roll(S, side) {
  const P = S[side];
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (P.rolled) return fail('Tu as déjà lancé les dés ce tour.');
  const count = (P.diceCount || 3) + (P.bonusDieNext ? 1 : 0);
  P.bonusDieNext = false; P.dice = [];
  const forced = P.forcedRoll; P.forcedRoll = null;      // lancer imposé (tutoriel)
  for (let i = 0; i < (forced ? forced.length : count); i++) {
    if (!P.monsterBag.length) P.monsterBag = shuffle(P.monsterDeck);
    const id = forced ? forced[i].id : P.monsterBag.shift(), face = forced ? forced[i].face : pick(facesOf(S, side, id));
    P.dice.push({id, face});
    P.crests[face] = Math.min(CREST_CAP, P.crests[face] + 1);
  }
  P.rolled = true;
  fx(S, {t: 'roll', side, dice: P.dice.map(d => ({...d}))});
  log(S, `${side === 'player' ? 'Tu lances' : 'Le rival lance'} ${P.dice.length} dés : ${P.dice.map(d => FACE[d.face][0]).join(' ')}.`, who(side));
  return ok();
}
function facesOf(S, side, id) { return (S[side].faces && S[side].faces[id]) || MONSTERS[id].faces; }
function rollFaces(S, side) { return S[side].dice.map(d => d.face); }
function hasCombo(S, side, req) {
  const faces = rollFaces(S, side);
  for (const x of req) { const i = faces.indexOf(x); if (i < 0) return false; faces.splice(i, 1); }
  return true;
}
const comboKey = req => [...req].sort().join('+');

/* ---------- invocation ---------- */
function isSummonTarget(S, r, c, side) {
  if (!inBounds(S, r, c) || isBlocked(S, r, c) || tileAt(S, r, c) || unitAt(S, r, c) || coreAt(S, r, c)) return false;
  return neighbors(S, r, c).some(([a, b]) => tileAt(S, a, b)?.owner === side || (S.cores[side].r === a && S.cores[side].c === b));
}
function summonTargets(S, side) {
  const out = [];
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (isSummonTarget(S, r, c, side)) out.push([r, c]);
  return out;
}
function summonRoster(S, side) {
  const P = S[side];
  return [...new Set(P.monsterDeck)].map(id => ({id, cost: summonCost(MONSTERS[id]), copies: P.monsterDeck.filter(x => x === id).length,
    affordable: P.crests.summon >= summonCost(MONSTERS[id])}));
}
function summonMonster(S, side, id, r, c) {
  const P = S[side], m = MONSTERS[id];
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (!m || !P.monsterDeck.includes(id)) return fail('Ce monstre n’est pas dans ton deck.');
  const cost = summonCost(m);
  if (P.crests.summon < cost) return fail(`Il faut ${cost} ◇ pour invoquer ${m.name}.`);
  if (!isSummonTarget(S, r, c, side)) return fail('Case d’invocation invalide.');
  P.crests.summon -= cost;
  placeMonster(S, side, id, r, c);
  return ok();
}
/* crée une unité sur le plateau, sans coût ni effet d'arrivée */
function newUnit(S, side, id, r, c) {
  const m = MONSTERS[id];
  const u = {uid: 'u' + (S.nextUid++), id, side, r, c, hp: m.hp, maxHp: m.hp, atk: m.atk, mov: m.mov, shield: 0,
    attacked: false, skillUsed: false, movedSteps: 0, stealthUntil: 0, frozenUntil: 0, wolfGuardUsed: false,
    bonusMove: 0, empowered: 0, unstable: false, prairieUsed: false};
  S.units.push(u);
  return u;
}
function placeMonster(S, side, id, r, c) {
  const m = MONSTERS[id], P = S[side], biome = BIOME_BY_MONSTER[id] || 'citadel';
  const cells = [];
  if (addFloor(S, r, c, side, biome)) cells.push([r, c]);
  const dirs = side === 'player' ? [[0, 1], [1, 0], [-1, 0]] : [[0, -1], [1, 0], [-1, 0]];
  for (const [a, b] of dirs) if (addFloor(S, r + a, c + b, side, biome)) cells.push([r + a, c + b]);
  for (const [a, b] of cells) maybeSpawnSpecial(S, a, b);
  S.activeBiome = biome;
  const u = newUnit(S, side, id, r, c);
  if (P.invId === 'vega' && !P.firstSummonDone) { u.mov += 1; log(S, `Avant-garde de Vega : ${m.name} gagne +1 MOV.`, who(side)); }
  P.firstSummonDone = true;
  if (P.hpBonus && P.hpBonus[id]) { u.maxHp += P.hpBonus[id]; u.hp += P.hpBonus[id]; }
  cardStat(S, side, id).summoned++; S.stats[side].summons++;
  fx(S, {t: 'summon', side, id, r, c, cells, biome});
  log(S, `${side === 'player' ? 'Tu invoques' : 'Le rival invoque'} <b>${m.name}</b> (${summonTier(m)}).`, who(side));
  applyFamilySummon(S, u);
  if (id === 'crimson_drake') withSource(S, side, id, () => { for (const v of S.units.filter(x => x.side !== side && adjacent(u, x))) dealDamage(S, v, 1); });
  arrive(S, u);
  return u;
}
function maybeSpawnSpecial(S, r, c) {
  const t = tileAt(S, r, c);
  if (!t || t.special || S.noSpecials || rng() > 0.27) return;
  const x = rng();
  t.special = x < 0.34 ? 'treasure' : x < 0.57 ? 'boost' : x < 0.78 ? 'shrine' : 'trap';
}

/* ---------- familles ---------- */
function familyCount(S, side, fam) { return S.units.filter(u => u.side === side && family(u) === fam).length; }
function applyFamilySummon(S, u) {
  const fam = family(u), P = S[u.side];
  if (familyCount(S, u.side, fam) < 2) return;
  const w = who(u.side), name = MONSTERS[u.id].name;
  if (fam === 'Dragon') { u.maxHp++; u.hp++; float(S, u.r, u.c, '+1 PV', 'heal'); log(S, `Lignée Dragon : ${name} gagne +1 PV max.`, w); }
  if (fam === 'Gobelin') { u.bonusMove = Math.max(1, u.bonusMove); log(S, `Meute Gobeline : ${name} gagne 1 pas gratuit.`, w); }
  if (fam === 'Arcane') { P.arcaneDiscount = 1; log(S, 'Conclave Arcanique : prochaine Concentration réduite de 1.', w); }
  if (fam === 'Ombre') { setStealth(S, u); log(S, `Cour d’Ombre : ${name} devient furtif.`, w); }
  if (fam === 'Construct') { u.shield = 1; log(S, `Formation Construct : ${name} gagne une Garde ◆.`, w); }
  if (fam === 'Tempête') { u.empowered = Math.max(1, u.empowered); log(S, `Escadron Tempête : ${name} charge sa prochaine attaque (+1).`, w); }
}
function familyAttackBonus(S, u) {
  const fam = family(u);
  if (fam === 'Gobelin' && S.units.some(v => v !== u && v.side === u.side && family(v) === 'Gobelin' && adjacent(u, v))) return 1;
  if (fam === 'Ombre' && isStealthed(S, u)) return 1;
  return 0;
}

/* ---------- cases spéciales & biomes ---------- */
function arrive(S, u) {
  if (!S.units.includes(u)) return;
  const t = tileAt(S, u.r, u.c), name = MONSTERS[u.id].name, w = who(u.side);
  if (t?.special === 'relic') {
    if (S.relicOwner !== u.side) {
      S.relicOwner = u.side;
      log(S, `${u.side === 'player' ? 'Tu contrôles' : 'Le rival contrôle'} le <b>Relais arcanique</b>.`, w);
      float(S, u.r, u.c, '✦ RELAIS', 'skill');
    }
  } else if (t?.special) {
    const sp = t.special; t.special = null;
    if (sp === 'treasure') { drawEffect(S, u.side); log(S, `${name} ouvre un coffre et pioche une carte Effet.`, w); float(S, u.r, u.c, '+CARTE', 'treasure'); }
    if (sp === 'boost') { S[u.side].bonusDieNext = true; log(S, `${name} active un Nexus : prochain lancer avec 4 dés.`, w); float(S, u.r, u.c, '+1 DÉ', 'skill'); }
    if (sp === 'shrine') { u.hp = Math.min(u.maxHp, u.hp + 2); log(S, `${name} récupère 2 PV au sanctuaire.`, w); float(S, u.r, u.c, '+2', 'heal'); }
    if (sp === 'trap') { log(S, `${name} déclenche un piège.`, w); dealDamage(S, u, 1); }
  }
  if (!S.units.includes(u)) return;
  const b = t?.biome;
  if (b === 'shadow') { setStealth(S, u); float(S, u.r, u.c, '◐', 'skill'); }
  if (b === 'crystal' && t.owner && t.owner !== u.side && rng() < 0.35) {
    setFrozen(S, u); log(S, `${name} est saisi par le gel cristallin !`, 'event'); float(S, u.r, u.c, '❄', 'skill');
  }
}
function biomeAttackBonus(S, u) {
  const b = biomeAt(S, u.r, u.c), el = element(u);
  if (b === 'volcanic' && el === 'Feu') return 1;
  if ((b === 'prairie' || b === 'storm') && el === 'Foudre') return 1;
  return 0;
}

/* ---------- tour ---------- */
function startTurn(S, side) {
  const P = S[side];
  P.rolled = false; P.dice = []; P.combosUsed = []; P.concentrationUsed = false; P.magicPlayed = false; P.forcedMarchUsed = false;
  S.cores[opp(side)].barrier = true;
  for (const u of S.units) u.wolfGuardUsed = false;
  for (const u of S.units.filter(x => x.side === side)) {
    u.empowered = 0; u.attacked = false; u.skillUsed = false; u.movedSteps = 0; u.prairieUsed = false; u.unstable = false;
  }
  if (side === 'player') checkEvents(S);
  if (S.turn >= COLLAPSE_TURN) {             // effondrement : garantit qu'un duel finit toujours
    const core = S.cores[side];
    core.hp = Math.max(0, core.hp - 1);
    float(S, core.r, core.c, '-1 ♥', 'damage');
    log(S, `Le donjon s’effondre : ${side === 'player' ? 'ton Invocateur' : 'l’Invocateur rival'} perd 1 PV.`, 'event');
    if (core.hp <= 0) return endGame(S, opp(side));
  }
  P.relayDiscount = S.relicOwner === side ? 1 : 0;
  for (const u of S.units.filter(x => x.side === side)) {
    const b = biomeAt(S, u.r, u.c);
    if (b === 'mountain' && !u.shield) { u.shield = 1; float(S, u.r, u.c, '◆', 'heal'); }
    if (b === 'volcanic' && element(u) !== 'Feu') { log(S, `${MONSTERS[u.id].name} subit la chaleur volcanique.`, 'event'); dealDamage(S, u, 1); }
  }
  for (const u of S.units.filter(x => x.side === side && family(x) === 'Construct')) {
    if (!u.shield && S.units.some(v => v !== u && v.side === side && family(v) === 'Construct' && adjacent(u, v))) { u.shield = 1; float(S, u.r, u.c, '◆', 'heal'); }
  }
  for (const u of S.units.filter(x => x.side === side && x.id === 'mystic_sage')) {
    const t = S.units.find(v => v.side === side && v.hp < v.maxHp && adjacent(u, v));
    if (t) { t.hp++; float(S, t.r, t.c, '+1', 'heal'); }
  }
}
function checkEvents(S) {
  const once = (n, f) => { if (S.turn >= n && !S.eventsDone.includes(n)) { S.eventsDone.push(n); f(); } };
  once(4, () => {
    const cells = Object.keys(S.tiles).filter(k => !S.tiles[k].special).map(unkey).filter(([r, c]) => !unitAt(S, r, c));
    for (let i = 0; i < 3 && cells.length; i++) { const [r, c] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; S.tiles[key(r, c)].special = 'treasure'; }
    log(S, '⚠ <b>Événement :</b> pluie de coffres — 3 trésors apparaissent.', 'event'); fx(S, {t: 'banner', text: 'Pluie de coffres'});
  });
  once(7, () => {
    S.player.bonusDieNext = true; S.enemy.bonusDieNext = true;
    log(S, '⚠ <b>Événement :</b> tempête de dés — le prochain lancer de chacun utilise 4 dés.', 'event'); fx(S, {t: 'banner', text: 'Tempête de dés'});
  });
  once(10, () => {
    S.suddenDeath = true;
    for (const s of ['player', 'enemy']) S.cores[s].hp = Math.max(1, S.cores[s].hp - 1);
    log(S, '☠ <b>MORT SUBITE :</b> les Invocateurs perdent 1 PV et tous les monstres gagnent +1 ATQ.', 'event'); fx(S, {t: 'banner', text: '☠ Mort subite', danger: true});
  });
  once(COLLAPSE_TURN, () => {
    log(S, '☠ <b>EFFONDREMENT :</b> désormais, chaque Invocateur perd 1 PV au début de son tour.', 'event'); fx(S, {t: 'banner', text: '☠ Effondrement', danger: true});
  });
}
function endTurn(S) {
  if (S.over) return fail('Le duel est terminé.');
  S.phase++; S.side = opp(S.side); S.turn = Math.ceil(S.phase / 2);
  startTurn(S, S.side);
  return ok();
}

/* ---------- déplacement ---------- */
function stepCost(S, u, r, c) { const t = tileAt(S, r, c); return t && t.biome === 'swamp' && t.owner && t.owner !== u.side ? 2 : 1; }
/* Dijkstra sur le donjon : renvoie Map(clé -> coût en pas). */
function reach(S, u, max, weighted = true) {
  const out = new Map(), best = new Map([[key(u.r, u.c), 0]]), q = [[u.r, u.c, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]);
    const [r, c, d] = q.shift();
    if (d !== best.get(key(r, c))) continue;
    if (d > 0) out.set(key(r, c), d);
    for (const [a, b] of neighbors(S, r, c)) {
      if (!tileAt(S, a, b) || unitAt(S, a, b) || coreAt(S, a, b)) continue;
      const nd = d + (weighted ? stepCost(S, u, a, b) : 1), k = key(a, b);
      if (nd <= max && (best.get(k) === undefined || nd < best.get(k))) { best.set(k, nd); q.push([a, b, nd]); }
    }
  }
  return out;
}
function moveDiscounts(S, u) {
  const P = S[u.side];
  return {bonus: u.bonusMove || 0, prairie: biomeAt(S, u.r, u.c) === 'prairie' && !u.prairieUsed ? 1 : 0, relay: P.relayDiscount || 0};
}
function moveBudget(S, u) {
  const d = moveDiscounts(S, u), free = d.bonus + d.prairie + d.relay;
  return {steps: Math.max(0, u.mov - u.movedSteps), free, total: Math.min(Math.max(0, u.mov - u.movedSteps), S[u.side].crests.move + free)};
}
function canMove(S, u) {
  if (!u || S.over || S.side !== u.side) return fail('Ce n’est pas ton tour.');
  if (isFrozen(S, u)) return fail(`${MONSTERS[u.id].name} est gelé.`);
  const b = moveBudget(S, u);
  if (b.steps < 1) return fail(`${MONSTERS[u.id].name} a utilisé tout son mouvement (${u.mov}) ce tour.`);
  if (b.total < 1) return fail('Il te faut au moins 1 ➤ (ou un déplacement gratuit).');
  return ok();
}
function moveTargets(S, uid) {
  const u = unitById(S, uid);
  if (!canMove(S, u).ok) return new Map();
  return reach(S, u, moveBudget(S, u).total);
}
function move(S, uid, r, c) {
  const u = unitById(S, uid), chk = canMove(S, u);
  if (!chk.ok) return chk;
  const steps = moveTargets(S, uid).get(key(r, c));
  if (steps === undefined) return fail('Destination hors de portée.');
  const d = moveDiscounts(S, u), P = S[u.side];
  let free = Math.min(steps, d.bonus + d.prairie + d.relay), used = free;
  const takeBonus = Math.min(used, d.bonus); u.bonusMove -= takeBonus; used -= takeBonus;
  if (used > 0 && d.prairie) { u.prairieUsed = true; used--; }
  if (used > 0 && d.relay) { P.relayDiscount = 0; used--; }
  const cost = steps - free;
  P.crests.move -= cost; u.movedSteps += steps;
  const from = [u.r, u.c];
  u.r = r; u.c = c;
  if (u.id === 'shadow_imp') setStealth(S, u);
  fx(S, {t: 'move', uid, from, to: [r, c]});
  log(S, `${MONSTERS[u.id].name} avance (${cost} ➤${free ? ` · ${free} gratuit` : ''}).`, who(u.side));
  arrive(S, u);
  return ok();
}

/* ---------- combat ---------- */
function dealDamage(S, t, amount) {
  if (amount <= 0 || !S.units.includes(t)) return 0;
  const name = MONSTERS[t.id].name;
  if (t.shield) { t.shield = 0; amount--; log(S, `${name} absorbe 1 dégât grâce à sa Garde ◆.`, 'event'); }
  if (amount > 0 && t.id === 'stone_golem') amount = Math.max(1, amount - 1);
  if (amount > 0 && t.id === 'steel_wolf_knight' && !t.wolfGuardUsed) { amount--; t.wolfGuardUsed = true; }
  if (amount <= 0) { float(S, t.r, t.c, '0', 'block'); return 0; }
  t.hp -= amount;
  float(S, t.r, t.c, '-' + amount, 'damage');
  const src = S._src && S._src.side !== t.side ? S._src : null;
  if (src) cardStat(S, src.side, src.id).dmg += Math.min(amount, amount + t.hp);
  if (t.hp <= 0) {
    S.stats[t.side].lost++;
    if (src) { cardStat(S, src.side, src.id).kills++; S.stats[src.side].kills++; }
    S.units = S.units.filter(x => x !== t);
    fx(S, {t: 'death', r: t.r, c: t.c, id: t.id});
    log(S, `<b>${name}</b> est détruit.`, 'event');
  }
  return amount;
}
function canAttack(S, u) {
  if (!u || S.over || S.side !== u.side) return fail('Ce n’est pas ton tour.');
  if (isFrozen(S, u)) return fail(`${MONSTERS[u.id].name} est gelé.`);
  if (u.attacked) return fail(`${MONSTERS[u.id].name} a déjà attaqué ce tour.`);
  return ok();
}
function attackTargets(S, uid) {
  const u = unitById(S, uid);
  if (!canAttack(S, u).ok) return [];
  const out = S.units.filter(v => v.side !== u.side && adjacent(u, v) && !isStealthed(S, v)).map(v => [v.r, v.c]);
  const core = S.cores[opp(u.side)];
  if (adjacent(u, core) && !u.unstable) out.push([core.r, core.c]);
  return out;
}
/* dégâts prévus (sans le hasard), utile pour l'aperçu et l'IA */
function attackPreview(S, u, r, c) {
  const P = S[u.side], charged = u.empowered + P.nextAttackBoost, bonus = biomeAttackBonus(S, u) + familyAttackBonus(S, u);
  const core = coreAt(S, r, c);
  if (core) {
    const raw = Math.max(1, unitAtk(S, u) - 1) + charged + bonus + (u.id === 'thunder_roc' ? 1 : 0);
    return {core: true, raw, dmg: Math.max(0, Math.min(SIEGE_CAP, raw) - (core.barrier ? 1 : 0))};
  }
  const t = unitAt(S, r, c), block = S[t.side].reaction > 0 && !t.shield ? 1 : 0;
  let dmg = Math.max(0, unitAtk(S, u) + charged + bonus - block);
  if (t.shield && dmg > 0) dmg--;
  if (dmg > 0 && t.id === 'stone_golem') dmg = Math.max(1, dmg - 1);
  if (dmg > 0 && t.id === 'steel_wolf_knight' && !t.wolfGuardUsed) dmg--;
  return {core: false, dmg, kills: dmg >= t.hp};
}
function attack(S, uid, r, c) {
  const u = unitById(S, uid);
  return u ? withSource(S, u.side, u.id, () => attackImpl(S, uid, r, c)) : attackImpl(S, uid, r, c);
}
function attackImpl(S, uid, r, c) {
  const u = unitById(S, uid), chk = canAttack(S, u);
  if (!chk.ok) return chk;
  if (!attackTargets(S, uid).some(([a, b]) => a === r && b === c)) {
    const core = coreAt(S, r, c);
    if (core && u.unstable) return fail(`${MONSTERS[u.id].name} est instable après sa téléportation : il ne peut pas frapper l’Invocateur ce tour.`);
    return fail('Cible invalide : il faut un ennemi adjacent et visible.');
  }
  const P = S[u.side], name = MONSTERS[u.id].name, w = who(u.side), def = opp(u.side);
  const boost = P.nextAttackBoost; P.nextAttackBoost = 0;
  const charged = u.empowered + boost, terrain = biomeAttackBonus(S, u), fam = familyAttackBonus(S, u);
  if (fam) log(S, `${name} : synergie de famille, +1 dégât.`, w);
  if (terrain) log(S, `${name} exploite son terrain : +1 dégât.`, w);
  u.attacked = true; u.empowered = 0;
  if (isStealthed(S, u)) u.stealthUntil = 0;           // attaquer révèle
  fx(S, {t: 'attack', uid, id: u.id, from: [u.r, u.c], to: [r, c]});
  const core = coreAt(S, r, c);
  if (core) {
    const raw = Math.max(1, unitAtk(S, u) - 1) + charged + terrain + fam + (u.id === 'thunder_roc' ? 1 : 0);
    let dmg = Math.min(SIEGE_CAP, raw);
    const barrier = core.barrier;
    if (barrier) { core.barrier = false; dmg = Math.max(0, dmg - 1); }
    core.hp = Math.max(0, core.hp - dmg);
    cardStat(S, u.side, u.id).coreDmg += dmg; S.stats[u.side].coreDmg += dmg;
    float(S, r, c, dmg ? `-${dmg} ♥` : 'BARRIÈRE', dmg ? 'damage' : 'block');
    log(S, `${name} frappe l’Invocateur : ${raw} de puissance${raw > SIEGE_CAP ? ' (plafond 2)' : ''}${barrier ? ', -1 Barrière' : ''} → <b>${dmg} dégât(s)</b>.`, w);
    if (core.hp <= 0) endGame(S, u.side);
    return ok();
  }
  const t = unitAt(S, r, c);
  let block = 0;
  if (S[def].reaction > 0 && !t.shield) { S[def].reaction--; block = 1; log(S, `La Garde préparée ${def === 'player' ? 'de ton camp' : 'du rival'} réduit l’attaque de 1.`, who(def)); }
  const dealt = dealDamage(S, t, Math.max(0, unitAtk(S, u) + charged + terrain + fam - block));
  log(S, `${name} inflige ${dealt} à ${MONSTERS[t.id].name}${charged ? ` (+${charged} chargé)` : ''}.`, w);
  if (u.id === 'crystal_guardian' && S.units.includes(t) && rng() < 0.3) { setFrozen(S, t); log(S, `${MONSTERS[t.id].name} est gelé par le Lien de cristal.`, 'event'); float(S, t.r, t.c, '❄', 'skill'); }
  if (u.id === 'goblin_raider') u.bonusMove = Math.max(1, u.bonusMove);
  return ok();
}
function charge(S, uid) {
  const u = unitById(S, uid), P = u && S[u.side];
  if (!u || S.over || S.side !== u.side) return fail('Ce n’est pas ton tour.');
  if (u.attacked) return fail(`${MONSTERS[u.id].name} a déjà attaqué ce tour.`);
  if (P.crests.attack < 1) return fail('Il faut 1 ⚔ pour charger l’attaque.');
  if (u.empowered >= 2) return fail('Charge déjà au maximum (+2).');
  P.crests.attack--; u.empowered++;
  float(S, u.r, u.c, `⚔ +${u.empowered}`, 'skill');
  log(S, `${MONSTERS[u.id].name} charge son attaque (+${u.empowered}).`, who(u.side));
  return ok();
}
function prepareGuard(S, side) {
  const P = S[side];
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (P.reaction) return fail('Une Garde est déjà prête.');
  if (P.crests.guard < 1) return fail('Il faut 1 ◆.');
  P.crests.guard--; P.reaction = 1;
  log(S, `${side === 'player' ? 'Tu prépares' : 'Le rival prépare'} une Garde ◆ : la prochaine attaque contre un monstre sans Garde est réduite de 1.`, who(side));
  return ok();
}
function forcedMarch(S, side, picks) {
  const P = S[side];
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (P.forcedMarchUsed) return fail('Marche forcée déjà utilisée ce tour.');
  if (!Array.isArray(picks) || picks.length !== 2) return fail('Choisis 2 blasons.');
  const need = {};
  for (const k of picks) need[k] = (need[k] || 0) + 1;
  for (const k in need) if (!CREST_KEYS.includes(k) || P.crests[k] < need[k]) return fail('Blasons insuffisants.');
  for (const k of picks) P.crests[k]--;
  P.crests.move = Math.min(CREST_CAP, P.crests.move + 1); P.forcedMarchUsed = true;
  log(S, `${side === 'player' ? 'Marche forcée' : 'Le rival utilise Marche forcée'} : ${picks.map(k => FACE[k][0]).join(' + ')} → +1 ➤.`, who(side));
  return ok();
}

/* ---------- compétences (combos du lancer) ---------- */
const SKILL_TARGET = {
  boulder_ram: {kind: 'enemy', range: 1}, nightblade_stalker: {kind: 'enemy', range: 1},
  goblin_bombardier: {kind: 'enemy', range: 2}, thunder_roc: {kind: 'enemy', range: 3}, tempest_djinn: {kind: 'enemy', range: 3},
  goblin_raider: {kind: 'dash', range: 3}, storm_lynx: {kind: 'dash', range: 4},
  shadow_imp: {kind: 'blink', range: 3}, void_weaver: {kind: 'blink', range: 4}
};
const NEEDS_ADJ_ENEMY = ['crimson_drake', 'crystal_guardian'];
function visibleEnemiesAround(S, u, range) { return S.units.filter(v => v.side !== u.side && dist(u, v) <= range && !isStealthed(S, v)); }
function skillState(S, uid) {
  const u = unitById(S, uid), sk = u && SKILLS[u.id];
  if (!sk) return {ready: false, msg: 'Aucune compétence.'};
  const P = S[u.side], tgt = SKILL_TARGET[u.id] || null;
  const base = {skill: sk, target: tgt, ready: false};
  if (S.over || S.side !== u.side) return {...base, msg: 'Ce n’est pas ton tour.'};
  if (!P.rolled) return {...base, msg: `Lance les dés : il faut ${sk.req.map(x => FACE[x][0]).join('')} dans le lancer.`};
  if (!hasCombo(S, u.side, sk.req)) return {...base, msg: `Le lancer ne contient pas ${sk.req.map(x => FACE[x][0]).join('')}.`};
  if (P.combosUsed.includes(comboKey(sk.req))) return {...base, msg: 'Cette recette a déjà servi ce tour.'};
  if (u.skillUsed) return {...base, msg: 'Compétence déjà utilisée ce tour.'};
  if (isFrozen(S, u)) return {...base, msg: `${MONSTERS[u.id].name} est gelé.`};
  if (NEEDS_ADJ_ENEMY.includes(u.id) && !visibleEnemiesAround(S, u, 1).length) return {...base, msg: 'Il faut un ennemi adjacent.'};
  if (u.id === 'chronomancer' && !u.attacked) return {...base, msg: 'Rembobinage sert après une attaque.'};
  if (tgt && !skillTargets(S, uid).length) return {...base, msg: 'Aucune cible à portée.'};
  return {...base, ready: true};
}
function skillTargets(S, uid) {
  const u = unitById(S, uid), tgt = u && SKILL_TARGET[u.id];
  if (!tgt) return [];
  if (tgt.kind === 'enemy') return visibleEnemiesAround(S, u, tgt.range).map(v => [v.r, v.c]);
  if (tgt.kind === 'dash') return [...reach(S, u, tgt.range, false).keys()].map(unkey);
  return freeFloorsWithin(S, u, tgt.range);
}
function freeFloorsWithin(S, u, range) {
  return Object.keys(S.tiles).map(unkey).filter(([r, c]) => !unitAt(S, r, c) && !coreAt(S, r, c) && Math.abs(r - u.r) + Math.abs(c - u.c) <= range);
}
function useSkill(S, uid, r, c) {
  const u = unitById(S, uid);
  return u ? withSource(S, u.side, u.id, () => useSkillImpl(S, uid, r, c)) : useSkillImpl(S, uid, r, c);
}
function useSkillImpl(S, uid, r, c) {
  const st = skillState(S, uid);
  if (!st.ready) return fail(st.msg);
  const u = unitById(S, uid), P = S[u.side], sk = st.skill, name = MONSTERS[u.id].name;
  if (st.target && !skillTargets(S, uid).some(([a, b]) => a === r && b === c)) return fail('Cible hors de portée.');
  P.combosUsed.push(comboKey(sk.req)); u.skillUsed = true;
  cardStat(S, u.side, u.id).combos++; S.stats[u.side].combos++;
  fx(S, {t: 'skill', side: u.side, id: u.id, r: u.r, c: u.c, name: sk.name});
  log(S, `${name} déclenche <b>${sk.name}</b>.`, who(u.side));
  const adjEnemies = () => visibleEnemiesAround(S, u, 1);
  const target = st.target?.kind === 'enemy' ? unitAt(S, r, c) : null;
  switch (u.id) {
    case 'crimson_drake': adjEnemies().forEach(v => dealDamage(S, v, 2)); break;
    case 'ember_whelp': u.empowered = Math.min(2, u.empowered + 1); break;
    case 'magma_behemoth': u.shield = 1; adjEnemies().forEach(v => dealDamage(S, v, 2)); break;
    case 'steel_wolf_knight': u.shield = 1; P.reaction = 1; break;
    case 'iron_sentinel': u.hp = Math.min(u.maxHp, u.hp + 1); u.shield = 1; break;
    case 'stone_golem': u.shield = 1; adjEnemies().forEach(v => dealDamage(S, v, 1)); break;
    case 'mystic_sage': S.units.filter(v => v.side === u.side).forEach(v => { if (v.hp < v.maxHp) { v.hp++; float(S, v.r, v.c, '+1', 'heal'); } }); break;
    case 'arcane_familiar': drawEffect(S, u.side); break;
    case 'chronomancer': u.attacked = false; break;
    case 'crystal_guardian': adjEnemies().forEach(v => { setFrozen(S, v); float(S, v.r, v.c, '❄', 'skill'); }); break;
    case 'goblin_shaman': {
      const gob = S.units.filter(v => v.side === u.side && family(v) === 'Gobelin' && v !== u).sort((a, b) => (a.hp - a.maxHp) - (b.hp - b.maxHp))[0] || u;
      gob.hp = Math.min(gob.maxHp, gob.hp + 1); gob.shield = 1; float(S, gob.r, gob.c, '+1 ◆', 'heal'); break;
    }
    case 'boulder_ram': case 'goblin_bombardier': case 'thunder_roc': dealDamage(S, target, 2); break;
    case 'nightblade_stalker': dealDamage(S, target, 3); break;
    case 'tempest_djinn': {
      const chain = S.units.find(v => v.side !== u.side && v !== target && adjacent(v, target) && !isStealthed(S, v));
      dealDamage(S, target, 2); if (chain) dealDamage(S, chain, 1); break;
    }
    case 'goblin_raider': case 'storm_lynx': {
      const from = [u.r, u.c]; u.r = r; u.c = c; fx(S, {t: 'move', uid, from, to: [r, c]}); arrive(S, u); break;
    }
    case 'shadow_imp': case 'void_weaver': {
      u.r = r; u.c = c; setStealth(S, u); u.unstable = true;
      if (u.id === 'shadow_imp') u.empowered = Math.max(1, u.empowered);
      fx(S, {t: 'blink', r, c}); log(S, `${name} est instable : il ne peut pas frapper l’Invocateur ce tour.`, who(u.side));
      arrive(S, u); break;
    }
  }
  return ok();
}

/* ---------- cartes Effet ---------- */
/* étapes de ciblage : 'summon' (case), 'ally', 'enemy', puis 'portal' / 'dash' (destination) */
function effectSteps(id) {
  const k = EFFECTS[id].kind;
  if (k === 'summon' || k === 'dragonSummon') return ['summon'];
  if (k === 'ally') return ['ally'];
  if (k === 'enemy') return ['enemy'];
  if (k === 'portal') return ['ally', 'portal'];
  if (k === 'dash') return ['ally', 'dash'];
  return [];
}
function effectPool(S, side, id) { const d = S[side].monsterDeck; return id === 'dragon_gate' ? d.filter(m => MONSTERS[m].family === 'Dragon') : d; }
function effectCost(S, side, id) { return Math.max(1, EFFECTS[id].cost - ((S[side].costBonus && S[side].costBonus[id]) || 0)); }
function canPlayEffect(S, side, handIndex) {
  const P = S[side], id = P.hand[handIndex], e = EFFECTS[id];
  if (!e) return fail('Carte introuvable.');
  if (S.over || S.side !== side) return fail('Ce n’est pas ton tour.');
  if (P.magicPlayed) return fail('Une seule carte Effet par tour.');
  if (P.crests.magic < effectCost(S, side, id)) return fail(`Il faut ${effectCost(S, side, id)} ✦ pour ${e.name}.`);
  if ((e.kind === 'summon' || e.kind === 'dragonSummon') && !effectPool(S, side, id).length) return fail('Aucun monstre éligible dans ton deck.');
  const first = effectSteps(id)[0];
  if (first && !effectTargets(S, side, id, first).length) return fail('Aucune cible valide pour cette carte.');
  return ok();
}
function effectTargets(S, side, id, step, allyUid) {
  const allies = S.units.filter(u => u.side === side);
  if (step === 'summon') return summonTargets(S, side);
  if (step === 'ally') {
    const k = EFFECTS[id].kind;
    return allies.filter(u => !(k === 'dash' && isFrozen(S, u))).filter(u => k !== 'portal' && k !== 'dash' || effectTargets(S, side, id, k, u.uid).length).map(u => [u.r, u.c]);
  }
  if (step === 'enemy') {
    return S.units.filter(v => v.side !== side && (id === 'dispel_wave' || !isStealthed(S, v)) && allies.some(a => dist(a, v) <= 4)).map(v => [v.r, v.c]);
  }
  const ally = unitById(S, allyUid);
  if (!ally) return [];
  if (step === 'portal') return freeFloorsWithin(S, ally, 3);
  if (step === 'dash') return [...reach(S, ally, 3, false).keys()].map(unkey);
  return [];
}
/* targets : liste de [r,c] dans l'ordre des étapes */
function playEffect(S, side, handIndex, targets = []) {
  const id = S[side].hand[handIndex];
  return id ? withSource(S, side, id, () => playEffectImpl(S, side, handIndex, targets)) : playEffectImpl(S, side, handIndex, targets);
}
function playEffectImpl(S, side, handIndex, targets = []) {
  const chk = canPlayEffect(S, side, handIndex);
  if (!chk.ok) return chk;
  const P = S[side], id = P.hand[handIndex], e = EFFECTS[id], steps = effectSteps(id);
  let ally = null;
  for (let i = 0; i < steps.length; i++) {
    const [r, c] = targets[i] || [];
    const valid = effectTargets(S, side, id, steps[i], ally?.uid).some(([a, b]) => a === r && b === c);
    if (!valid) return fail('Cible invalide.');
    if (steps[i] === 'ally') ally = unitAt(S, r, c);
  }
  P.crests.magic -= effectCost(S, side, id); P.magicPlayed = true;
  cardStat(S, side, id).played++; S.stats[side].effects++;
  P.discard.push(P.hand.splice(handIndex, 1)[0]);
  const [t0, t1] = targets, w = who(side), foe = t0 ? unitAt(S, t0[0], t0[1]) : null;
  const at = t0 || [S.cores[side].r, S.cores[side].c];
  fx(S, {t: 'spell', side, id, r: at[0], c: at[1]});
  log(S, `${side === 'player' ? 'Tu joues' : 'Le rival joue'} <b>${e.name}</b>.`, w);
  const nm = u => MONSTERS[u.id].name;
  switch (id) {
    case 'summon_surge': case 'dragon_gate': placeMonster(S, side, pick(effectPool(S, side, id)), t0[0], t0[1]); break;
    case 'mystic_heal': ally.hp = Math.min(ally.maxHp, ally.hp + 2); float(S, ally.r, ally.c, '+2', 'heal'); break;
    case 'guard_sigil': ally.shield = 1; float(S, ally.r, ally.c, '◆', 'heal'); break;
    case 'shadow_veil': setStealth(S, ally); break;
    case 'smoke_bomb': setStealth(S, ally); ally.bonusMove = Math.max(1, ally.bonusMove); break;
    case 'stone_skin': ally.hp = Math.min(ally.maxHp, ally.hp + 1); ally.shield = 1; float(S, ally.r, ally.c, '+1 ◆', 'heal'); break;
    case 'portal_shift': ally.r = t1[0]; ally.c = t1[1]; ally.unstable = true; fx(S, {t: 'blink', r: t1[0], c: t1[1]});
      log(S, `${nm(ally)} est instable : il ne peut pas frapper l’Invocateur ce tour.`, w); arrive(S, ally); break;
    case 'chain_dash': case 'storm_step': { const from = [ally.r, ally.c]; ally.r = t1[0]; ally.c = t1[1]; fx(S, {t: 'move', uid: ally.uid, from, to: t1}); arrive(S, ally); break; }
    case 'flame_burst': {
      const splash = S.units.filter(v => v.side !== side && v !== foe && adjacent(v, foe));
      dealDamage(S, foe, 2); splash.forEach(v => dealDamage(S, v, 1)); break;
    }
    case 'frost_bind': setFrozen(S, foe); float(S, foe.r, foe.c, '❄', 'skill'); break;
    case 'dispel_wave': foe.shield = 0; foe.stealthUntil = 0; foe.empowered = 0; float(S, foe.r, foe.c, '⊘', 'skill'); break;
    case 'treasure_sense': drawEffect(S, side); break;
    case 'arcane_insight': drawEffect(S, side); drawEffect(S, side); break;
    case 'war_drum': P.nextAttackBoost = 2; break;
  }
  return ok();
}

function endGame(S, winner) {
  if (S.over) return;
  S.over = true; S.winner = winner;
  fx(S, {t: 'over', winner});
  log(S, winner === 'player' ? '<b>Victoire !</b> L’Invocateur rival est détruit.' : '<b>Défaite.</b> Ton Invocateur est tombé.', 'event');
}

DD.engine = {HAND_LIMIT, COLLAPSE_TURN, newUnit, addFloor, facesOf, effectCost, cardStat, seeded, key, unkey, opp, dist, shuffle, newBattle, inBounds, isBlocked, tileAt, unitAt, unitById, coreAt, biomeAt,
  neighbors, adjacent, isStealthed, isFrozen, unitAtk, invocator, canDraw, drawEffect, concentrationCost, concentrate, roll,
  rollFaces, hasCombo, comboKey, isSummonTarget, summonTargets, summonRoster, summonMonster, reach, moveBudget, canMove,
  moveTargets, move, dealDamage, canAttack, attackTargets, attackPreview, attack, charge, prepareGuard, forcedMarch,
  SKILL_TARGET, skillState, skillTargets, useSkill, effectSteps, canPlayEffect, effectTargets, playEffect, endTurn, startTurn,
  biomeAttackBonus, familyAttackBonus};
})(globalThis.DD = globalThis.DD || {});
