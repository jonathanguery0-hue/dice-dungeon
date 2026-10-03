/* Dice Dungeon — interface (écrans, plateau tactile, animations).
   Lit l'état du moteur et appelle ses actions ; ne modifie jamais l'état directement. */
(function (DD) {
'use strict';
const E = DD.engine, store = DD.store, audio = DD.audio;
const {MONSTERS, EFFECTS, ALL, SKILLS, FACE, FAMILY_INFO, BIOME_INFO, SPECIAL_ICON, SPECIAL_INFO, ARENAS, INVOCATORS,
  DECK_PRESETS, CAMPAIGN_MISSIONS, CREST_KEYS, summonCost, summonTier, copyLimitFor} = DD;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const faces = req => req.map(x => FACE[x][0]).join('');
const crestName = {summon: 'Invocation', move: 'Mouvement', attack: 'Attaque', magic: 'Magie', guard: 'Défense'};

/* ---------- illustrations : une classe CSS par carte, générée une fois ---------- */
(function injectArt() {
  const css = Object.keys(ALL).map(id => `.art-${id}{background-image:url("${DD.cardArtSVG(id)}")}`).join('\n');
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

/* ---------- petits outils d'interface ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
let bannerTimer;
function banner(text, danger) {
  const b = $('#banner'); b.textContent = text; b.className = 'banner show' + (danger ? ' danger' : '');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1600);
}
function vibrate(ms) { if (store.settings.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
let sheetLocked = false, sheetOnClose = null;
function openSheet(html, {locked = false, cls = '', onClose = null} = {}) {
  const s = $('#sheet');
  $('#sheetBody').innerHTML = html;
  s.querySelector('.sheetPanel').className = 'sheetPanel panel ' + cls;
  sheetLocked = locked; sheetOnClose = onClose;
  $('#sheetClose').classList.toggle('hidden', locked);
  s.classList.remove('hidden'); s.setAttribute('aria-hidden', 'false');
  $('#sheetBody').scrollTop = 0;
  return $('#sheetBody');
}
function closeSheet() {
  const s = $('#sheet');
  if (s.classList.contains('hidden')) return;
  s.classList.add('hidden'); s.setAttribute('aria-hidden', 'true');
  const cb = sheetOnClose; sheetOnClose = null; if (cb) cb();
}
$('#sheetClose').onclick = closeSheet;
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' && !sheetLocked) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheetLocked) closeSheet(); });

/* ---------- cartes ---------- */
function vis(id) { return DD.visualFor(id); }
function dieStrip(m) { return `<div class="dieStrip">${m.faces.map(f => `<i class="f-${f}">${FACE[f][0]}</i>`).join('')}</div>`; }
function cardHTML(id, {qty = 0, locked = 0, extra = ''} = {}) {
  const c = ALL[id], v = vis(id);
  const style = `--c1:${v.c1};--c2:${v.c2};--glow:${v.glow};--fam:${c.type === 'monster' ? DD.familyCardColor(c.family) : v.glow}`;
  const top = c.type === 'monster'
    ? `<span class="cTop"><span>Niv ${c.lv}</span><span class="cost">${'◇'.repeat(summonCost(c))}</span></span>`
    : `<span class="cTop"><span>${esc(v.sigil)}</span><span class="cost mag">✦${c.cost}</span></span>`;
  const bottom = c.type === 'monster'
    ? `<span class="cStats">♥${c.hp} ⚔${c.atk} ➤${c.mov}</span>${dieStrip(c)}`
    : `<span class="cShort">${esc(c.short)}</span>`;
  return `<div class="card ${c.type} ${locked ? 'locked' : ''} ${extra}" data-card="${id}" style="${style}">
    <i class="cArt art-${id}"></i>${top}<span class="cName">${esc(c.name)}</span>${bottom}
    ${qty ? `<b class="qty">×${qty}</b>` : ''}${locked ? `<span class="lock">🔒 Niv ${locked}</span>` : ''}</div>`;
}
function cardDetailHTML(id) {
  const c = ALL[id];
  if (c.type === 'monster') {
    const sk = SKILLS[id], fi = FAMILY_INFO[c.family], bio = BIOME_INFO[DD.BIOME_BY_MONSTER[id]];
    const pct = Math.round(c.faces.filter(f => f === 'summon').length / 6 * 100);
    return `<div class="detail"><div class="detailArt">${cardHTML(id)}</div><div>
      <div class="kicker">Monstre · ${esc(c.role)} · ${esc(c.element)}</div><h2>${esc(c.name)}</h2>
      <div class="chips"><span>Niv ${c.lv}</span><span>♥ ${c.hp}</span><span>⚔ ${c.atk}</span><span>➤ ${c.mov}</span><span>${'◇'.repeat(summonCost(c))} ${summonTier(c)}</span></div>
      <p>${esc(c.ability)}</p>
      <p class="rule"><b>Combo ${faces(sk.req)} — ${esc(sk.name)} :</b> ${esc(sk.desc)}</p>
      <p class="rule fam"><b>${fi.glyph} Famille ${esc(c.family)} :</b> ${esc(fi.rule)}</p>
      ${bio ? `<p class="rule"><b>${bio.glyph} Biome créé — ${esc(bio.name)} :</b> ${esc(bio.rule)}</p>` : ''}
      <div class="dieLine">Dé : ${dieStrip(c)} <span class="muted">Face ◇ : ${pct} %</span></div>
    </div></div>`;
  }
  return `<div class="detail"><div class="detailArt">${cardHTML(id)}</div><div>
    <div class="kicker">Carte Effet · coût ✦${c.cost}</div><h2>${esc(c.name)}</h2><p>${esc(c.text)}</p>
    <p class="muted small">Une seule carte Effet par tour. Main max 5 ; Concentration pour piocher.</p></div></div>`;
}

/* ---------- navigation ---------- */
const screens = ['menu', 'campaign', 'deck', 'battle'];
let current = 'menu';
function show(name) {
  current = name;
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== name);
  window.scrollTo(0, 0);
  audio.setMode(name === 'battle' ? 'battle' : name === 'deck' ? 'deck' : 'menu');
  if (name === 'menu') renderMenu();
  if (name === 'campaign') renderCampaign();
  if (name === 'deck') renderDeck();
}
$$('[data-back]').forEach(b => b.onclick = () => show('menu'));

/* =================== MENU =================== */
function renderMenu() {
  const xp = store.xpProgress(), nl = store.nextUnlockLevel();
  $('#pfLevel').textContent = xp.level;
  $('#pfXp').textContent = xp.span ? `${xp.cur} / ${xp.span} XP` : 'Niveau maximum';
  $('#pfBar').style.width = xp.pct + '%';
  $('#pfNext').innerHTML = nl ? `Prochain déblocage — <b>Niveau ${nl}</b> : ${store.unlocksAtLevel(nl).slice(0, 4).join(' · ')}`
    : `Collection complète · ${store.profile.wins} victoire(s) sur ${store.profile.matches} duel(s)`;
  const saved = store.loadBattle();
  $('#mResume').classList.toggle('hidden', !saved);
  if (saved) $('#mResume').textContent = `▶ Reprendre le duel (tour ${saved.turn})`;
  $('#arenaGrid').innerHTML = Object.values(ARENAS).map(a => `<button class="choice ${store.settings.arena === a.id ? 'on' : ''}" data-arena="${a.id}">
    <b>${esc(a.name)} · ${a.size}</b><span>${esc(a.desc)}</span></button>`).join('');
  $('#invGrid').innerHTML = Object.values(INVOCATORS).map(v => {
    const open = store.isInvocatorUnlocked(v.id);
    return `<button class="choice inv ${store.settings.invocator === v.id ? 'on' : ''}" data-inv="${v.id}" ${open ? '' : 'disabled'}>
      <i class="glyph">${open ? v.glyph : '🔒'}</i><b>${esc(v.name)}</b><span>${open ? esc(v.passive) : 'Niveau ' + store.unlockLevelFor(v.id, 'invocator')}</span></button>`;
  }).join('');
  $$('[data-arena]').forEach(b => b.onclick = () => { store.settings.arena = b.dataset.arena; store.saveSettings(); renderMenu(); });
  $$('[data-inv]').forEach(b => b.onclick = () => { store.settings.invocator = b.dataset.inv; store.saveSettings(); renderMenu(); });
}
$('#mQuick').onclick = () => startBattle({mode: 'quick', arenaId: store.settings.arena});
$('#mCampaign').onclick = () => show('campaign');
$('#mDeck').onclick = () => { deckState.cards = store.loadDeck(); show('deck'); };
$('#mRules').onclick = () => openSheet(RULES_HTML, {cls: 'wide'});
$('#mResume').onclick = () => { const S = store.loadBattle(); if (S) resumeBattle(S); };
$('#mSettings').onclick = () => openSettings(false);

/* installation PWA */
let installEvt = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#mInstall').classList.remove('hidden'); });
if (!standalone() && /iphone|ipad|ipod/i.test(navigator.userAgent)) $('#mInstall').classList.remove('hidden');
$('#mInstall').onclick = async () => {
  if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#mInstall').classList.add('hidden'); return; }
  openSheet(`<h2>Installer sur iPhone / iPad</h2><ol class="steps"><li>Ouvre cette page dans <b>Safari</b>.</li>
    <li>Touche le bouton <b>Partager</b> (carré avec une flèche).</li><li>Choisis <b>« Sur l’écran d’accueil »</b>.</li></ol>
    <p class="muted">Le jeu s’ouvrira ensuite en plein écran et fonctionnera hors-ligne.</p>`);
};

function openSettings(inBattle) {
  const p = audio.pref, st = store.settings;
  const body = openSheet(`<h2>${inBattle ? 'Duel' : 'Réglages'}</h2>
    ${inBattle ? `<div class="menuList">
      <button class="btn" data-a="log">📜 Journal du duel</button>
      <button class="btn" data-a="rules">? Règles</button>
      <button class="btn" data-a="full">⛶ Plein écran</button>
      <button class="btn red" data-a="quit">⚑ Abandonner le duel</button></div>` : ''}
    <div class="setRow"><span>Son</span><button class="btn small" data-a="mute">${p.muted ? '🔇 Coupé' : '🔊 Activé'}</button></div>
    <div class="setRow"><span>Volume</span><input type="range" min="0" max="100" value="${Math.round(p.volume * 100)}" data-a="vol"></div>
    <div class="setRow"><span>Vibrations</span><button class="btn small" data-a="vib">${st.vibrate ? 'Activées' : 'Désactivées'}</button></div>
    <div class="setRow"><span>Vitesse du rival</span><button class="btn small" data-a="speed">${st.speed > 1 ? 'Rapide' : 'Normale'}</button></div>`);
  body.querySelector('[data-a=mute]').onclick = () => { audio.setMuted(!p.muted); openSettings(inBattle); };
  body.querySelector('[data-a=vol]').oninput = e => audio.setVolume(e.target.value / 100);
  body.querySelector('[data-a=vib]').onclick = () => { st.vibrate = !st.vibrate; store.saveSettings(); openSettings(inBattle); };
  body.querySelector('[data-a=speed]').onclick = () => { st.speed = st.speed > 1 ? 1 : 2; store.saveSettings(); openSettings(inBattle); };
  if (!inBattle) return;
  body.querySelector('[data-a=log]').onclick = showLog;
  body.querySelector('[data-a=rules]').onclick = () => openSheet(RULES_HTML, {cls: 'wide'});
  body.querySelector('[data-a=full]').onclick = toggleFullscreen;
  body.querySelector('[data-a=quit]').onclick = () => {
    const b = openSheet(`<h2>Abandonner ?</h2><p>Le duel sera compté comme une défaite.</p><div class="row"><button class="btn red" id="qYes">Abandonner</button><button class="btn" id="qNo">Continuer</button></div>`);
    b.querySelector('#qNo').onclick = closeSheet;
    b.querySelector('#qYes').onclick = () => { closeSheet(); S.over = true; S.winner = 'enemy'; render(); };
  };
}
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (e) { toast('Le navigateur refuse le plein écran : installe le jeu sur l’écran d’accueil.'); }
}

/* =================== CAMPAGNE =================== */
function renderCampaign() {
  const c = store.campaign;
  $('#cpWins').textContent = `${c.cleared.length}/${CAMPAIGN_MISSIONS.length} · ${store.campaignRank()}`;
  $('#cpPath').innerHTML = CAMPAIGN_MISSIONS.map((m, i) => {
    const open = store.missionUnlocked(i), done = c.cleared.includes(i), best = c.best?.[i];
    return `<article class="mission panel ${open ? '' : 'locked'} ${done ? 'done' : ''}" style="--glow:${m.glow}">
      <div class="mNum">DUEL ${i + 1}${done ? ' · ✓' : ''}</div><h3>${esc(m.name)}</h3><div class="mRival">${esc(m.rival)} · ${esc(ARENAS[m.arena].name)}</div>
      <p>${esc(m.desc)}</p><p class="small"><b>Règle :</b> ${esc(m.rule)}</p>
      <div class="row"><span class="small muted">${done ? `Meilleur : ${best} tours` : open ? 'Disponible' : 'Verrouillé'}</span>
      <button class="btn ${done ? '' : 'gold'} small" data-mission="${i}" ${open ? '' : 'disabled'}>${done ? 'Rejouer' : 'Combattre'}</button></div></article>`;
  }).join('');
  $$('[data-mission]').forEach(b => b.onclick = () => startBattle({mode: 'campaign', missionIndex: +b.dataset.mission}));
}
$('#cpReset').onclick = () => {
  const b = openSheet(`<h2>Réinitialiser la campagne ?</h2><p>Les duels terminés seront de nouveau verrouillés (ton niveau est conservé).</p>
    <div class="row"><button class="btn red" id="rYes">Réinitialiser</button><button class="btn" id="rNo">Annuler</button></div>`);
  b.querySelector('#rNo').onclick = closeSheet;
  b.querySelector('#rYes').onclick = () => { store.resetCampaign(); closeSheet(); renderCampaign(); };
};

/* =================== DECK =================== */
const deckState = {cards: store.loadDeck(), type: 'all', family: 'all', search: '', tab: 'collection'};
$('#dkFamily').innerHTML += Object.keys(FAMILY_INFO).map(f => `<option value="${f}">${FAMILY_INFO[f].glyph} ${f}</option>`).join('');
$$('#dkType button').forEach(b => b.onclick = () => { deckState.type = b.dataset.v; renderDeck(); });
$('#dkFamily').onchange = e => { deckState.family = e.target.value; renderDeck(); };
$('#dkSearch').oninput = e => { deckState.search = e.target.value.trim().toLowerCase(); renderDeck(); };
$$('.tab').forEach(t => t.onclick = () => { deckState.tab = t.dataset.tab; renderDeck(); });
$('#dkClear').onclick = () => { deckState.cards = []; renderDeck(); };
$('#dkSave').onclick = () => {
  const issues = store.deckIssues(deckState.cards);
  if (issues.length) return toast('Deck incomplet : ' + issues.join(' · '));
  store.saveDeck(deckState.cards); toast('Deck sauvegardé ✓');
};
$('#dkBack').onclick = () => {
  if (deckState.cards.join() !== store.loadDeck().join()) {
    if (store.validDeck(deckState.cards)) { store.saveDeck(deckState.cards); toast('Deck sauvegardé ✓'); }
    else toast('Deck incomplet : ton dernier deck valide est conservé.');
  }
  show('menu');
};
function addCard(id) {
  const c = ALL[id], d = deckState.cards, n = d.filter(x => x === id).length;
  if (!store.isUnlocked(id)) return toast(`Carte verrouillée — niveau ${store.unlockLevelFor(id)} requis.`);
  if (n >= copyLimitFor(id)) return toast(`${c.name} : ${copyLimitFor(id)} exemplaire(s) maximum.`);
  if (c.type === 'monster' && d.filter(x => MONSTERS[x]).length >= 12) return toast('12 monstres maximum.');
  if (c.type === 'effect' && d.filter(x => EFFECTS[x]).length >= 8) return toast('8 effets maximum.');
  d.push(id); audio.play('tap'); renderDeck();
}
function removeCard(id) { const i = deckState.cards.lastIndexOf(id); if (i >= 0) deckState.cards.splice(i, 1); renderDeck(); }
function openCardInDeck(id) {
  const n = deckState.cards.filter(x => x === id).length, open = store.isUnlocked(id);
  const b = openSheet(`${cardDetailHTML(id)}<div class="row sheetActions">
    <button class="btn" id="cdRem" ${n ? '' : 'disabled'}>− Retirer</button><span class="pill">×${n} / ${copyLimitFor(id)}</span>
    <button class="btn gold" id="cdAdd" ${open ? '' : 'disabled'}>+ Ajouter</button></div>`, {cls: 'wide'});
  b.querySelector('#cdAdd').onclick = () => { addCard(id); openCardInDeck(id); };
  b.querySelector('#cdRem').onclick = () => { removeCard(id); openCardInDeck(id); };
}
function renderDeck() {
  const d = deckState.cards, counts = store.countBy(d);
  const m = d.filter(x => MONSTERS[x]).length, e = d.filter(x => EFFECTS[x]).length;
  $('#dkM').textContent = `${m}/12 monstres`; $('#dkM').className = 'pill ' + (m === 12 ? 'good' : 'bad');
  $('#dkE').textContent = `${e}/8 effets`; $('#dkE').className = 'pill ' + (e === 8 ? 'good' : 'bad');
  $('#dkTotal').textContent = `${d.length}/20`;
  $$('#dkType button').forEach(b => b.classList.toggle('on', b.dataset.v === deckState.type));
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === deckState.tab));
  $$('.dkPane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== deckState.tab));
  const lvl = store.level(), preset = store.detectPreset(d);
  $('#dkPresets').innerHTML = Object.entries(DECK_PRESETS).map(([k, p]) => {
    const req = store.presetRequiredLevel(p);
    return `<button class="preset ${preset === k ? 'on' : ''}" data-preset="${k}" ${lvl >= req ? '' : 'disabled'}><b>${esc(p.name)}</b><span>${lvl >= req ? esc(p.subtitle) : '🔒 Niveau ' + req}</span></button>`;
  }).join('');
  $$('[data-preset]').forEach(b => b.onclick = () => { deckState.cards = [...DECK_PRESETS[b.dataset.preset].deck]; toast(`Archétype chargé : ${DECK_PRESETS[b.dataset.preset].name}`); renderDeck(); });
  const ids = Object.keys(ALL).filter(id => deckState.type === 'all' || ALL[id].type === deckState.type)
    .filter(id => deckState.family === 'all' || ALL[id].type !== 'monster' || ALL[id].family === deckState.family)
    .filter(id => ALL[id].name.toLowerCase().includes(deckState.search));
  $('#dkCollection').innerHTML = ids.map(id => `<div class="cardCell">${cardHTML(id, {qty: counts[id] || 0, locked: store.isUnlocked(id) ? 0 : store.unlockLevelFor(id)})}
    ${store.isUnlocked(id) ? `<button class="plus" data-add="${id}" aria-label="Ajouter">+</button>` : ''}</div>`).join('');
  $$('#dkCollection [data-card]').forEach(c => c.onclick = () => openCardInDeck(c.dataset.card));
  $$('#dkCollection [data-add]').forEach(b => b.onclick = ev => { ev.stopPropagation(); addCard(b.dataset.add); });
  const issues = store.deckIssues(d);
  $('#dkIssues').innerHTML = issues.length ? '⚠ ' + issues.join(' · ') : '✓ Deck valide et prêt au duel.';
  $('#dkIssues').className = 'notice ' + (issues.length ? 'bad' : 'good');
  const uniq = [...new Set(d)].sort((a, b) => (ALL[a].type === ALL[b].type ? 0 : ALL[a].type === 'monster' ? -1 : 1));
  $('#dkList').innerHTML = uniq.map(id => {
    const c = ALL[id];
    return `<div class="deckRow"><i class="thumb art-${id}"></i><div class="grow" data-open="${id}"><b>${esc(c.name)}</b>
      <span class="small muted">${c.type === 'monster' ? `${c.family} · Niv ${c.lv} · ${'◇'.repeat(summonCost(c))}` : `Effet · ✦${c.cost} · ${esc(c.short)}`}</span></div>
      <button class="btn small" data-rem="${id}">−</button><b class="qtyN">×${counts[id]}</b><button class="btn small" data-add2="${id}">+</button></div>`;
  }).join('') || '<p class="muted center">Deck vide : ajoute des cartes depuis la Collection ou charge un archétype.</p>';
  $$('[data-rem]').forEach(b => b.onclick = () => removeCard(b.dataset.rem));
  $$('[data-add2]').forEach(b => b.onclick = () => addCard(b.dataset.add2));
  $$('[data-open]').forEach(b => b.onclick = () => openCardInDeck(b.dataset.open));
  renderAnalysis();
}
function renderAnalysis() {
  const mons = deckState.cards.filter(id => MONSTERS[id]), cnt = {summon: 0, move: 0, attack: 0, magic: 0, guard: 0};
  let power = 0;
  for (const id of mons) { power += MONSTERS[id].power; for (const f of MONSTERS[id].faces) cnt[f]++; }
  const total = mons.length * 6, norm = mons.length ? 12 / mons.length : 0, n = {};
  for (const k in cnt) n[k] = cnt[k] * norm;
  const avg = mons.length ? power / mons.length : 0;
  const warn = [];
  if (mons.length < 12) warn.push(['warn', `Analyse provisoire : ${mons.length}/12 monstres.`]);
  if (mons.length) {
    if (n.move <= 10) warn.push(['bad', '➤ Mobilité critique : tes monstres risquent de rester loin du Relais et de l’Invocateur.']);
    else if (n.move <= 13) warn.push(['warn', '➤ Mobilité faible : prévois des unités rapides ou des cartes de déplacement.']);
    if (n.summon <= 13) warn.push(['bad', '◇ Invocation instable : risque de plusieurs tours sans développer ton plateau.']);
    if (n.magic <= 8) warn.push(['warn', '✦ Peu de magie : Concentration et cartes Effet difficiles à alimenter.']);
    if (n.guard <= 5) warn.push(['warn', '◆ Défense faible : ton deck dépend du tempo.']);
    if (n.attack <= 8) warn.push(['warn', '⚔ Peu de ⚔ : difficile de charger les attaques.']);
    if (n.move >= 18 && n.summon >= 18) warn.push(['good', '✓ Excellent tempo : invocations et déplacements rapides.']);
    if (!warn.length) warn.push(['good', '✓ Pool cohérent : aucune faiblesse majeure.']);
  }
  const fams = store.countBy(mons.map(id => MONSTERS[id].family));
  $('#dkAnalysis').innerHTML = `<div class="panel pad"><h3 class="sectionTitle">Pool de dés · ${mons.length} dés · ${total} faces</h3>
    ${CREST_KEYS.map(k => `<div class="anRow"><i class="f-${k}">${FACE[k][0]}</i><span>${crestName[k]}</span>
      <div class="bar"><i style="width:${Math.min(100, n[k] / 24 * 100)}%"></i></div><b>${cnt[k]}</b></div>`).join('')}
    <p>Puissance moyenne : <b>${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} ${avg.toFixed(1)}</b></p>
    <p>Familles : ${Object.entries(fams).map(([f, k]) => `${FAMILY_INFO[f].glyph} ${f} ${k}`).join(' · ') || '—'}</p>
    ${warn.map(([c, s]) => `<div class="notice ${c}">${s}</div>`).join('')}</div>`;
}

/* =================== DUEL =================== */
let S = null;
const ui = {sel: null, mode: null, summonId: null, eff: null, pending: null, busy: false, transpose: false, tile: 40};

function startBattle(opts) {
  const deck = store.loadDeck();
  S = E.newBattle({...opts, playerDeck: deck, invocatorId: store.settings.invocator});
  enterBattle();
  banner(S.mode === 'campaign' ? CAMPAIGN_MISSIONS[S.missionIndex].name : ARENAS[S.arenaId].name);
}
function resumeBattle(saved) { S = saved; S.fx = []; enterBattle(); toast('Duel repris.'); if (S.side === 'enemy') enemyTurn(); }
function enterBattle() {
  Object.assign(ui, {sel: null, mode: null, summonId: null, eff: null, pending: null, busy: false, finished: false});
  show('battle');
  S.fx.length = 0;
  store.saveBattle(S);
  requestAnimationFrame(() => { layoutBoard(); render(); scrollToCore(); });
}
const P = () => S.player;
const myTurn = () => S && !S.over && S.side === 'player' && !ui.busy;
const name = u => MONSTERS[u.id].name;

/* ----- disposition du plateau (rotation en portrait) ----- */
function disp(r, c) { return ui.transpose ? {row: S.cols - c, col: r + 1} : {row: r + 1, col: c + 1}; }
function layoutBoard() {
  if (!S) return;
  const wrap = $('#boardWrap'), W = wrap.clientWidth - 8, H = wrap.clientHeight - 8;
  const portrait = innerHeight > innerWidth;
  if (ui.transpose !== (portrait && S.cols > S.rows)) { ui.transpose = portrait && S.cols > S.rows; renderBoard(); }
  const dc = ui.transpose ? S.rows : S.cols, dr = ui.transpose ? S.cols : S.rows, gap = 3;
  ui.tile = Math.max(28, Math.min(76, Math.floor(Math.min((W - gap * (dc - 1)) / dc, (H - gap * (dr - 1)) / dr))));
  const b = $('#board');
  b.style.setProperty('--ts', ui.tile + 'px');
  b.style.gridTemplateColumns = `repeat(${dc}, ${ui.tile}px)`;
  b.style.gridTemplateRows = `repeat(${dr}, ${ui.tile}px)`;
  b.classList.toggle('small', ui.tile < 40);
}
function scrollToCore() {
  const sc = $('#boardScroll'), el = tileEl(S.cores.player.r, S.cores.player.c);
  if (!el) return;
  const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
  sc.scrollTop += a.top - b.top - sc.clientHeight / 2 + a.height / 2;
  sc.scrollLeft += a.left - b.left - sc.clientWidth / 2 + a.width / 2;
}
addEventListener('resize', () => { if (current === 'battle' && S) { layoutBoard(); render(); } });
function tileEl(r, c) { return $(`#board [data-k="${r},${c}"]`); }

/* ----- cibles surlignées selon le mode ----- */
function targets() {
  const m = new Map();
  if (!myTurn()) return m;
  if (ui.mode === 'summon') for (const [r, c] of E.summonTargets(S, 'player')) m.set(E.key(r, c), 'summon');
  else if (ui.mode === 'effect') { const st = ui.eff.steps[ui.eff.targets.length]; for (const [r, c] of E.effectTargets(S, 'player', ui.eff.id, st, ui.eff.ally)) m.set(E.key(r, c), 'effect'); }
  else if (ui.mode === 'skill') for (const [r, c] of E.skillTargets(S, ui.sel)) m.set(E.key(r, c), 'skill');
  else if (ui.sel) {
    for (const k of E.moveTargets(S, ui.sel).keys()) m.set(k, 'move');
    for (const [r, c] of E.attackTargets(S, ui.sel)) m.set(E.key(r, c), 'attack');
  }
  return m;
}

/* ----- rendu ----- */
function render() {
  if (!S) return;
  const sel = ui.sel && E.unitById(S, ui.sel);
  if (ui.sel && !sel) ui.sel = null;
  renderTop(); renderCrests(); renderBoard(); renderContext(); renderHand(); renderActions(); renderPrompt();
  layoutBoard();
  if (S.over && !ui.finished && current === 'battle') { ui.finished = true; store.clearBattle(); setTimeout(finishBattle, 700); }
  $('#sideLog').innerHTML = S.log.slice(0, 40).map(l => `<div class="${l.cls}"><small>T${l.turn}</small> ${l.msg}</div>`).join('');
  $('#ticker').innerHTML = S.log[0] ? S.log[0].msg : '';
  $('#ticker').className = 'ticker ' + (S.log[0]?.cls || '');
}
function renderTop() {
  const pc = S.cores.player, ec = S.cores.enemy, pi = INVOCATORS[pc.invId], ei = INVOCATORS[ec.invId];
  const mission = S.mode === 'campaign' ? CAMPAIGN_MISSIONS[S.missionIndex] : null;
  $('#pName').textContent = `${pi.glyph} ${pi.name}`;
  $('#eName').textContent = mission ? mission.rival.split(' — ')[0] : `${ei.glyph} ${ei.name}`;
  $('#pHp').textContent = pc.hp; $('#eHp').textContent = ec.hp;
  $('#pHpBar').style.width = pc.hp / pc.maxHp * 100 + '%'; $('#eHpBar').style.width = ec.hp / ec.maxHp * 100 + '%';
  $('#turnPill').innerHTML = `Tour ${S.turn}<small>${S.over ? 'Fin' : S.side === 'player' ? 'À toi' : 'Rival'}</small>`;
  $('#turnPill').className = 'turnPill ' + (S.side === 'player' ? 'mine' : 'theirs') + (S.turn >= 10 ? ' danger' : '');
  audio.setMode(S.turn >= 10 || pc.hp <= 2 || ec.hp <= 2 ? 'tension' : 'battle');
}
function renderCrests() {
  const c = P().crests, faces = E.rollFaces(S, 'player');
  const extra = [];
  if (P().reaction) extra.push('<span class="flag">◆ Garde prête</span>');
  if (P().nextAttackBoost) extra.push(`<span class="flag">⚔ +${P().nextAttackBoost} prochaine attaque</span>`);
  if (P().relayDiscount) extra.push('<span class="flag">✦ Relais : 1 pas offert</span>');
  if (P().bonusDieNext) extra.push('<span class="flag">+1 dé au prochain lancer</span>');
  $('#crests').innerHTML = CREST_KEYS.map(k => `<span class="crest f-${k} ${c[k] ? '' : 'zero'}" title="${crestName[k]}"><i>${FACE[k][0]}</i><b>${c[k]}</b></span>`).join('')
    + `<span class="roll">${faces.length ? 'Lancer ' + faces.map(f => `<i class="f-${f}">${FACE[f][0]}</i>`).join('') : '<span class="muted">Pas encore lancé</span>'}</span>`
    + extra.join('');
}
function renderBoard() {
  const tg = targets(), sel = ui.sel, out = [];
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const k = E.key(r, c), d = disp(r, c), t = S.tiles[k], core = E.coreAt(S, r, c), u = E.unitAt(S, r, c);
    const cls = ['tile'];
    let inner = '';
    if (E.isBlocked(S, r, c)) cls.push('wall');
    else if (t) { cls.push('floor', 'o-' + t.owner, 'b-' + t.biome); inner += `<span class="bg">${BIOME_INFO[t.biome].glyph}</span>`; if (t.special) inner += `<span class="sp sp-${t.special}">${SPECIAL_ICON[t.special]}</span>`; }
    if (core) {
      const inv = INVOCATORS[core.invId];
      cls.push('core', 'core-' + core.side);
      inner += `<div class="coreTok"><b>${inv.glyph}</b><span>♥${core.hp}</span>${core.barrier && S.side !== core.side ? '<i class="barrier"></i>' : ''}</div>`;
    }
    if (u) {
      const st = (E.isFrozen(S, u) ? '❄' : '') + (E.isStealthed(S, u) ? '◐' : '') + (u.shield ? '◆' : '') + (u.empowered ? '⚔' : '');
      const spent = u.side === 'player' && S.side === 'player' && u.attacked && E.moveBudget(S, u).steps === 0;
      inner += `<div class="unit ${u.side === 'player' ? 'mine' : 'foe'} ${u.uid === sel ? 'sel' : ''} ${E.isStealthed(S, u) ? 'stealth' : ''} ${E.isFrozen(S, u) ? 'frozen' : ''} ${spent ? 'spent' : ''}">
        <i class="art art-${u.id}"></i><b class="hp">${u.hp}</b><b class="atk">${E.unitAtk(S, u)}</b>${st ? `<span class="st">${st}</span>` : ''}</div>`;
    }
    const tk = tg.get(k);
    if (tk) cls.push('t-' + tk);
    if (ui.pending && ui.pending.k === k) cls.push('pending');
    out.push(`<div class="${cls.join(' ')}" data-k="${k}" style="grid-row:${d.row};grid-column:${d.col}">${inner}</div>`);
  }
  $('#board').innerHTML = out.join('');
}
function renderContext() {
  const box = $('#context'), u = ui.sel && E.unitById(S, ui.sel);
  if (S.over) { box.innerHTML = ''; return; }
  if (S.side !== 'player') { box.innerHTML = `<div class="hint">⏳ Le rival joue…</div>`; return; }
  if (!u) {
    const hint = !P().rolled ? 'Commence par <b>🎲 Lancer</b> : chaque face rejoint ta réserve.'
      : S.units.some(x => x.side === 'player') ? 'Touche un de tes monstres pour le faire agir. Touche une carte de ta main pour la lire.'
      : P().crests.summon ? 'Touche <b>◇ Invoquer</b> pour poser ton premier monstre à côté de ton Invocateur.'
      : 'Pas de ◇ ce tour : utilise tes cartes ou termine le tour.';
    box.innerHTML = `<div class="hint">${hint}</div>`; return;
  }
  const m = MONSTERS[u.id], sk = SKILLS[u.id], st = E.skillState(S, u.uid), bud = E.moveBudget(S, u);
  const chargeOk = !u.attacked && P().crests.attack > 0 && u.empowered < 2;
  box.innerHTML = `<div class="unitCard">
    <i class="thumb art-${u.id}" data-info="unit"></i>
    <div class="grow"><b>${esc(m.name)}</b>
      <div class="chips"><span>♥ ${u.hp}/${u.maxHp}</span><span>⚔ ${E.unitAtk(S, u)}${u.empowered ? '+' + u.empowered : ''}</span><span>➤ ${bud.steps}/${u.mov}</span>${u.shield ? '<span>◆ Garde</span>' : ''}
      ${E.isFrozen(S, u) ? '<span class="bad">❄ Gelé</span>' : ''}${E.isStealthed(S, u) ? '<span>◐ Furtif</span>' : ''}${u.unstable ? '<span class="bad">Instable</span>' : ''}${u.attacked ? '<span class="muted">a attaqué</span>' : ''}</div>
</div>
    <div class="unitBtns">
      <button class="btn small ${chargeOk ? '' : 'off'}" id="uCharge">⚔ Charger <small>${u.empowered}/2</small></button>
      <button class="btn small skill ${st.ready ? 'ready' : 'off'}" id="uSkill">✦ ${esc(sk.name)} <small>${faces(sk.req)}</small></button>
      <button class="btn small ghost" id="uInfo">ⓘ</button>
    </div></div>`;
  $('#uCharge').onclick = () => act(() => E.charge(S, u.uid));
  $('#uSkill').onclick = () => {
    if (!st.ready) return toast(st.msg);
    if (st.target) { ui.mode = 'skill'; ui.pending = null; render(); }
    else act(() => E.useSkill(S, u.uid));
  };
  $('#uInfo').onclick = () => inspect(u.r, u.c);
  box.querySelector('[data-info]').onclick = () => inspect(u.r, u.c);
}
function renderHand() {
  const h = $('#hand'), cc = E.concentrationCost(S, 'player');
  const cards = P().hand.map((id, i) => {
    const can = myTurn() && E.canPlayEffect(S, 'player', i).ok;
    return `<button class="handCard ${can ? '' : 'off'}" data-hand="${i}" style="--glow:${vis(id).glow}"><i class="art art-${id}"></i><b class="hc">✦${EFFECTS[id].cost}</b><span>${esc(EFFECTS[id].name)}</span></button>`;
  });
  const canConc = myTurn() && !P().concentrationUsed && P().crests.magic >= cc && E.canDraw(S, 'player');
  h.innerHTML = cards.join('') + `<button class="handCard conc ${canConc ? '' : 'off'}" id="hConc"><b>📖</b><span>Piocher<br>${cc}✦</span></button>`
    + `<span class="handMeta">${P().hand.length}/5${P().magicPlayed ? ' · effet joué' : ''}</span>`;
  $$('[data-hand]').forEach(b => b.onclick = () => openHandCard(+b.dataset.hand));
  $('#hConc').onclick = () => act(() => E.concentrate(S, 'player'));
}
function renderActions() {
  const mine = myTurn(), p = P(), canSummon = mine && p.crests.summon > 0 && E.summonTargets(S, 'player').length > 0;
  $('#aRoll').disabled = !mine || p.rolled;
  $('#aRoll').classList.toggle('glow', mine && !p.rolled);
  $('#aSummon').disabled = !canSummon;
  $('#aSummon').classList.toggle('glow', canSummon && !S.units.some(u => u.side === 'player'));
  $('#aSummonN').textContent = p.crests.summon ? '◇' + p.crests.summon : '';
  $('#aTactics').disabled = !mine;
  $('#aEnd').disabled = !mine;
  $('#aEnd').classList.toggle('glow', mine && p.rolled && !anythingToDo());
}
function anythingToDo() {
  const p = P();
  if (p.crests.summon && E.summonTargets(S, 'player').length) return true;
  if (p.hand.some((_, i) => E.canPlayEffect(S, 'player', i).ok)) return true;
  return S.units.some(u => u.side === 'player' && (E.attackTargets(S, u.uid).length || E.moveTargets(S, u.uid).size || E.skillState(S, u.uid).ready));
}
function renderPrompt() {
  let txt = '';
  if (ui.pending) txt = ui.pending.text;
  else if (ui.mode === 'summon') txt = `◇ ${MONSTERS[ui.summonId].name} : choisis une case dorée.`;
  else if (ui.mode === 'effect') {
    const st = ui.eff.steps[ui.eff.targets.length];
    txt = `${EFFECTS[ui.eff.id].name} : ${{summon: 'choisis une case dorée', ally: 'choisis un allié', enemy: 'choisis un ennemi', portal: 'choisis la destination (3 cases)', dash: 'choisis la destination (3 pas)'}[st]}.`;
  } else if (ui.mode === 'skill') txt = `${SKILLS[E.unitById(S, ui.sel).id].name} : choisis une cible.`;
  $('#prompt').classList.toggle('hidden', !txt);
  $('#promptText').textContent = txt;
}
$('#promptCancel').onclick = () => { cancelMode(); render(); };
function cancelMode() { ui.mode = null; ui.summonId = null; ui.eff = null; ui.pending = null; }

