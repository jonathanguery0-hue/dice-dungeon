/* Dice Dungeon — mode Histoire.
   Ton léger : Pépin, un dé à six faces très bavard, guide l'apprenti Invocateur à travers le donjon.
   Chaque mission : un rival, une arène, un objectif bonus (★★) et un objectif de rapidité (★★★). */
(function (DD) {
'use strict';
const SPEAKERS = {
  pepin: {name: 'Pépin', glyph: '🎲', color: '#e9b64c', role: 'ton dé bavard'},
  brok: {name: 'Brok', glyph: '🪙', color: '#83a94d', role: 'péagiste gobelin'},
  gruelle: {name: 'Mère Gruelle', glyph: '🍲', color: '#9bbf5a', role: 'cantinière du marais'},
  zipzap: {name: 'Zip-Zap', glyph: '🧨', color: '#ff8a4c', role: 'artificier diplômé (par lui-même)'},
  grik: {name: 'Grik', glyph: '👑', color: '#c8e05a', role: 'Chef de Meute et poète'}
};

const SWAMP_SMALL = ['goblin_raider', 'goblin_raider', 'goblin_raider', 'goblin_shaman', 'goblin_shaman', 'goblin_shaman',
  'storm_lynx', 'storm_lynx', 'ember_whelp', 'ember_whelp', 'shadow_imp', 'shadow_imp',
  'mystic_heal', 'mystic_heal', 'guard_sigil', 'guard_sigil', 'treasure_sense', 'treasure_sense', 'war_drum', 'summon_surge'];
const SWAMP_BOMBS = ['goblin_bombardier', 'goblin_bombardier', 'goblin_bombardier', 'goblin_raider', 'goblin_raider', 'goblin_raider',
  'goblin_shaman', 'goblin_shaman', 'ember_whelp', 'ember_whelp', 'storm_lynx', 'storm_lynx',
  'war_drum', 'war_drum', 'flame_burst', 'flame_burst', 'smoke_bomb', 'smoke_bomb', 'treasure_sense', 'summon_surge'];

const STORY = {acts: [
  {id: 'act1', num: 'I', name: 'Les Marais Gobelins', color: '#83a94d',
    blurb: 'Un marais qui sent la soupe, des gobelins qui sentent la soupe, et un péage pas très officiel.',
    missions: [
      {id: 'a1m1', title: 'Le Péage du Pont-Moisi', rival: 'brok', arena: 'quick', preset: 'balanced', enemyDeck: SWAMP_SMALL, enemyHp: 4, enemyHand: 2, enemyDice: 2, fastTurns: 10,
        bonus: {text: 'Invoque 3 monstres', check: S => S.stats.player.summons >= 3},
        intro: [
          ['pepin', 'Salut, apprenti ! Moi c’est Pépin : dé à six faces, guide officiel et, pour l’instant, ton seul ami ici.'],
          ['pepin', 'Bienvenue dans les Marais Gobelins. Respire par la bouche, ça aide.'],
          ['brok', 'Halte ! Péage du Pont-Moisi. C’est trois pièces d’or. Ou deux. Ou un caillou joli.'],
          ['pepin', 'On n’a pas de caillou joli. Lance-moi : on va négocier à notre façon.']],
        win: [
          ['brok', 'Bon… pour cette fois, c’est gratuit. Mais ne dites à personne que le péage est négociable.'],
          ['pepin', 'Tu as vu ? Je suis tombé sur la bonne face. Comme d’habitude. Enfin, presque.']],
        lose: [
          ['brok', 'Ça fera trois pièces, plus les frais de défaite.'],
          ['pepin', 'On revient tout de suite. Avec un caillou joli, cette fois.']]},
      {id: 'a1m2', title: 'La Cantine de Mère Gruelle', rival: 'gruelle', arena: 'grand', preset: 'swarm', enemyHp: 6, enemyHand: 3, enemyDice: 2, fastTurns: 12,
        bonus: {text: 'Contrôle le Relais ✦ à la fin du duel', check: S => S.relicOwner === 'player'},
        intro: [
          ['gruelle', 'Encore un client ! Aujourd’hui, c’est soupe de marais. Hier aussi. Demain aussi.'],
          ['pepin', 'Elle cache la clé du marais au fond de sa marmite. Il va falloir… la commander.'],
          ['gruelle', 'Personne ne touche à ma marmite sans avoir fini son assiette !'],
          ['pepin', 'Astuce : le Relais ✦ au centre offre un pas gratuit à chaque tour. Prends-le et garde-le.']],
        win: [
          ['gruelle', 'Bon, prends la clé. Et une boîte de soupe pour la route, tu as l’air maigre.'],
          ['pepin', 'Je ne mange pas, je suis un dé. Mais l’intention me touche.']],
        lose: [
          ['gruelle', 'Allez, au lit sans dessert.'],
          ['pepin', 'J’ai une faim de revanche.']]},
      {id: 'a1m3', title: 'Le Concours de Pétards', rival: 'zipzap', arena: 'caldera', enemyDeck: SWAMP_BOMBS, preset: 'swarm', enemyHp: 7, enemyHand: 4, enemyDice: 2, fastTurns: 13,
        bonus: {text: 'Détruis 4 monstres rivaux', check: S => S.stats.player.kills >= 4},
        intro: [
          ['zipzap', 'Bienvenue au Concours de Pétards ! Règle n°1 : tout explose. Règle n°2 : voir règle n°1.'],
          ['pepin', 'Le centre de l’arène est volcanique. Si tes monstres ne sont pas de Feu, ils vont avoir chaud aux pieds.'],
          ['zipzap', 'Et le grand gagnant repart avec… des sourcils neufs !']],
        win: [
          ['zipzap', 'Bravo ! Tes sourcils sont intacts, c’est déjà une victoire.'],
          ['pepin', 'Prochain arrêt : le chef de tout ce petit monde. Il paraît qu’il écrit des poèmes. Courage.']],
        lose: [
          ['zipzap', 'BOUM ! Ah, désolé, ce n’était pas prévu. Si, en fait.'],
          ['pepin', 'Je sens le roussi. Ah non, c’est moi.']]},
      {id: 'a1m4', title: 'Le Trône de Boue', rival: 'grik', arena: 'grand', preset: 'swarm', enemyHp: 4, enemyHand: 3, fastTurns: 11, boss: true,
        bonus: {text: 'Gagne avec ton Invocateur à 5 PV ou plus', check: S => S.cores.player.hp >= 5},
        intro: [
          ['grik', 'Ô voyageur perdu dans ma boue, / ton destin est de… heu… finir à genoux !'],
          ['pepin', 'Il rime mal, mais il commande bien. Ses gobelins arrivent par trois : ne te laisse pas encercler.'],
          ['grik', 'Ma meute est nombreuse, et ma poésie aussi !']],
        win: [
          ['grik', 'Vaincu… Comme le dit mon poème : « Aïe ». Prends ce passage vers la Forteresse.'],
          ['pepin', 'Acte I terminé ! La suite : des gens en pierre. J’espère qu’ils ont de l’humour.']],
        lose: [
          ['grik', 'Victoire ! Je l’écrirai dans mon recueil, page 1. C’est la seule page.'],
          ['pepin', 'Encore une fois ? J’ai un bon pressentiment. J’ai toujours un bon pressentiment, je suis un dé.']]}
    ]},
  {id: 'act2', num: 'II', name: 'La Forteresse de Pierre', color: '#d3b17b', soon: true, blurb: 'Des Constructs très sérieux qui n’ont jamais ri de leur vie. Pépin compte bien y remédier.', missions: []},
  {id: 'act3', num: 'III', name: 'Les Archives du Voile', color: '#bb80ff', soon: true, blurb: 'Une bibliothèque où les livres mordent et où les Ombres font « chut ».', missions: []},
  {id: 'act4', num: 'IV', name: 'La Couronne des Cendres', color: '#ff7952', soon: true, blurb: 'Des Dragons, un trône brûlant, et la vérité sur le Maître du Donjon.', missions: []}
]};

DD.STORY = STORY;
DD.SPEAKERS = SPEAKERS;
})(globalThis.DD = globalThis.DD || {});
