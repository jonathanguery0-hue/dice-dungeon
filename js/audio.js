/* Dice Dungeon — musique et bruitages procéduraux (Web Audio, aucun fichier son).
   Ambiance « taverne fantasy » : luth et harpe (cordes pincées Karplus-Strong), flûte, basse, bodhrán,
   tambourin et basson, dans une salle de pierre (réverbération synthétique).
   Chaque thème est écrit en sections (A, A', B…) jouées avec de légères variations à chaque passage,
   et la musique de duel ajoute des instruments quand la partie s'intensifie. */
(function (DD) {
'use strict';
const pref = DD.store.audioPref;
if (pref.music == null) pref.music = .7;
if (pref.sfx == null) pref.sfx = .85;

/* ================= notation ================= */
const NOTE = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
function midiOf(n) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
/* mélodie : "A4:3 D5:1 -:2 | …" → mesures de notes {n, d} (d en croches) */
function mel(s) { return s.split('|').map(bar => bar.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return {n: n === '-' ? null : midiOf(n), d: +d}; })); }
function chord(c) {
  const m = /^([A-G][#b]?)(m|7|m7)?$/.exec(c);
  const root = midiOf(m[1] + '2');
  const ints = m[2] === 'm' ? [0, 3, 7] : m[2] === '7' ? [0, 4, 7, 10] : m[2] === 'm7' ? [0, 3, 7, 10] : [0, 4, 7];
  return {root: root < 40 ? root + 12 : root, ints};
}

/* ================= partitions ================= */
const THEMES = {
  /* La Taverne du Dé — valse calme, ré dorien */
  menu: {title: 'La Taverne du Dé', step: .34, bar: 6, style: 'waltz', lead: 'flute',
    form: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: {chords: 'Dm C Dm Am F C G Dm', mel: mel('A4:3 D5:1 E5:1 F5:1 | E5:2 D5:1 C5:3 | D5:2 F5:1 A5:2 G5:1 | E5:4 -:2 | F5:2 A5:1 G5:1 F5:2 | E5:2 G5:1 E5:1 C5:2 | B4:2 D5:1 E5:1 D5:1 B4:1 | D5:6')},
      A2: {chords: 'Dm C Dm Am F C G Dm', mel: mel('A4:3 D5:1 E5:1 F5:1 | E5:2 D5:1 C5:3 | D5:2 F5:1 A5:2 G5:1 | E5:4 -:2 | F5:2 A5:1 G5:1 F5:2 | E5:2 G5:1 E5:1 C5:2 | G5:2 F5:1 E5:1 D5:1 B4:1 | A4:1 D5:5')},
      B: {chords: 'Bb F C Dm Bb F Gm A', mel: mel('D5:2 F5:1 D5:1 Bb4:2 | C5:2 F5:1 A5:1 G5:1 F5:1 | E5:2 G5:1 E5:1 C5:2 | D5:3 -:3 | F5:2 D5:1 F5:1 Bb5:2 | A5:2 G5:1 F5:1 C5:2 | Bb4:2 D5:1 G5:1 F5:1 E5:1 | C#5:4 E5:2')}
    }},
  /* Gigue du Duel — gigue 6/8, mi dorien */
  battle: {title: 'Gigue du Duel', step: .19, bar: 6, style: 'jig', lead: 'flute',
    form: ['A', 'A', 'B', 'B', 'A', 'C'],
    sections: {
      A: {chords: 'Em Em D D Em Em D Em', mel: mel('B4:1 E5:1 E5:1 B4:1 E5:1 G5:1 | F#5:1 E5:1 D5:1 B4:2 A4:1 | A4:1 D5:1 D5:1 A4:1 D5:1 F#5:1 | E5:1 D5:1 B4:1 A4:2 F#4:1 | G4:1 B4:1 E5:1 G5:1 F#5:1 E5:1 | B5:2 A5:1 G5:1 F#5:1 E5:1 | F#5:1 A5:1 F#5:1 D5:1 E5:1 F#5:1 | E5:2 B4:1 E5:3')},
      B: {chords: 'G D C D G D C B', mel: mel('G5:1 B5:1 D6:1 B5:2 G5:1 | A5:1 F#5:1 D5:1 A5:2 F#5:1 | G5:1 E5:1 C5:1 E5:1 G5:1 E5:1 | F#5:2 E5:1 D5:2 A4:1 | B4:1 D5:1 G5:1 B5:2 A5:1 | A5:1 F#5:1 D5:1 F#5:1 A5:1 D6:1 | E5:1 G5:1 E5:1 C5:1 D5:1 E5:1 | D#5:3 F#5:3')},
      C: {chords: 'Em Em C C D D B B', mel: null}
    }},
  /* Mort Subite — même gigue, sombre et pressée */
  tension: {title: 'Mort Subite', step: .165, bar: 6, style: 'tension', lead: 'flute',
    form: ['T', 'T2'],
    sections: {
      T: {chords: 'Em F Em F Am G F B', mel: mel('B4:2 C5:1 B4:3 | A4:2 G4:1 F4:1 E4:2 | E5:2 F5:1 E5:3 | C5:3 A4:3 | A4:1 C5:1 E5:1 A5:3 | G5:2 F5:1 D5:3 | F5:1 E5:1 D5:1 C5:3 | B4:3 D#5:3')},
      T2: {chords: 'Em F Em F Am G F B', mel: null}
    }},
  /* Polka des Marais — mode Histoire, basson et fanfare de gobelins */
  goblin: {title: 'Polka des Marais', step: .23, bar: 4, style: 'polka', lead: 'bassoon',
    form: ['A', 'A', 'B', 'A2'],
    sections: {
      A: {chords: 'C G G C C F G C', mel: mel('E4:1 G4:1 C5:2 | B4:1 A4:1 G4:2 | F4:1 G4:1 A4:1 B4:1 | C5:2 G4:2 | E5:1 D#5:1 E5:1 G5:1 | F5:1 E5:1 D5:1 C5:1 | B4:1 C5:1 D5:1 G4:1 | C5:2 -:2')},
      A2: {chords: 'C G G C C F G C', mel: mel('E4:1 G4:1 C5:2 | B4:1 A4:1 G4:2 | F4:1 G4:1 A4:1 B4:1 | C5:2 G4:2 | E5:1 D#5:1 E5:1 G5:1 | F5:1 E5:1 D5:1 C5:1 | G4:1 G#4:1 A4:1 B4:1 | C5:1 G4:1 C4:2')},
      B: {chords: 'F C G C F C D7 G', mel: mel('A4:1 C5:1 F5:2 | E5:1 C5:1 G4:2 | D5:1 B4:1 G4:1 B4:1 | C5:1 E5:1 G5:2 | F5:1 F5:1 A5:1 F5:1 | E5:2 C5:2 | F#5:1 E5:1 D5:1 C5:1 | B4:2 -:1 G4:1')}
    }}
};
const FANFARES = {
  win: {step: .13, notes: 'D5:1 F#5:1 A5:1 D6:3 A5:1 D6:5', chords: ['D', 'D', 'G', 'D']},
  lose: {step: .22, notes: 'A4:2 G4:2 F4:2 E4:2 D4:6', chords: ['Dm', 'Bb', 'Gm', 'Dm']}
};

/* ================= moteur ================= */
let ctx = null, master, comp, musicBus, sfxBus, verb, noiseBuf;
let mode = 'menu', preview = null, intensity = 1, play = null, timer = null, duck = 1;
const ksCache = new Map();

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .2;
  master.connect(comp); comp.connect(ctx.destination);
  verb = ctx.createConvolver(); verb.buffer = impulse(2.6, 2.4);
  const verbOut = ctx.createGain(); verbOut.gain.value = .9; verb.connect(verbOut); verbOut.connect(master);
  musicBus = ctx.createGain(); sfxBus = ctx.createGain();
  musicBus.connect(master); sfxBus.connect(master);
  const mSend = ctx.createGain(); mSend.gain.value = .32; musicBus.connect(mSend); mSend.connect(verb);
  const sSend = ctx.createGain(); sSend.gain.value = .14; sfxBus.connect(sSend); sSend.connect(verb);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyGain(true);
  timer = setInterval(tick, 50);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}