/* ----- interactions ----- */
async function act(fn, keepSel = true) {
  if (!myTurn()) return;
  const res = fn();
  if (!res.ok) { toast(res.msg); return; }
  if (!keepSel) ui.sel = null;
  ui.pending = null;
  render();
  await playFx();
  render();
  store.saveBattle(S);
}
$('#board').addEventListener('click', e => {
  const t = e.target.closest('.tile');
  if (!t || !S) return;
  const [r, c] = E.unkey(t.dataset.k);
  onTile(r, c, t.dataset.k);
});
function onTile(r, c, k) {
  if (!myTurn()) return inspect(r, c);
  const kind = targets().get(k), u = E.unitAt(S, r, c);
  if (kind === 'move' || kind === 'attack') {
    if (ui.pending?.k !== k) {
      const sel = E.unitById(S, ui.sel);
      let text;
      if (kind === 'move') { const steps = E.moveTargets(S, ui.sel).get(k), b = E.moveBudget(S, sel); text = `Déplacer ${name(sel)} : ${steps} pas, coût ${Math.max(0, steps - b.free)} ➤. Touche encore pour confirmer.`; }
      else { const pv = E.attackPreview(S, sel, r, c); text = pv.core ? `Frapper l’Invocateur : ${pv.dmg} dégât(s) prévus. Touche encore pour confirmer.` : `Attaquer ${name(u)} : ${pv.dmg} dégât(s)${pv.kills ? ' — détruit !' : ''}. Touche encore.`; }
      ui.pending = {k, text}; audio.play('tap'); render(); return;
    }
    return kind === 'move' ? act(() => E.move(S, ui.sel, r, c)) : act(() => E.attack(S, ui.sel, r, c));
  }
  if (kind === 'summon') { const id = ui.summonId; cancelMode(); return act(() => E.summonMonster(S, 'player', id, r, c), false); }
  if (kind === 'skill') { ui.mode = null; return act(() => E.useSkill(S, ui.sel, r, c)); }
  if (kind === 'effect') {
    ui.eff.targets.push([r, c]);
    if (ui.eff.steps[ui.eff.targets.length - 1] === 'ally') ui.eff.ally = u.uid;
    if (ui.eff.targets.length < ui.eff.steps.length) { render(); return; }
    const {handIndex, targets: tg} = ui.eff; cancelMode();
    return act(() => E.playEffect(S, 'player', handIndex, tg));
  }
  if (ui.mode || ui.pending) { cancelMode(); render(); if (!u) return; }
  if (u && u.side === 'player') { ui.sel = ui.sel === u.uid ? null : u.uid; audio.play('tap'); render(); return; }
  if (u || E.coreAt(S, r, c) || S.tiles[k] || E.isBlocked(S, r, c)) return inspect(r, c);
  if (ui.sel) { ui.sel = null; render(); }
}

