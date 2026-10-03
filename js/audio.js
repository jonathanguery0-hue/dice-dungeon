/* Dice Dungeon — musique et bruitages procéduraux (Web Audio, aucun fichier son). */
(function (DD) {
'use strict';
const pref = DD.store.audioPref;
let ctx = null, master, music, sfx, step = 0, mode = 'menu';
const MUSIC = {
  menu: {bass: [45, 45, 52, 45, 48, 45, 52, 55], lead: [69, null, 72, null, 67, null, 64, null]},
  deck: {bass: [48, 55, 52, 57, 48, 55, 59, 57], lead: [72, null, 71, 74, null, 76, 74, null]},
  battle: {bass: [43, 50, 46, 53, 43, 50, 55, 53], lead: [67, null, 70, 72, 67, 74, 72, null]},
  tension: {bass: [41, 48, 53, 46, 41, 50, 55, 46], lead: [65, 68, null, 72, 70, 75, null, 77]}
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); music = ctx.createGain(); sfx = ctx.createGain();
  music.connect(master); sfx.connect(master); master.connect(ctx.destination);
  music.gain.value = .22; sfx.gain.value = .46;
  applyGain();
  setInterval(tick, 260);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}
function applyGain() { if (!master) return; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(pref.muted ? 0 : pref.volume, ctx.currentTime + .05); }
function note(n, dur = .25, vol = .05, type = 'triangle', bus = music, delay = 0) {
  if (!ctx || pref.muted) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(midi(n), t);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + .025); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .04);
}
function noise(vol = .07, dur = .12, delay = 0) {
  if (!ctx || pref.muted) return;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1500; src.buffer = buf; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfx); src.start(ctx.currentTime + delay);
}
function tick() {
  if (!ctx || ctx.state !== 'running' || pref.muted) return;
  const p = MUSIC[mode] || MUSIC.menu, i = step++ % p.bass.length, tense = mode === 'tension';
  note(p.bass[i], tense ? .18 : .34, tense ? .075 : .052);
  if (p.lead[i] != null) note(p.lead[i], .42, tense ? .045 : .032, 'sine', music, .02);
  if (i % 4 === 0) { note(p.bass[i] + 12, .65, .018, 'sine'); if (mode === 'battle' || tense) noise(tense ? .02 : .012, .06); }
}
function play(kind) {
  ensure();
  if (!ctx || pref.muted) return;
  if (kind === 'dice') { noise(.12, .12); [60, 64, 67].forEach((n, i) => note(n, .13, .06, 'square', sfx, i * .08)); }
  else if (kind === 'spell') [72, 79, 84].forEach((n, i) => note(n, .28, .055, 'sine', sfx, i * .05));
  else if (kind === 'hit') { noise(.18, .09); note(38, .18, .11, 'sawtooth', sfx); }
  else if (kind === 'summon') [48, 55, 60, 67].forEach((n, i) => note(n, .35, .055, 'triangle', sfx, i * .06));
  else if (kind === 'move') note(62, .08, .03, 'triangle', sfx);
  else if (kind === 'tap') note(76, .05, .02, 'sine', sfx);
  else if (kind === 'win') [60, 64, 67, 72].forEach((n, i) => note(n, .55, .07, 'triangle', sfx, i * .12));
  else if (kind === 'lose') [55, 51, 48, 43].forEach((n, i) => note(n, .5, .065, 'sawtooth', sfx, i * .12));
}
function setMode(m) { mode = m; }
function setMuted(m) { pref.muted = m; DD.store.saveAudio(); ensure(); applyGain(); }
function setVolume(v) { pref.volume = Math.max(0, Math.min(1, v)); if (pref.volume > 0) pref.muted = false; DD.store.saveAudio(); ensure(); applyGain(); }
document.addEventListener('pointerdown', ensure, {once: true});

DD.audio = {play, setMode, setMuted, setVolume, pref};
})(globalThis.DD = globalThis.DD || {});
