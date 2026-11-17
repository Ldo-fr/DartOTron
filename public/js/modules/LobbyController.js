/**
 * Contrôleur Lobby DartOTron (public/js/modules/LobbyController.js)
 * Gère l'assistant tactile 2 étapes (choix de jeu, options) et la modale des joueurs.
 */

import { generateQRCodeSVG } from '../lib/qrcode.js';

export const STITCH_GAME_META = {
  Ho_One: {
    title: '501 / 301',
    categoryTag: 'Tournoi Officiel',
    badgeMain: 'Compétition',
    badgeSub: 'X01 Classic',
    glyphIcon: 'adjust',
    glyphCode: 'D-OUT',
    glow: 'neon',
    desc: 'Décompte à zéro avec finish double obligatoire'
  },
  Cricket: {
    title: 'CRICKET',
    categoryTag: 'Contrôle de Cible',
    badgeMain: 'Stratégie',
    badgeSub: '15 ➔ Bull',
    glyphIcon: 'grid_view',
    glyphCode: 'SLOTS',
    glow: 'cyan',
    desc: 'Fermez les zones 15 à 20 et le Bull avant les rivaux'
  },
  Practice: {
    title: 'THE CLOCK',
    categoryTag: 'Séquence & Précision',
    badgeMain: 'Entraînement',
    badgeSub: '1 ➔ 20',
    glyphIcon: 'timer',
    glyphCode: 'ROUNDS',
    glow: 'amber',
    desc: 'Validez chaque secteur dans l\'ordre de 1 à 20 sans faille'
  },
  '321_Zlip': {
    title: '321 ZLIP',
    categoryTag: 'Calcul & Pièges',
    badgeMain: 'Soirée / Fun',
    badgeSub: '321 Pile',
    glyphIcon: 'bolt',
    glyphCode: 'ZLIP',
    glow: 'neon',
    desc: 'Atteignez 321 pile : dépassement = retour à zéro !'
  },
  Kinito: {
    title: 'KINITO',
    categoryTag: 'Jeu d\'Ambiance',
    badgeMain: 'Bluff & Fun',
    badgeSub: 'Dés Virtuels',
    glyphIcon: 'casino',
    glyphCode: 'BLUFF',
    glow: 'cyan',
    desc: 'Bluffez vos adversaires avec les combinaisons de fléchettes'
  },
  By_Fives: {
    title: 'BY FIVES',
    categoryTag: 'Précision Chiffrée',
    badgeMain: 'Calcul Mental',
    badgeSub: 'Multiple de 5',
    glyphIcon: 'calculate',
    glyphCode: 'MULT-5',
    glow: 'amber',
    desc: 'Marquez uniquement si la volée est un multiple exact de 5'
  }
};

export class LobbyController {
  constructor(app) {
    this.app = app;
    this.lobbyStep = 1;
    this.pendingDeletePlayerName = null;
    this.configuringGameId = null;
  }

  goToLobbyStep(stepNum) {
    this.lobbyStep = 1;
    this.renderGamesGrid();
  }

  renderGamesGrid() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;

    const games = Array.isArray(this.app.games) ? this.app.games : [];

    grid.innerHTML = games
      .map(g => {
        const isSel = g.id === this.app.selectedGameId;
        const meta = STITCH_GAME_META[g.id] || {};
        const title = this.app.i18n?.t(`games.${g.id}.title`, {}, g.title || meta.title || g.id);
        const category = this.app.i18n?.t(`games.${g.id}.category`, {}, g.categoryTag || meta.categoryTag || g.category || 'Arcade');
        const badgeMain = g.badge || meta.badgeMain || this.app.i18n?.t('lobby.official_badge', {}, 'OFFICIEL');
        const glow = g.glow || meta.glow || 'neon';
        const subtitle = this.app.i18n?.t(`games.${g.id}.description`, {}, meta.desc || g.description || '');
        const hasSettings = Boolean(g.hasSettings);
        const hasVariants = Boolean(g.hasVariants && Array.isArray(g.variants) && g.variants.length > 0);
        const variantsJson = hasVariants ? JSON.stringify(g.variants) : '[]';

        return `
          <game-card
            game-id="${this.app.escapeHtml(g.id)}"
            title="${this.app.escapeHtml(title)}"
            category="${this.app.escapeHtml(category)}"
            badge-main="${this.app.escapeHtml(badgeMain)}"
            glow="${this.app.escapeHtml(glow)}"
            subtitle="${this.app.escapeHtml(subtitle)}"
            ${hasSettings ? 'has-settings' : ''}
            ${hasVariants ? 'has-variants' : ''}
            variants='${this.app.escapeHtml(variantsJson)}'
            ${isSel ? 'selected' : ''}
          ></game-card>
        `;
      })
      .join('');