/* réponse impulsionnelle d'une salle de pierre : bruit stéréo qui s'éteint */
function impulse(sec, decay) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1); }
  return b;
}
function applyGain(now) {
  if (!ctx) return;
  const t = ctx.currentTime, r = now ? 0 : .08;
  master.gain.setTargetAtTime(pref.muted ? 0 : pref.volume, t, r || .001);
  musicBus.gain.setTargetAtTime(pref.music * .55 * duck, t, r || .001);
  sfxBus.gain.setTargetAtTime(pref.sfx * .9, t, r || .001);
}

/* ---------- instruments ---------- */
function env(g, t, a, peak, d, sustain = 0.0001) {
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(.0001, sustain), t + a + d);
}
/* corde pincée (luth, harpe) : algorithme de Karplus-Strong, un tampon par note mis en cache */
function ksBuffer(m, soft) {
  const k = m + (soft ? 'h' : 'l');
  if (ksCache.has(k)) return ksCache.get(k);
  const sr = ctx.sampleRate, f = hz(m), N = Math.max(2, Math.floor(sr / f - .5)), len = Math.floor(sr * (m < 50 ? 2.2 : 1.6));
  const b = ctx.createBuffer(1, len, sr), y = b.getChannelData(0);
  const damp = m < 50 ? .998 : m < 70 ? .996 : .993;
  let prev = 0;
  for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; y[i] = soft ? (r + prev) * .5 : r; prev = r; }
  for (let i = N; i < len; i++) y[i] = damp * .5 * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
  const out = {buf: b, rate: f / (sr / (N + .5))};
  ksCache.set(k, out);
  return out;
}
function pluck(m, t, vel, out, {soft = false, bright = 3200, pan = 0} = {}) {
  const {buf, rate} = ksBuffer(m, soft), s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  s.buffer = buf; s.playbackRate.value = rate;
  f.type = 'lowpass'; f.frequency.value = bright;
  g.gain.value = vel;
  s.connect(f); f.connect(g);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out);
  s.start(t); s.stop(t + buf.duration);
}
function strum(c, t, vel, out, {low = 0, dir = 1} = {}) {
  const notes = [c.root + 12, ...c.ints.map(i => c.root + 12 + i), c.root + 24].map(n => n + low);
  (dir > 0 ? notes : notes.reverse()).forEach((n, i) => pluck(n, t + i * .016, vel * (.8 + Math.random() * .2), out, {soft: true, bright: 2600, pan: (i - 2) * .12}));
}
function flute(m, t, dur, vel, out) {
  const f = hz(m), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; g2.gain.value = .12;
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .006, t + Math.min(.35, dur * .6));
  lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
  o.connect(g); o2.connect(g2); g2.connect(g);
  const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();       // souffle
  n.buffer = noiseBuf; nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 1.5; ng.gain.value = vel * .18;
  n.connect(nf); nf.connect(ng); ng.connect(out);
  const end = t + dur;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vel, t + .05); g.gain.setTargetAtTime(vel * .75, t + .05, .2);
  g.gain.setTargetAtTime(.0001, end - .02, .06);
  ng.gain.setTargetAtTime(.0001, t + .08, .05);
  g.connect(out);
  [o, o2, lfo, n].forEach(x => { x.start(t); x.stop(end + .4); });
}
function bassoon(m, t, dur, vel, out) {
  const f = hz(m), o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.frequency.value = Math.min(1400, f * 4); fl.Q.value = 3;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = f * .004; lfo.connect(lg); lg.connect(o.frequency);
  o.connect(fl); fl.connect(g); g.connect(out);
  const end = t + dur * .85;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vel, t + .025); g.gain.setTargetAtTime(vel * .6, t + .03, .12); g.gain.setTargetAtTime(.0001, end, .04);
  [o, lfo].forEach(x => { x.start(t); x.stop(end + .3); });
}
function bass(m, t, dur, vel, out) {
  const f = hz(m), o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f / 2;
  fl.type = 'lowpass'; fl.frequency.value = 700;
  o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(out);
  env(g, t, .01, vel, Math.min(dur, .9));
  [o, o2].forEach(x => { x.start(t); x.stop(t + dur + .2); });
}
function noise(t, dur, vel, out, type, freq, q = 1) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  s.connect(f); f.connect(g); g.connect(out);
  env(g, t, .002, vel, dur);
  s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function boom(t, vel, out) {                                         // bodhrán grave
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(52, t + .16);
  o.connect(g); g.connect(out); env(g, t, .004, vel, .4);
  o.start(t); o.stop(t + .5);
  noise(t, .05, vel * .25, out, 'lowpass', 900);
}
function tap(t, vel, out) {                                          // bodhrán, coup de bord
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(170, t + .05);
  o.connect(g); g.connect(out); env(g, t, .002, vel * .5, .08);
  o.start(t); o.stop(t + .15);
  noise(t, .04, vel * .35, out, 'bandpass', 1800, .8);
}
function jingle(t, vel, out) {                                       // tambourin
  for (let i = 0; i < 3; i++) noise(t + i * .012, .09, vel * (1 - i * .25), out, 'highpass', 7000);
}
function bell(m, t, vel, out, dur = 1.6) {                           // carillon (étoiles, niveaux)
  [1, 2.76, 5.4].forEach((r, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m) * r;
    o.connect(g); g.connect(out); env(g, t, .003, vel / (1 + i * 1.8), dur / (1 + i));
    o.start(t); o.stop(t + dur + .1);
  });
}

