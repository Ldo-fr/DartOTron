/**
 * Contrôleur Match & HUD en Direct DartOTron (public/js/modules/MatchController.js)
 * Gère l'affichage dynamique du jeu, les scoreboards X01/Cricket/Générique, les animations et la victoire.
 */

export class MatchController {
  constructor(app) {
    this.app = app;
    this.lastDisplayedHitId = null;
    this.hitAnimTimeout = null;
    this.delayedAnnouncementTimer = null;
    this.delayedFinishedTimer = null;
  }

  applyMatchState(state) {
    this.app.matchState = state;

    if (state.status !== 'waiting_player' && this.delayedAnnouncementTimer) {
      clearTimeout(this.delayedAnnouncementTimer);
      this.delayedAnnouncementTimer = null;
    }
    if (state.status !== 'finished' && this.delayedFinishedTimer) {
      clearTimeout(this.delayedFinishedTimer);
      this.delayedFinishedTimer = null;
    }

    // Détection d'un nouvel impact de fléchette
    let isNewHit = false;
    if (state.lastHit && state.lastHit.id && state.lastHit.id !== this.lastDisplayedHitId) {
      this.lastDisplayedHitId = state.lastHit.id;
      if (state.status === 'playing' || state.status === 'waiting_player' || state.status === 'finished') {
        this.showHitAnimation(state.lastHit.key, state);
        isNewHit = true;
      }
    }

    // Événements sonores et vocaux
    if (Array.isArray(state.events)) {
      for (const ev of state.events) {
        if (ev.type === 'sound') {
          if (ev.name !== 'victory') {
            this.app.audio.playSound(ev.name);
          }
        } else if (ev.type === 'speech') {
          this.app.audio.speak(ev.text, ev.delay || 0);
        }
      }
    }

    // Gestion des messages ("Retirez les flèches")
    const messageEvent = Array.isArray(state.events) ? state.events.find(e => e.type === 'message') : null;

    if (messageEvent && state.status === 'waiting_player') {
      const showMsg = () => {
        this.delayedAnnouncementTimer = null;
        const bottomBar = document.querySelector('.game-bottom-bar-stitch');
        if (bottomBar && this.app.matchState?.status === 'waiting_player') {
          bottomBar.classList.add('is-waiting-player');
        }
        this.app.showAnnouncement(
          messageEvent.text,
          messageEvent.duration !== undefined ? messageEvent.duration : 1600,
          messageEvent.color || null
        );
      };

      if (isNewHit || this.hitAnimTimeout || this.delayedAnnouncementTimer) {
        // Temporisation de 1.2s : laisse l'animation d'impact de fléchette se terminer au centre avant d'afficher "Retirez les flèches"
        if (!this.delayedAnnouncementTimer) {
          this.delayedAnnouncementTimer = setTimeout(showMsg, 1200);
        }
      } else if (!this.delayedAnnouncementTimer) {
        showMsg();
      }
    } else if (state.status === 'playing') {
      this.app.hideAnnouncement();
    }

    if (state.status === 'lobby') {
      this.hideHitAnimation();
      this.app.hideAnnouncement();
      this.app.switchView('view-lobby');
      this.app.lobbyController?.goToLobbyStep(1);
      return;
    }

    if (state.status === 'finished') {
      this.app.hideAnnouncement();

      // En cas d'interruption (GAMEBUTTON ou abandon HUD), retourner directement au lobby
      if (state.endReason === 'interrupted') {
        if (this.delayedFinishedTimer) {
          clearTimeout(this.delayedFinishedTimer);
          this.delayedFinishedTimer = null;
        }
        this.hideHitAnimation();
        this.app.switchView('view-lobby');
        this.app.lobbyController?.goToLobbyStep(1);
        this.app.notify({
          title: this.app.i18n ? this.app.i18n.t('match.interrupted_title') : 'PARTIE INTERROMPUE',
          subtitle: this.app.i18n ? this.app.i18n.t('match.interrupted_subtitle') : 'Retour au menu principal',
          icon: 'cancel',
          type: 'warning',
          duration: 3000
        });
        // S'assurer que le moteur serveur bascule en mode lobby
        fetch('/api/match/lobby', { method: 'POST' }).catch(() => {});
        return;
      }

      const showFinished = () => {
        this.delayedFinishedTimer = null;
        this.hideHitAnimation();
        this.renderFinishedView(state);
        this.app.switchView('view-finished');
        if (state.winner) {
          this.app.audio.playSound('victory');
        }
      };

      if (isNewHit || this.hitAnimTimeout || this.delayedFinishedTimer) {
        if (!this.delayedFinishedTimer) {
          this.delayedFinishedTimer = setTimeout(showFinished, 1200);
        }
      } else if (!this.delayedFinishedTimer) {
        showFinished();
      }
      return;
    }

    this.app.switchView('view-game');
    this.renderInGameView(state);
  }

