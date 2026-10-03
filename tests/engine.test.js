// Tests des règles, sur des situations construites à la main.
const test = require('node:test'), assert = require('node:assert');
const {DD, seeded} = require('./load');
const E = DD.engine;

function battle(seed = 1) {
  DD.rng = seeded(seed);
  return E.newBattle({mode: 'quick', arenaId: 'quick', playerDeck: DD.DEFAULT_DECK, invocatorId: 'aegis', enemyPresetKey: 'swarm'});
}
function floor(S, r, c, owner = 'player', biome = 'citadel') { S.tiles[E.key(r, c)] = {owner, biome, special: null}; }
function put(S, id, side, r, c) {
  floor(S, r, c, side);
  const m = DD.MONSTERS[id];
  const u = {uid: 'u' + (S.nextUid++), id, side, r, c, hp: m.hp, maxHp: m.hp, atk: m.atk, mov: m.mov, shield: 0, attacked: false,
    skillUsed: false, movedSteps: 0, stealthUntil: 0, frozenUntil: 0, wolfGuardUsed: false, bonusMove: 0, empowered: 0, unstable: false, prairieUsed: false};
  S.units.push(u); return u;
}

test('un duel commence avec 3 cartes, sans territoire, Relais neutre au centre', () => {
  const S = battle();
  assert.equal(S.player.hand.length, 3); assert.equal(S.enemy.hand.length, 3);
  assert.deepEqual(Object.keys(S.tiles), [E.key(S.relay.r, S.relay.c)]);
  assert.equal(S.cores.player.hp, 8);   // Aegis
});

test('la première invocation se fait à côté de l’Invocateur et crée 4 cases', () => {
  const S = battle();
  S.player.crests.summon = 1;
  const t = E.summonTargets(S, 'player');
  assert.ok(t.every(([r, c]) => Math.abs(r - S.cores.player.r) + Math.abs(c - S.cores.player.c) === 1));
  assert.equal(E.summonMonster(S, 'player', 'mystic_sage', 3, 1).ok, false, 'coût 2 ◇ pour un niveau 3');
  assert.ok(E.summonMonster(S, 'player', 'storm_lynx', 3, 1).ok);
  assert.equal(S.player.crests.summon, 0);
  assert.equal(Object.values(S.tiles).filter(t => t.owner === 'player').length, 4);
});

test('déplacement : coût en ➤, limité au MOV par tour, réduction du Relais consommée', () => {
  const S = battle();
  const u = put(S, 'storm_lynx', 'player', 0, 0);
  for (let c = 1; c <= 6; c++) floor(S, 0, c);
  S.player.crests.move = 2; S.player.relayDiscount = 1;
  assert.ok(E.moveTargets(S, u.uid).has(E.key(0, 3)), '2 ➤ + 1 gratuit = 3 cases');
  assert.ok(!E.moveTargets(S, u.uid).has(E.key(0, 4)));
  assert.ok(E.move(S, u.uid, 0, 3).ok);
  assert.equal(S.player.crests.move, 0); assert.equal(S.player.relayDiscount, 0);
  S.player.crests.move = 9;
  assert.ok(E.move(S, u.uid, 0, 5).ok);
  assert.equal(E.move(S, u.uid, 0, 6).ok, false, 'MOV 5 épuisé ce tour');
});

test('siège : plafond de 2 dégâts et Barrière sur la première attaque du tour', () => {
  const S = battle();
  const core = S.cores.enemy;
  const u = put(S, 'crimson_drake', 'player', core.r, core.c - 1);
  u.empowered = 2;
  assert.ok(E.attack(S, u.uid, core.r, core.c).ok);
  assert.equal(core.hp, core.maxHp - 1, 'min(2, 2+2) - 1 barrière');
  const v = put(S, 'goblin_raider', 'player', core.r - 1, core.c);
  assert.ok(E.attack(S, v.uid, core.r, core.c).ok);
  assert.equal(core.hp, core.maxHp - 2, 'barrière déjà consommée : 1 dégât (ATQ 2 - 1)');
  assert.equal(E.attack(S, v.uid, core.r, core.c).ok, false, 'une attaque par tour');
});