/* ----- fiches : case, monstre, carte de la main, invocation, tactique ----- */
function inspect(r, c) {
  const u = E.unitAt(S, r, c), core = E.coreAt(S, r, c), t = S.tiles[E.key(r, c)];
  let html = '';
  if (u) {
    const status = [u.shield && '◆ Garde', E.isFrozen(S, u) && '❄ Gelé', E.isStealthed(S, u) && '◐ Furtif (inciblable)', u.empowered && `⚔ Chargé +${u.empowered}`, u.unstable && 'Instable'].filter(Boolean);
    html += `<div class="kicker">${u.side === 'player' ? 'Ton monstre' : 'Monstre rival'} · ♥ ${u.hp}/${u.maxHp} · ⚔ ${E.unitAtk(S, u)}</div>${status.length ? `<p>${status.join(' · ')}</p>` : ''}${cardDetailHTML(u.id)}`;
  }
  if (core) {
    const inv = INVOCATORS[core.invId];
    html += `<h2>${inv.glyph} ${esc(inv.name)} — ${esc(inv.title)}</h2><p>${core.side === 'player' ? 'Ton Invocateur' : 'Invocateur rival'} · ♥ ${core.hp}/${core.maxHp}</p>
      <p class="rule">${esc(inv.passive)}</p><p class="rule">Dégâts de siège plafonnés à 2 par attaque. La Barrière absorbe 1 dégât sur la première attaque de chaque tour adverse.</p>`;
  }
  if (E.isBlocked(S, r, c)) html += '<h2>Mur</h2><p>Case infranchissable : impossible d’y invoquer, de s’y déplacer ou de s’y téléporter.</p>';
  else if (t) {
    const bi = BIOME_INFO[t.biome];
    html += `<div class="tileInfo"><h3>${bi.glyph} ${esc(bi.name)} <span class="muted small">${t.owner === 'player' ? 'ton territoire' : t.owner === 'enemy' ? 'territoire rival' : 'zone neutre'}</span></h3>
      <p class="rule">${esc(bi.rule)}</p>${t.special ? `<p class="rule">${SPECIAL_ICON[t.special]} <b>${SPECIAL_INFO[t.special].name} :</b> ${SPECIAL_INFO[t.special].effect}</p>` : ''}</div>`;
  } else if (!core) html += '<h2>Case vide</h2><p>Pas encore de donjon ici. Une invocation adjacente à ton territoire étend le donjon.</p>';
  openSheet(html, {cls: 'wide'});
}
function openHandCard(i) {
  const id = P().hand[i], chk = E.canPlayEffect(S, 'player', i);
  const b = openSheet(`${cardDetailHTML(id)}<div class="row sheetActions">
    ${myTurn() ? `<button class="btn gold" id="hcPlay" ${chk.ok ? '' : 'disabled'}>Jouer (✦${EFFECTS[id].cost})</button>${chk.ok ? '' : `<span class="small bad">${esc(chk.msg)}</span>`}` : ''}</div>`, {cls: 'wide'});
  const btn = b.querySelector('#hcPlay');
  if (btn) btn.onclick = () => {
    closeSheet();
    const steps = E.effectSteps(id);
    if (!steps.length) return act(() => E.playEffect(S, 'player', i));
    ui.mode = 'effect'; ui.eff = {handIndex: i, id, steps, targets: [], ally: null}; ui.pending = null;
    render();
  };
}
$('#aRoll').onclick = async () => {
  if (!myTurn()) return;
  const res = E.roll(S, 'player');
  if (!res.ok) return toast(res.msg);
  ui.busy = true; render();
  await playFx();
  ui.busy = false; render(); store.saveBattle(S);
};
$('#aSummon').onclick = () => {
  if (!myTurn()) return;
  const roster = E.summonRoster(S, 'player');
  const b = openSheet(`<h2>Invoquer <span class="pill">◇ ${P().crests.summon}</span></h2>
    <p class="small muted">Petit (niv 1-2) ◇ · Moyen (niv 3-4) ◇◇ · Colosse (niv 5) ◇◇◇. La case doit toucher ton territoire ou ton Invocateur.</p>
    <div class="cardGrid">${roster.map(m => `<div class="cardCell ${m.affordable ? '' : 'dim'}">${cardHTML(m.id, {qty: m.copies})}
      <button class="btn small ${m.affordable ? 'gold' : ''}" data-sum="${m.id}" ${m.affordable ? '' : 'disabled'}>${'◇'.repeat(m.cost)} Invoquer</button>
      <button class="iconBtn info" data-sinfo="${m.id}">ⓘ</button></div>`).join('')}</div>`, {cls: 'wide'});
  b.querySelectorAll('[data-sum]').forEach(x => x.onclick = () => { closeSheet(); cancelMode(); ui.mode = 'summon'; ui.summonId = x.dataset.sum; ui.sel = null; render(); });
  b.querySelectorAll('[data-sinfo]').forEach(x => x.onclick = () => openSheet(cardDetailHTML(x.dataset.sinfo), {cls: 'wide', onClose: () => setTimeout(() => $('#aSummon').click())}));
};
$('#aTactics').onclick = () => tactics();
function tactics(picks = []) {
  if (!myTurn()) return;
  const p = P(), cc = E.concentrationCost(S, 'player'), left = {...p.crests};
  picks.forEach(k => left[k]--);
  const b = openSheet(`<h2>Tactique</h2>
    <div class="tac"><div><b>◆ Préparer une Garde</b><p class="small muted">Coûte 1 ◆. La prochaine attaque contre un de tes monstres sans Garde est réduite de 1.</p></div>
      <button class="btn" id="tGuard" ${!p.reaction && p.crests.guard ? '' : 'disabled'}>${p.reaction ? 'Prête' : 'Préparer'}</button></div>
    <div class="tac"><div><b>📖 Concentration</b><p class="small muted">Coûte ${cc} ✦ (1 si tu tiens des Ruines Arcaniques). Pioche 1 carte. Une fois par tour.</p></div>
      <button class="btn" id="tConc" ${!p.concentrationUsed && p.crests.magic >= cc && E.canDraw(S, 'player') ? '' : 'disabled'}>Piocher</button></div>
    <div class="tac col"><div><b>➤ Marche forcée</b><p class="small muted">Une fois par tour : sacrifie 2 blasons au choix pour gagner 1 ➤.</p></div>
      ${p.forcedMarchUsed ? '<span class="muted">Déjà utilisée ce tour.</span>' : `<div class="fmRow">${CREST_KEYS.filter(k => k !== 'move').map(k =>
        `<button class="crest f-${k}" data-fm="${k}" ${left[k] > 0 && picks.length < 2 ? '' : 'disabled'}><i>${FACE[k][0]}</i><b>${left[k]}</b></button>`).join('')}</div>
      <div class="row"><span>Sacrifice : <b>${picks.map(k => FACE[k][0]).join(' + ') || '—'}</b> (${picks.length}/2)</span>
      <button class="btn gold" id="tFm" ${picks.length === 2 ? '' : 'disabled'}>Gagner 1 ➤</button></div>`}</div>
    <div class="tac"><div><b>📜 Journal</b><p class="small muted">Tout ce qui s’est passé dans le duel.</p></div><button class="btn" id="tLog">Ouvrir</button></div>`);
  b.querySelector('#tGuard').onclick = () => { closeSheet(); act(() => E.prepareGuard(S, 'player')); };
  b.querySelector('#tConc').onclick = () => { closeSheet(); act(() => E.concentrate(S, 'player')); };
  b.querySelector('#tLog').onclick = showLog;
  b.querySelectorAll('[data-fm]').forEach(x => x.onclick = () => tactics([...picks, x.dataset.fm]));
  const fm = b.querySelector('#tFm');
  if (fm) fm.onclick = () => { closeSheet(); act(() => E.forcedMarch(S, 'player', picks)); };
}
function showLog() {
  openSheet(`<h2>Journal</h2><div class="log">${S.log.map(l => `<div class="${l.cls}"><small>T${l.turn}</small> ${l.msg}</div>`).join('')}</div>`, {cls: 'wide'});
}
$('#bMenu').onclick = () => openSettings(true);
$('#aEnd').onclick = async () => {
  if (!myTurn()) return;
  cancelMode(); ui.sel = null;
  E.endTurn(S);
  await enemyTurn();
};
$('#crests').onclick = () => openSheet(`<h2>Ta réserve</h2><p>Chaque face de dé lancée est stockée (9 max par symbole) :</p>
  <ul class="steps">${CREST_KEYS.map(k => `<li><b>${FACE[k][0]} ${crestName[k]}</b> — ${{summon: 'payer les invocations (◇ à ◇◇◇ selon la taille).', move: 'déplacer tes monstres, 1 ➤ par pas.', attack: 'charger une attaque : +1 dégât (max +2 par attaque).', magic: 'jouer des cartes Effet et te Concentrer.', guard: 'préparer une Garde qui réduit une attaque de 1.'}[k]}</li>`).join('')}</ul>
  <p class="small muted">Les faces du lancer actuel forment aussi des <b>combos</b> qui débloquent la compétence de tes monstres, sans dépenser les symboles. Les combos expirent à la fin du tour.</p>`);