/* ---------- séquenceur ---------- */
const human = () => (Math.random() - .5) * .014;
function startTheme(name) {
  const th = THEMES[name];
  if (play) { const old = play.gain; old.gain.setTargetAtTime(.0001, ctx.currentTime, .15); setTimeout(() => old.disconnect(), 1500); }
  if (!th) { play = null; return; }
  const g = ctx.createGain(); g.connect(musicBus);
  g.gain.setValueAtTime(.0001, ctx.currentTime); g.gain.setTargetAtTime(1, ctx.currentTime + .05, .4);
  play = {name, th, gain: g, form: 0, bar: 0, next: ctx.currentTime + .12, pass: 0, vary: varySection(th, 0, 0)};
}
function varySection(th, formIdx, pass) {
  const key = th.form[formIdx], repeat = th.form.indexOf(key) < formIdx || pass > 0;
  return {melody: !(repeat && Math.random() < .2), octave: repeat && Math.random() < .15 ? 12 : 0, grace: .22};
}
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const want = preview || mode;
  if (!play || play.name !== want) startTheme(want);
  if (!play) return;
  while (play.next < ctx.currentTime + .25) {
    const th = play.th, secKey = th.form[play.form], sec = th.sections[secKey];
    const chords = sec.chords.split(' ');
    scheduleBar(th, sec, chords[play.bar], play.bar, play.next, play.vary);
    play.next += th.step * th.bar;
    if (++play.bar >= chords.length) {
      play.bar = 0;
      if (++play.form >= th.form.length) { play.form = 0; play.pass++; }
      play.vary = varySection(th, play.form, play.pass);
    }
  }
}
function scheduleBar(th, sec, chName, barIdx, t0, vary) {
  const out = play.gain, c = chord(chName), s = th.step, lvl = (play.name === 'menu' || play.name === 'goblin') ? Math.min(intensity, 1) : intensity;
  // accompagnement
  if (th.style === 'waltz') {
    const arp = [0, 7, 12 + c.ints[1], 12 + 7, 24, 12 + c.ints[1]];
    arp.forEach((iv, i) => pluck(c.root + 12 + iv, t0 + i * s + human(), i === 0 ? .5 : .32, out, {soft: true, bright: 2400, pan: (i % 3 - 1) * .3}));
    bass(c.root, t0, s * 5, .32, out);
  } else if (th.style === 'jig') {
    strum(c, t0 + human(), .32, out); strum(c, t0 + 3 * s + human(), .24, out, {dir: -1});
    bass(c.root, t0, s * 2.6, .38, out); bass(c.root + 7, t0 + 3 * s, s * 2.6, .3, out);
    if (lvl >= 1) { boom(t0, .55, out); tap(t0 + 2 * s, .35, out); boom(t0 + 3 * s, .38, out); tap(t0 + 5 * s, .3, out); }
    if (lvl >= 2) { jingle(t0 + 3 * s, .1, out); if (barIdx % 2) jingle(t0 + 5 * s, .07, out); }
  } else if (th.style === 'tension') {
    for (let i = 0; i < 6; i++) pluck(c.root + 12 + (i % 3 === 2 ? 7 : 0), t0 + i * s + human(), i % 3 === 0 ? .42 : .26, out, {bright: 1800});
    bass(c.root, t0, s * 6, .42, out);
    for (let i = 0; i < 6; i++) (i % 3 === 0 ? boom : tap)(t0 + i * s, i % 3 === 0 ? .6 : .28, out);
    if (barIdx % 2 === 1) jingle(t0 + 5 * s, .12, out);
  } else if (th.style === 'polka') {
    bassoon(c.root, t0, s * 1.2, .34, out); bassoon(c.root + 7, t0 + 2 * s, s * 1.2, .3, out);
    strum(c, t0 + s + human(), .2, out); strum(c, t0 + 3 * s + human(), .2, out);
    tap(t0 + s, .22, out); tap(t0 + 3 * s, .22, out);
    if (barIdx % 4 === 3) jingle(t0 + 3 * s, .08, out);
  }
  // mélodie
  if (!sec.mel || !vary.melody || (th.style === 'jig' && lvl < 1)) return;
  let off = 0;
  for (const n of sec.mel[barIdx]) {
    if (n.n !== null) {
      const t = t0 + off * s + human(), dur = n.d * s, m = n.n + vary.octave + (th.lead === 'bassoon' ? -12 : 0), v = .2 + Math.random() * .05;
      if (th.lead === 'bassoon') bassoon(m, t, dur, v * 1.6, out);
      else {
        if (n.d >= 2 && Math.random() < vary.grace) flute(m + 2, t - .05, .05, v * .6, out);          // ornement
        flute(m, t, dur, v, out);
      }
      if (lvl >= 2 && th.style === 'jig') pluck(m - 12, t, .16, out, {bright: 2200});               // doublure au luth
    }
    off += n.d;
  }
}