  getCheckoutGuide(score) {
    if (score < 2 || score > 170) return null;
    const CHECKOUTS = {
      170: 'T20 • T20 • Bull', 167: 'T20 • T19 • Bull', 164: 'T20 • T18 • Bull', 161: 'T20 • T17 • Bull',
      160: 'T20 • T20 • D20', 158: 'T20 • T20 • D19', 157: 'T20 • T19 • D20', 156: 'T20 • T20 • D18',
      155: 'T20 • T19 • D19', 154: 'T20 • T18 • D20', 153: 'T20 • T19 • D18', 152: 'T20 • T20 • D16',
      151: 'T20 • T17 • D20', 150: 'T20 • T18 • D18', 149: 'T20 • T19 • D16', 148: 'T20 • T20 • D14',
      147: 'T20 • T17 • D18', 146: 'T20 • T18 • D16', 145: 'T20 • T19 • D14', 144: 'T20 • T20 • D12',
      143: 'T20 • T17 • D16', 142: 'T20 • T14 • D20', 141: 'T20 • T19 • D12', 140: 'T20 • T20 • D10',
      139: 'T20 • T13 • D20', 138: 'T20 • T18 • D12', 137: 'T20 • T19 • D10', 136: 'T20 • T20 • D8',
      135: 'T20 • T17 • D12', 134: 'T20 • T14 • D16', 133: 'T20 • T19 • D8', 132: 'T20 • T16 • D12',
      131: 'T20 • T13 • D16', 130: 'T20 • T18 • D8', 129: 'T19 • T20 • D6', 128: 'T18 • T14 • D16',
      127: 'T20 • T17 • D8', 126: 'T19 • T19 • D6', 125: '25 • T20 • D20', 124: 'T20 • T16 • D8',
      123: 'T19 • T16 • D9', 122: 'T18 • T20 • D4', 121: 'T20 • T15 • D8', 120: 'T20 • 20 • D20',
      119: 'T19 • T10 • D16', 118: 'T20 • 18 • D20', 117: 'T20 • 17 • D20', 116: 'T20 • 16 • D20',
      115: 'T20 • 15 • D20', 114: 'T20 • 14 • D20', 113: 'T19 • 16 • D20', 112: 'T20 • 20 • D16',
      111: 'T20 • 19 • D16', 110: 'T20 • 18 • D16', 109: 'T20 • 17 • D16', 108: 'T20 • 16 • D16',
      107: 'T19 • 18 • D16', 106: 'T20 • 14 • D16', 105: 'T20 • 13 • D16', 104: 'T18 • 18 • D16',
      103: 'T20 • 11 • D16', 102: 'T20 • 10 • D16', 101: 'T17 • 18 • D16', 100: 'T20 • D20',
      99: 'T19 • 10 • D16', 98: 'T20 • D19', 97: 'T19 • D20', 96: 'T20 • D18', 95: 'T19 • D19',
      94: 'T18 • D20', 93: 'T19 • D18', 92: 'T20 • D16', 91: 'T17 • D20', 90: 'T18 • D18',
      89: 'T19 • D16', 88: 'T16 • D20', 87: 'T17 • D18', 86: 'T18 • D16', 85: 'T15 • D20',
      84: 'T20 • D12', 83: 'T17 • D16', 82: 'Bull • D16', 81: 'T15 • D18', 80: 'T20 • D10',
      79: 'T13 • D20', 78: 'T18 • D12', 77: 'T15 • D16', 76: 'T20 • D8', 75: 'T17 • D12',
      74: 'T14 • D16', 73: 'T19 • D8', 72: 'T16 • D12', 71: 'T13 • D16', 70: 'T18 • D8',
      69: 'T15 • D12', 68: 'T16 • D10', 67: 'T17 • D8', 66: 'T10 • D18', 65: '25 • D20',
      64: 'T16 • D8', 63: 'T13 • D12', 62: 'T10 • D16', 61: 'T15 • D8', 60: '20 • D20',
      59: '19 • D20', 58: '18 • D20', 57: '17 • D20', 56: '16 • D20', 55: '15 • D20',
      54: '14 • D20', 53: '13 • D20', 52: '12 • D20', 51: '11 • D20', 50: 'Bull',
      49: '9 • D20', 48: '16 • D16', 47: '15 • D16', 46: '14 • D16', 45: '13 • D16',
      44: '12 • D16', 43: '11 • D16', 42: '10 • D16', 41: '9 • D16', 40: 'D20',
      38: 'D19', 36: 'D18', 34: 'D17', 32: 'D16', 30: 'D15', 28: 'D14', 26: 'D13',
      24: 'D12', 22: 'D11', 20: 'D10', 18: 'D9', 16: 'D8', 14: 'D7', 12: 'D6',
      10: 'D5', 8: 'D4', 6: 'D3', 4: 'D2', 2: 'D1'
    };
    if (CHECKOUTS[score]) return CHECKOUTS[score];
    if (score % 2 === 0 && score <= 40) return `D${score / 2}`;
    if (score <= 40) return `${score - 32 > 0 ? (score - 32) + ' • D16' : '1 • D' + Math.floor((score - 1) / 2)}`;
    return null;
  }

