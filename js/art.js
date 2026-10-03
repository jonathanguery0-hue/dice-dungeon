/* Dice Dungeon — illustrations vectorielles des cartes (SVG généré, aucun fichier image). */
(function (DD) {
'use strict';
const CARD_VISUALS={
 crimson_drake:{glyph:'🐉',sigil:'FEU',c1:'#8d2e22',c2:'#23070b',glow:'#ff6a3d'},
 steel_wolf_knight:{glyph:'🐺',sigil:'ACIER',c1:'#38577d',c2:'#101824',glow:'#7fc8ff'},
 mystic_sage:{glyph:'✦',sigil:'ARCANE',c1:'#5a3f8d',c2:'#140d26',glow:'#bf83ff'},
 goblin_raider:{glyph:'⚔',sigil:'VENT',c1:'#4d763a',c2:'#14210f',glow:'#a8e36f'},
 stone_golem:{glyph:'⬢',sigil:'TERRE',c1:'#715c45',c2:'#21170e',glow:'#d6a85f'},
 shadow_imp:{glyph:'☾',sigil:'OMBRE',c1:'#4a255f',c2:'#0e0715',glow:'#c05cff'},
 crystal_guardian:{glyph:'❄',sigil:'GLACE',c1:'#34758b',c2:'#0a2029',glow:'#94efff'},
 thunder_roc:{glyph:'⚡',sigil:'FOUDRE',c1:'#7b6730',c2:'#17231c',glow:'#ffe36a'},
 summon_surge:{glyph:'◇',sigil:'INVOC.',c1:'#315f91',c2:'#0b1930',glow:'#76c9ff'},
 mystic_heal:{glyph:'✚',sigil:'SOIN',c1:'#357352',c2:'#0c2418',glow:'#78eaa4'},
 guard_sigil:{glyph:'◆',sigil:'GARDE',c1:'#4a5e78',c2:'#111925',glow:'#a5c9ff'},
 flame_burst:{glyph:'✹',sigil:'FLAMME',c1:'#8f3522',c2:'#2b0908',glow:'#ff7648'},
 portal_shift:{glyph:'◉',sigil:'PORTAIL',c1:'#694196',c2:'#190d2a',glow:'#c98aff'},
 shadow_veil:{glyph:'◐',sigil:'OMBRE',c1:'#483055',c2:'#0d0911',glow:'#a96dd0'},
 treasure_sense:{glyph:'▣',sigil:'TRÉSOR',c1:'#8a6e2c',c2:'#251a08',glow:'#ffd66a'},
 chain_dash:{glyph:'➤',sigil:'RUÉE',c1:'#2d6386',c2:'#0a1823',glow:'#70d9ff'},
 ember_whelp:{glyph:'♨',sigil:'DRAGON',c1:'#8a3c23',c2:'#24100b',glow:'#ff9a4d'},
 magma_behemoth:{glyph:'☄',sigil:'DRAGON',c1:'#752315',c2:'#180807',glow:'#ff4f2f'},
 iron_sentinel:{glyph:'▦',sigil:'CONSTRUCT',c1:'#41566f',c2:'#101820',glow:'#9bcaff'},
 boulder_ram:{glyph:'⬟',sigil:'CONSTRUCT',c1:'#705638',c2:'#21170d',glow:'#d5a45f'},
 arcane_familiar:{glyph:'✧',sigil:'ARCANE',c1:'#51418f',c2:'#120d27',glow:'#d8a1ff'},
 chronomancer:{glyph:'⌛',sigil:'ARCANE',c1:'#493887',c2:'#100a20',glow:'#a990ff'},
 goblin_bombardier:{glyph:'✹',sigil:'GOBELIN',c1:'#667238',c2:'#17210d',glow:'#d9ec6c'},
 goblin_shaman:{glyph:'♣',sigil:'GOBELIN',c1:'#4c7339',c2:'#10200e',glow:'#a6e97a'},
 nightblade_stalker:{glyph:'✦',sigil:'OMBRE',c1:'#39204f',c2:'#0d0614',glow:'#c06aff'},
 void_weaver:{glyph:'◉',sigil:'OMBRE',c1:'#382354',c2:'#0c0714',glow:'#9d5cff'},
 storm_lynx:{glyph:'ϟ',sigil:'TEMPÊTE',c1:'#587145',c2:'#102016',glow:'#e3f56d'},
 tempest_djinn:{glyph:'⚡',sigil:'TEMPÊTE',c1:'#496d72',c2:'#0b1b22',glow:'#88eaff'},
 war_drum:{glyph:'♫',sigil:'GUERRE',c1:'#7a3a25',c2:'#24100b',glow:'#ff9d64'},
 arcane_insight:{glyph:'⌘',sigil:'SAVOIR',c1:'#55408e',c2:'#140d25',glow:'#c79aff'},
 smoke_bomb:{glyph:'☁',sigil:'FUMÉE',c1:'#3c4651',c2:'#0d1217',glow:'#b7d0db'},
 stone_skin:{glyph:'⬢',sigil:'PIERRE',c1:'#685a47',c2:'#1d1710',glow:'#d7b47b'},
 frost_bind:{glyph:'❅',sigil:'GEL',c1:'#3a7085',c2:'#0a202a',glow:'#a4efff'},
 storm_step:{glyph:'➤',sigil:'ORAGE',c1:'#3b7080',c2:'#0a1c25',glow:'#8beaff'},
 dragon_gate:{glyph:'🐉',sigil:'PORTAIL',c1:'#82392b',c2:'#210b0a',glow:'#ff8059'},
 dispel_wave:{glyph:'⊘',sigil:'DISPEL',c1:'#4a5874',c2:'#111827',glow:'#b7ceff'}
};
function visualFor(id){return CARD_VISUALS[id]||{glyph:'✦',sigil:'CARTE',c1:'#40516d',c2:'#0d1420',glow:'#9ecbff'}}
function svgData(svg){return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
function cardArtSVG(id){
 const v=visualFor(id), base=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${v.c1}"/><stop offset="1" stop-color="${v.c2}"/></linearGradient><radialGradient id="halo" cx="0.5" cy="0.35" r="0.5"><stop offset="0" stop-color="${v.glow}" stop-opacity="0.9"/><stop offset="1" stop-color="${v.glow}" stop-opacity="0"/></radialGradient></defs><rect width="220" height="300" fill="url(%23bg)"/><rect width="220" height="300" fill="url(%23halo)" opacity="0.55"/>{{BODY}}<g opacity="0.2"><circle cx="110" cy="68" r="42" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="110" cy="68" r="58" fill="none" stroke="#fff" stroke-width="0.7" stroke-dasharray="2 4"/></g><rect x="10" y="10" width="200" height="280" rx="18" fill="none" stroke="#ffffff38" stroke-width="1.2"/></svg>`;
 const bodies={
  crimson_drake:`<g><path d="M34 208 Q72 152 110 162 T186 138 Q176 176 200 205 Q155 191 126 212 Q128 240 100 252 Q108 224 95 207 Q66 216 34 208Z" fill="#170707" opacity="0.86"/><path d="M48 190 Q95 128 138 140 Q168 146 186 176 Q155 174 136 184 Q122 165 110 158 Q85 156 48 190Z" fill="#e1532f" opacity="0.95"/><path d="M110 90 l25 48 -25 22 -25 -22z" fill="#401313"/><path d="M98 128 q24 -18 40 2 q-2 14 -20 24 q-18 -6 -20 -26z" fill="#e45a35"/><circle cx="129" cy="122" r="4" fill="#fff5b4"/><path d="M112 150 q18 15 34 44" stroke="#ffd094" stroke-width="6" stroke-linecap="round"/><path d="M151 188 q12 -8 26 -2 q-15 10 -4 28 q-14 -7 -24 -4 q-5 -11 2 -22z" fill="#ffb44f"/></g>`,
  steel_wolf_knight:`<g><path d="M58 224 Q78 155 110 138 Q142 155 162 224 Z" fill="#d1deea" opacity="0.95"/><path d="M110 84 l18 20 16 7 -7 16 7 22 -20 -5 -14 11 -14 -11 -20 5 7 -22 -7 -16 16 -7z" fill="#dce8f8"/><path d="M88 109 76 96 66 116 79 122zM132 109l12-13 10 20-13 6z" fill="#f3f7ff"/><circle cx="102" cy="124" r="3.6" fill="#8ad1ff"/><circle cx="118" cy="124" r="3.6" fill="#8ad1ff"/><path d="M110 154 L142 196 L110 244 L78 196 Z" fill="#6b84a7" opacity="0.82"/><path d="M110 166 L129 196 L110 225 L91 196 Z" fill="#c2d9f0"/><path d="M164 144 L180 210" stroke="#bfd7ef" stroke-width="8" stroke-linecap="round"/><path d="M178 150 q14 8 18 28 q-16 -3 -24 6" fill="#c2d9f0"/></g>`,
  mystic_sage:`<g><path d="M72 232 Q82 162 110 122 Q138 162 148 232 Z" fill="#e8dbff" opacity="0.95"/><path d="M85 212 Q110 150 135 212" stroke="#ffffff77" stroke-width="2" fill="none"/><circle cx="110" cy="96" r="22" fill="#f4ebff" opacity="0.9"/><path d="M90 88 q20 -18 40 0 v18 q-20 9 -40 0z" fill="#6e4aac"/><circle cx="110" cy="136" r="18" fill="#b983ff" opacity="0.6"/><circle cx="110" cy="136" r="30" fill="none" stroke="#ebddff" stroke-width="1.5" stroke-dasharray="3 5"/><path d="M168 88 V196" stroke="#f3eaff" stroke-width="6" stroke-linecap="round"/><circle cx="168" cy="78" r="14" fill="#d2a1ff"/><path d="M53 108 q26 -20 56 -5" stroke="#f0d7ff" stroke-width="5" stroke-linecap="round"/><g fill="#fff8"><circle cx="64" cy="160" r="4"/><circle cx="154" cy="146" r="3"/><circle cx="144" cy="102" r="3"/></g></g>`,
  goblin_raider:`<g><path d="M55 224 Q70 152 110 144 Q150 152 165 224 Z" fill="#3a200d" opacity="0.82"/><path d="M86 88 q24 -24 48 0 v34 q-24 15 -48 0z" fill="#8dcc66"/><path d="M86 99 70 104 86 112zM134 99l16 5-16 8z" fill="#9edd6f"/><circle cx="100" cy="107" r="4" fill="#111"/><circle cx="120" cy="107" r="4" fill="#111"/><path d="M97 120 q13 8 26 0" stroke="#772b20" stroke-width="4" stroke-linecap="round"/><path d="M74 164 46 212" stroke="#d8dfe8" stroke-width="8" stroke-linecap="round"/><path d="M146 164 174 212" stroke="#d8dfe8" stroke-width="8" stroke-linecap="round"/><path d="M40 219 l20-29 6 14zM180 219l-20-29-6 14z" fill="#dbe6ef"/><path d="M76 150 q34 22 68 0" stroke="#b94232" stroke-width="12" stroke-linecap="round"/></g>`,
  stone_golem:`<g><path d="M56 226 70 154 92 126 128 126 150 154 164 226 Z" fill="#504235"/><path d="M75 150h28v24H75zM118 150h28v24h-28zM86 182h48v34H86z" fill="#8f7b67"/><path d="M72 118 92 96h36l20 22-12 20H84z" fill="#9f8973"/><circle cx="100" cy="152" r="5" fill="#ffd782"/><circle cx="120" cy="152" r="5" fill="#ffd782"/><circle cx="110" cy="194" r="10" fill="#ffba52"/><path d="M58 205h-14v-42h16zM176 205h-14v-42h16z" fill="#7f6a58"/><g stroke="#ffbd6a" stroke-width="2" opacity="0.7"><path d="M107 184v20"/><path d="M98 194h24"/></g></g>`,
  shadow_imp:`<g><path d="M110 156 Q82 126 82 100 Q82 72 110 78 Q138 72 138 100 Q138 126 110 156Z" fill="#201126"/><path d="M78 118 Q40 98 34 66 Q70 78 86 108Z" fill="#6f2f98" opacity="0.9"/><path d="M142 118 Q180 98 186 66 Q150 78 134 108Z" fill="#6f2f98" opacity="0.9"/><circle cx="100" cy="106" r="5" fill="#ffd1ff"/><circle cx="120" cy="106" r="5" fill="#ffd1ff"/><path d="M101 126 q9 8 18 0" stroke="#d49cff" stroke-width="4" stroke-linecap="round"/><path d="M94 154 82 214" stroke="#b96cff" stroke-width="5"/><path d="M126 154 138 214" stroke="#b96cff" stroke-width="5"/><path d="M110 150 q-9 23 -38 42 q24 8 38 32 q14 -24 38 -32 q-29 -19 -38 -42z" fill="#a34dff" opacity="0.7"/></g>`,
  crystal_guardian:`<g><path d="M74 220 90 144 110 118 130 144 146 220 Z" fill="#d9fbff" opacity="0.92"/><path d="M110 86 130 116 110 146 90 116Z" fill="#d5f7ff"/><path d="M82 100 68 140 92 132Z" fill="#7de4ff"/><path d="M138 100 152 140 128 132Z" fill="#7de4ff"/><path d="M56 174 76 154 86 192 64 200Z" fill="#a8f2ff"/><path d="M164 174 144 154 134 192 156 200Z" fill="#a8f2ff"/><circle cx="102" cy="118" r="4" fill="#1d4252"/><circle cx="118" cy="118" r="4" fill="#1d4252"/><path d="M110 162 126 190 110 218 94 190Z" fill="#87edff" opacity="0.8"/></g>`,
  thunder_roc:`<g><path d="M110 168 Q84 146 46 164 Q74 118 97 112 Q106 90 110 76 Q114 90 123 112 Q146 118 174 164 Q136 146 110 168Z" fill="#f8f4da" opacity="0.95"/><path d="M100 120 q10 -16 20 0 q-4 18 -10 30 q-6 -12 -10 -30z" fill="#d1bd66"/><circle cx="103" cy="129" r="3.5" fill="#3e320e"/><circle cx="117" cy="129" r="3.5" fill="#3e320e"/><path d="M110 152 q10 28 10 54" stroke="#f5edc4" stroke-width="7" stroke-linecap="round"/><path d="M110 150 Q80 174 72 218" stroke="#edd98c" stroke-width="5"/><path d="M110 150 Q140 174 148 218" stroke="#edd98c" stroke-width="5"/><path d="M170 78 152 112 174 110 146 154" fill="none" stroke="#fff4b0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  summon_surge:`<g><circle cx="110" cy="128" r="34" fill="none" stroke="#d7f2ff" stroke-width="6" stroke-dasharray="4 6"/><circle cx="110" cy="128" r="56" fill="none" stroke="#9ad6ff" stroke-width="2"/><path d="M110 78v100M60 128h100M76 94l68 68M144 94l-68 68" stroke="#ecfbff" stroke-width="4" stroke-linecap="round" opacity="0.8"/><g fill="#aee3ff"><circle cx="61" cy="72" r="4"/><circle cx="159" cy="86" r="5"/><circle cx="144" cy="58" r="3"/></g></g>`,
  mystic_heal:`<g><circle cx="110" cy="128" r="44" fill="#bafad0" opacity="0.3"/><circle cx="110" cy="128" r="62" fill="none" stroke="#ddffee" stroke-width="3" stroke-dasharray="3 5"/><path d="M110 90v76M72 128h76" stroke="#eefff5" stroke-width="14" stroke-linecap="round"/><g fill="#cffff0"><circle cx="72" cy="88" r="5"/><circle cx="152" cy="166" r="4"/><circle cx="156" cy="96" r="3"/></g></g>`,
  guard_sigil:`<g><path d="M110 76 158 96v42q0 46-48 72Q62 184 62 138V96z" fill="#cfe7ff" opacity="0.95"/><path d="M110 102v80M82 142h56" stroke="#5d8cc5" stroke-width="8" stroke-linecap="round"/><path d="M78 100q32 20 64 0" stroke="#fff" stroke-width="3" opacity="0.7"/></g>`,
  flame_burst:`<g><path d="M110 66q20 28 6 49q33-1 33 33q0 43-39 58q-39-15-39-58q0-34 33-33q-14-21 6-49z" fill="#ff8a51"/><path d="M110 98q10 17 0 33q20 5 20 24q0 20-20 30q-20-10-20-30q0-19 20-24q-10-16 0-33z" fill="#ffe1a4"/></g>`,
  portal_shift:`<g><circle cx="110" cy="128" r="26" fill="#0a0613"/><circle cx="110" cy="128" r="48" fill="none" stroke="#d4a3ff" stroke-width="7"/><circle cx="110" cy="128" r="64" fill="none" stroke="#f0d6ff" stroke-width="2" stroke-dasharray="4 5"/><path d="M110 64q40 27 42 64q-2 37-42 64q-40-27-42-64q2-37 42-64z" fill="none" stroke="#9f61ff" stroke-width="3" opacity="0.7"/></g>`,
  shadow_veil:`<g><path d="M70 176q20-66 78-68q-18 24-18 51q0 27 18 51q-58-2-78-34z" fill="#8b5af1" opacity="0.75"/><path d="M129 96q-13-13-33-13q-30 0-30 30q0 20 13 33q7-27 50-50z" fill="#e9d7ff" opacity="0.9"/><g fill="#d8beff"><circle cx="142" cy="102" r="3"/><circle cx="150" cy="126" r="4"/><circle cx="62" cy="140" r="2.5"/></g></g>`,
  treasure_sense:`<g><path d="M64 174h92v34H64z" fill="#7c5e1c"/><path d="M60 132h100l-8 42H68z" fill="#d0a849"/><path d="M82 132q8-20 28-20t28 20" fill="none" stroke="#ffe298" stroke-width="6" stroke-linecap="round"/><circle cx="110" cy="154" r="10" fill="#fff3bd"/><path d="M110 145v18M101 154h18" stroke="#9e7d24" stroke-width="4" stroke-linecap="round"/><g fill="#fff0a6"><circle cx="64" cy="98" r="4"/><circle cx="154" cy="90" r="5"/><circle cx="174" cy="120" r="3"/></g></g>`,
  chain_dash:`<g><path d="M58 184q54-78 106-84" stroke="#eefcff" stroke-width="12" stroke-linecap="round" opacity="0.9"/><path d="M54 202q56-78 112-84" stroke="#7ddfff" stroke-width="7" stroke-linecap="round" opacity="0.95"/><path d="M154 90 176 100 160 118" fill="none" stroke="#f4fbff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><g fill="#c9f5ff"><circle cx="74" cy="134" r="4"/><circle cx="98" cy="116" r="4"/><circle cx="122" cy="102" r="4"/></g></g>`
 };
 return svgData(base.replace('{{BODY}}', bodies[id]||`<g><text x="110" y="150" text-anchor="middle" font-size="68" fill="#fff" opacity="0.88">${v.glyph}</text></g>`));
}
function familyCardColor(family){return ({Dragon:'#c85b3b',Gobelin:'#83a94d',Arcane:'#8d69d7',Ombre:'#7d4b9f',Construct:'#8a806d','Tempête':'#5b9fb0'}[family]||'#a58a55')}
Object.assign(DD, {CARD_VISUALS, visualFor, cardArtSVG, familyCardColor});
})(globalThis.DD = globalThis.DD || {});