/* ---------- fanfares et bruitages ---------- */
function fanfare(kind) {
  const f = FANFARES[kind], t0 = ctx.currentTime + .05;
  duck = .15; applyGain(); setTimeout(() => { duck = 1; applyGain(); }, 4200);
  f.chords.forEach((c, i) => strum(chord(c), t0 + i * f.step * 3, .35, sfxBus));
  let off = 0;
  for (const n of mel(f.notes)[0]) { if (n.n !== null) flute(n.n, t0 + off * f.step, n.d * f.step, .3, sfxBus); off += n.d; }
  if (kind === 'win') { boom(t0, .5, sfxBus); jingle(t0 + f.step * 3, .2, sfxBus); }
}
function sound(kind) {
  ensure();
  if (!ctx || pref.muted) return;
  const t = ctx.currentTime + .01, out = sfxBus;
  switch (kind) {
    case 'dice': {                                     // dés qui roulent sur une table en bois
      let x = t;
      for (let i = 0; i < 9; i++) { const v = .5 * Math.pow(.82, i); noise(x, .025, v, out, 'bandpass', 2200 + Math.random() * 1500, 2); tap(x, v * .5, out); x += .045 + i * .012 + Math.random() * .02; }
      noise(x, .06, .2, out, 'bandpass', 1500, 1.5);
      break;
    }
    case 'tap': noise(t, .03, .25, out, 'bandpass', 2600, 3); break;
    case 'move': noise(t, .07, .18, out, 'lowpass', 700); tap(t, .12, out); break;
    case 'hit': boom(t, .7, out); noise(t, .12, .45, out, 'bandpass', 900, .7); break;
    case 'summon': [0, 4, 7, 12, 16].forEach((iv, i) => pluck(57 + iv, t + i * .05, .4, out, {bright: 4000})); boom(t + .25, .45, out); break;
    case 'spell': [0, 7, 12, 19].forEach((iv, i) => pluck(69 + iv, t + i * .04, .3, out, {bright: 5000})); bell(88, t + .15, .12, out, 1); break;
    case 'star': bell(84, t, .25, out); break;
    case 'level': [72, 76, 79, 84].forEach((m, i) => bell(m, t + i * .09, .18, out, 1.2)); break;
    case 'coin': bell(91, t, .15, out, .5); bell(96, t + .07, .15, out, .7); break;
    case 'win': case 'lose': fanfare(kind); break;
  }
}

