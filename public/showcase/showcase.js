/**
 * DartOTron CyberHUD Showcase Controller
 * Moteur d'exploration atomique de composants (Knobs + Events log)
 */

import '../components/index.js';

const COMPONENT_REGISTRY = {
  'game-card': {
    title: '<game-card>',
    tag: 'GameCard.js',
    create: (knobValues) => {
      const el = document.createElement('game-card');
      el.setAttribute('game-id', knobValues['game-id'] || 'Ho_One');
      el.setAttribute('title', knobValues['title'] || '501');
      el.setAttribute('category', knobValues['category'] || 'X01');
      el.setAttribute('badge-main', knobValues['badge-main'] || 'OFFICIEL');
      el.setAttribute('glow', knobValues['glow'] || 'neon');
      el.setAttribute('subtitle', knobValues['subtitle'] || 'Standard X01 DIDO // Bull 50/50');
      if (knobValues['has-settings']) el.setAttribute('has-settings', '');
      if (knobValues['has-variants']) {
        el.setAttribute('has-variants', '');
        const sampleVariants = [
          { id: '301', title: '301', subtitle: 'RAPIDE', badge: 'RAPIDE' },
          { id: '501', title: '501', subtitle: 'OFFICIEL', badge: 'OFFICIEL' },
          { id: '701', title: '701', subtitle: 'EXPERT', badge: 'EXPERT' },
          { id: '1001', title: '1001', subtitle: 'MARATHON', badge: 'MARATHON' }
        ];
        el.setAttribute('variants', JSON.stringify(sampleVariants));
      }
      if (knobValues['current-variant']) el.setAttribute('current-variant', knobValues['current-variant']);
      if (knobValues['flipped']) el.setAttribute('flipped', '');
      if (knobValues['selected']) el.setAttribute('selected', '');
      return el;
    },
    knobs: [
      { key: 'game-id', label: 'Jeu (ID)', type: 'select', options: ['Ho_One', 'Cricket', 'Kinito', '321_Zlip', 'By_Fives', 'Practice'], default: 'Ho_One' },
      { key: 'title', label: 'Titre principal', type: 'text', default: '501' },
      { key: 'badge-main', label: 'Badge Haut (.tile-badge-main)', type: 'text', default: 'OFFICIEL' },
      { key: 'subtitle', label: 'Sous-titre / Règles', type: 'text', default: 'Standard X01 DIDO // Bull 50/50' },
      { key: 'has-variants', label: 'Variantes avec Flip 3D (sync)', type: 'boolean', default: true },
      { key: 'current-variant', label: 'Variante active (301/501/701/1001)', type: 'text', default: '501' },
      { key: 'has-settings', label: 'Bouton Réglages dédié (engrenage)', type: 'boolean', default: true },
      { key: 'flipped', label: 'Retourner face arrière (Flip 3D)', type: 'boolean', default: false },
      { key: 'glow', label: 'Glow thématique', type: 'select', options: ['neon', 'cyan', 'amber', 'crimson'], default: 'neon' },
      { key: 'selected', label: 'Sélectionné', type: 'boolean', default: true }
    ],
    events: ['game-select', 'game-variant-change', 'game-configure', 'card-flip']
  },

  'player-select-card': {
    title: '<player-select-card>',
    tag: 'PlayerSelectCard.js',
    create: (knobValues) => {
      const el = document.createElement('player-select-card');
      el.setAttribute('player-name', knobValues['player-name'] || 'Alex');
      el.setAttribute('order', knobValues['order'] || '1');
      el.setAttribute('stat', knobValues['stat'] || '65+');
      if (knobValues['selected']) el.setAttribute('selected', '');
      return el;
    },
    knobs: [
      { key: 'player-name', label: 'Nom du Joueur', type: 'text', default: 'Alex' },
      { key: 'selected', label: 'Sélectionné', type: 'boolean', default: true },
      { key: 'order', label: 'Ordre de passage', type: 'text', default: '1' },
      { key: 'stat', label: 'Moyenne (PPR/PPD)', type: 'text', default: '65+' }
    ],
    events: ['player-toggle', 'player-stats', 'player-rename', 'player-delete']
  },

  'player-name': {
    title: '<player-name>',
    tag: 'PlayerName.js',
    create: (knobValues) => {
      const el = document.createElement('player-name');
      el.setAttribute('name', knobValues['name'] || 'ALEX');
      el.setAttribute('stat', knobValues['stat'] || '85+');
      el.setAttribute('size', knobValues['size'] || 'md');
      if (knobValues['highlight']) el.setAttribute('highlight', '');
      if (knobValues['show-stat'] === false) el.setAttribute('show-stat', 'false');
      return el;
    },
    knobs: [
      { key: 'name', label: 'Nom du Joueur', type: 'text', default: 'ALEX' },
      { key: 'stat', label: 'Stat (3-Dart Avg)', type: 'text', default: '85+' },
      { key: 'size', label: 'Taille (sm / md / lg)', type: 'text', default: 'md' },
      { key: 'highlight', label: 'Surbrillance (Or/Ambre)', type: 'boolean', default: false },
      { key: 'show-stat', label: 'Afficher la Stat', type: 'boolean', default: true }
    ],
    events: []
  },

  'hud-stepper': {
    title: '<hud-stepper>',
    tag: 'HudStepper.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stepper');
      el.setAttribute('label', knobValues['label'] || 'TEMPS RETRAIT FLÉCHETTES');
      el.setAttribute('tag', knobValues['tag'] || 'SÉCURITÉ');
      el.setAttribute('value', String(knobValues['value'] ?? 10));
      el.setAttribute('unit', knobValues['unit'] || 's');
      el.setAttribute('min', String(knobValues['min'] ?? 3));
      el.setAttribute('max', String(knobValues['max'] ?? 30));
      el.setAttribute('step', String(knobValues['step'] ?? 1));
      el.setAttribute('presets', knobValues['presets'] || '5,8,10,15,20');
      return el;
    },
    knobs: [
      { key: 'label', label: 'Label', type: 'text', default: 'TEMPS RETRAIT FLÉCHETTES' },
      { key: 'tag', label: 'Tag Badge', type: 'text', default: 'SÉCURITÉ' },
      { key: 'value', label: 'Valeur', type: 'number', default: 10 },
      { key: 'unit', label: 'Unité', type: 'text', default: 's' },
      { key: 'min', label: 'Minimum', type: 'number', default: 3 },
      { key: 'max', label: 'Maximum', type: 'number', default: 30 },
      { key: 'step', label: 'Pas (Step)', type: 'number', default: 1 },
      { key: 'presets', label: 'Presets (séparés par virgule)', type: 'text', default: '5,8,10,15,20' }
    ],
    events: ['stepper-change']
  },

  'hud-boolean-card': {
    title: '<hud-boolean-card>',
    tag: 'HudBooleanCard.js',
    create: (knobValues) => {
      const el = document.createElement('hud-boolean-card');
      el.setAttribute('label', knobValues['label'] || 'Double Out');
      el.setAttribute('tag', knobValues['tag'] || 'WDF');
      if (knobValues['strict']) el.setAttribute('strict', '');
      el.setAttribute('desc', knobValues['desc'] || 'Clôture obligatoire par anneau double');
      el.setAttribute('yes-label', knobValues['yes-label'] || 'OUI');
      el.setAttribute('no-label', knobValues['no-label'] || 'NON');
      if (knobValues['checked']) el.setAttribute('checked', '');
      return el;
    },
    knobs: [
      { key: 'label', label: 'Label', type: 'text', default: 'Double Out' },
      { key: 'tag', label: 'Tag Badge', type: 'text', default: 'WDF' },
      { key: 'strict', label: 'Tag Strict (Rouge)', type: 'boolean', default: false },
      { key: 'desc', label: 'Description', type: 'text', default: 'Clôture obligatoire par anneau double' },
      { key: 'checked', label: 'Actif (OUI)', type: 'boolean', default: true },
      { key: 'yes-label', label: 'Bouton Oui', type: 'text', default: 'OUI' },
      { key: 'no-label', label: 'Bouton Non', type: 'text', default: 'NON' }
    ],
    events: ['toggle-change']
  },

  'scoreboard-x01': {
    title: '<scoreboard-x01>',
    tag: 'ScoreboardX01.js',
    create: (knobValues) => {
      const el = document.createElement('scoreboard-x01');
      el.setAttribute('active-player', String(knobValues['active-player'] ?? 0));
      el.setAttribute('starting-at', String(knobValues['starting-at'] ?? 501));
      return el;
    },
    knobs: [
      { key: 'active-player', label: 'Joueur Actif (Index 0 ou 1)', type: 'number', default: 0 },
      { key: 'starting-at', label: 'Score initial (301, 501, 701)', type: 'number', default: 501 }
    ],
    events: []
  },

  'scoreboard-cricket': {
    title: '<scoreboard-cricket>',
    tag: 'ScoreboardCricket.js',
    create: (knobValues) => {
      const el = document.createElement('scoreboard-cricket');
      el.setAttribute('active-player', String(knobValues['active-player'] ?? 0));
      return el;
    },
    knobs: [
      { key: 'active-player', label: 'Joueur Actif (Index 0 ou 1)', type: 'number', default: 0 }
    ],
    events: []
  },

  'hud-notification': {
    title: '<hud-notification>',
    tag: 'HudNotification.js',
    create: (knobValues) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'sc-notif-preview-wrapper';

      const el = document.createElement('hud-notification');
      el.setAttribute('title', knobValues['title'] || 'CIBLE CONNECTÉE');
      el.setAttribute('subtitle', knobValues['subtitle'] || 'Matrice piezo synchronisée');
      el.setAttribute('icon', knobValues['icon'] || 'sensors');
      el.setAttribute('type', knobValues['type'] || 'info');
      el.setAttribute('duration', String(knobValues['duration'] ?? 3000));
      // In canvas preview, keep it inline and visible so user can see it right away
      el.setAttribute('fixed', 'false');

      const triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.className = 'sc-btn-trigger-toast';
      triggerBtn.innerHTML = `
        <span class="material-symbols-outlined">play_arrow</span>
        <span>TESTER L'ANIMATION EN BAS À GAUCHE (3S)</span>
      `;

      triggerBtn.addEventListener('click', () => {
        // Trigger live floating notification in bottom left corner
        let liveToast = document.getElementById('sc-live-toast');
        if (!liveToast) {
          liveToast = document.createElement('hud-notification');
          liveToast.id = 'sc-live-toast';
          document.body.appendChild(liveToast);
        }
        liveToast.show({
          title: knobValues['title'],
          subtitle: knobValues['subtitle'],
          icon: knobValues['icon'],
          type: knobValues['type'],
          duration: Number(knobValues['duration']) || 3000
        });
      });

      wrapper.appendChild(triggerBtn);
      wrapper.appendChild(el);

      // Force inline preview to be visible in canvas
      setTimeout(() => {
        const sheet = el.querySelector('.hud-notification-sheet');
        if (sheet) {
          sheet.classList.remove('is-hidden');
          sheet.classList.add('is-visible');
        }
      }, 50);

      // Delegate event forwarding from both preview and live toast
      wrapper.componentElement = el;
      return wrapper;
    },
    knobs: [
      { key: 'title', label: 'Titre', type: 'text', default: 'CIBLE CONNECTÉE' },
      { key: 'subtitle', label: 'Sous-titre', type: 'text', default: 'Matrice piezo synchronisée' },
      { key: 'icon', label: 'Icône (Material Symbol)', type: 'text', default: 'sensors' },
      { key: 'type', label: 'Type / Label (info ou danger)', type: 'select', options: ['info', 'danger'], default: 'info' },
      { key: 'duration', label: 'Durée affichage (ms)', type: 'number', default: 3000 }
    ],
    events: ['notification-show', 'notification-hide']
  },

  'hit-impact': {
    title: '<hit-impact>',
    tag: 'HitImpact.js',
    create: (knobValues) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'sc-notif-preview-wrapper';

      const stage = document.createElement('div');
      stage.className = 'sc-hit-impact-stage';

      const bgDemo = document.createElement('div');
      bgDemo.className = 'sc-hit-impact-backdrop-demo';
      bgDemo.innerHTML = `
        <span>301</span>
        <span>20 • T20</span>
        <span>141</span>
        <span>CRICKET</span>
        <span>BULL</span>
        <span>85.4 PPR</span>
      `;

      const el = document.createElement('hit-impact');
      el.setAttribute('badge', knobValues['badge'] || 'TRIPLE IMPACT');
      el.setAttribute('value', knobValues['value'] || 'T20');
      el.setAttribute('variant', knobValues['variant'] || 'scored');
      if (knobValues['static'] !== false) {
        el.setAttribute('static', '');
      }
      el.setAttribute('active', '');

      stage.appendChild(bgDemo);
      stage.appendChild(el);

      const presetsRow = document.createElement('div');
      presetsRow.className = 'sc-hit-impact-presets';

      const triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.className = 'sc-btn-trigger-toast';
      triggerBtn.innerHTML = `
        <span class="material-symbols-outlined">replay</span>
        <span>REJOUER L'ANIMATION D'IMPACT</span>
      `;
      triggerBtn.addEventListener('click', () => {
        el.show({
          badge: knobValues['badge'] || 'TRIPLE IMPACT',
          value: knobValues['value'] || 'T20',
          variant: knobValues['variant'] || 'scored',
          duration: Number(knobValues['duration']) || 1200
        });
      });

      presetsRow.appendChild(triggerBtn);
      wrapper.appendChild(presetsRow);
      wrapper.appendChild(stage);
      return wrapper;
    },
    knobs: [
      { key: 'variant', label: 'Variante (scored = Vert, penalty = Rouge, neutral = Gris)', type: 'select', options: ['scored', 'penalty', 'neutral'], default: 'scored' },
      { key: 'badge', label: 'Texte du Badge', type: 'text', default: 'TRIPLE IMPACT' },
      { key: 'value', label: 'Valeur Affichée', type: 'text', default: 'T20' },
      { key: 'static', label: 'Maintenir affiché (Mode inspection)', type: 'boolean', default: true },
      { key: 'duration', label: 'Durée animation (ms)', type: 'number', default: 1200 }
    ],
    events: ['hit-impact-show', 'hit-impact-hide']
  },

  'hud-player-dropdown': {
    title: '<hud-player-dropdown>',
    tag: 'HudPlayerDropdown.js',
    create: (knobValues) => {
      const el = document.createElement('hud-player-dropdown');
      el.setAttribute('selected-player', knobValues['selected-player'] || 'ALEX');
      el.setAttribute('selected-stat', knobValues['selected-stat'] || '89+');
      if (knobValues['disabled']) el.setAttribute('disabled', '');
      el.players = [
        { name: 'ALEX', stat: '89+' },
        { name: 'MAXIME', stat: '84+' },
        { name: 'SARAH', stat: '76+' },
        { name: 'THOMAS', stat: '92+' }
      ];
      return el;
    },
    knobs: [
      { key: 'selected-player', label: 'Joueur Sélectionné', type: 'text', default: 'ALEX' },
      { key: 'selected-stat', label: 'Badge / Statut', type: 'text', default: '89+' },
      { key: 'disabled', label: 'Désactivé', type: 'boolean', default: false }
    ],
    events: ['player-select']
  },

  'hud-stats-telemetry': {
    title: '<hud-stats-telemetry>',
    tag: 'HudStatsTelemetry.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stats-telemetry');
      el.setAttribute('icon', knobValues['icon'] || 'sports_score');
      el.setAttribute('label', knobValues['label'] || 'Parties');
      el.setAttribute('value', knobValues['value'] || '142');
      el.setAttribute('sub', knobValues['sub'] || '');
      el.setAttribute('color', knobValues['color'] || 'white');
      return el;
    },
    knobs: [
      { key: 'icon', label: 'Icône (Material Symbol)', type: 'text', default: 'sports_score' },
      { key: 'label', label: 'Libellé', type: 'text', default: 'Parties' },
      { key: 'value', label: 'Valeur Principale', type: 'text', default: '142' },
      { key: 'sub', label: 'Sous-valeur (optionnelle)', type: 'text', default: '' },
      { key: 'color', label: 'Couleur Accent', type: 'select', options: ['white', 'neon', 'cyan', 'amber', 'crimson'], default: 'white' }
    ],
    events: []
  },

  'hud-stats-column': {
    title: '<hud-stats-column>',
    tag: 'HudStatsColumn.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stats-column');
      const color = knobValues['color'] || 'neon';
      el.setAttribute('color', color);
      el.setAttribute('icon', knobValues['icon'] || 'speed');
      el.setAttribute('title', knobValues['title'] || 'Moyennes X01');
      el.setAttribute('badge', knobValues['badge'] || 'STABLE');
      el.setAttribute('footer-icon', knobValues['footer-icon'] || 'workspace_premium');
      el.setAttribute('footer-title', knobValues['footer-title'] || 'Volée Maximale');
      el.setAttribute('footer-badge', knobValues['footer-badge'] || 'RECORD');
      el.setAttribute('footer-main', knobValues['footer-main'] || 'T20 · T20 · T20');
      el.setAttribute('footer-val', knobValues['footer-val'] || '180 pts');
      el.style.width = '250px';
      el.style.height = '480px';

      // Inner stats blocks
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      grid.style.gap = '8px';

      const m1 = document.createElement('hud-stats-metric');
      m1.setAttribute('label', 'PPD');
      m1.setAttribute('value', '28.4');
      m1.setAttribute('unit', 'pt');
      m1.setAttribute('color', color);

      const m2 = document.createElement('hud-stats-metric');
      m2.setAttribute('label', 'PPR');
      m2.setAttribute('value', '85.2');
      m2.setAttribute('unit', 'pt');
      m2.setAttribute('color', 'white');

      grid.appendChild(m1);
      grid.appendChild(m2);

      const gauge = document.createElement('hud-stats-gauge');
      gauge.setAttribute('target', 'T20');
      gauge.setAttribute('label', 'Précision scoring');
      gauge.setAttribute('value', '41.2%');
      gauge.setAttribute('progress', '41.2');
      gauge.setAttribute('color', color);

      el.appendChild(grid);
      el.appendChild(gauge);
      return el;
    },
    knobs: [
      { key: 'color', label: 'Variante Couleur', type: 'select', options: ['neon', 'cyan', 'amber', 'crimson'], default: 'neon' },
      { key: 'icon', label: 'Icône En-tête', type: 'text', default: 'speed' },
      { key: 'title', label: 'Titre En-tête', type: 'text', default: 'Moyennes X01' },
      { key: 'badge', label: 'Badge En-tête', type: 'text', default: 'STABLE' },
      { key: 'footer-icon', label: 'Icône Footer', type: 'text', default: 'workspace_premium' },
      { key: 'footer-title', label: 'Titre Footer', type: 'text', default: 'Volée Maximale' },
      { key: 'footer-badge', label: 'Badge Footer', type: 'text', default: 'RECORD' },
      { key: 'footer-main', label: 'Texte Footer', type: 'text', default: 'T20 · T20 · T20' },
      { key: 'footer-val', label: 'Valeur Footer', type: 'text', default: '180 pts' }
    ],
    events: []
  },

  'hud-stats-metric': {
    title: '<hud-stats-metric>',
    tag: 'HudStatsMetric.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stats-metric');
      el.setAttribute('label', knobValues['label'] || 'PPD (Pt/Dart)');
      el.setAttribute('value', knobValues['value'] || '28.4');
      el.setAttribute('unit', knobValues['unit'] || 'pt');
      el.setAttribute('color', knobValues['color'] || 'neon');
      if (knobValues['icon']) el.setAttribute('icon', knobValues['icon']);
      if (knobValues['horizontal']) el.setAttribute('horizontal', '');
      el.style.width = '200px';
      return el;
    },
    knobs: [
      { key: 'label', label: 'Libellé', type: 'text', default: 'PPD (Pt/Dart)' },
      { key: 'value', label: 'Valeur', type: 'text', default: '28.4' },
      { key: 'unit', label: 'Unité', type: 'text', default: 'pt' },
      { key: 'color', label: 'Couleur', type: 'select', options: ['neon', 'cyan', 'amber', 'crimson', 'white'], default: 'neon' },
      { key: 'icon', label: 'Icône Statut (optionnelle)', type: 'text', default: '' },
      { key: 'horizontal', label: 'Disposition Horizontale', type: 'boolean', default: false }
    ],
    events: []
  },

  'hud-stats-preference': {
    title: '<hud-stats-preference>',
    tag: 'HudStatsPreference.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stats-preference');
      el.setAttribute('label', knobValues['label'] || 'TRIPLE FAVORIT');
      el.setAttribute('value', knobValues['value'] || 'T20');
      if (knobValues['count']) el.setAttribute('count', knobValues['count']);
      el.setAttribute('color', knobValues['color'] || 'neon');
      el.setAttribute('icon', knobValues['icon'] || 'stars');
      el.style.width = '220px';
      return el;
    },
    knobs: [
      { key: 'label', label: 'Libellé', type: 'text', default: 'TRIPLE FAVORIT' },
      { key: 'value', label: 'Valeur principale', type: 'text', default: 'T20' },
      { key: 'count', label: 'Badge touches/parties', type: 'text', default: '85 touches' },
      { key: 'color', label: 'Couleur', type: 'select', options: ['neon', 'cyan', 'amber', 'crimson', 'white'], default: 'neon' },
      { key: 'icon', label: 'Icône', type: 'text', default: 'stars' }
    ],
    events: []
  },

  'hud-stats-gauge': {
    title: '<hud-stats-gauge>',
    tag: 'HudStatsGauge.js',
    create: (knobValues) => {
      const el = document.createElement('hud-stats-gauge');
      el.setAttribute('target', knobValues['target'] || 'T20');
      el.setAttribute('label', knobValues['label'] || 'Triple scoring');
      el.setAttribute('value', knobValues['value'] || '41.2%');
      el.setAttribute('progress', String(knobValues['progress'] ?? 41.2));
      el.setAttribute('color', knobValues['color'] || 'cyan');
      el.style.width = '260px';
      return el;
    },
    knobs: [
      { key: 'target', label: 'Pilule Cible', type: 'text', default: 'T20' },
      { key: 'label', label: 'Libellé', type: 'text', default: 'Triple scoring' },
      { key: 'value', label: 'Valeur Affichée', type: 'text', default: '41.2%' },
      { key: 'progress', label: 'Progression % (0-100)', type: 'number', default: 41.2 },
      { key: 'color', label: 'Couleur', type: 'select', options: ['cyan', 'neon', 'amber', 'crimson'], default: 'cyan' }
    ],
    events: []
  },

  'record-card': {
    title: '<record-card>',
    tag: 'RecordCard.js',
    create: (knobValues) => {
      const el = document.createElement('record-card');
      el.setAttribute('title', knobValues['title'] || 'Points Par Tour (PPR)');
      el.setAttribute('badge', knobValues['badge'] || 'Top 3 All-Time');
      el.setAttribute('icon', knobValues['icon'] || 'speed');
      el.setAttribute('color', knobValues['color'] || 'neon');
      el.setAttribute('unit', knobValues['unit'] || 'pt');
      const hasNew = knobValues['has-new-record'] !== false;
      el.records = [
        { rank: 1, playername: 'Alex', score: 85.2, date: '2026-10-24', hiscore: hasNew },
        { rank: 2, playername: 'Maxime', score: 78.4, date: '2026-10-22', hiscore: false },
        { rank: 3, playername: 'Sarah', score: 71.0, date: '2026-10-20', hiscore: false }
      ];
      return el;
    },
    knobs: [
      { key: 'title', label: 'Titre', type: 'text', default: 'Points Par Tour (PPR)' },
      { key: 'badge', label: 'Badge', type: 'text', default: 'Top 3 All-Time' },
      { key: 'has-new-record', label: 'Nouveau Record (sur #1)', type: 'boolean', default: true },
      { key: 'icon', label: 'Icône (Material Symbol)', type: 'text', default: 'speed' },
      { key: 'color', label: 'Couleur', type: 'select', options: ['neon', 'cyan', 'amber', 'crimson'], default: 'neon' },
      { key: 'unit', label: 'Unité', type: 'text', default: 'pt' }
    ],
    events: []
  },

  'virtual-keyboard': {
    title: '<virtual-keyboard>',
    tag: 'VirtualKeyboard.js',
    create: (knobValues) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '16px';
      container.style.width = '100%';

      const demoInput = document.createElement('input');
      demoInput.type = knobValues['mode'] === 'numeric' ? 'number' : 'text';
      demoInput.className = 'cyber-input-field';
      demoInput.style.padding = '12px';
      demoInput.style.width = '320px';
      demoInput.placeholder = 'Cliquez ici pour saisir...';
      demoInput.value = knobValues['initialValue'] || '';

      const triggerBtn = document.createElement('button');
      triggerBtn.className = 'btn-touch';
      triggerBtn.textContent = 'OUVRIR MANUELLEMENT';
      triggerBtn.style.padding = '12px 24px';
      triggerBtn.style.background = 'var(--accent-primary)';
      triggerBtn.style.color = '#000';
      triggerBtn.style.fontWeight = 'bold';
      triggerBtn.style.borderRadius = '8px';

      const vk = document.querySelector('virtual-keyboard') || document.createElement('virtual-keyboard');
      if (!vk.isConnected) document.body.appendChild(vk);

      triggerBtn.addEventListener('click', () => {
        vk.open({
          title: knobValues['title'] || 'TEST CLAVIER TACTILE',
          initialValue: demoInput.value,
          maxLength: knobValues['maxLength'] || 32,
          mode: knobValues['mode'] || 'text',
          targetInput: demoInput
        });
      });

      container.appendChild(demoInput);
      container.appendChild(triggerBtn);
      return container;
    },
    knobs: [
      { key: 'title', label: 'Titre Overlay', type: 'text', default: 'TEST CLAVIER TACTILE' },
      { key: 'initialValue', label: 'Valeur Initiale', type: 'text', default: 'DartOTron' },
      { key: 'mode', label: 'Mode (text / numeric)', type: 'select', options: ['text', 'numeric'], default: 'text' },
      { key: 'maxLength', label: 'Longueur Max', type: 'number', default: 32 }
    ],
    events: ['change', 'input']
  },

  'dartboard': {
    title: '<dart-board>',
    tag: 'Dartboard.js',
    create: (knobValues) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '20px';
      container.style.width = '100%';
      container.style.maxWidth = '460px';

      const el = document.createElement('dart-board');
      let targetList = [];
      const preset = knobValues['targets-preset'] || 'cricket-standard';
      if (preset === 'cricket-standard') targetList = ['20', '19', '18', '17', '16', '15', 'B'];
      else if (preset === 'cricket-adjacent') targetList = ['20', '1', '18', '4', 'B']; // Test fusion bordures 20-1-18-4
      else if (preset === 'single-20') targetList = ['20'];
      else if (preset === 'all-active') targetList = ['20', '1', '18', '4', '13', '6', '10', '15', '2', '17', '3', '19', '7', '16', '8', '11', '14', '9', '12', '5', 'B'];
      else if (knobValues['custom-targets']) {
        targetList = knobValues['custom-targets'].split(',').map(s => s.trim().toUpperCase());
      }

      el.targets = targetList;
      if (knobValues['interactive']) el.interactive = true;

      let hitsList = [];
      if (knobValues['hits']) {
        hitsList = knobValues['hits'].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      }
      el.hits = hitsList;

      // Boutons d'action rapides pour simuler les tirs
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.flexWrap = 'wrap';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'center';

      const sampleHits = ['T20', 'S19', 'D18', 'T1', 'DB', 'SB'];
      sampleHits.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sc-btn-trigger-toast';
        btn.textContent = `+ ${h}`;
        btn.addEventListener('click', () => {
          let curr = [...el.hits];
          if (curr.length >= 3) curr = [];
          curr.push(h);
          el.hits = curr;
          const hitsInput = document.querySelector('[data-knob-key="hits"]');
          if (hitsInput) hitsInput.value = curr.join(',');
        });
        actions.appendChild(btn);
      });

      const btnReset = document.createElement('button');
      btnReset.type = 'button';
      btnReset.className = 'sc-btn-trigger-toast';
      btnReset.textContent = 'RÉINIT VOLÉE';
      btnReset.addEventListener('click', () => {
        el.hits = [];
        const hitsInput = document.querySelector('[data-knob-key="hits"]');
        if (hitsInput) hitsInput.value = '';
      });
      actions.appendChild(btnReset);

      container.appendChild(actions);
      container.appendChild(el);
      return container;
    },
    knobs: [
      {
        key: 'targets-preset',
        label: 'Preset Numéros Actifs',
        type: 'select',
        options: ['cricket-standard', 'cricket-adjacent', 'single-20', 'all-active', 'none'],
        default: 'cricket-standard'
      },
      { key: 'custom-targets', label: 'Numéros personnalisés (ex: 20,19,B)', type: 'text', default: '' },
      { key: 'hits', label: 'Fléchettes du tour (ex: T20,S19,DB)', type: 'text', default: 'T20,D18' },
      { key: 'interactive', label: 'Cliquable (émet segment-hit)', type: 'boolean', default: true }
    ],
    events: ['segment-hit']
  },

  'hud-tabs': {
    title: '<hud-tabs>',
    tag: 'HudTabs.js',
    create: (knobValues) => {
      const container = document.createElement('div');
      container.className = 'sc-hud-tabs-demo u-w-full u-h-full';
      container.style.width = '100%';
      container.style.maxWidth = '760px';
      container.style.height = '420px';

      const tabs = document.createElement('hud-tabs');
      tabs.id = 'demo-tabs';
      tabs.setAttribute('active', knobValues['active-tab'] || 'tab-1');

      const p1 = document.createElement('hud-tab-panel');
      p1.setAttribute('tab', 'tab-1');
      p1.setAttribute('label', 'AUDIO & CONTRÔLES');
      p1.setAttribute('icon', 'volume_up');
      p1.className = 'tab-panel-view';
      p1.innerHTML = '<div class="hud-card u-p-lg"><h3 class="u-text-neon u-m-0">Panneau 1 : Audio</h3><p class="u-text-secondary">Contenu de test du premier onglet Stitch CyberHUD.</p></div>';

      const p2 = document.createElement('hud-tab-panel');
      p2.setAttribute('tab', 'tab-2');
      p2.setAttribute('label', 'CIBLE USB');
      p2.setAttribute('icon', 'usb');
      p2.className = 'tab-panel-view';
      p2.innerHTML = '<div class="hud-card u-p-lg"><h3 class="u-text-cyan u-m-0">Panneau 2 : Cible USB</h3><p class="u-text-secondary">Configuration de la liaison série Arduino.</p></div>';

      const p3 = document.createElement('hud-tab-panel');
      p3.setAttribute('tab', 'tab-3');
      p3.setAttribute('label', 'CALIBRATION');
      p3.setAttribute('icon', 'adjust');
      p3.className = 'tab-panel-view';
      p3.innerHTML = '<div class="hud-card u-p-lg"><h3 class="u-text-white u-m-0">Panneau 3 : Calibration</h3><p class="u-text-secondary">Assistant pas à pas pour la matrice des capteurs.</p></div>';

      tabs.appendChild(p1);
      tabs.appendChild(p2);
      tabs.appendChild(p3);

      container.appendChild(tabs);
      return container;
    },
    knobs: [
      {
        key: 'active-tab',
        label: 'Onglet actif',
        type: 'select',
        options: ['tab-1', 'tab-2', 'tab-3'],
        default: 'tab-1'
      }
    ],
    events: ['tab-change']
  }
};