    // Branchement des événements sur chaque <game-card>
    const allCards = grid.querySelectorAll('game-card');
    allCards.forEach(card => {
      // 1. Exclusivité du flip : quand une carte se retourne, refermer les autres
      card.addEventListener('card-flip', (e) => {
        if (e.detail?.isFlipped) {
          allCards.forEach(c => {
            if (c !== card && c.isFlipped) c.flip(false);
          });
        }
      });

      // 2. Changement de variante au dos de la carte
      card.addEventListener('game-variant-change', (e) => {
        const clickedId = e.detail?.gameId || card.getAttribute('game-id');
        this.app.selectedGameId = clickedId;
        this.app.audio?.playClick();

        // Synchroniser les options de variante dans customGameOptions
        if (!this.app.customGameOptions[clickedId]) {
          this.app.customGameOptions[clickedId] = {};
        }
        if (e.detail?.variantOptions) {
          Object.assign(this.app.customGameOptions[clickedId], e.detail.variantOptions);
        }

        // Mettre à jour l'état visuel de sélection sur les cartes
        allCards.forEach(c => {
          c.selected = (c.getAttribute('game-id') === clickedId);
        });

        this.updatePlayersSummaryUI();
      });

      // 3. Clic face avant : sélectionne la carte
      card.addEventListener('game-select', (e) => {
        const clickedId = e.detail?.gameId || card.getAttribute('game-id');
        this.app.selectedGameId = clickedId;
        this.app.audio?.playClick();

        // Synchroniser les options de variante si présentes
        if (e.detail?.variantOptions) {
          if (!this.app.customGameOptions[clickedId]) {
            this.app.customGameOptions[clickedId] = {};
          }
          Object.assign(this.app.customGameOptions[clickedId], e.detail.variantOptions);
        }

        allCards.forEach(c => {
          c.selected = (c.getAttribute('game-id') === clickedId);
        });

        this.updatePlayersSummaryUI();
      });

      // 4. Clic sur la roue crantée (Options)
      card.addEventListener('game-configure', (e) => {
        const clickedId = e.detail?.gameId || card.getAttribute('game-id');
        this.openGameOptionsModal(clickedId);
      });
    });