/* ----- tour du rival ----- */
async function enemyTurn() {
  ui.busy = true; render();
  await playFx(); render();
  if (!S.over && S.side === 'enemy') {
    await sleep(350);
    const speed = store.settings.speed || 1;
    for (const step of DD.ai.turn(S)) {
      render(); await playFx(); render();
      if (S.over) break;
      await sleep((step.delay || 300) / speed);
    }
    if (!S.over) E.endTurn(S);
    render(); await playFx();
  }
  ui.busy = false; render();
  store.saveBattle(S);
  if (!S.over) banner('À toi de jouer');
}

/* ----- fin du duel ----- */
function finishBattle() {
  store.clearBattle();
  const win = S.winner === 'player';
  audio.play(win ? 'win' : 'lose');
  let first = false, extra = '';
  if (S.mode === 'campaign' && win) {
    first = store.clearMission(S.missionIndex, S.turn);
    extra = first ? `<p class="rule">Récompense : ${esc(CAMPAIGN_MISSIONS[S.missionIndex].reward)}</p>` : '';
  }
  const xp = store.awardXp(win, S.mode, first, S.turn);
  const hasNext = S.mode === 'campaign' && win && S.missionIndex < CAMPAIGN_MISSIONS.length - 1;
  const b = openSheet(`<div class="result ${win ? 'win' : 'lose'}"><h1>${win ? 'VICTOIRE' : 'DÉFAITE'}</h1>
    <p>${win ? 'L’Invocateur rival est détruit.' : 'Ton Invocateur est tombé.'} Duel terminé au tour ${S.turn}.</p>${extra}
    <p class="xp">+${xp.gained} XP · Niveau ${xp.after}${xp.after > xp.before ? ` <b>— niveau supérieur !</b>` : ''}</p>
    ${xp.unlocks.length ? `<p class="rule">Débloqué : ${xp.unlocks.join(' · ')}</p>` : ''}
    <div class="row center">${hasNext ? '<button class="btn gold" id="rNext">Duel suivant ▶</button>' : ''}
    <button class="btn ${hasNext ? '' : 'gold'}" id="rAgain">Rejouer</button><button class="btn ghost" id="rMenu">Menu</button></div></div>`, {locked: true});
  const again = {mode: S.mode, missionIndex: S.missionIndex, arenaId: S.arenaId};
  b.querySelector('#rAgain').onclick = () => { closeSheet(); startBattle(again); };
  b.querySelector('#rMenu').onclick = () => { closeSheet(); show(S.mode === 'campaign' ? 'campaign' : 'menu'); };
  const nx = b.querySelector('#rNext');
  if (nx) nx.onclick = () => { closeSheet(); startBattle({mode: 'campaign', missionIndex: again.missionIndex + 1}); };
}