  renderInGameView(state) {
    const isX01 = state.gameId === 'Ho_One';
    const isCricket = state.gameId === 'Cricket';

    const seriesEl = document.getElementById('hud-series-label');
    if (seriesEl) {
      const sKey = isX01 ? 'match.series_x01' : (isCricket ? 'match.series_cricket' : 'match.series_arcade');
      seriesEl.textContent = this.app.i18n ? this.app.i18n.t(sKey) : (isX01 ? 'X01 SÉRIE PRO' : (isCricket ? 'CRICKET PRO' : 'ARCADE PRO'));
    }

    const titleEl = document.getElementById('hud-game-title');
    if (titleEl) titleEl.textContent = state.gameTitle || state.gameId;

    const roundEl = document.getElementById('hud-round');
    if (roundEl) {
      roundEl.innerHTML = `${String(state.actualround).padStart(2, '0')}<span class="hud-round-max"> / ${state.maxround}</span>`;
    }

    const histEl = document.getElementById('hud-round-history');
    if (histEl) {
      const history = state.roundHistory || [];
      const totalSlots = state.nbdarts || 3;
      let slotsHtml = '';
      for (let i = 0; i < totalSlots; i++) {
        if (i < history.length) {
          const hit = String(history[i]);
          const up = hit.toUpperCase();
          let variant = 'is-gold';
          if (up === 'MISS' || up === '0') variant = 'is-miss';
          else if (up.startsWith('T') || up === 'DB' || up === 'SB' || up === 'BULL') variant = 'is-neon';
          else if (up.startsWith('D')) variant = 'is-gold';
          slotsHtml += `<div class="hud-impact-pill ${variant}">${this.app.escapeHtml(hit)}</div>`;
        } else if (i === history.length && state.status === 'playing') {
          slotsHtml += `<div class="hud-impact-pill is-empty">-</div>`;
        } else {
          slotsHtml += `<div class="hud-impact-pill is-empty opacity-40">-</div>`;
        }
      }
      histEl.innerHTML = slotsHtml;
    }

    const ammoContainer = document.getElementById('hud-darts-icons');
    if (ammoContainer) {
      const nbdarts = state.nbdarts || 3;
      const rem = state.remainingDarts ?? 3;
      let ammoHtml = '';
      for (let i = 0; i < nbdarts; i++) {
        const isSpent = i >= rem;
        ammoHtml += `
          <div class="hud-ammo-icon ${isSpent ? 'spent' : 'active'}">
            <span class="material-symbols-outlined">navigation</span>
          </div>
        `;
      }
      ammoContainer.innerHTML = ammoHtml;
    }

    const missSub = document.getElementById('hud-miss-sub');
    if (missSub) {
      const penalty = Number(state.missPenalty || 0);
      missSub.textContent = penalty > 0
        ? (this.app.i18n ? this.app.i18n.t('match.miss_penalty', { penalty }) : `PÉNALITÉ (+${penalty} PTS)`)
        : (this.app.i18n ? this.app.i18n.t('match.miss_sub') : 'HORS CIBLE (0 PT)');
    }

    const nextBtn = document.getElementById('btn-game-next');
    const nextMain = document.getElementById('btn-game-next-main');
    const nextSub = document.getElementById('btn-game-next-sub');
    const bottomBar = document.querySelector('.game-bottom-bar-stitch');
    const isSolo = state.players && state.players.length === 1;
    const isWaiting = state.status === 'waiting_player';

    if (bottomBar) {
      bottomBar.classList.toggle('is-waiting-player', isWaiting && !this.delayedAnnouncementTimer);
    }

    if (nextBtn) {
      const nextPlayerText = isSolo
        ? (this.app.i18n ? this.app.i18n.t('match.next_turn') : 'TOUR SUIVANT')
        : (this.app.i18n ? this.app.i18n.t('match.next_player') : 'JOUEUR SUIVANT');
      if (isWaiting) {
        nextBtn.classList.add('is-waiting-next');
        if (nextSub) nextSub.textContent = this.app.i18n ? this.app.i18n.t('match.ready_to_throw') : 'PRÊT À LANCER';
        if (nextMain) nextMain.textContent = nextPlayerText;
      } else {
        nextBtn.classList.remove('is-waiting-next');
        if (nextSub) nextSub.textContent = this.app.i18n ? this.app.i18n.t('match.validate_turn') : 'VALIDER TOUR';
        if (nextMain) nextMain.textContent = nextPlayerText;
      }
    }

    const boardContainer = document.getElementById('game-board-container');
    if (isX01) {
      this.renderX01Scoreboard(state, boardContainer);
    } else if (isCricket) {
      this.renderCricketScoreboard(state, boardContainer);
    } else {
      this.renderGenericScoreboard(state, boardContainer);
    }
  }

