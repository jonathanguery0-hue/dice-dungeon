// Parties complètes IA contre IA : vérifie les invariants des règles après chaque action.
const test = require('node:test'), assert = require('node:assert');
const {DD, seeded} = require('./load');
const E = DD.engine;

function check(S) {
  const seen = new Set();
  for (const s of ['player', 'enemy']) for (const k of DD.CREST_KEYS) {
    const v = S[s].crests[k];
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 9, `blason ${s}.${k}=${v}`);
  }
  for (const s of ['player', 'enemy']) assert.ok(S[s].hand.length <= 5, 'main > 5');
  for (const u of S.units) {
    assert.ok(u.hp > 0 && u.hp <= u.maxHp, `PV ${u.id} ${u.hp}/${u.maxHp}`);
    const k = E.key(u.r, u.c);
    assert.ok(!seen.has(k), 'deux unités sur ' + k); seen.add(k);
    assert.ok(S.tiles[k], `${u.id} hors du donjon en ${k}`);
    assert.ok(!E.coreAt(S, u.r, u.c), 'unité sur un Invocateur');
  }
  JSON.parse(JSON.stringify(S));   // l'état reste sérialisable
}

function playGame(seed, arenaId, deck) {
  DD.rng = seeded(seed);
  const S = E.newBattle({mode: 'quick', arenaId, playerDeck: deck, invocatorId: ['aegis', 'nova', 'vega'][seed % 3]});
  let guard = 0;
  while (!S.over && S.turn <= 40) {
    for (const _ of DD.ai.turn(S, S.side)) { check(S); S.fx.length = 0; if (S.over) break; }
    check(S);
    if (!S.over) E.endTurn(S);
    assert.ok(++guard < 200);
  }
  return S;
}

test('400 parties IA contre IA sans violation de règle', () => {
  const stats = {player: 0, enemy: 0, none: 0, turns: []};
  const arenas = Object.keys(DD.ARENAS), presets = Object.keys(DD.DECK_PRESETS);
  for (let i = 0; i < 400; i++) {
    const S = playGame(1000 + i, arenas[i % arenas.length], DD.DECK_PRESETS[presets[i % presets.length]].deck);
    stats[S.winner || 'none']++; stats.turns.push(S.turn);
  }
  stats.turns.sort((a, b) => a - b);
  console.log('victoires', {joueur: stats.player, rival: stats.enemy, sans_fin: stats.none},
    'tours médian', stats.turns[200], 'max', stats.turns[399]);
  assert.ok(stats.none < 20, 'trop de parties sans fin');
});