/* ----- animations ----- */
function tileCenter(r, c) {
  const el = tileEl(r, c), wrap = $('#boardWrap');
  if (!el) return null;
  const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect();
  return {x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2};
}
function fxEl(cls, html, r, c, ms = 1000) {
  const p = tileCenter(r, c);
  if (!p) return null;
  const d = document.createElement('div');
  d.className = 'fx ' + cls; d.innerHTML = html; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
  $('#fxLayer').appendChild(d); setTimeout(() => d.remove(), ms);
  return d;
}
function shake() { const w = $('#boardWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
async function playFx() {
  const list = S.fx.splice(0);
  for (const e of list) {
    if (e.t === 'roll') await diceAnimation(e.side, e.dice);
    else if (e.t === 'float') {
      fxEl('float ' + e.kind, esc(e.text), e.r, e.c, 1100);
      if (e.kind === 'damage') { audio.play('hit'); shake(); const u = E.unitAt(S, e.r, e.c), core = E.coreAt(S, e.r, e.c); if ((u || core)?.side === 'player') vibrate(40); }
    } else if (e.t === 'summon') {
      audio.play('summon');
      fxEl('burst summonFx', `<div class="cine">${cardHTML(e.id)}</div>`, e.r, e.c, 1200);
      for (const [r, c] of e.cells) tileEl(r, c)?.classList.add('born');
      await sleep(500);
    } else if (e.t === 'attack') {
      const a = tileCenter(...e.from), b = tileCenter(...e.to);
      if (a && b) {
        const d = document.createElement('div'), len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        d.className = 'fx slash'; d.style.left = a.x + 'px'; d.style.top = a.y + 'px'; d.style.width = len + 'px'; d.style.transform = `rotate(${ang}deg)`;
        d.style.setProperty('--glow', vis(e.id).glow); d.innerHTML = `<span>${esc(DD.ATTACK_NAMES[e.id] || 'Attaque')}</span>`;
        $('#fxLayer').appendChild(d); setTimeout(() => d.remove(), 700);
      }
      await sleep(260);
    } else if (e.t === 'move') { audio.play('move'); fxEl('float move', '➤', e.to[0], e.to[1], 700); }
    else if (e.t === 'blink') fxEl('burst blink', '', e.r, e.c, 800);
    else if (e.t === 'death') fxEl('burst death', '✖', e.r, e.c, 900);
    else if (e.t === 'spell') {
      audio.play('spell');
      banner(`${e.side === 'player' ? '' : 'Rival · '}${EFFECTS[e.id].name}`);
      const d = fxEl('burst spell', vis(e.id).glyph, e.r, e.c, 1000); if (d) d.style.setProperty('--glow', vis(e.id).glow);
      await sleep(350);
    } else if (e.t === 'skill') {
      audio.play('spell'); banner(`${e.side === 'player' ? '' : 'Rival · '}${e.name}`);
      fxEl('burst skillFx', '✦', e.r, e.c, 900); await sleep(250);
    } else if (e.t === 'banner') banner(e.text, e.danger);
  }
  if (list.length) await sleep(120);
}
let skipDice = null;
$('#diceOverlay').onclick = () => skipDice && skipDice();
async function diceAnimation(side, dice) {
  audio.play('dice');
  const ov = $('#diceOverlay'), row = $('#diceRow'), pos = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  const rot = [{x: 0, y: 0}, {x: 0, y: 180}, {x: 0, y: -90}, {x: 0, y: 90}, {x: -90, y: 0}, {x: 90, y: 0}];
  $('#diceTitle').textContent = side === 'player' ? 'TON LANCER' : 'LANCER DU RIVAL';
  ov.className = 'diceOverlay ' + side;
  row.innerHTML = dice.map(d => {
    const f = MONSTERS[d.id].faces;
    return `<div class="die"><div class="cube">${f.map((x, i) => `<div class="face ${pos[i]} f-${x}">${FACE[x][0]}</div>`).join('')}</div><b>${esc(MONSTERS[d.id].name)}</b><span class="res">…</span></div>`;
  }).join('');
  const cubes = [...row.querySelectorAll('.cube')];
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  cubes.forEach((cube, i) => {
    const f = MONSTERS[dice[i].id].faces, idx = f.map((x, j) => x === dice[i].face ? j : -1).filter(j => j >= 0), t = rot[idx[Math.floor(Math.random() * idx.length)]];
    cube.style.transition = `transform ${900 + i * 120}ms cubic-bezier(.12,.72,.16,1)`;
    cube.style.transform = `rotateX(${720 + t.x}deg) rotateY(${1080 + t.y}deg)`;
  });
  await new Promise(res => { skipDice = res; setTimeout(res, 1250 + dice.length * 100); });
  row.querySelectorAll('.res').forEach((s, i) => { s.textContent = `${FACE[dice[i].face][0]} ${FACE[dice[i].face][1]}`; s.classList.add('on'); });
  await new Promise(res => { skipDice = res; setTimeout(res, side === 'player' ? 800 : 550); });
  skipDice = null;
  ov.className = 'diceOverlay hidden';
}

/* =================== RÈGLES =================== */
const RULES_HTML = `<h2>Règles du duel</h2>
<p><b>But :</b> détruire l’Invocateur adverse (7 PV ; Aegis 8).</p>
<h3>1. Les dés sont ta seule ressource</h3>
<p>Chaque monstre de ton deck apporte son dé à 6 faces. À chaque tour tu lances 3 dés tirés de ton pool ; chaque face rejoint ta réserve (9 max par symbole) :
◇ Invocation · ➤ Mouvement · ⚔ Attaque · ✦ Magie · ◆ Défense.</p>
<h3>2. Invoquer et construire le donjon</h3>
<p>Coût : Petit (niv 1-2) ◇, Moyen (niv 3-4) ◇◇, Colosse (niv 5) ◇◇◇. Ta première invocation touche ton Invocateur, les suivantes ton territoire.
Chaque invocation crée jusqu’à 4 cases d’un biome lié au monstre ; des coffres, sanctuaires, Nexus et pièges peuvent y apparaître.</p>
<h3>3. Agir avec un monstre</h3>
<p>Touche ton monstre : <b>bleu</b> = déplacement (1 ➤ par pas, jusqu’à son MOV par tour), <b>rouge</b> = attaque (gratuite, une par tour, sur une case adjacente).
Touche deux fois pour confirmer. <b>Charger</b> dépense 1 ⚔ : +1 dégât (max +2) sur l’attaque de ce tour.</p>
<h3>4. Combos et compétences</h3>
<p>Si ton lancer contient les symboles d’une compétence (ex. ⚔⚔ pour le Crimson Drake), le monstre peut l’utiliser. Le combo ne dépense rien, sert une fois par recette et expire à la fin du tour.</p>
<h3>5. Cartes Effet</h3>
<p>3 cartes au départ, main max 5, <b>une carte Effet par tour</b>, payée en ✦. <b>Concentration</b> : 2 ✦ (1 si tu tiens des Ruines Arcaniques) pour piocher, une fois par tour.</p>
<h3>6. Siège de l’Invocateur</h3>
<p>Dégâts plafonnés à 2 par attaque ; la <b>Barrière</b> absorbe 1 dégât sur la première attaque de chaque tour. Un monstre téléporté (Portal Shift, Saut d’Ombre, Faille Mobile) est <b>instable</b> : il ne peut pas frapper l’Invocateur ce tour.</p>
<h3>7. États</h3>
<p><b>◐ Furtif</b> : ne peut être ni attaqué ni ciblé (sauf Dispel Wave) jusqu’à la fin du prochain tour de son propriétaire ; attaquer le révèle. <b>❄ Gelé</b> : ne peut ni bouger, ni attaquer, ni utiliser de compétence pendant le prochain tour de son propriétaire. <b>◆ Garde</b> : réduit la prochaine attaque de 1.</p>
<h3>8. Tactique</h3>
<p><b>Préparer une Garde</b> (1 ◆) : la prochaine attaque contre un de tes monstres sans Garde est réduite de 1. <b>Marche forcée</b> : une fois par tour, 2 blasons au choix → 1 ➤.</p>
<h3>9. Relais, familles, biomes</h3>
<p>Le <b>Relais</b> central offre 1 pas gratuit par tour à son contrôleur. Chaque famille a une synergie et chaque biome une règle : touche une case ou un monstre pour la lire.</p>
<h3>10. Le donjon s’emballe</h3>
<p>Tour 4 : pluie de coffres. Tour 7 : tempête de dés (4 dés). Tour 10 : <b>Mort subite</b> (Invocateurs -1 PV, monstres +1 ATQ). Tour 15 : <b>Effondrement</b> — chaque Invocateur perd 1 PV au début de son tour.</p>`;

/* ----- démarrage ----- */
document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.over && current === 'battle' && !ui.busy) store.saveBattle(S); });
show('menu');
DD.ui = {show, startBattle, render, get state() { return S; }, ui};
})(globalThis.DD = globalThis.DD || {});