/* ---------- interface publique ---------- */
function setMode(m) { mode = THEMES[m] ? m : m === 'deck' ? 'menu' : 'menu'; if (m === 'deck') setIntensity(0); else if (m === 'menu') setIntensity(1); }
function setIntensity(l) { intensity = Math.max(0, Math.min(2, l)); }
function setPreview(m) { preview = m && THEMES[m] ? m : null; ensure(); }
function setMuted(m) { pref.muted = m; DD.store.saveAudio(); ensure(); applyGain(); }
function setVolume(v) { pref.volume = Math.max(0, Math.min(1, v)); if (pref.volume > 0) pref.muted = false; DD.store.saveAudio(); ensure(); applyGain(); }
function setMusic(v) { pref.music = Math.max(0, Math.min(1, v)); DD.store.saveAudio(); ensure(); applyGain(); }
function setSfx(v) { pref.sfx = Math.max(0, Math.min(1, v)); DD.store.saveAudio(); ensure(); applyGain(); }
document.addEventListener('pointerdown', ensure, {once: true});

DD.audio = {play: sound, setMode, setIntensity, setPreview, setMuted, setVolume, setMusic, setSfx, pref,
  THEMES, get ctx() { return ctx; }, get output() { return comp; }, ensure};
})(globalThis.DD = globalThis.DD || {});