test('une unité furtive ne peut pas être attaquée ni ciblée, Dispel Wave le peut', () => {
  const S = battle();
  const a = put(S, 'goblin_raider', 'player', 2, 3), b = put(S, 'shadow_imp', 'enemy', 2, 4);
  b.stealthUntil = S.phase + 1;
  assert.deepEqual(E.attackTargets(S, a.uid), []);
  S.player.hand = ['flame_burst', 'dispel_wave']; S.player.crests.magic = 5;
  assert.equal(E.canPlayEffect(S, 'player', 0).ok, false);
  assert.ok(E.playEffect(S, 'player', 1, [[2, 4]]).ok);
  assert.equal(E.isStealthed(S, b), false);
  assert.deepEqual(E.attackTargets(S, a.uid), [[2, 4]]);
});

test('le gel empêche de bouger et d’attaquer pendant le prochain tour du propriétaire', () => {
  const S = battle();
  const a = put(S, 'goblin_raider', 'player', 2, 3), b = put(S, 'storm_lynx', 'enemy', 2, 4);
  S.player.hand = ['frost_bind']; S.player.crests.magic = 2;
  assert.ok(E.playEffect(S, 'player', 0, [[2, 4]]).ok);
  E.endTurn(S);
  assert.equal(E.canAttack(S, b).ok, false);
  E.endTurn(S); E.endTurn(S);
  assert.ok(E.canAttack(S, b).ok, 'dégelé au tour suivant');
});

test('une seule carte Effet par tour, payée en ✦', () => {
  const S = battle();
  S.player.hand = ['treasure_sense', 'war_drum']; S.player.crests.magic = 1;
  assert.ok(E.playEffect(S, 'player', 1).ok);
  assert.equal(S.player.crests.magic, 0); assert.equal(S.player.nextAttackBoost, 2);
  S.player.crests.magic = 3;
  assert.equal(E.playEffect(S, 'player', 0).ok, false);
});

test('Portal Shift rend instable : pas d’attaque sur l’Invocateur ce tour', () => {
  const S = battle();
  const core = S.cores.enemy;
  const u = put(S, 'goblin_raider', 'player', core.r, core.c - 3);
  floor(S, core.r, core.c - 1);
  S.player.hand = ['portal_shift']; S.player.crests.magic = 2;
  assert.ok(E.playEffect(S, 'player', 0, [[u.r, u.c], [core.r, core.c - 1]]).ok);
  assert.deepEqual(E.attackTargets(S, u.uid), []);
});

test('compétence : le combo du lancer est requis et utilisable une fois par recette', () => {
  const S = battle();
  const d = put(S, 'nightblade_stalker', 'player', 2, 3), e = put(S, 'iron_sentinel', 'enemy', 2, 4);
  S.player.rolled = true; S.player.dice = [{id: 'shadow_imp', face: 'attack'}, {id: 'shadow_imp', face: 'move'}, {id: 'shadow_imp', face: 'magic'}];
  assert.ok(E.skillState(S, d.uid).ready);
  assert.ok(E.useSkill(S, d.uid, 2, 4).ok);
  assert.equal(e.hp, 2, 'Exécution : 3 dégâts');
  assert.equal(E.skillState(S, d.uid).ready, false);
});

test('Marche forcée : 2 blasons → 1 ➤, une fois par tour', () => {
  const S = battle();
  S.player.crests.summon = 1; S.player.crests.guard = 2;
  assert.ok(E.forcedMarch(S, 'player', ['summon', 'guard']).ok);
  assert.equal(S.player.crests.move, 1);
  assert.equal(E.forcedMarch(S, 'player', ['guard', 'guard']).ok, false);
});

test('effondrement : à partir du tour 15 chaque Invocateur perd 1 PV à son tour', () => {
  const S = battle();
  while (S.turn < E.COLLAPSE_TURN) E.endTurn(S);
  assert.ok(S.cores.player.hp < S.cores.player.maxHp);
  S.cores.enemy.hp = 1;
  E.endTurn(S);
  assert.equal(S.winner, 'player');
});
