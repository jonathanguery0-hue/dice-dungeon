// Tests de la méta-progression : XP par carte, dés modifiés, succès, défi du jour, expédition, Histoire.
const test = require('node:test'), assert = require('node:assert');
const {DD, seeded} = require('./load');
const E = DD.engine, M = DD.meta;

function play(S) {
  while (!S.over && S.turn <= 40) { for (const _ of DD.ai.turn(S, S.side)) { S.fx.length = 0; if (S.over) break; } if (!S.over) E.endTurn(S); }
  return S;
}

test('les statistiques du duel attribuent dégâts et éliminations aux bonnes cartes', () => {
  DD.rng = seeded(3);
  const S = play(E.newBattle({mode: 'quick', arenaId: 'grand', playerDeck: DD.DEFAULT_DECK, invocatorId: 'aegis', enemyPresetKey: 'swarm'}));
  const st = S.stats.player, cards = Object.values(st.cards);
  assert.equal(cards.reduce((n, c) => n + c.summoned, 0), st.summons);
  assert.equal(cards.reduce((n, c) => n + c.kills, 0), st.kills);
  assert.ok(st.summons > 0);
});

test('XP par carte : seuils de niveau et gains de fin de duel', () => {
  M.data.cardXp = {};
  assert.equal(M.cardLevel('storm_lynx'), 1);
  M.addCardXp({storm_lynx: 40});
  assert.equal(M.cardLevel('storm_lynx'), 2);
  const ups = M.addCardXp({storm_lynx: 410});
  assert.deepEqual(ups, [{id: 'storm_lynx', before: 2, after: 5}]);
  DD.rng = seeded(9);
  const S = play(E.newBattle({mode: 'quick', arenaId: 'quick', playerDeck: DD.DEFAULT_DECK, invocatorId: 'aegis', enemyPresetKey: 'swarm'}));
  const gains = M.cardXpFromDuel(S);
  for (const [id, xp] of Object.entries(gains)) { assert.ok(DD.ALL[id]); assert.ok(xp > 0); }
});

test('atelier du dé : emplacements limités par le niveau, 3 faces identiques au plus', () => {
  M.data.cardXp = {goblin_raider: 0}; M.data.faces = {};
  assert.ok(M.setFace('goblin_raider', 0, 'move'), 'niveau 1 : aucune modification');
  M.data.cardXp.goblin_raider = 40;                               // niveau 2 : 1 face
  assert.equal(M.setFace('goblin_raider', 4, 'magic'), null);
  assert.ok(M.setFace('goblin_raider', 5, 'magic'), 'une seule face au niveau 2');
  assert.equal(M.facesOf('goblin_raider')[4], 'magic');
  M.data.cardXp.goblin_raider = 250;                              // niveau 4 : 2 faces
  assert.equal(M.setFace('goblin_raider', 0, 'move'), null, '3 ➤ autorisés');
  assert.ok(M.setFace('goblin_raider', 1, 'move'), 'un 4e ➤ est refusé');
  M.resetFaces('goblin_raider');
  assert.deepEqual(M.facesOf('goblin_raider'), DD.MONSTERS.goblin_raider.faces);
});

test('le dé modifié est vraiment utilisé en duel', () => {
  M.data.cardXp = {storm_lynx: 250}; M.data.faces = {storm_lynx: {0: 'attack', 1: 'attack'}};
  const deck = Array(12).fill('storm_lynx').slice(0, 3).concat(DD.DEFAULT_DECK.slice(3));
  DD.rng = seeded(1);
  const S = E.newBattle({mode: 'quick', arenaId: 'quick', playerDeck: deck, invocatorId: 'aegis', enemyPresetKey: 'swarm', playerCards: M.playerCards(deck)});
  assert.deepEqual(E.facesOf(S, 'player', 'storm_lynx').slice(0, 2), ['attack', 'attack']);
  assert.deepEqual(E.facesOf(S, 'enemy', 'storm_lynx'), DD.MONSTERS.storm_lynx.faces, 'le rival garde le dé normal');
  M.data.faces = {}; M.data.cardXp = {};
});

test('défi du jour : même date, même partie', () => {
  const a = M.dailySetup('2026-10-13'), b = M.dailySetup('2026-10-13'), c = M.dailySetup('2026-10-14');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const start = d => { DD.rng = E.seeded(d.seed); const S = E.newBattle({mode: 'daily', arenaId: d.arenaId, enemyPresetKey: d.enemyPreset, playerDeck: DD.DECK_PRESETS[d.playerPreset].deck, invocatorId: d.invocatorId}); E.roll(S, 'player'); return S.player.dice; };
  assert.deepEqual(start(a), start(b));
});

test('expédition : victoire = étage suivant et choix de carte, défaite = fin', () => {
  M.expStart('aegis');
  const fake = (winner, hp) => ({winner, cores: {player: {hp}}});
  let r = M.expAfterBattle(fake('player', 5));
  assert.equal(r.floor, 1); assert.equal(r.hp, 7); assert.equal(r.picks.length, 3);
  M.expPick(r.picks[0]);
  assert.equal(M.data.expedition.deck.length, 13);
  r = M.expAfterBattle(fake('enemy', 0));
  assert.ok(r.over && !r.win); assert.equal(M.data.expedition, null); assert.ok(M.data.expBest >= 1);
});

test('Histoire : étoiles et déblocage des missions', () => {
  M.data.story = {cleared: {}, stars: {}};
  const act = DD.STORY.acts[0], m = act.missions[0];
  assert.ok(M.storyUnlocked(act, 0)); assert.ok(!M.storyUnlocked(act, 1));
  const S = {winner: 'player', turn: 7, stats: {player: {summons: 3, lost: 0, kills: 0}}, relicOwner: null, cores: {player: {hp: 8}}};
  const res = M.storyResult(m, S);
  assert.equal(res.n, 3); assert.ok(res.first);
  assert.ok(M.storyUnlocked(act, 1));
  assert.equal(M.storyStars('act1'), 3);
});

test('succès : déclenchés une seule fois', () => {
  M.data.achievements = {};
  const ctx = {S: {turn: 6, relicOwner: null, cores: {player: {hp: 8}}}, win: true, st: {summons: 5, kills: 0, lost: 0, combos: 0, effects: 0}};
  const ids = M.checkAchievements(ctx).map(a => a.id);
  assert.ok(ids.includes('first_win') && ids.includes('builder') && ids.includes('blitz') && ids.includes('flawless'));
  assert.equal(M.checkAchievements(ctx).length, 0);
});