    this.updatePlayersSummaryUI();
  }

  openGameOptionsModal(gameId) {
    const games = Array.isArray(this.app.games) ? this.app.games : [];
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    this.configuringGameId = gameId;

    const modal = document.getElementById('modal-game-options');
    const titleEl = document.getElementById('modal-game-options-title');
    const form = document.getElementById('modal-game-options-form');

    const gTitle = this.app.i18n?.t(`games.${game.id}.title`, {}, game.title || game.id);
    if (titleEl) titleEl.textContent = `${this.app.i18n?.t('game_options.modal_title', {}, 'Options de Jeu')} — ${gTitle}`;

    if (!this.app.customGameOptions[game.id]) {
      this.app.customGameOptions[game.id] = {};
      for (const opt of game.options || []) {
        this.app.customGameOptions[game.id][opt.key] = opt.defaultValue;
      }
    }

    const optsValues = this.app.customGameOptions[game.id];
    const i18n = this.app.i18n;
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');

    const getOptMeta = (optKey) => {
      if (i18n) {
        const tag = i18n.has(`game_options.meta.${optKey}.tag`) ? i18n.t(`game_options.meta.${optKey}.tag`) : '';
        const desc = i18n.has(`game_options.meta.${optKey}.desc`) ? i18n.t(`game_options.meta.${optKey}.desc`) : '';
        if (tag || desc) return { tag, desc };
      }
      if (isEn) {
        const enFallback = {
          max_round: { tag: 'MATCH LIMIT', desc: 'Maximum number of rounds allowed' },
          double_out: { tag: 'WDF PRO', desc: 'Double ring checkout required to win' },
          double_in: { tag: 'START', desc: 'Scoring only begins after hitting a Double' },
          split_bull: { tag: 'TARGET', desc: 'Outer Bull at 25 pts / Double Bull inner core at 50 pts' },
          equal: { tag: 'EQUAL TURNS', desc: 'Same number of darts for all players (draw & catch-up)' }
        };
        if (enFallback[optKey]) return enFallback[optKey];
      }
      const frFallback = {
        max_round: { tag: 'LIMITE MATCH', desc: 'Nombre maximum de volées autorisées' },
        double_out: { tag: 'WDF PRO', desc: 'Clôture obligatoire par un anneau Double' },
        double_in: { tag: 'DÉPART', desc: 'Décompte actif seulement après un premier Double' },
        split_bull: { tag: 'CIBLE', desc: 'Bulle extérieure à 25 pts / Cœur Double Bull à 50 pts' },
        equal: { tag: 'ÉQUITÉ', desc: 'Même nombre de fléchettes pour tous les joueurs (rattrapage & match nul)' }
      };
      return frFallback[optKey] || { tag: '', desc: '' };
    };

    if (form) {
      if (!game.options || game.options.length === 0) {
        const emptyMsg = i18n ? i18n.t('game_options.empty_desc') : 'Ce jeu ne nécessite aucune configuration préalable.';
        form.innerHTML = `
          <div class="game-options-empty" data-i18n="game_options.empty_desc">
            ${this.app.escapeHtml(emptyMsg)}
          </div>
        `;
      } else {
        form.innerHTML = game.options.map(opt => {
          const val = optsValues[opt.key] ?? opt.defaultValue;
          const optMeta = getOptMeta(opt.key);
          const optLabel = i18n ? i18n.t(`games.${game.id}.options.${opt.key}`, {}, opt.label) : opt.label;
          const attrI18n = `label:games.${game.id}.options.${opt.key};tag:game_options.meta.${opt.key}.tag;desc:game_options.meta.${opt.key}.desc`;
          if (opt.type === 'boolean') {
            return `
              <hud-boolean-card
                label="${this.app.escapeHtml(optLabel)}"
                tag="${this.app.escapeHtml(optMeta.tag || '')}"
                desc="${this.app.escapeHtml(optMeta.desc || '')}"
                data-i18n-attr="${attrI18n}"
                opt-key="${opt.key}"
                ${Boolean(val) ? 'checked' : ''}
              ></hud-boolean-card>
            `;
          } else {
            let presets = [10, 15, 20, 25];
            return `
              <hud-stepper
                label="${this.app.escapeHtml(optLabel)}"
                tag="${this.app.escapeHtml(optMeta.tag || '')}"
                desc="${this.app.escapeHtml(optMeta.desc || '')}"
                data-i18n-attr="${attrI18n}"
                opt-key="${opt.key}"
                value="${val}"
                min="1"
                max="100"
                step="1"
                presets="${presets.join(',')}"
              ></hud-stepper>
            `;
          }
        }).join('');

        // Listeners sur les formulaires de la modale
        form.querySelectorAll('hud-boolean-card').forEach(card => {
          card.addEventListener('toggle-change', (e) => {
            const k = e.detail?.key || card.getAttribute('opt-key');
            const checked = Boolean(e.detail?.checked ?? e.detail?.value);
            this.app.customGameOptions[game.id][k] = checked;
          });
        });

        form.querySelectorAll('hud-stepper').forEach(stepper => {
          stepper.addEventListener('stepper-change', (e) => {
            const k = e.detail?.key || stepper.getAttribute('opt-key');
            const v = e.detail?.value;
            this.app.customGameOptions[game.id][k] = Number(v);
          });
        });
      }
    }

    modal?.classList.remove('hidden');
  }

  saveGameOptions() {
    const modal = document.getElementById('modal-game-options');
    modal?.classList.add('hidden');
    this.app.notify({
      title: 'OPTIONS ENREGISTRÉES',
      subtitle: 'La configuration du jeu a été mise à jour.',
      icon: 'check_circle',
      type: 'success'
    });
  }

  openRulesModal(gameId) {
    const games = Array.isArray(this.app.games) ? this.app.games : [];
    const game = games.find(g => g.id === (gameId || this.configuringGameId || this.app.selectedGameId)) || games[0];
    if (!game) return;

    const titleEl = document.getElementById('rules-modal-title');
    const descEl = document.getElementById('selected-game-desc');
    const modal = document.getElementById('modal-rules');

    const gTitle = this.app.i18n?.t(`games.${game.id}.title`, {}, game.title || game.id);
    const gDesc = this.app.i18n?.t(`games.${game.id}.description`, {}, game.description || 'Règles officielles de la partie.');

    if (titleEl) titleEl.textContent = `${this.app.i18n?.t('rules.modal_title', {}, 'Règles du jeu')} — ${gTitle}`;
    if (descEl) descEl.textContent = gDesc;

    modal?.classList.remove('hidden');
  }

  launchMatch(gameId, extraOptions = {}) {
    const games = Array.isArray(this.app.games) ? this.app.games : [];
    const activeGame = games.find(g => g.id === gameId) || games[0];
    if (!activeGame) return;

    if (!Array.isArray(this.app.players) || this.app.players.length === 0) {
      this.app.notify({
        title: 'AUCUN JOUEUR',
        subtitle: 'Veuillez inscrire au moins un joueur avant de lancer la partie.',
        icon: 'group_off',
        type: 'danger'
      });
      this.openPlayersModal();
      return;
    }

    const savedOpts = this.app.customGameOptions[activeGame.id] || {};
    const gameOpts = { ...savedOpts, ...extraOptions };

    fetch('/api/match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: activeGame.id,
        players: this.app.players,
        options: gameOpts
      })
    }).catch(err => {
      this.app.notify({
        title: 'ERREUR DÉMARRAGE',
        subtitle: err.message,
        icon: 'error',
        type: 'danger'
      });
    });
  }

  updatePlayersSummaryUI() {
    const topCount = document.getElementById('topbar-players-count');
    if (topCount) {
      topCount.textContent = String(this.app.players.length);
    }

    // Mise à jour du récapitulatif dans le footer fixe du lobby
    const games = Array.isArray(this.app.games) ? this.app.games : [];
    const selectedGame = games.find(g => g.id === this.app.selectedGameId) || games[0];
    if (selectedGame) {
      const meta = STITCH_GAME_META[selectedGame.id] || {};
      const iconEl = document.getElementById('footer-game-icon');
      const catEl = document.getElementById('footer-game-category');
      const titleEl = document.getElementById('footer-game-title');

      if (iconEl) iconEl.textContent = selectedGame.glyphIcon || meta.glyphIcon || 'sports_score';

      const pCount = this.app.players.length;
      const pText = this.app.i18n
        ? (pCount > 1
            ? this.app.i18n.t('players.player_count', { count: pCount })
            : this.app.i18n.t('players.player_count_singular'))
        : `${pCount} JOUEUR${pCount > 1 ? 'S' : ''}`;
      const catText = selectedGame.category || meta.categoryTag || 'ARCADE';

      const cardEl = document.querySelector(`game-card[game-id="${selectedGame.id}"]`);
      const curVarObj = cardEl?._getCurrentVariantObj?.();
      const displayTitle = (selectedGame.hasVariants && curVarObj?.title)
        ? curVarObj.title
        : (selectedGame.title || selectedGame.id);

      if (catEl) catEl.textContent = `${catText} • ${pText}`;
      if (titleEl) titleEl.textContent = displayTitle;
    }

    const list = document.getElementById('step2-players-summary-list');
    if (!list) return;

    list.innerHTML = this.app.players
      .map((name, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === this.app.players.length - 1;
        return `
          <div class="player-slot-row" data-player-name="${this.app.escapeHtml(name)}">
            <span class="player-slot-num">0${idx + 1}</span>
            <div class="player-slot-avatar">
              <span class="material-symbols-outlined">person</span>
            </div>
            <span class="player-slot-name">${this.app.escapeHtml(name)}</span>
            <div class="player-slot-actions">
              <button type="button" class="player-reorder-btn btn-player-up" ${isFirst ? 'disabled' : ''} aria-label="Monter ${this.app.escapeHtml(name)}">
                <span class="material-symbols-outlined">arrow_upward</span>
              </button>
              <button type="button" class="player-reorder-btn btn-player-down" ${isLast ? 'disabled' : ''} aria-label="Descendre ${this.app.escapeHtml(name)}">
                <span class="material-symbols-outlined">arrow_downward</span>
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    list.querySelectorAll('.player-slot-row').forEach((row, idx) => {
      row.querySelector('.btn-player-up')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = this.app.players[idx];
          this.app.players[idx] = this.app.players[idx - 1];
          this.app.players[idx - 1] = temp;
          this.persistPlayersState();
          this.renderPlayersModal();
        }
      });

      row.querySelector('.btn-player-down')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx < this.app.players.length - 1) {
          const temp = this.app.players[idx];
          this.app.players[idx] = this.app.players[idx + 1];
          this.app.players[idx + 1] = temp;
          this.persistPlayersState();
          this.renderPlayersModal();
        }
      });
    });
  }

  applyPlayersData(playersData) {
    if (!playersData) return;
    if (Array.isArray(playersData.activePlayers) && playersData.activePlayers.length > 0) {
      this.app.players = playersData.activePlayers;
    }
    if (Array.isArray(playersData.knownPlayers) && playersData.knownPlayers.length > 0) {
      this.app.knownPlayers = playersData.knownPlayers;
    }
    if (playersData.selectedGame && STITCH_GAME_META[playersData.selectedGame]) {
      this.app.selectedGameId = playersData.selectedGame;
    }
    if (Array.isArray(playersData.stats)) {
      this.app.playersStatsMap.clear();
      for (const st of playersData.stats) {
        if (st && st.name) {
          this.app.playersStatsMap.set(st.name.toLowerCase(), st);
        }
      }
    }
    this.updatePlayersSummaryUI();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dartotron-players-updated', { detail: playersData }));
    }
  }

  async persistPlayersState() {
    this.updatePlayersSummaryUI();
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePlayers: this.app.players,
          knownPlayers: this.app.knownPlayers
        })
      });
      const data = await res.json();
      this.applyPlayersData(data);
    } catch {
      // ignore
    }
  }

  async openPlayersModal() {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      this.applyPlayersData(data);
    } catch {
      // ignore
    }
    this.renderPlayersModal();
    document.getElementById('modal-players')?.classList.remove('hidden');
    return true;
  }

  closePlayersModal() {
    document.getElementById('modal-players').classList.add('hidden');
    this.updatePlayersSummaryUI();
    return true;
  }

  togglePlayerSelection(name) {
    const idx = this.app.players.indexOf(name);
    if (idx !== -1) {
      if (this.app.players.length <= 1) return;
      this.app.players.splice(idx, 1);
    } else {
      this.app.players.push(name);
    }
    this.renderPlayersModal();
    this.persistPlayersState();
  }

  renderPlayersModal() {
    this.updatePlayersSummaryUI();
    const activeCount = this.app.players.length;

    const badgeEl = document.getElementById('players-active-badge');
    if (badgeEl) {
      badgeEl.textContent = this.app.i18n
        ? (activeCount > 1
            ? this.app.i18n.t('players.active_badge', { count: activeCount })
            : this.app.i18n.t('players.active_badge_singular'))
        : `${activeCount} ACTIF${activeCount > 1 ? 'S' : ''}`;
      badgeEl.classList.remove('empty');
    }

    const btnShuffle = document.getElementById('btn-shuffle-players');
    if (btnShuffle) {
      btnShuffle.disabled = activeCount <= 1;
    }

    const grid = document.getElementById('players-select-grid');
    if (!grid) return;

    grid.innerHTML = this.app.knownPlayers
      .map(name => {
        const activeIdx = this.app.players.indexOf(name);
        const isSelected = activeIdx !== -1;
        const isLastActive = isSelected && activeCount === 1;
        const slotText = isSelected ? String(activeIdx + 1) : '+';

        const st = this.app.playersStatsMap.get(name.toLowerCase()) || {};
        const rawAvg = Number(st.avg3DAllTime ?? st.avgPPR ?? 0);
        let avgLabel = '—';
        if (rawAvg > 0) {
          const roundedFloor5 = Math.floor(rawAvg / 5) * 5;
          avgLabel = `${roundedFloor5}+`;
        }

        return `
          <player-select-card
            player-name="${this.app.escapeHtml(name)}"
            order="${this.app.escapeHtml(slotText)}"
            stat="${this.app.escapeHtml(avgLabel)}"
            ${isSelected ? 'selected' : ''}
            ${isLastActive ? 'disable-delete' : ''}
          ></player-select-card>
        `;
      })
      .join('');

    grid.querySelectorAll('player-select-card').forEach(card => {
      card.addEventListener('player-toggle', (e) => {
        const name = e.detail?.playerName || card.getAttribute('player-name');
        this.togglePlayerSelection(name);
      });

      card.addEventListener('player-stats', (e) => {
        const name = e.detail?.playerName || card.getAttribute('player-name');
        document.getElementById('modal-players').classList.add('hidden');
        this.app.settingsController?.openRecordsModal?.('player', name);
      });

      card.addEventListener('player-rename', (e) => {
        const oldName = e.detail?.playerName || card.getAttribute('player-name');
        this.promptRenamePlayer(oldName);
      });

      card.addEventListener('player-delete', (e) => {
        const name = e.detail?.playerName || card.getAttribute('player-name');
        if (this.app.players.length === 1 && this.app.players.includes(name)) return;
        this.pendingDeletePlayerName = name;
        document.getElementById('delete-player-modal-name').textContent = name;
        document.getElementById('modal-confirm-delete-player').classList.remove('hidden');
      });
    });
  }

  promptRenamePlayer(oldName) {
    if (!oldName) return;
    const title = this.app.i18n
      ? this.app.i18n.t('players.rename_title', { name: oldName })
      : `RENOMMER « ${oldName} »`;
    this.app.vk.open({
      title,
      initialValue: oldName,
      maxLength: 16,
      onConfirm: async (newName) => {
        const clean = String(newName || '').trim();
        if (!clean || clean === oldName) return;

        try {
          const res = await fetch('/api/players/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName: clean })
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            this.app.notify({
              title: 'ERREUR',
              subtitle: data.error || 'Erreur lors du renommage',
              icon: 'error',
              type: 'danger'
            });
            return;
          }
          this.app.knownPlayers = this.app.knownPlayers.map(p => p.toLowerCase() === oldName.toLowerCase() ? clean : p);
          this.app.players = this.app.players.map(p => p.toLowerCase() === oldName.toLowerCase() ? clean : p);
          this.applyPlayersData(data);
          this.renderPlayersModal();
          this.app.notify({
            title: 'JOUEUR RENOMMÉ',
            subtitle: `« ${oldName} » devient « ${clean} »`,
            icon: 'badge',
            type: 'info'
          });
        } catch {
          this.app.notify({
            title: 'ERREUR',
            subtitle: 'Erreur lors du renommage',
            icon: 'error',
            type: 'danger'
          });
        }
      }
    });
  }

  async confirmDeletePlayer() {
    const target = this.pendingDeletePlayerName;
    document.getElementById('modal-confirm-delete-player').classList.add('hidden');
    this.pendingDeletePlayerName = null;
    if (!target) return;

    try {
      const res = await fetch('/api/players/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        this.app.notify({
          title: 'ERREUR',
          subtitle: data.error || 'Erreur suppression joueur',
          icon: 'error',
          type: 'danger'
        });
        return;
      }
      this.app.knownPlayers = this.app.knownPlayers.filter(p => p.toLowerCase() !== target.toLowerCase());
      this.app.players = this.app.players.filter(p => p.toLowerCase() !== target.toLowerCase());
      this.applyPlayersData(data);
      this.renderPlayersModal();
      this.app.notify({
        title: 'JOUEUR SUPPRIMÉ',
        subtitle: `« ${target} » et ses statistiques ont été effacés`,
        icon: 'delete',
        type: 'info'
      });
    } catch {
      this.app.notify({
        title: 'ERREUR',
        subtitle: 'Erreur lors de la suppression',
        icon: 'error',
        type: 'danger'
      });
    }
  }

  openCompanionQrModal() {
    let url = this.app.companionUrl;
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        url = `${window.location.protocol}//${host}${port}/companion`;
      } else if (this.app.localIp && this.app.localIp !== '127.0.0.1') {
        const effectivePort = window.location.port ? `:${window.location.port}` : ':8180';
        url = `${window.location.protocol}//${this.app.localIp}${effectivePort}/companion`;
      }
    }
    if (!url) {
      url = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}/companion`
        : 'http://localhost:8180/companion';
    }

    const container = document.getElementById('companion-qr-container');
    if (container) {
      container.innerHTML = generateQRCodeSVG(url, {
        color: '#4cd7f6',
        background: '#060a12',
        margin: 2
      });
    }

    document.getElementById('modal-companion-qr')?.classList.remove('hidden');
  }

  bindEvents() {
    document.getElementById('btn-lobby-qr')?.addEventListener('click', () => this.openCompanionQrModal());

    // Fermer toute carte retournée lors d'un clic en dehors
    document.addEventListener('click', (e) => {
      if (!e.target.closest('game-card')) {
        document.querySelectorAll('game-card').forEach(c => {
          if (c.isFlipped) c.flip(false);
        });
      }
    });

    document.getElementById('btn-modal-open-rules')?.addEventListener('click', () => this.openRulesModal());
    document.getElementById('btn-save-game-options')?.addEventListener('click', () => this.saveGameOptions());
    document.getElementById('btn-open-rules')?.addEventListener('click', () => this.openRulesModal());
    document.getElementById('btn-open-players')?.addEventListener('click', () => this.openPlayersModal());

    document.getElementById('btn-new-player-vk')?.addEventListener('click', () => {
      const title = this.app.i18n
        ? this.app.i18n.t('players.new_player_title')
        : 'NOM DU NOUVEAU JOUEUR';
      this.app.vk.open({
        title,
        initialValue: '',
        maxLength: 16,
        onConfirm: async (newName) => {
          const clean = String(newName || '').trim();
          if (!clean) return;
          if (!this.app.knownPlayers.includes(clean)) {
            this.app.knownPlayers.push(clean);
          }
          if (!this.app.players.includes(clean)) {
            this.app.players.push(clean);
          }
          await this.persistPlayersState();
          this.renderPlayersModal();
        }
      });
    });

    document.getElementById('btn-close-players-modal')?.addEventListener('click', () => this.closePlayersModal());
    document.getElementById('btn-validate-players')?.addEventListener('click', () => this.closePlayersModal());
    document.getElementById('modal-players')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-players') this.closePlayersModal();
    });

    document.getElementById('btn-cancel-delete-player')?.addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-player').classList.add('hidden');
      this.pendingDeletePlayerName = null;
    });
    document.getElementById('btn-confirm-delete-player')?.addEventListener('click', () => this.confirmDeletePlayer());

    document.getElementById('btn-shuffle-players')?.addEventListener('click', () => {
      for (let i = this.app.players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.app.players[i], this.app.players[j]] = [this.app.players[j], this.app.players[i]];
      }
      this.persistPlayersState();
      this.renderPlayersModal();
    });

    const launchMatchHandler = () => {
      const games = Array.isArray(this.app.games) ? this.app.games : [];
      const activeGame = games.find(g => g.id === this.app.selectedGameId) || games[0];
      if (!activeGame) return;

      if (!Array.isArray(this.app.players) || this.app.players.length === 0) {
        this.app.notify({
          title: 'AUCUN JOUEUR',
          subtitle: 'Veuillez inscrire au moins un joueur avant de lancer la partie.',
          icon: 'group_off',
          type: 'danger'
        });
        this.openPlayersModal();
        return;
      }

      // Synchroniser les options de la variante active sélectionnée
      const cardEl = document.querySelector(`game-card[game-id="${activeGame.id}"]`);
      const curVarObj = cardEl?._getCurrentVariantObj?.();
      const variantOpts = curVarObj?.options || {};
      const savedOpts = this.app.customGameOptions[activeGame.id] || {};
      const gameOpts = { ...savedOpts, ...variantOpts };

      fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGame.id,
          players: this.app.players,
          options: gameOpts
        })
      }).catch(err => {
        this.app.notify({
          title: 'ERREUR DÉMARRAGE',
          subtitle: err.message,
          icon: 'error',
          type: 'danger'
        });
      });
    };

    document.getElementById('btn-start-match')?.addEventListener('click', launchMatchHandler);
    document.getElementById('btn-launch-game')?.addEventListener('click', launchMatchHandler);

    window.addEventListener('i18n:change', () => {
      this.updatePlayersSummaryUI();
      if (!document.getElementById('modal-players')?.classList.contains('hidden')) {
        this.renderPlayersModal();
      }
      if (!document.getElementById('modal-game-options')?.classList.contains('hidden')) {
        const games = Array.isArray(this.app.games) ? this.app.games : [];
        const activeGame = games.find(g => g.id === this.configuringGameId) || games.find(g => g.id === this.app.selectedGameId) || games[0];
        if (activeGame) this.openGameOptionsModal(activeGame);
      }
    });
  }
}

