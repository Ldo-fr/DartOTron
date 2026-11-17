/**
 * DartOTron Mobile Companion Mirror Client (public/companion/companion.js)
 * Mode miroir déporté en lecture seule pour smartphones et tablettes.
 * Synchronisation temps réel via WebSocket RFC 6455 et réutilisation des Web Components.
 */

import { CHECKOUT_GUIDE } from '/components/index.js';
import { i18n } from '/js/lib/i18n.js';

class CompanionClient {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.matchState = null;

    // Éléments du DOM
    this.connPill = document.getElementById('companion-conn-pill');
    this.connText = document.getElementById('companion-conn-text');

    this.liveBanner = document.getElementById('companion-live-banner');
    this.activePlayerEl = document.getElementById('companion-active-player');
    this.gameTitleEl = document.getElementById('companion-game-title');
    this.roundInfoEl = document.getElementById('companion-round-info');
    this.dartDots = [
      document.getElementById('dart-dot-1'),
      document.getElementById('dart-dot-2'),
      document.getElementById('dart-dot-3')
    ];

    this.checkoutBar = document.getElementById('companion-checkout-bar');
    this.checkoutPath = document.getElementById('companion-checkout-path');

    this.viewLobby = document.getElementById('companion-view-lobby');
    this.viewMatch = document.getElementById('companion-view-match');
    this.viewFinished = document.getElementById('companion-view-finished');

    this.lobbyGameBadge = document.getElementById('companion-lobby-game-badge');
    this.scoreboardContainer = document.getElementById('companion-scoreboard-container');

    this.winnerNameEl = document.getElementById('companion-winner-name');
    this.winnerSubEl = document.getElementById('companion-winner-sub');
    this.standingsListEl = document.getElementById('companion-standings-list');

    // Cible interactive compagnon
    this.dartboardEl = document.getElementById('companion-dartboard');

    // Footer & Bouton Joueur Suivant
    this.footerEl = document.getElementById('companion-footer');
    this.btnNextPlayer = document.getElementById('companion-btn-next-player');
    this._isAdvancing = false;