  renderX01Scoreboard(state, container = document.getElementById('game-board-container')) {
    if (!container) return;
    let el = container.querySelector('scoreboard-x01');
    if (!el) {
      container.innerHTML = '<scoreboard-x01></scoreboard-x01>';
      el = container.querySelector('scoreboard-x01');
    }
    el.state = state;
  }

  renderCricketScoreboard(state, container = document.getElementById('game-board-container')) {
    if (!container) return;
    let el = container.querySelector('scoreboard-cricket');
    if (!el) {
      container.innerHTML = '<scoreboard-cricket></scoreboard-cricket>';
      el = container.querySelector('scoreboard-cricket');
    }
    el.state = state;
  }

  renderGenericScoreboard(state, container = document.getElementById('game-board-container')) {
    if (!container) return;
    let table = document.getElementById('scoreboard-table');
    if (!table) {
      container.innerHTML = `
        <table class="game-board-table" id="scoreboard-table">
          <thead id="scoreboard-thead"></thead>
          <tbody id="scoreboard-tbody"></tbody>
        </table>
      `;
    }
    const thead = document.getElementById('scoreboard-thead');
    const tbody = document.getElementById('scoreboard-tbody');
    if (!thead || !tbody) return;

    const rawHeaders = state.headers || [];
    const validColIndices = [];
    rawHeaders.forEach((h, idx) => {
      const trimmed = String(h ?? '').trim();
      if (trimmed && trimmed !== '-') {
        validColIndices.push(idx);
      }
    });

    const i18n = this.app.i18n;
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    const thPlayer = i18n ? i18n.t('match.th_player') : (isEn ? 'PLAYER' : 'JOUEUR');
    const thScore = i18n ? i18n.t('match.th_score') : 'SCORE';

    thead.innerHTML = `
      <tr>
        <th class="th-player">
          <span class="material-symbols-outlined header-player-icon">sports_score</span>
          <span data-i18n="match.th_player">${thPlayer}</span>
        </th>
        ${validColIndices.map(colIdx => `<th class="th-stat">${this.app.escapeHtml(String(rawHeaders[colIdx]))}</th>`).join('')}
        <th class="th-score" data-i18n="match.th_score">${thScore}</th>
      </tr>
    `;

    tbody.innerHTML = state.players
      .map((p, idx) => {
        const isActive = idx === state.actualplayer;

        const colsHtml = validColIndices
          .map(colIdx => `
            <td class="td-stat">
              <div class="stat-cell-wrap">
                <span class="generic-cell-value">
                  ${this.formatScoreboardCell(p.columns?.[colIdx])}
                </span>
              </div>
            </td>
          `)
          .join('');

        return `
          <tr class="${isActive ? 'is-active' : 'is-inactive'}">
            <td class="td-player">
              <div class="player-identity-wrap">
                <span class="player-num-badge">${idx + 1}</span>
                <span class="player-name-text">${this.app.escapeHtml(p.PlayerName)}</span>
              </div>
            </td>
            ${colsHtml}
            <td class="td-score">
              <div class="score-cell-wrap">
                <span class="player-score-giant">${p.score}</span>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  formatScoreboardCell(cell) {
    if (!cell || cell.value === null || cell.value === undefined || cell.value === '') {
      return '';
    }
    const { value, type, color } = cell;

    if (type === 'led') {
      const count = Math.min(3, Math.max(0, Number(value) || 0));
      if (count === 0) return '';
      return count >= 3 ? 'FERMÉ' : `${count}/3`;
    }

    let colorClass = '';
    if (color === 'green') colorClass = 'text-neon';
    else if (color === 'yellow') colorClass = 'text-amber';
    else if (color === 'red') colorClass = 'text-crimson';
    else if (color === 'purple') colorClass = 'text-purple';
    else if (color) colorClass = `text-${this.app.escapeHtml(String(color))}`;

    if (colorClass) {
      return `<span class="${colorClass}">${this.app.escapeHtml(String(value))}</span>`;
    }

    return this.app.escapeHtml(String(value));
  }

  renderFinishedView(state) {
    const titleEl = document.getElementById('finished-title');
    const statusEl = document.getElementById('finished-match-status');
    const winnerEl = document.getElementById('finished-winner-name');
    const summaryEl = document.getElementById('finished-winner-summary');
    const detailsEl = document.getElementById('finished-winner-details');

    const winner = state.winner;
    const winnerPlayer = winner
      ? (state.players || []).find(p => p.ident === winner.ident) || null
      : null;

    const actualround = state.actualround || 1;
    const isX01 = String(state.gameId || '').includes('Ho_One') || Boolean(state.gameOptions?.startingat);
    const isCricket = String(state.gameId || '').toLowerCase().includes('cricket');

    if (winner) {
      if (titleEl) {
        titleEl.textContent = this.app.i18n ? this.app.i18n.t('finished.victory_badge') : 'VICTOIRE';
        titleEl.className = 'badge-victory-stitch';
      }
      if (statusEl) {
        statusEl.textContent = this.app.i18n ? this.app.i18n.t('finished.match_end_badge') : '• FIN DE PARTIE';
      }
      if (winnerEl) {
        winnerEl.textContent = winner.PlayerName || 'VAINQUEUR';
        winnerEl.className = 'finished-winner-name text-neon';
      }

      const dartsThrown = winnerPlayer?.dartsthrown || (actualround * (state.nbdarts || 3));
      const totalPts = Number(winnerPlayer?.TotalPoints ?? winnerPlayer?.score ?? 0);

      if (summaryEl) {
        summaryEl.innerHTML = `en <span class="highlight-amber">${actualround} tour${actualround > 1 ? 's' : ''}</span> avec <span class="highlight-cyan">${totalPts} points</span>`;
      }

      if (detailsEl) {
        if (isX01) {
          const ppd = dartsThrown > 0 ? (totalPts / dartsThrown).toFixed(1) : '0.0';
          const ppr = Number(winnerPlayer?.scorePerRound) > 0 ? Number(winnerPlayer.scorePerRound).toFixed(1) : (actualround > 0 ? (totalPts / actualround).toFixed(1) : '0.0');
          detailsEl.textContent = this.app.i18n ? this.app.i18n.t('match.average_ppd_ppr', { ppd, ppr, darts: dartsThrown }) : `Moyenne ${ppd} PPD (${ppr} PPR) • ${dartsThrown} flèches jouées`;
        } else if (isCricket) {
          const mpr = Number(winnerPlayer?.scorePerRound) > 0 ? Number(winnerPlayer.scorePerRound).toFixed(1) : '-';
          detailsEl.textContent = this.app.i18n ? this.app.i18n.t('match.average_mpr', { mpr, darts: dartsThrown }) : `Moyenne ${mpr} MPR • ${dartsThrown} flèches jouées`;
        } else {
          const spr = Number(winnerPlayer?.scorePerRound) > 0 ? Number(winnerPlayer.scorePerRound).toFixed(1) : '-';
          detailsEl.textContent = this.app.i18n ? this.app.i18n.t('match.average_pts_round', { spr, darts: dartsThrown }) : `Moyenne ${spr} pts/tour • ${dartsThrown} flèches jouées`;
        }
      }
    } else if (state.endReason === 'interrupted') {
      if (titleEl) {
        titleEl.textContent = this.app.i18n ? this.app.i18n.t('match.interrupted_title') : 'INTERROMPU';
        titleEl.className = 'badge-victory-stitch badge-victory-interrupted';
      }
      if (statusEl) {
        statusEl.textContent = this.app.i18n ? this.app.i18n.t('match.match_stopped') : '• PARTIE ARRÊTÉE';
      }
      if (winnerEl) {
        winnerEl.textContent = this.app.i18n ? this.app.i18n.t('match.match_stopped_title') : 'PARTIE ARRÊTÉE';
        winnerEl.className = 'finished-winner-name text-crimson';
      }
      if (summaryEl) {
        summaryEl.innerHTML = `Arrêtée au <span class="highlight-amber">tour ${actualround}</span>`;
      }
      if (detailsEl) {
        const game = state.gameTitle || 'Partie';
        detailsEl.textContent = this.app.i18n ? this.app.i18n.t('match.match_not_finished', { game }) : `${game} non terminée`;
      }
    } else {
      if (titleEl) {
        titleEl.textContent = this.app.i18n ? this.app.i18n.t('finished.victory_badge') : 'FIN DE PARTIE';
        titleEl.className = 'badge-victory-stitch';
      }
      if (statusEl) {
        statusEl.textContent = this.app.i18n ? this.app.i18n.t('match.round_limit') : '• LIMITE DE TOURS';
      }
      if (winnerEl) {
        winnerEl.textContent = this.app.i18n ? this.app.i18n.t('match.no_winner') : 'AUCUN VAINQUEUR';
        winnerEl.className = 'finished-winner-name text-cyan';
      }
      if (summaryEl) {
        summaryEl.innerHTML = `<span class="highlight-amber">${state.maxround || actualround} tours</span> joués`;
      }
      if (detailsEl) {
        detailsEl.textContent = `${state.gameTitle || 'Partie'}`;
      }
    }

    // CLASSEMENT DU MATCH (COLONNE GAUCHE)
    const sorted = [...(state.players || [])].sort((a, b) => {
      if (state.winner && a.ident === state.winner.ident) return -1;
      if (state.winner && b.ident === state.winner.ident) return 1;
      if (isX01) {
        return (a.score || 0) - (b.score || 0);
      }
      return (b.score || 0) - (a.score || 0);
    });

    const standingsContainer = document.getElementById('finished-standings-list');
    if (standingsContainer) {
      standingsContainer.innerHTML = sorted.map((p, i) => {
        const isWinner = Boolean(state.winner && p.ident === state.winner.ident);
        const rankIndex = i + 1;
        const rankClass = rankIndex <= 3 ? `rank-${rankIndex}` : '';

        let statLabel = 'MOY / T';
        let statVal = '-';
        if (isX01) {
          statLabel = 'PPD / PPR';
          const totalPts = Number(p.TotalPoints ?? (p.Stats?.TotalPoints ?? 0));
          const ppd = p.dartsthrown > 0 ? (totalPts / p.dartsthrown).toFixed(1) : '-';
          const ppr = Number(p.scorePerRound) > 0 ? Number(p.scorePerRound).toFixed(1) : (p.Stats?.PPR || '-');
          statVal = `${ppd} / ${ppr}`;
        } else if (isCricket) {
          statLabel = 'MPR';
          statVal = Number(p.scorePerRound) > 0 ? Number(p.scorePerRound).toFixed(1) : (p.Stats?.MPR || '-');
        } else {
          statVal = Number(p.scorePerRound) > 0 ? Number(p.scorePerRound).toFixed(1) : (p.Stats?.AVG || '-');
        }

        const scoreLabel = isX01 ? 'Reste' : 'Score';

        return `
          <div class="player-rank-item ${isWinner ? 'is-winner' : ''}">
            <div class="rank-left-group">
              <span class="rank-badge-circle ${rankClass}">${rankIndex}</span>
              <div class="rank-player-details">
                <div class="player-name-row">
                  <span class="rank-player-name">${this.app.escapeHtml(p.PlayerName)}</span>
                  ${isWinner ? '<span class="badge-winner-mini">Gagnant</span>' : ''}
                </div>
                <span class="rank-player-sub">${p.dartsthrown || 0} flèches • Tour ${actualround}</span>
              </div>
            </div>
            <div class="rank-right-stats">
              <div class="rank-stat-unit">
                <span class="stat-lbl">${statLabel}</span>
                <span class="stat-val">${statVal}</span>
              </div>
              <div class="rank-score-unit">
                <span class="stat-lbl">${scoreLabel}</span>
                <span class="score-val">${p.score}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // HALL OF FAME & RECORDS (COLONNE DROITE)
    const recordsContainer = document.getElementById('finished-records-list');
    if (recordsContainer) {
      if (!state.records || state.records.length === 0) {
        recordsContainer.innerHTML = `
          <div class="record-cat-card record-cat-card--empty">
            <span class="material-symbols-outlined record-empty-icon">emoji_events</span>
            <p class="record-empty-message">Aucun record enregistré pour cette partie.</p>
          </div>
        `;
      } else {
        recordsContainer.innerHTML = '';
        state.records.forEach(rec => {
          const rows = (rec.allTime || []).slice(0, 3);
          const icon = rec.scorename?.includes('ppr') || rec.scorename?.includes('speed') ? 'speed' : 'adjust';
          const variantTag = rec.variant || state.variant;
          const badgeText = variantTag ? `Top 3 • ${variantTag}` : 'Top 3 All-Time';
          const card = document.createElement('record-card');
          card.setAttribute('title', rec.label || rec.scorename);
          card.setAttribute('badge', badgeText);
          card.setAttribute('icon', icon);
          card.setAttribute('color', 'cyan');
          card.records = rows;
          recordsContainer.appendChild(card);
        });
      }
    }
  }


  formatHitDisplay(key, state = null) {
    if (!key) return null;
    const k = String(key).trim().toUpperCase();
    const matchState = state || this.app.matchState;
    const lastHit = matchState?.lastHit || null;
    const i18n = this.app.i18n;

    if (k === 'MISSDART' || k === 'MISS' || k === '0') {
      const penalty = Number(lastHit?.penalty ?? matchState?.missPenalty ?? 0);
      if (penalty > 0) {
        return { badge: i18n ? i18n.t('hits.penalty') : 'PÉNALITÉ', number: `+${penalty}`, type: 'miss-penalty', variant: 'penalty' };
      }
      return { badge: i18n ? i18n.t('hits.miss') : 'HORS CIBLE', number: '0', type: 'miss', variant: 'penalty' };
    }

    let baseBadge = 'IMPACT';
    let number = k;
    let type = 'hit';

    if (k === 'DB' || k === 'DOUBLEBULLSEYE') {
      baseBadge = i18n ? i18n.t('hits.double_bull') : 'DOUBLE BULLSEYE';
      number = 'DB';
      type = 'double-bull';
    } else if (k === 'SB' || k === 'BULLSEYE' || k === 'BULL') {
      baseBadge = i18n ? i18n.t('hits.bull') : 'BULLSEYE';
      number = 'BULL';
      type = 'bull';
    } else {
      const m = k.match(/^([SDT])([1-9]|1[0-9]|20)$/);
      if (m) {
        const mult = m[1];
        const num = m[2];
        if (mult === 'T') {
          baseBadge = i18n ? i18n.t('hits.triple') : 'TRIPLE IMPACT';
          number = `T${num}`;
          type = 'triple';
        } else if (mult === 'D') {
          baseBadge = i18n ? i18n.t('hits.double') : 'DOUBLE IMPACT';
          number = `D${num}`;
          type = 'double';
        } else {
          baseBadge = i18n ? i18n.t('hits.simple') : 'SIMPLE IMPACT';
          number = num;
          type = 'simple';
        }
      }
    }

    const hitStatus = lastHit?.status || 'scored';
    const hitReason = lastHit?.reason || 'scored';
    const hitPenalty = Number(lastHit?.penalty ?? 0);

    if (hitStatus === 'penalty') {
      let penaltyBadge = i18n ? i18n.t('hits.penalty') : 'PÉNALITÉ';
      if (hitReason === 'bust') {
        penaltyBadge = i18n ? i18n.t('hits.bust') : 'BUST !';
      } else if (hitReason === 'penalty' && hitPenalty > 0) {
        penaltyBadge = i18n ? i18n.t('hits.penalty_pts', { penalty: hitPenalty }) : `PÉNALITÉ • +${hitPenalty}`;
      } else if (hitReason === 'not_multiple_5') {
        penaltyBadge = i18n ? i18n.t('hits.not_multiple_5') : 'NON MULTIPLE DE 5';
      }
      return { badge: penaltyBadge, number, type, variant: 'penalty' };
    }

    if (hitStatus === 'neutral') {
      const neutralBadge = hitReason === 'double_in'
        ? (i18n ? i18n.t('hits.double_in_required') : 'DOUBLE-IN REQUIS')
        : (i18n ? i18n.t('hits.out_of_contract') : 'HORS CONTRAT');
      return { badge: neutralBadge, number, type, variant: 'neutral' };
    }

    return { badge: baseBadge, number, type, variant: 'scored' };
  }

  showHitAnimation(key, state = null) {
    const info = this.formatHitDisplay(key, state);
    if (!info) return;

    if (info.variant === 'scored') {
      if (info.type === 'triple') {
        this.app.audio.playSound('triple');
      } else if (info.type === 'double') {
        this.app.audio.playSound('double');
      } else if (info.type === 'double-bull') {
        this.app.audio.playSound('double-bull');
      } else if (info.type === 'bull') {
        this.app.audio.playSound('bull');
      }
    }

    const overlay = document.getElementById('hit-animation-overlay');
    if (!overlay) return;

    if (this.hitAnimTimeout) {
      clearTimeout(this.hitAnimTimeout);
      this.hitAnimTimeout = null;
    }

    overlay.className = 'hit-animation-overlay pointer-events-none';
    let widget = overlay.querySelector('m-hit-impact, hit-impact');
    if (!widget) {
      widget = document.createElement('m-hit-impact');
      widget.id = 'hit-impact-widget';
      overlay.innerHTML = '';
      overlay.appendChild(widget);
    }

    if (typeof widget.show === 'function') {
      widget.show({
        badge: info.badge,
        number: info.number,
        variant: info.variant,
        duration: 1200
      });
    } else {
      widget.setAttribute('badge', info.badge);
      widget.setAttribute('value', info.number);
      widget.setAttribute('variant', info.variant);
      widget.setAttribute('active', '');
    }

    this.hitAnimTimeout = setTimeout(() => {
      this.hideHitAnimation();
    }, 1200);
  }

  hideHitAnimation() {
    const overlay = typeof document !== 'undefined' ? document.getElementById('hit-animation-overlay') : null;
    if (this.hitAnimTimeout) {
      clearTimeout(this.hitAnimTimeout);
      this.hitAnimTimeout = null;
    }
    if (overlay) {
      const widget = overlay.querySelector('m-hit-impact, hit-impact');
      if (widget && typeof widget.hide === 'function') {
        widget.hide();
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  async sendInput(key) {
    if (!key) return;
    try {
      const res = await fetch('/api/match/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, char: key })
      });
      const data = await res.json();
      if (data.match) {
        this.applyMatchState(data.match);
      }
    } catch (err) {
      console.error('Erreur envoi input match:', err);
    }
  }

  bindEvents() {
    // 3 boutons tactiles d'arcade en bas de l'écran de jeu (.game-bottom-bar-stitch)
    document.getElementById('btn-game-undo')?.addEventListener('click', () => {
      this.sendInput('BACKUPBUTTON');
    });

    document.getElementById('btn-game-miss')?.addEventListener('click', () => {
      this.sendInput('MISSDART');
    });

    // Boutons Abandon / Quitter la partie (HUD en haut à droite & modal de confirmation)
    const triggerAbortModal = () => {
      document.getElementById('modal-confirm-quit')?.classList.remove('hidden');
    };
    document.getElementById('btn-hud-abort')?.addEventListener('click', triggerAbortModal);
    document.getElementById('btn-game-abort')?.addEventListener('click', triggerAbortModal);
    document.getElementById('btn-game-quit')?.addEventListener('click', triggerAbortModal);

    document.getElementById('btn-confirm-abort-yes')?.addEventListener('click', () => {
      document.getElementById('modal-confirm-quit')?.classList.add('hidden');
      this.sendInput('GAMEBUTTON');
    });

    // Clic sur l'overlay ou sur le bouton SUIVANT pour passer immédiatement au joueur suivant
    const advanceNextIfWaiting = async (e) => {
      if (e) e.stopPropagation();
      if (this.app.matchState?.status === 'waiting_player') {
        if (this._isAdvancingPlayer) return;
        this._isAdvancingPlayer = true;

        if (this.delayedAnnouncementTimer) {
          clearTimeout(this.delayedAnnouncementTimer);
          this.delayedAnnouncementTimer = null;
        }
        this.app.hideAnnouncement();

        try {
          await this.sendInput('PLAYERBUTTON');
        } finally {
          setTimeout(() => {
            this._isAdvancingPlayer = false;
          }, 400);
        }
      }
    };

    document.getElementById('btn-game-next')?.addEventListener('click', (e) => {
      if (this.app.matchState?.status === 'waiting_player') {
        advanceNextIfWaiting(e);
      } else {
        this.sendInput('PLAYERBUTTON');
      }
    });

    // Un seul listener sur l'overlay (pas sur l'enfant announcement-box pour éviter le double déclenchement par bubbling)
    document.getElementById('announcement-overlay')?.addEventListener('click', advanceNextIfWaiting);

    // Écran de fin de partie / Victoire (#view-finished)
    const returnToLobby = async () => {
      try {
        const res = await fetch('/api/match/lobby', { method: 'POST' });
        const data = await res.json();
        if (data.match) this.applyMatchState(data.match);
      } catch {
        this.app.switchView('view-lobby');
        this.app.lobbyController?.goToLobbyStep(1);
      }
    };
    document.getElementById('btn-back-lobby')?.addEventListener('click', returnToLobby);
    document.getElementById('btn-finished-new')?.addEventListener('click', returnToLobby);

    const restartMatch = async () => {
      try {
        const res = await fetch('/api/match/restart', { method: 'POST' });
        const data = await res.json();
        if (data.match) this.applyMatchState(data.match);
      } catch {
        this.app.switchView('view-lobby');
        this.app.lobbyController?.goToLobbyStep(1);
      }
    };
    document.getElementById('btn-rematch')?.addEventListener('click', restartMatch);
    document.getElementById('btn-finished-replay')?.addEventListener('click', restartMatch);

    window.addEventListener('i18n:change', () => {
      if (this.app.matchState) {
        if (this.app.matchState.status === 'finished') {
          this.renderFinishedView(this.app.matchState);
        } else {
          this.renderInGameView(this.app.matchState);
        }
      }
    });
  }
}