class ShowcaseController {
  constructor() {
    this.currentCompId = 'game-card';
    this.knobValues = {};
    this.activeElement = null;

    this.initDOMElements();
    this.initEventListeners();
    this.loadComponent(this.currentCompId);
  }

  initDOMElements() {
    this.canvasTarget = document.getElementById('sc-canvas-target');
    this.compTitle = document.getElementById('sc-comp-title');
    this.btnCopyName = document.getElementById('sc-btn-copy-name');
    this.compTag = document.getElementById('sc-comp-tag');
    this.knobsContainer = document.getElementById('sc-knobs-container');
    this.eventList = document.getElementById('sc-event-list');
    this.tabKnobs = document.getElementById('tab-btn-knobs');
    this.tabEvents = document.getElementById('tab-btn-events');
    this.contentKnobs = document.getElementById('tab-content-knobs');
    this.contentEvents = document.getElementById('tab-content-events');
    this.btnClearEvents = document.getElementById('btn-clear-events');
    this.navList = document.getElementById('sc-nav-list');
  }

  initEventListeners() {
    // Nav switcher
    this.navList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-component-id]');
      if (!btn) return;
      const compId = btn.dataset.componentId;
      if (compId && COMPONENT_REGISTRY[compId]) {
        this.navList.querySelectorAll('.sc-nav-item').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        this.loadComponent(compId);
      }
    });

    // Inspector Tabs
    this.tabKnobs.addEventListener('click', () => this.switchTab('knobs'));
    this.tabEvents.addEventListener('click', () => this.switchTab('events'));

    // Clear events
    this.btnClearEvents.addEventListener('click', () => {
      this.eventList.innerHTML = '';
    });

    // Copy component name to clipboard
    if (this.btnCopyName) {
      this.btnCopyName.addEventListener('click', () => {
        const textToCopy = this.compTitle ? this.compTitle.textContent.trim() : '';
        if (!textToCopy) return;

        this.copyToClipboard(textToCopy).then(() => {
          this.btnCopyName.classList.add('copied');
          const icon = this.btnCopyName.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = 'check';
          const origTitle = this.btnCopyName.getAttribute('title');
          this.btnCopyName.setAttribute('title', 'Copié !');

          setTimeout(() => {
            this.btnCopyName.classList.remove('copied');
            if (icon) icon.textContent = 'content_copy';
            this.btnCopyName.setAttribute('title', origTitle || 'Copier le nom du composant');
          }, 1500);
        });
      });
    }

    // Global listeners for live floating toast
    document.addEventListener('notification-show', (e) => {
      if (this.currentCompId === 'hud-notification') {
        this.logEvent('notification-show', e.detail);
      }
    });
    document.addEventListener('notification-hide', (e) => {
      if (this.currentCompId === 'hud-notification') {
        this.logEvent('notification-hide', e.detail);
      }
    });

    // Outside click in showcase canvas to flip back game-card if flipped
    const canvas = document.querySelector('.sc-canvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        if (this.currentCompId === 'game-card' && this.activeElement) {
          if (!e.target.closest('game-card') && this.activeElement.isFlipped) {
            this.activeElement.flip(false);
          }
        }
      });
    }
  }

  async copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback below
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }

  switchTab(tab) {
    if (tab === 'knobs') {
      this.tabKnobs.classList.add('active');
      this.tabEvents.classList.remove('active');
      this.contentKnobs.style.display = 'block';
      this.contentEvents.style.display = 'none';
    } else {
      this.tabEvents.classList.add('active');
      this.tabKnobs.classList.remove('active');
      this.contentEvents.style.display = 'block';
      this.contentKnobs.style.display = 'none';
    }
  }

  loadComponent(compId) {
    this.currentCompId = compId;
    const def = COMPONENT_REGISTRY[compId];
    if (!def) return;

    this.compTitle.textContent = def.title;
    this.compTag.textContent = def.tag;

    // Reset knobs state to defaults
    this.knobValues = {};
    for (const knob of def.knobs) {
      this.knobValues[knob.key] = knob.default;
    }

    this.renderKnobs(def.knobs);
    this.renderActiveComponent();
  }

  renderKnobs(knobs) {
    this.knobsContainer.innerHTML = '';

    for (const knob of knobs) {
      const knobWrap = document.createElement('div');
      knobWrap.className = 'sc-knob';

      if (knob.type === 'boolean') {
        knobWrap.className = 'sc-knob-toggle';
        knobWrap.innerHTML = `
          <span class="sc-knob-label">${knob.label}</span>
          <label class="sc-toggle-switch">
            <input type="checkbox" data-knob-key="${knob.key}" ${this.knobValues[knob.key] ? 'checked' : ''}>
            <span class="sc-slider"></span>
          </label>
        `;
        const input = knobWrap.querySelector('input');
        input.addEventListener('change', () => {
          this.knobValues[knob.key] = input.checked;
          this.renderActiveComponent();
        });
      } else if (knob.type === 'select') {
        knobWrap.innerHTML = `
          <label class="sc-knob-label">${knob.label}</label>
          <select class="sc-knob-input" data-knob-key="${knob.key}">
            ${knob.options.map(opt => `<option value="${opt}" ${this.knobValues[knob.key] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        `;
        const select = knobWrap.querySelector('select');
        select.addEventListener('change', () => {
          this.knobValues[knob.key] = select.value;
          this.renderActiveComponent();
        });
      } else {
        knobWrap.innerHTML = `
          <label class="sc-knob-label">${knob.label}</label>
          <input
            type="${knob.type === 'number' ? 'number' : 'text'}"
            class="sc-knob-input"
            data-knob-key="${knob.key}"
            value="${this.knobValues[knob.key]}"
          >
        `;
        const input = knobWrap.querySelector('input');
        input.addEventListener('input', () => {
          this.knobValues[knob.key] = knob.type === 'number' ? Number(input.value) : input.value;
          this.renderActiveComponent();
        });
      }

      this.knobsContainer.appendChild(knobWrap);
    }
  }

  renderActiveComponent() {
    const def = COMPONENT_REGISTRY[this.currentCompId];
    if (!def) return;

    this.canvasTarget.innerHTML = '';
    const el = def.create(this.knobValues);
    this.activeElement = el;

    // Attach event log listeners
    for (const evtName of def.events) {
      el.addEventListener(evtName, (e) => {
        this.logEvent(evtName, e.detail);

        // If stepper-change, update value knob live
        if (evtName === 'stepper-change' && e.detail?.value !== undefined) {
          this.knobValues['value'] = e.detail.value;
          const knobInput = this.knobsContainer.querySelector('[data-knob-key="value"]');
          if (knobInput) knobInput.value = e.detail.value;
        }

        // If toggle-change, update checked knob live
        if (evtName === 'toggle-change' && e.detail?.value !== undefined) {
          this.knobValues['checked'] = e.detail.value;
          const knobCheckbox = this.knobsContainer.querySelector('[data-knob-key="checked"]');
          if (knobCheckbox) knobCheckbox.checked = e.detail.value;
        }

        // Live syncing pour <game-card>
        if (evtName === 'card-flip' && e.detail?.isFlipped !== undefined) {
          this.knobValues['flipped'] = e.detail.isFlipped;
          const knobCheckbox = this.knobsContainer.querySelector('[data-knob-key="flipped"]');
          if (knobCheckbox) knobCheckbox.checked = e.detail.isFlipped;
        }
        if (evtName === 'game-variant-change' && e.detail?.variantId !== undefined) {
          this.knobValues['current-variant'] = e.detail.variantId;
          const knobInput = this.knobsContainer.querySelector('[data-knob-key="current-variant"]');
          if (knobInput) knobInput.value = e.detail.variantId;
        }
        if (evtName === 'game-select') {
          this.knobValues['selected'] = true;
          const knobCheckbox = this.knobsContainer.querySelector('[data-knob-key="selected"]');
          if (knobCheckbox) knobCheckbox.checked = true;
          if (el && typeof el.selected !== 'undefined') el.selected = true;
        }
      });
    }

    this.canvasTarget.appendChild(el);
  }

  logEvent(name, detail) {
    const time = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'sc-event-item';

    item.innerHTML = `
      <div class="sc-event-title-row">
        <span>⚡ ${name}</span>
        <span class="sc-event-time">${time}</span>
      </div>
      <div class="sc-event-body">${JSON.stringify(detail, null, 2)}</div>
    `;

    this.eventList.prepend(item);
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new ShowcaseController();
});