    if (this.btnNextPlayer) {
      this.btnNextPlayer.addEventListener('click', () => this.sendPlayerNext());
    }
  }

  async init() {
    // 1. Récupération de l'état initial via bootstrap et configuration i18n
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        const rawLocale = data.config?.SectionGlobals?.locale || 'fr';
        await i18n.init(rawLocale);
        if (data.match) {
          this.applyMatchState(data.match);
        }
      }
    } catch {
      await i18n.init('fr');
    }

    // 2. Connexion WebSocket temps réel
    this.connectWebSocket();
  }

  connectWebSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener('open', () => {
      this.setOnline(true);
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handleServerEvent(msg.type, msg.data);
      } catch {
        // ignorer trames invalides
      }
    });

    this.ws.addEventListener('close', () => {
      this.setOnline(false);
      this.scheduleReconnect();
    });

    this.ws.addEventListener('error', () => {
      this.setOnline(false);
    });
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 2000);
    }
  }

  setOnline(isOnline) {
    if (this.connPill) {
      this.connPill.classList.toggle('is-offline', !isOnline);
    }
    if (this.connText) {
      this.connText.textContent = isOnline ? i18n.t('companion.direct_pill', {}, 'DIRECT') : i18n.t('common.loading', {}, 'RECONNEXION');
    }
  }

  handleServerEvent(type, data) {
    if (type === 'init' && data?.match) {
      this.applyMatchState(data.match);
    } else if (type === 'match_state' && data) {
      this.applyMatchState(data);
    }
  }

  applyMatchState(state) {
    this.matchState = state;
    if (!state || state.status === 'lobby' || (state.status === 'finished' && state.endReason === 'interrupted')) {
      this.showLobbyView(state);
      return;
    }

    if (state.status === 'playing' || state.status === 'waiting_player') {
      this.showMatchView(state);
      return;
    }

    if (state.status === 'finished') {
      this.showFinishedView(state);
    }
  }

  showLobbyView(state) {
    if (this.viewLobby) this.viewLobby.classList.remove('hidden');
    if (this.viewMatch) this.viewMatch.classList.add('hidden');
    if (this.viewFinished) this.viewFinished.classList.add('hidden');
    if (this.liveBanner) this.liveBanner.classList.add('hidden');
    if (this.checkoutBar) this.checkoutBar.classList.add('hidden');

    if (this.footerEl) {
      this.footerEl.classList.add('hidden');
    }
    if (this.btnNextPlayer) {
      this.btnNextPlayer.classList.remove('is-waiting-player', 'is-busy');
    }

    if (this.lobbyGameBadge) {
      const gName = state?.gameTitle || state?.gameId || 'X01 Classic';
      this.lobbyGameBadge.textContent = gName;
    }
  }

  showMatchView(state) {
    if (this.viewLobby) this.viewLobby.classList.add('hidden');
    if (this.viewMatch) this.viewMatch.classList.remove('hidden');
    if (this.viewFinished) this.viewFinished.classList.add('hidden');
    if (this.liveBanner) this.liveBanner.classList.remove('hidden');

    // Joueur actif
    const activeIdx = Number(state.activePlayer ?? 0);
    const activePlayer = state.players?.[activeIdx];
    const playerName = activePlayer?.PlayerName || (activePlayer ? `Joueur ${activeIdx + 1}` : '—');
    if (this.activePlayerEl) {
      this.activePlayerEl.textContent = playerName;
    }

    // Indicateurs des 3 fléchettes du tour
    const thrownCount = Number(state.actualdart ?? 0);
    this.dartDots.forEach((dot, idx) => {
      if (dot) {
        dot.classList.toggle('is-thrown', idx < thrownCount);
      }
    });

    // Méta du match
    if (this.gameTitleEl) {
      const isX01 = state.gameId === 'Ho_One';
      const variantName = isX01 ? (state.gameOptions?.startingat || 'X01') : (state.gameTitle || state.gameId || 'Match');
      this.gameTitleEl.textContent = variantName;
    }

    if (this.roundInfoEl) {
      const actualRound = state.actualround || 1;
      const maxRound = state.maxround || 20;
      this.roundInfoEl.textContent = `${actualRound} / ${maxRound}`;
    }

    // Guide Checkout pour X01
    const isX01 = state.gameId === 'Ho_One' || Boolean(state.gameOptions?.startingat);
    if (isX01 && activePlayer) {
      const currentScore = Number(activePlayer.score ?? 0);
      const checkoutText = this.getCheckoutSuggestion(currentScore);
      if (checkoutText && this.checkoutBar && this.checkoutPath) {
        this.checkoutPath.textContent = checkoutText;
        this.checkoutBar.classList.remove('hidden');
      } else if (this.checkoutBar) {
        this.checkoutBar.classList.add('hidden');
      }
    } else if (this.checkoutBar) {
      this.checkoutBar.classList.add('hidden');
    }

    // Affichage strict du bouton Joueur Suivant uniquement pendant la phase "retirer les flèches" (waiting_player)
    const isWaiting = state.status === 'waiting_player';
    if (this.footerEl) {
      this.footerEl.classList.toggle('hidden', !isWaiting);
    }
    if (this.btnNextPlayer) {
      this.btnNextPlayer.classList.toggle('is-waiting-player', isWaiting);
    }

    // Rendu miroir du tableau de jeu
    this.renderScoreboardMirror(state);

    // Mise à jour de la cible compagnon (numéros actifs & impacts)
    this.updateDartboard(state);
  }

  updateDartboard(state) {
    if (!this.dartboardEl) return;

    // Numéros cibles (priorité Cricket, ou Practice target)
    let targetList = [];
    const isCricket = String(state.gameId || '').toLowerCase().includes('cricket');

    if (isCricket) {
      const headers = state.headers || [];
      const players = state.players || [];
      targetList = headers
        .map(h => String(h || '').trim())
        .filter((h, colIdx) => {
          if (!h || h === '-' || h === 'RND' || h === 'PPR' || h === 'PPD') return false;
          // Un chiffre fermé par tous les joueurs (>= 3 touches pour chacun) devient inactif
          const isClosedByAll = players.length > 0 && players.every(pl => Number(pl.columns?.[colIdx]?.value || 0) >= 3);
          return !isClosedByAll;
        });
    } else if (state.gameId === 'Practice' && state.target) {
      targetList = [String(state.target)];
    }

    // Fléchettes tirées dans la volée courante (roundHistory)
    const hits = (state.roundHistory || [])
      .map(h => String(h || '').toUpperCase())
      .filter(h => h && h !== 'MISS' && h !== '0');

    this.dartboardEl.targets = targetList;
    this.dartboardEl.hits = hits;
  }

  renderScoreboardMirror(state) {
    if (!this.scoreboardContainer) return;

    if (state.gameId === 'Ho_One') {
      let el = this.scoreboardContainer.querySelector('scoreboard-x01');
      if (!el) {
        this.scoreboardContainer.innerHTML = '<scoreboard-x01></scoreboard-x01>';
        el = this.scoreboardContainer.querySelector('scoreboard-x01');
      }
      el.state = state;
    } else if (state.gameId === 'Cricket') {
      let el = this.scoreboardContainer.querySelector('scoreboard-cricket');
      if (!el) {
        this.scoreboardContainer.innerHTML = '<scoreboard-cricket></scoreboard-cricket>';
        el = this.scoreboardContainer.querySelector('scoreboard-cricket');
      }
      el.state = state;
    } else {
      this.renderGenericScoreboard(state);
    }
  }

  renderGenericScoreboard(state) {
    const rawHeaders = state.headers || [];
    const validColIndices = [];
    rawHeaders.forEach((h, idx) => {
      const trimmed = String(h ?? '').trim();
      if (trimmed && trimmed !== '-') validColIndices.push(idx);
    });

    const headerThs = validColIndices.map(idx => `<th>${rawHeaders[idx]}</th>`).join('');
    const thPlayer = (typeof i18n !== 'undefined' && i18n?.t)
      ? i18n.t('match.th_player')
      : (document.documentElement.lang?.startsWith('en') ? 'PLAYER' : 'JOUEUR');
    const theadHtml = `
      <tr>
        <th class="th-player" data-i18n="match.th_player">${thPlayer}</th>
        ${headerThs}
      </tr>
    `;

    const activeIdx = Number(state.activePlayer ?? 0);
    const tbodyHtml = (state.players || []).map((player, pIdx) => {
      const isActive = pIdx === activeIdx;
      const cells = validColIndices.map(colIdx => {
        const val = player.grid?.[colIdx] ?? '—';
        return `<td>${val}</td>`;
      }).join('');

      return `
        <tr class="${isActive ? 'is-active-player' : ''}">
          <td class="td-player-name">${player.PlayerName || `Joueur ${pIdx + 1}`}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    this.scoreboardContainer.innerHTML = `
      <table class="game-board-table">
        <thead>${theadHtml}</thead>
        <tbody>${tbodyHtml}</tbody>
      </table>
    `;
  }

  showFinishedView(state) {
    if (this.viewLobby) this.viewLobby.classList.add('hidden');
    if (this.viewMatch) this.viewMatch.classList.add('hidden');
    if (this.viewFinished) this.viewFinished.classList.remove('hidden');
    if (this.liveBanner) this.liveBanner.classList.add('hidden');
    if (this.checkoutBar) this.checkoutBar.classList.add('hidden');

    if (this.footerEl) {
      this.footerEl.classList.add('hidden');
    }
    if (this.btnNextPlayer) {
      this.btnNextPlayer.classList.remove('is-waiting-player', 'is-busy');
    }

    const winner = state.winner;
    const winnerName = winner?.PlayerName || 'Vainqueur';
    if (this.winnerNameEl) {
      this.winnerNameEl.textContent = winnerName;
    }

    const actualRound = state.actualround || 1;
    if (this.winnerSubEl) {
      this.winnerSubEl.textContent = `Partie terminée en ${actualRound} tour${actualRound > 1 ? 's' : ''}`;
    }

    if (this.standingsListEl) {
      const players = Array.isArray(state.players) ? [...state.players] : [];
      this.standingsListEl.innerHTML = players.map((p, idx) => {
        const isWinner = winner ? p.ident === winner.ident : idx === 0;
        const scoreDisplay = p.score !== undefined ? `${p.score} pts` : (p.TotalPoints !== undefined ? `${p.TotalPoints} pts` : '');
        return `
          <div class="standings-row ${isWinner ? 'is-first' : ''}">
            <div class="standings-left">
              <span class="standings-rank">${idx + 1}</span>
              <span class="standings-name">${p.PlayerName || `Joueur ${idx + 1}`}</span>
            </div>
            <div class="standings-score">${scoreDisplay}</div>
          </div>
        `;
      }).join('');
    }
  }

  getCheckoutSuggestion(score) {
    if (score < 2 || score > 170) return null;
    if (CHECKOUT_GUIDE && CHECKOUT_GUIDE[score]) {
      return CHECKOUT_GUIDE[score];
    }
    if (score % 2 === 0 && score <= 40) return `D${score / 2}`;
    if (score <= 40) return `${score - 32 > 0 ? (score - 32) + ' • D16' : '1 • D' + Math.floor((score - 1) / 2)}`;
    return null;
  }

  async sendPlayerNext() {
    if (this._isAdvancing) return;
    this._isAdvancing = true;

    // Réaction visuelle immédiate : masquer le footer dès l'appui
    if (this.footerEl) {
      this.footerEl.classList.add('hidden');
    }

    if (this.btnNextPlayer) {
      this.btnNextPlayer.classList.add('is-busy');
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {
        // ignore
      }
    }

    try {
      const res = await fetch('/api/match/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'WAITING_PLAYER_ADVANCE', char: 'WAITING_PLAYER_ADVANCE' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          this.applyMatchState(data.match);
        }
      }
    } catch (err) {
      console.error('Erreur lors du passage au joueur suivant:', err);
    } finally {
      setTimeout(() => {
        this._isAdvancing = false;
        if (this.btnNextPlayer) {
          this.btnNextPlayer.classList.remove('is-busy');
        }
      }, 500);
    }
  }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  const client = new CompanionClient();
  client.init();
});
