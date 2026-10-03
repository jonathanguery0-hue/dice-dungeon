/* Dice Dungeon — données du jeu (cartes, arènes, campagne…).
   Aucune logique ici : uniquement des constantes partagées par le moteur et l'interface. */
(function (DD) {
'use strict';
const MAX_CORE = 7;
const ARENAS={
 quick:{id:'quick',name:'Arène Rapide',size:'11×7',rows:7,cols:11,coreRow:3,playerCoreCol:0,enemyCoreCol:10,relay:[3,5],desc:'Courte et agressive. Idéale pour des duels rapides.',blocked:[],neutral:[]},
 grand:{id:'grand',name:'Grande Arène',size:'13×9',rows:9,cols:13,coreRow:4,playerCoreCol:0,enemyCoreCol:12,relay:[4,6],desc:'Nouveau standard : plus de place, trois grandes voies et deux goulots vers le centre.',blocked:[[2,4],[3,4],[5,4],[6,4],[2,8],[3,8],[5,8],[6,8]],neutral:[]},
 nexus:{id:'nexus',name:'Ruines du Nexus',size:'13×9',rows:9,cols:13,coreRow:4,playerCoreCol:0,enemyCoreCol:12,relay:[4,6],desc:'Murs anciens et chokepoints. Les tanks et les contournements y prennent de la valeur.',blocked:[[1,5],[2,5],[6,5],[7,5],[1,7],[2,7],[6,7],[7,7],[3,4],[5,4],[3,8],[5,8]],neutral:[[3,6,'arcane'],[5,6,'arcane']]},
 caldera:{id:'caldera',name:'Caldeira',size:'13×9',rows:9,cols:13,coreRow:4,playerCoreCol:0,enemyCoreCol:12,relay:[4,6],desc:'Centre dangereux : une ceinture volcanique neutre accélère les raccourcis mais brûle les non-Feu.',blocked:[[1,6],[7,6]],neutral:[[4,5,'volcanic'],[4,7,'volcanic'],[3,5,'volcanic'],[3,6,'volcanic'],[3,7,'volcanic'],[5,5,'volcanic'],[5,6,'volcanic'],[5,7,'volcanic']] }
};
const INVOCATORS={
 aegis:{id:'aegis',name:'Aegis',title:'Gardien du Sceau',glyph:'◆',hp:8,passive:'Rempart : 8 PV au lieu de 7.'},
 nova:{id:'nova',name:'Nova',title:'Tisseuse de Dés',glyph:'✦',hp:7,passive:'Canal : la première Concentration du duel coûte 1 ✦ de moins.'},
 vega:{id:'vega',name:'Vega',title:'Éclaireur du Nexus',glyph:'➤',hp:7,passive:'Avant-garde : ton premier monstre invoqué gagne +1 MOV.'}
};
const ENEMY_INVOCATOR_BY_PRESET = {balanced:'aegis',inferno:'vega',arcane:'nova',fortress:'aegis',storm:'vega',swarm:'vega',shadow:'nova'};
const MONSTERS={
 crimson_drake:{id:'crimson_drake',type:'monster',name:'Crimson Drake',lv:4,hp:6,atk:3,mov:2,power:5,role:'Attaquant',element:'Feu',family:'Dragon',faces:['summon','attack','attack','magic','magic','guard'],ability:'Souffle ardent : 1 dégât aux ennemis adjacents lors de l’invocation.'},
 ember_whelp:{id:'ember_whelp',type:'monster',name:'Ember Whelp',lv:2,hp:3,atk:2,mov:3,power:2,role:'Éclaireur',element:'Feu',family:'Dragon',faces:['summon','summon','move','attack','magic','magic'],ability:'Jeune flamme : si un autre Dragon est en jeu, gagne +1 PV max à l’invocation.'},
 magma_behemoth:{id:'magma_behemoth',type:'monster',name:'Magma Behemoth',lv:5,hp:7,atk:4,mov:1,power:5,role:'Colosse',element:'Feu',family:'Dragon',faces:['summon','attack','attack','guard','guard','magic'],ability:'Masse volcanique : très lent, mais ses attaques brisent les lignes ennemies.'},
 steel_wolf_knight:{id:'steel_wolf_knight',type:'monster',name:'Steel Wolf Knight',lv:3,hp:5,atk:2,mov:3,power:3,role:'Défenseur',element:'Acier',family:'Construct',faces:['summon','guard','guard','move','move','attack'],ability:'Armure lupine : le premier dégât reçu à chaque tour est réduit de 1.'},
 iron_sentinel:{id:'iron_sentinel',type:'monster',name:'Iron Sentinel',lv:3,hp:5,atk:2,mov:2,power:3,role:'Sentinelle',element:'Acier',family:'Construct',faces:['summon','guard','guard','guard','move','attack'],ability:'Formation : les Constructs adjacents se protègent mutuellement au début du tour.'},
 boulder_ram:{id:'boulder_ram',type:'monster',name:'Boulder Ram',lv:4,hp:5,atk:3,mov:2,power:4,role:'Briseur',element:'Terre',family:'Construct',faces:['summon','attack','attack','guard','guard','move'],ability:'Bélier minéral : spécialisé dans la rupture des défenses.'},
 stone_golem:{id:'stone_golem',type:'monster',name:'Stone Golem',lv:4,hp:6,atk:2,mov:2,power:4,role:'Défenseur',element:'Terre',family:'Construct',faces:['summon','guard','guard','guard','attack','move'],ability:'Corps de pierre : réduit chaque attaque subie de 1 (minimum 1).'},
 mystic_sage:{id:'mystic_sage',type:'monster',name:'Mystic Sage',lv:3,hp:4,atk:2,mov:2,power:3,role:'Soutien',element:'Arcane',family:'Arcane',faces:['summon','magic','magic','magic','guard','move'],ability:'Bénédiction : soigne 1 PV à un allié adjacent au début de ton tour.'},
 arcane_familiar:{id:'arcane_familiar',type:'monster',name:'Arcane Familiar',lv:1,hp:2,atk:1,mov:4,power:1,role:'Familier',element:'Arcane',family:'Arcane',faces:['summon','summon','magic','magic','magic','move'],ability:'Catalyseur : facilite fortement la génération de magie et les invocations Arcane.'},
 chronomancer:{id:'chronomancer',type:'monster',name:'Chronomancer',lv:4,hp:4,atk:2,mov:2,power:4,role:'Contrôle',element:'Arcane',family:'Arcane',faces:['summon','magic','magic','magic','guard','move'],ability:'Distorsion : manipule le tempo et peut rejouer une action offensive.'},
 crystal_guardian:{id:'crystal_guardian',type:'monster',name:'Crystal Guardian',lv:3,hp:5,atk:2,mov:2,power:3,role:'Contrôle',element:'Glace',family:'Arcane',faces:['summon','guard','guard','magic','magic','attack'],ability:'Lien de cristal : 30 % de chance de geler la cible attaquée pendant 1 tour.'},
 goblin_raider:{id:'goblin_raider',type:'monster',name:'Goblin Raider',lv:2,hp:3,atk:2,mov:4,power:2,role:'Éclaireur',element:'Vent',family:'Gobelin',faces:['summon','summon','move','move','attack','attack'],ability:'Frappe-éclair : gagne 1 pas gratuit après avoir attaqué.'},
 goblin_bombardier:{id:'goblin_bombardier',type:'monster',name:'Goblin Bombardier',lv:2,hp:3,atk:3,mov:2,power:2,role:'Artificier',element:'Feu',family:'Gobelin',faces:['summon','summon','attack','attack','move','magic'],ability:'Charge instable : fragile mais capable de projeter des dégâts à distance.'},
 goblin_shaman:{id:'goblin_shaman',type:'monster',name:'Goblin Shaman',lv:2,hp:3,atk:1,mov:3,power:2,role:'Soutien',element:'Arcane',family:'Gobelin',faces:['summon','summon','magic','magic','move','guard'],ability:'Totem de meute : soutient le swarm avec magie et défense.'},
 shadow_imp:{id:'shadow_imp',type:'monster',name:'Shadow Imp',lv:2,hp:3,atk:3,mov:4,power:2,role:'Assassin',element:'Ombre',family:'Ombre',faces:['summon','summon','move','move','attack','attack'],ability:'Pas d’ombre : devient furtif après un déplacement jusqu’au prochain tour.'},
 nightblade_stalker:{id:'nightblade_stalker',type:'monster',name:'Nightblade Stalker',lv:3,hp:4,atk:3,mov:3,power:4,role:'Assassin',element:'Ombre',family:'Ombre',faces:['summon','move','move','attack','attack','magic'],ability:'Embuscade : les attaques effectuées depuis la furtivité gagnent +1 dégât.'},
 void_weaver:{id:'void_weaver',type:'monster',name:'Void Weaver',lv:4,hp:4,atk:2,mov:2,power:4,role:'Contrôle',element:'Ombre',family:'Ombre',faces:['summon','magic','magic','magic','move','guard'],ability:'Tisse-faille : repositionne les unités et transforme les Faille d’Ombre en points d’appui.'},
 thunder_roc:{id:'thunder_roc',type:'monster',name:'Thunder Roc',lv:4,hp:4,atk:3,mov:4,power:4,role:'Attaquant',element:'Foudre',family:'Tempête',faces:['summon','move','move','attack','attack','magic'],ability:'Plongeon foudroyant : inflige 1 dégât bonus à l’Invocateur adverse (avant le plafond de siège).'},
 storm_lynx:{id:'storm_lynx',type:'monster',name:'Storm Lynx',lv:2,hp:3,atk:2,mov:5,power:2,role:'Éclaireur',element:'Foudre',family:'Tempête',faces:['summon','summon','move','move','attack','magic'],ability:'Prédateur du vent : extrême mobilité et excellent contrôle des flancs.'},
 tempest_djinn:{id:'tempest_djinn',type:'monster',name:'Tempest Djinn',lv:4,hp:4,atk:3,mov:4,power:4,role:'Lanceur',element:'Foudre',family:'Tempête',faces:['summon','move','move','attack','magic','magic'],ability:'Courant vivant : excelle sur les Prairies et Plateaux Tempête.'}
};
const EFFECTS={
 summon_surge:{id:'summon_surge',type:'effect',name:'Summon Surge',cost:2,kind:'summon',short:'Invocation surprise',text:'Invoque un monstre aléatoire de ton pool sur une case de déploiement.'},
 mystic_heal:{id:'mystic_heal',type:'effect',name:'Mystic Heal',cost:1,kind:'ally',short:'+2 PV',text:'Rend 2 PV à un monstre allié.'},
 guard_sigil:{id:'guard_sigil',type:'effect',name:'Guard Sigil',cost:1,kind:'ally',short:'Garde renforcée',text:'Donne 1 Garde ◆ temporaire à un allié. La prochaine attaque reçue est réduite de 1.'},
 flame_burst:{id:'flame_burst',type:'effect',name:'Flame Burst',cost:3,kind:'enemy',short:'2 dégâts de zone',text:'Inflige 2 dégâts à une cible ennemie et 1 aux ennemis adjacents.'},
 portal_shift:{id:'portal_shift',type:'effect',name:'Portal Shift',cost:2,kind:'portal',short:'Téléportation',text:'Téléporte un allié sur une case de sol libre dans un rayon de 3.'},
 shadow_veil:{id:'shadow_veil',type:'effect',name:'Shadow Veil',cost:2,kind:'ally',short:'Furtivité',text:'Un allié devient furtif jusqu’à la fin de ton prochain tour : il ne peut plus être ciblé.'},
 treasure_sense:{id:'treasure_sense',type:'effect',name:'Treasure Sense',cost:1,kind:'instant',short:'Pioche 1',text:'Pioche 1 carte Effet si ta main n’est pas pleine. Ne crée aucun blason.'},
 chain_dash:{id:'chain_dash',type:'effect',name:'Chain Dash',cost:2,kind:'dash',short:'Déplacement gratuit',text:'Déplace un allié de 3 cases au plus (chemin sur ton donjon) sans dépenser de blasons.'},
 war_drum:{id:'war_drum',type:'effect',name:'War Drum',cost:1,kind:'instant',short:'Assaut +2',text:'La prochaine attaque de l’un de tes monstres gagne +2 dégâts. Ne crée aucun blason.'},
 arcane_insight:{id:'arcane_insight',type:'effect',name:'Arcane Insight',cost:2,kind:'instant',short:'Pioche jusqu’à 2',text:'Pioche jusqu’à 2 cartes Effet sans dépasser la limite de main.'},
 smoke_bomb:{id:'smoke_bomb',type:'effect',name:'Smoke Bomb',cost:1,kind:'ally',short:'Furtivité + mobilité',text:'Un allié devient furtif et gagne 1 pas de déplacement gratuit.'},
 stone_skin:{id:'stone_skin',type:'effect',name:'Stone Skin',cost:2,kind:'ally',short:'+1 PV + Garde',text:'Rend 1 PV et donne une Garde ◆ à un allié.'},
 frost_bind:{id:'frost_bind',type:'effect',name:'Frost Bind',cost:2,kind:'enemy',short:'Gel',text:'Gèle un monstre ennemi pour son prochain tour.'},
 storm_step:{id:'storm_step',type:'effect',name:'Storm Step',cost:1,kind:'dash',short:'Dash 3',text:'Déplace un allié de 3 cases au plus (chemin sur ton donjon) gratuitement.'},
 dragon_gate:{id:'dragon_gate',type:'effect',name:'Dragon Gate',cost:3,kind:'dragonSummon',short:'Invocation Dragon',text:'Invoque aléatoirement un Dragon de ton pool sur une case de déploiement.'},
 dispel_wave:{id:'dispel_wave',type:'effect',name:'Dispel Wave',cost:1,kind:'enemy',short:'Dissipation',text:'Retire Garde, furtivité et charge offensive d’un monstre ennemi.'}
};
const ALL={...MONSTERS,...EFFECTS};
const MAX_PLAYER_LEVEL = 10;
const LEVEL_XP=[0,0,140,360,660,1040,1500,2040,2660,3360,4140];
const LEVEL_UNLOCKS={
 1:{invocators:['aegis'],monsters:['ember_whelp','steel_wolf_knight','mystic_sage','goblin_raider','shadow_imp','storm_lynx'],effects:['summon_surge','mystic_heal','guard_sigil','treasure_sense']},
 2:{monsters:['iron_sentinel','arcane_familiar'],effects:['war_drum']},
 3:{invocators:['nova'],monsters:['crimson_drake','goblin_shaman'],effects:['stone_skin']},
 4:{monsters:['stone_golem','crystal_guardian'],effects:['portal_shift']},
 5:{monsters:['thunder_roc','nightblade_stalker'],effects:['smoke_bomb','frost_bind']},
 6:{invocators:['vega'],monsters:['goblin_bombardier','boulder_ram'],effects:['arcane_insight']},
 7:{monsters:['chronomancer','tempest_djinn'],effects:['chain_dash','storm_step']},
 8:{monsters:['void_weaver'],effects:['flame_burst','shadow_veil']},
 9:{monsters:['magma_behemoth'],effects:['dispel_wave']},
 10:{effects:['dragon_gate']}
};
const DECK_PRESETS={
 starter:{name:'Deck Initié',subtitle:'Collection de départ',duelist:'Apprenti du Donjon',personality:'balanced',deck:[
'ember_whelp','ember_whelp','steel_wolf_knight','steel_wolf_knight','mystic_sage','mystic_sage','goblin_raider','goblin_raider','shadow_imp','shadow_imp','storm_lynx','storm_lynx',
'summon_surge','summon_surge','mystic_heal','mystic_heal','guard_sigil','guard_sigil','treasure_sense','treasure_sense']},
 balanced:{name:'Équilibré',subtitle:'Polyvalent',duelist:'Gardien d’Azur',personality:'balanced',deck:[
'crimson_drake','steel_wolf_knight','mystic_sage','goblin_raider','stone_golem','shadow_imp','crystal_guardian','thunder_roc','ember_whelp','arcane_familiar','iron_sentinel','storm_lynx',
'summon_surge','mystic_heal','guard_sigil','flame_burst','portal_shift','war_drum','arcane_insight','chain_dash']},
 inferno:{name:'Légion Draconique',subtitle:'Feu & finishers',duelist:'Maître des Flammes',personality:'rush',deck:[
'crimson_drake','crimson_drake','magma_behemoth','magma_behemoth','ember_whelp','ember_whelp','ember_whelp','thunder_roc','goblin_bombardier','storm_lynx','mystic_sage','steel_wolf_knight',
'flame_burst','flame_burst','dragon_gate','war_drum','war_drum','summon_surge','mystic_heal','portal_shift']},
 arcane:{name:'Conclave Arcanique',subtitle:'Magie & tempo',duelist:'Arcaniste du Voile',personality:'control',deck:[
'mystic_sage','mystic_sage','arcane_familiar','arcane_familiar','chronomancer','chronomancer','crystal_guardian','crystal_guardian','void_weaver','shadow_imp','steel_wolf_knight','storm_lynx',
'arcane_insight','arcane_insight','portal_shift','frost_bind','dispel_wave','mystic_heal','guard_sigil','summon_surge']},
 fortress:{name:'Bastion Construct',subtitle:'Verrouillage & centre',duelist:'Gardien de Pierre',personality:'fortress',deck:[
'stone_golem','stone_golem','iron_sentinel','iron_sentinel','boulder_ram','boulder_ram','steel_wolf_knight','steel_wolf_knight','crystal_guardian','mystic_sage','goblin_shaman','chronomancer',
'guard_sigil','guard_sigil','stone_skin','stone_skin','mystic_heal','frost_bind','treasure_sense','summon_surge']},
 storm:{name:'Meute Tempête',subtitle:'Mobilité & flancs',duelist:'Cavalier de l’Orage',personality:'skirmish',deck:[
'thunder_roc','thunder_roc','storm_lynx','storm_lynx','storm_lynx','tempest_djinn','tempest_djinn','steel_wolf_knight','goblin_raider','goblin_raider','arcane_familiar','mystic_sage',
'storm_step','storm_step','chain_dash','portal_shift','war_drum','treasure_sense','mystic_heal','summon_surge']},
 swarm:{name:'Horde Gobeline',subtitle:'Essaim & économie',duelist:'Chef de Meute',personality:'swarm',deck:[
'goblin_raider','goblin_raider','goblin_raider','goblin_bombardier','goblin_bombardier','goblin_bombardier','goblin_shaman','goblin_shaman','goblin_shaman','storm_lynx','ember_whelp','shadow_imp',
'war_drum','war_drum','smoke_bomb','smoke_bomb','storm_step','treasure_sense','summon_surge','mystic_heal']},
 shadow:{name:'Cour du Néant',subtitle:'Furtivité & embuscades',duelist:'Tisseur du Néant',personality:'ambush',deck:[
'shadow_imp','shadow_imp','nightblade_stalker','nightblade_stalker','nightblade_stalker','void_weaver','void_weaver','goblin_raider','storm_lynx','arcane_familiar','mystic_sage','chronomancer',
'shadow_veil','shadow_veil','smoke_bomb','smoke_bomb','portal_shift','dispel_wave','frost_bind','arcane_insight']}
};
const AI_PERSONALITY={
 balanced:{target:'mixed',summonCap:2,charge:1,guard:.55},rush:{target:'core',summonCap:2,charge:2,guard:.30},control:{target:'relay',summonCap:2,charge:1,guard:.65},fortress:{target:'relay',summonCap:2,charge:1,guard:.80},skirmish:{target:'core',summonCap:2,charge:2,guard:.35},swarm:{target:'core',summonCap:3,charge:1,guard:.25},ambush:{target:'core',summonCap:2,charge:2,guard:.45}
};

const CAMPAIGN_MISSIONS=[
 {id:'goblin_gate',arena:'quick',name:'Raid des Peaux-Vertes',rival:'Grik — Chef de Meute',preset:'swarm',core:5,glow:'#98d968',desc:'Une marée de petits dés très fiables. Il faut contenir l’essaim avant qu’il ne couvre la carte.',rule:'Le rival peut tenter jusqu’à 3 invocations par tour : ses petits monstres mettent immédiatement la pression.',reward:'Sceau de l’Essaim : victoire enregistrée.',mods:{}},
 {id:'iron_bastion',arena:'nexus',name:'Bastion de Fer',rival:'Durgan — Gardien',preset:'fortress',core:6,glow:'#d3b17b',desc:'Constructs, Gardes et chokepoints. Durgan cherche à verrouiller le Relais.',rule:'Invocateur rival : 6 PV. Les Constructs privilégient la défense et le contrôle des passages.',reward:'Sceau du Bastion : victoire enregistrée.',mods:{}},
 {id:'violet_archive',arena:'grand',name:'Archives du Voile',rival:'Lys — Arcaniste',preset:'arcane',core:5,glow:'#bb80ff',desc:'Une bataille de tempo où Concentration et contrôle du centre sont essentiels.',rule:'Le rival commence avec 4 cartes Effet et cherche les combos ✦.',reward:'Sceau des Archives : victoire enregistrée.',mods:{hand:4}},
 {id:'black_court',arena:'nexus',name:'Cour du Néant',rival:'Noctis — Lame Noire',preset:'shadow',core:6,glow:'#a663e8',desc:'Furtivité, téléportations et embuscades. Les lignes arrière ne sont jamais totalement sûres.',rule:'Le rival commence avec 4 cartes Effet et privilégie les combos Ombre.',reward:'Sceau du Néant : victoire enregistrée.',mods:{hand:4}},
 {id:'storm_gate',arena:'grand',name:'Œil de la Tempête',rival:'Nara — Éclaireuse',preset:'storm',core:6,glow:'#65cfff',desc:'Un deck de mobilité extrême qui attaque par les flancs.',rule:'Les unités Tempête privilégient les déplacements gratuits et les combos ➤.',reward:'Sceau de la Tempête : victoire enregistrée.',mods:{}},
 {id:'ashen_crown',arena:'caldera',name:'Couronne des Cendres',rival:'Pyra — Reine Draconique',preset:'inferno',core:7,glow:'#ff7952',desc:'Dragons lourds et dégâts de zone. Le terrain volcanique devient une arme.',rule:'Invocateur rival : 7 PV. Les Dragons sont difficiles à sortir, mais dominent si le duel s’allonge.',reward:'Sceau du Dragon : accès au duel final.',mods:{}},
 {id:'master_dungeon',arena:'nexus',name:'Maître du Donjon',rival:'Varek — Champion Pourpre',preset:'balanced',core:8,glow:'#e2bd66',desc:'Le duel final utilise un roster polyvalent et exploite toutes les familles de dés.',rule:'Invocateur rival : 8 PV et 5 cartes Effet. Aucun blason bonus : Varek joue avec la même économie de dés.',reward:'Titre : Champion du Donjon — Dice Core.',mods:{hand:5}}
];
const FACE={summon:['◇','Invocation'],move:['➤','Mouvement'],attack:['⚔','Puissance offensive'],magic:['✦','Magie'],guard:['◆','Défense']};
const FAMILY_INFO={
 Dragon:{glyph:'🐉',name:'Dragon',rule:'Lignée : à partir du 2e Dragon allié, le Dragon invoqué gagne +1 PV max.'},
 Gobelin:{glyph:'♣',name:'Gobelin',rule:'Meute : une invocation Gobelin avec un autre Gobelin allié gagne 1 pas gratuit.'},
 Arcane:{glyph:'✦',name:'Arcane',rule:'Conclave : une invocation Arcane avec un autre Arcane allié réduit la prochaine Concentration de 1.'},
 Ombre:{glyph:'◐',name:'Ombre',rule:'Embuscade : une attaque depuis la furtivité gagne +1 dégât puis révèle l’attaquant.'},
 Construct:{glyph:'⬢',name:'Construct',rule:'Formation : deux Constructs adjacents gagnent une Garde ◆ au début de leur tour.'},
 Tempête:{glyph:'⚡',name:'Tempête',rule:'Escadron : une invocation Tempête avec un autre allié Tempête charge sa prochaine attaque de +1.'}
};
const SKILLS={
 crimson_drake:{name:'Souffle du Dragon',req:['attack','attack'],desc:'2 dégâts à tous les ennemis adjacents.'},
 ember_whelp:{name:'Étincelle Vorace',req:['summon','attack'],desc:'Charge immédiatement +1 sur sa prochaine attaque.'},
 magma_behemoth:{name:'Éruption du Colosse',req:['attack','guard'],desc:'2 dégâts aux ennemis adjacents et gagne une Garde.'},
 steel_wolf_knight:{name:'Rempart Lupin',req:['guard','guard'],desc:'Gagne 1 Garde ◆ et prépare une réaction défensive.'},
 iron_sentinel:{name:'Ancrage',req:['guard','guard'],desc:'Récupère 1 PV et gagne une Garde ◆.'},
 boulder_ram:{name:'Bélier Tellurique',req:['attack','guard'],desc:'Inflige 2 dégâts à un ennemi adjacent.'},
 stone_golem:{name:'Onde Sismique',req:['guard','guard'],desc:'1 dégât aux ennemis adjacents et gagne 1 Garde ◆.'},
 mystic_sage:{name:'Onde de Grâce',req:['magic','magic'],desc:'Soigne 1 PV à tous tes monstres.'},
 arcane_familiar:{name:'Résonance',req:['magic','magic'],desc:'Pioche 1 carte Effet si ta main n’est pas pleine.'},
 chronomancer:{name:'Rembobinage',req:['magic','magic'],desc:'Réinitialise son attaque : il peut attaquer une seconde fois ce tour.'},
 crystal_guardian:{name:'Prison de Cristal',req:['magic','guard'],desc:'Gèle tous les ennemis adjacents.'},
 goblin_raider:{name:'Raid Éclair',req:['move','move'],desc:'Dash gratuit jusqu’à 3 cases.'},
 goblin_bombardier:{name:'Bombe à Mèche',req:['attack','move'],desc:'2 dégâts à un ennemi situé jusqu’à 2 cases.'},
 goblin_shaman:{name:'Totem de Meute',req:['summon','magic'],desc:'Donne une Garde à un Gobelin allié et soigne 1 PV.'},
 shadow_imp:{name:'Saut d’Ombre',req:['move','magic'],desc:'Téléportation 3 cases, furtivité et prochaine attaque +1.'},
 nightblade_stalker:{name:'Exécution',req:['attack','move'],desc:'Inflige 3 dégâts à un ennemi adjacent.'},
 void_weaver:{name:'Faille Mobile',req:['move','magic'],desc:'Téléportation jusqu’à 4 cases et furtivité.'},
 thunder_roc:{name:'Foudre Plongeante',req:['attack','move'],desc:'2 dégâts à un ennemi jusqu’à 3 cases.'},
 storm_lynx:{name:'Bond de Tempête',req:['move','move'],desc:'Dash gratuit jusqu’à 4 cases.'},
 tempest_djinn:{name:'Chaîne d’Éclair',req:['attack','magic'],desc:'2 dégâts à une cible à 3 cases et 1 à un ennemi adjacent à celle-ci.'}
};
const SPECIAL_ICON={treasure:'🟨',shrine:'✚',boost:'⬆',trap:'✹',relic:'✦'};
const BIOME_INFO={
 citadel:{name:'Citadelle',glyph:'◆',desc:'Dalles anciennes autour des Invocateurs.',rule:'Terrain neutre : aucun bonus.'},
 prairie:{name:'Prairie d’Orage',glyph:'♒',desc:'Herbe vive, ciel chargé et vents électriques.',rule:'Un monstre qui commence son déplacement ici paie 1 ➤ de moins sur son premier déplacement du tour.'},
 volcanic:{name:'Terres Volcaniques',glyph:'♨',desc:'Roche noire traversée de veines de lave.',rule:'Les monstres non-Feu y perdent 1 PV au début de leur tour. Les monstres Feu y gagnent +1 ATQ.'},
 arcane:{name:'Ruines Arcaniques',glyph:'✦',desc:'Vestiges chargés de magie et de glyphes.',rule:'Concentration coûte 1 ✦ au lieu de 2 si tu contrôles un monstre ici.'},
 swamp:{name:'Marais des Pillards',glyph:'♣',desc:'Sol humide, mousses et poches d’eau sombre.',rule:'Entrer dans un marais adverse coûte 1 ➤ supplémentaire.'},
 mountain:{name:'Hauts-Rocs',glyph:'▲',desc:'Plaques minérales et reliefs pierreux.',rule:'Au début du tour, les alliés présents sans Garde gagnent 1 Garde ◆. Une Garde réduit la prochaine attaque de 1.'},
 shadow:{name:'Faille d’Ombre',glyph:'◐',desc:'Terrain obscur saturé d’énergie violette.',rule:'Un monstre qui termine son déplacement ici devient furtif jusqu’au tour suivant.'},
 crystal:{name:'Toundra de Cristal',glyph:'❄',desc:'Glace bleutée et éclats cristallins.',rule:'Entrer sur une toundra cristalline adverse a 35 % de chance de geler.'},
 storm:{name:'Plateau Tempête',glyph:'ϟ',desc:'Prairie sombre balayée par la foudre.',rule:'Les monstres Foudre y gagnent +1 dégât, sans créer de blason.'}
};
const BIOME_BY_MONSTER={crimson_drake:'volcanic',ember_whelp:'volcanic',magma_behemoth:'volcanic',steel_wolf_knight:'mountain',iron_sentinel:'mountain',boulder_ram:'mountain',stone_golem:'mountain',mystic_sage:'arcane',arcane_familiar:'arcane',chronomancer:'arcane',crystal_guardian:'crystal',goblin_raider:'swamp',goblin_bombardier:'swamp',goblin_shaman:'swamp',shadow_imp:'shadow',nightblade_stalker:'shadow',void_weaver:'shadow',thunder_roc:'prairie',storm_lynx:'storm',tempest_djinn:'storm'};

const CARD_COPY_LIMITS = {summon_surge:2, dragon_gate:1};
const AI_PRESET_KEYS = ['inferno','arcane','fortress','storm','swarm','shadow'];
const DEFAULT_DECK = [...DECK_PRESETS.starter.deck];
const CREST_KEYS = ['summon','move','attack','magic','guard'];
const SPECIAL_INFO = {
 treasure:{name:'Coffre arcanique',effect:'Pioche 1 carte Effet.'},
 shrine:{name:'Sanctuaire',effect:'Rend 2 PV au monstre qui entre sur la case.'},
 boost:{name:'Nexus de dés',effect:'Ton prochain lancer utilise +1 dé.'},
 trap:{name:'Piège',effect:'Inflige 1 dégât au monstre qui marche dessus.'},
 relic:{name:'Relais arcanique',effect:'Le premier déplacement du tour de son contrôleur coûte 1 ➤ de moins.'}
};
const ATTACK_NAMES = {crimson_drake:'Souffle ardent',ember_whelp:'Morsure de braise',magma_behemoth:'Poing volcanique',steel_wolf_knight:'Charge du Croc',iron_sentinel:'Percussion d’acier',boulder_ram:'Bélier minéral',stone_golem:'Fracas tellurique',mystic_sage:'Impact arcanique',arcane_familiar:'Étincelle mystique',chronomancer:'Rayon temporel',crystal_guardian:'Lance de cristal',goblin_raider:'Taillade éclair',goblin_bombardier:'Bombe gobeline',goblin_shaman:'Trait totémique',shadow_imp:'Entaille d’ombre',nightblade_stalker:'Lame nocturne',void_weaver:'Faille du vide',thunder_roc:'Éclair plongeant',storm_lynx:'Griffe foudroyante',tempest_djinn:'Arc électrique'};

function summonCost(m){return m.lv<=2?1:m.lv<=4?2:3}
function summonTier(m){return m.lv<=2?'Petit':m.lv<=4?'Moyen':'Colosse'}
function copyLimitFor(id){return CARD_COPY_LIMITS[id]??3}

Object.assign(DD, {MAX_CORE, ARENAS, INVOCATORS, ENEMY_INVOCATOR_BY_PRESET, MONSTERS, EFFECTS, ALL,
  MAX_PLAYER_LEVEL, LEVEL_XP, LEVEL_UNLOCKS, DECK_PRESETS, AI_PERSONALITY, CAMPAIGN_MISSIONS, FACE,
  FAMILY_INFO, SKILLS, SPECIAL_ICON, BIOME_INFO, BIOME_BY_MONSTER, CARD_COPY_LIMITS, AI_PRESET_KEYS,
  DEFAULT_DECK, CREST_KEYS, SPECIAL_INFO, ATTACK_NAMES, summonCost, summonTier, copyLimitFor});
})(globalThis.DD = globalThis.DD || {});
