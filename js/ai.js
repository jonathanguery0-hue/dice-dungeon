/* Dice Dungeon — IA du rival.
   L'IA n'a aucun privilège : elle n'agit qu'à travers les fonctions du moteur (DD.engine),
   donc avec exactement les mêmes règles que le joueur.
   turn(S) est un générateur : chaque yield correspond à une action visible, l'interface
   l'anime puis reprend. Les tests l'itèrent d'un trait. */
(function (DD) {
'use strict';
const E = DD.engine, {MONSTERS, EFFECTS, DECK_PRESETS, AI_PERSONALITY, summonCost} = DD;
let SIDE = 'enemy', FOE = 'player';   // camp joué (paramétrable pour les simulations IA contre IA)
const dist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
const at = ([r, c]) => ({r, c});

function personality(S) { if (SIDE === 'player') return AI_PERSONALITY.balanced; return AI_PERSONALITY[DECK_PRESETS[S.enemyPresetKey]?.personality] || AI_PERSONALITY.balanced; }
function strategicTarget(S) {
  const p = personality(S);
  if (p.target === 'relay' && S.relicOwner !== SIDE) return S.relay;
  if (p.target === 'mixed' && S.relicOwner !== SIDE && S.turn < 6) return S.relay;
  return S.cores[FOE];
}
const myUnits = S => S.units.filter(u => u.side === SIDE);
const foes = S => S.units.filter(u => u.side !== SIDE);
const rnd = () => (DD.rng || Math.random)();

/* ---------- cartes Effet ---------- */
function bestEffect(S) {
  const P = S[SIDE], pers = personality(S), target = strategicTarget(S);
  let best = null;
  const consider = (i, targets, score) => { if (score > 1.5 && (!best || score > best.score)) best = {i, targets, score}; };
  P.hand.forEach((id, i) => {
    if (!E.canPlayEffect(S, SIDE, i).ok) return;
    const steps = E.effectSteps(id);
    const opts = steps.length ? E.effectTargets(S, SIDE, id, steps[0]) : [];
    const unitsAt = opts.map(([r, c]) => E.unitAt(S, r, c));
    switch (id) {
      case 'treasure_sense': if (E.canDraw(S, SIDE)) consider(i, [], 2); break;
      case 'arcane_insight': if (E.canDraw(S, SIDE) && P.hand.length <= 3) consider(i, [], 3); break;
      case 'war_drum': if (myUnits(S).some(u => E.attackTargets(S, u.uid).length || dist(u, S.cores[FOE]) <= u.mov + 1)) consider(i, [], 3.2); break;
      case 'mystic_heal': unitsAt.forEach((u, k) => { const miss = u.maxHp - u.hp; if (miss >= 2) consider(i, [opts[k]], 2.5 + miss); }); break;
      case 'stone_skin': unitsAt.forEach((u, k) => { if (u.hp < u.maxHp || !u.shield) consider(i, [opts[k]], (pers.guard > .7 ? 3 : 2) + (u.hp < u.maxHp ? 1 : 0)); }); break;
      case 'guard_sigil': unitsAt.forEach((u, k) => { if (!u.shield) consider(i, [opts[k]], foes(S).some(f => dist(f, u) <= 2) ? 3 : 1.6); }); break;
      case 'shadow_veil': case 'smoke_bomb':
        unitsAt.forEach((u, k) => { if (!E.isStealthed(S, u) && foes(S).some(f => dist(f, u) <= 2)) consider(i, [opts[k]], 2 + (u.hp <= 2 ? 1.5 : 0) + (S.enemyPresetKey === 'shadow' ? 1 : 0)); }); break;
      case 'flame_burst':
        unitsAt.forEach((u, k) => {
          const splash = foes(S).filter(v => v !== u && E.adjacent(u, v));
          const kills = (u.hp <= 2 ? 1 : 0) + splash.filter(v => v.hp <= 1).length;
          consider(i, [opts[k]], 2.5 + kills * 3 + splash.length);
        }); break;
      case 'frost_bind': unitsAt.forEach((u, k) => { const threat = dist(u, S.cores[SIDE]) <= 4 || myUnits(S).some(m => dist(m, u) <= 2); if (threat) consider(i, [opts[k]], 2 + u.atk * .5); }); break;
      case 'dispel_wave': unitsAt.forEach((u, k) => { if (u.shield || E.isStealthed(S, u) || u.empowered) consider(i, [opts[k]], 2.2); }); break;
      case 'summon_surge': case 'dragon_gate': {
        if (myUnits(S).length >= 5) break;
        const spot = bestSummonSpot(S, opts);
        if (spot) consider(i, [spot], id === 'dragon_gate' ? 4 : 3.5);
        break;
      }
      case 'portal_shift': case 'chain_dash': case 'storm_step':
        unitsAt.forEach((u, k) => {
          const dests = E.effectTargets(S, SIDE, id, steps[1], u.uid);
          let bestD = null, bestScore = 0;
          for (const d of dests) {
            const gain = dist(u, target) - dist(at(d), target);
            const nearFoe = foes(S).some(f => dist(f, at(d)) === 1) ? 1.5 : 0;
            const nearCore = id !== 'portal_shift' && dist(at(d), S.cores[FOE]) === 1 ? 3 : 0;
            const sc = gain * .6 + nearFoe + nearCore;
            if (sc > bestScore) { bestScore = sc; bestD = d; }
          }
          if (bestD) consider(i, [opts[k], bestD], 1 + bestScore);
        }); break;
    }
  });
  return best;
}

/* ---------- invocation ---------- */
function bestSummonSpot(S, spots = E.summonTargets(S, SIDE)) {
  const target = strategicTarget(S);
  let best = null;
  for (const s of spots) { const sc = dist(at(s), target) + rnd() * 1.5; if (!best || sc < best.sc) best = {s, sc}; }
  return best?.s || null;
}
function chooseMonster(S) {
  const roster = E.summonRoster(S, SIDE).filter(m => m.affordable);
  if (!roster.length) return null;
  const p = DECK_PRESETS[S.enemyPresetKey]?.personality;
  roster.sort((a, b) => p === 'swarm' ? a.cost - b.cost : p === 'rush' || p === 'fortress' ? b.cost - a.cost : (b.cost - a.cost) + (rnd() - .5) * 2);
  return roster[0].id;
}

/* ---------- compétences ---------- */
function skillPlan(S, u) {
  const st = E.skillState(S, u.uid);
  if (!st.ready) return null;
  const target = strategicTarget(S);
  if (st.target?.kind === 'enemy') {
    const opts = E.skillTargets(S, u.uid).map(([r, c]) => E.unitAt(S, r, c));
    opts.sort((a, b) => a.hp - b.hp);
    return [opts[0].r, opts[0].c];
  }
  if (st.target) {
    const opts = E.skillTargets(S, u.uid);
    let best = null;
    for (const d of opts) {
      const p = at(d);
      let sc = (dist(u, target) - dist(p, target)) * .5;
      if (foes(S).some(f => !E.isStealthed(S, f) && dist(f, p) === 1)) sc += 2;
      if (st.target.kind === 'dash' && dist(p, S.cores[FOE]) === 1) sc += 3;
      if (!best || sc > best.sc) best = {d, sc};
    }
    return best && best.sc > 0 ? best.d : null;
  }
  if (u.id === 'ember_whelp' && !E.attackTargets(S, u.uid).length && dist(u, S.cores[FOE]) > u.mov + 1) return null;
  if (u.id === 'mystic_sage' && !myUnits(S).some(v => v.hp < v.maxHp)) return null;
  if (u.id === 'arcane_familiar' && !E.canDraw(S, SIDE)) return null;
  return [];
}
function* useSkills(S) {
  for (const u of myUnits(S)) {
    if (S.over || !S.units.includes(u)) continue;
    const plan = skillPlan(S, u);
    if (plan && E.useSkill(S, u.uid, plan[0], plan[1]).ok) yield {delay: 520};
  }
}

/* ---------- combat & déplacement ---------- */
function bestAttack(S, u) {
  let best = null;
  for (const [r, c] of E.attackTargets(S, u.uid)) {
    const pv = E.attackPreview(S, u, r, c);
    let sc = pv.core ? 3 + pv.dmg * 3 : pv.dmg + (pv.kills ? 6 : 0) + (MONSTERS[E.unitAt(S, r, c).id].lv * .3);
    if (pv.core && pv.dmg === 0) sc = 1;
    if (!best || sc > best.sc) best = {r, c, sc};
  }
  return best;
}
function chargeFor(S, u, vsCore) {
  const P = S[SIDE], p = personality(S);
  let want = vsCore || p.charge >= 2 ? 2 : 1;
  if (vsCore) want = Math.min(want, Math.max(0, 3 - (Math.max(1, E.unitAtk(S, u) - 1) + u.empowered + P.nextAttackBoost))); // inutile au-delà du plafond
  while (want-- > 0 && u.empowered < 2 && P.crests.attack > 0 && E.charge(S, u.uid).ok);
}
function* attackWith(S, u) {
  const a = bestAttack(S, u);
  if (!a) return false;
  const vsCore = !!E.coreAt(S, a.r, a.c);
  chargeFor(S, u, vsCore);
  if (E.attack(S, u.uid, a.r, a.c).ok) { yield {delay: 650}; return true; }
  return false;
}
function bestMove(S, u) {
  const opts = E.moveTargets(S, u.uid);
  if (!opts.size) return null;
  const target = strategicTarget(S), core = S.cores[FOE];
  const here = dist(u, target);
  let best = null;
  for (const [k, steps] of opts) {
    const [r, c] = E.unkey(k), p = {r, c};
    let sc = (here - dist(p, target)) * 1.2 - steps * .15;
    if (!u.attacked) {
      if (dist(p, core) === 1 && !u.unstable) sc += 6;
      if (foes(S).some(f => !E.isStealthed(S, f) && dist(f, p) === 1)) sc += 3;
    }
    const t = E.tileAt(S, r, c);
    if (t?.special === 'trap' && u.hp <= 1) sc -= 5;
    if (t?.special && t.special !== 'trap') sc += 1;
    if (t?.special === 'relic' && S.relicOwner !== SIDE) sc += 2;
    if (!best || sc > best.sc) best = {r, c, sc};
  }
  return best && best.sc > 0 ? best : null;
}
function needsForcedMarch(S) {
  const P = S[SIDE];
  if (P.forcedMarchUsed || P.crests.move > 0) return null;
  const stuck = myUnits(S).some(u => !E.isFrozen(S, u) && !E.attackTargets(S, u.uid).length && u.movedSteps < u.mov);
  if (!stuck) return null;
  const pool = [];
  for (const k of ['summon', 'guard', 'magic', 'attack']) for (let i = 0; i < P.crests[k]; i++) pool.push(k);
  if (pool.length < 2) return null;
  pool.sort((a, b) => P.crests[b] - P.crests[a]);
  return pool.slice(0, 2);
}

/* ---------- tour complet ---------- */
function* turn(S, side = 'enemy') {
  SIDE = side; FOE = E.opp(side);
  const P = S[SIDE], pers = personality(S);
  const cc = E.concentrationCost(S, SIDE);
  if (E.canDraw(S, SIDE) && P.crests.magic >= cc && (P.hand.length <= 1 || (cc === 1 && P.hand.length < 3))) { E.concentrate(S, SIDE); yield {delay: 300}; }
  E.roll(S, SIDE); yield {delay: 300, roll: true};
  if (P.crests.guard > 0 && !P.reaction && rnd() < pers.guard) E.prepareGuard(S, SIDE);

  const fx = bestEffect(S);
  if (fx && E.playEffect(S, SIDE, fx.i, fx.targets).ok) yield {delay: 700};
  yield* useSkills(S);

  for (let n = 0; n < pers.summonCap && !S.over; n++) {
    const id = chooseMonster(S), spot = id && bestSummonSpot(S);
    if (!spot || !E.summonMonster(S, SIDE, id, spot[0], spot[1]).ok) break;
    yield {delay: 900};
  }

  const fm = needsForcedMarch(S);
  if (fm && E.forcedMarch(S, SIDE, fm).ok) yield {delay: 250};

  const target = strategicTarget(S);
  const order = myUnits(S).sort((a, b) => dist(a, target) - dist(b, target));
  for (const u of order) {
    if (S.over) return;
    if (!S.units.includes(u) || E.isFrozen(S, u)) continue;
    if (yield* attackWith(S, u)) continue;
    const mv = bestMove(S, u);
    if (mv && E.move(S, u.uid, mv.r, mv.c).ok) {
      yield {delay: 420};
      if (S.units.includes(u)) yield* attackWith(S, u);
    }
  }
  if (!S.over) yield* useSkills(S);
}

DD.ai = {turn, bestEffect, bestMove, strategicTarget};
})(globalThis.DD = globalThis.DD || {});
