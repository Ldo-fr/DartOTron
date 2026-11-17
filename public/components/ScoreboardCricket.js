/**
 * ScoreboardCricket Component (<scoreboard-cricket>)
 * Tableau des scores CyberHUD pour le mode Cricket.
 * Affiche les colonnes cibles (20 à Bull), capsules fermées (vert / rouge laser) et points lumineux.
 */
export class ScoreboardCricket extends HTMLElement {
  static get observedAttributes() {
    return ['active-player'];
  }

  constructor() {
    super();
    this._state = null;
  }

  connectedCallback() {
    this._handleI18n = () => this.render();
    if (typeof window !== 'undefined') {
      window.addEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('i18n:change', this._handleI18n);
    }
    this.render();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined' && this._handleI18n) {
      window.removeEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined' && this._handleI18n) {
      document.removeEventListener('i18n:change', this._handleI18n);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get state() {
    return this._state;
  }

  set state(val) {
    this._state = val;
    this.render();
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _getSampleState() {
    return {
      actualplayer: Number(this.getAttribute('active-player') || 0),
      headers: ['20', '19', '18', '17', '16', '15', 'B'],
      players: [
        {
          PlayerName: 'Joueur 1',
          score: 80,
          columns: [
            { value: 3 }, // 20 closed
            { value: 3 }, // 19 closed
            { value: 2 }, // 18 2 hits
            { value: 1 }, // 17 1 hit
            { value: 0 }, // 16 0 hit
            { value: 0 }, // 15 0 hit
            { value: 0 }  // B 0 hit
          ]
        },
        {
          PlayerName: 'Joueur 2',
          score: 40,
          columns: [
            { value: 3 }, // 20 closed (dead target)
            { value: 1 }, // 19 1 hit
            { value: 0 }, // 18 0 hit
            { value: 0 }, // 17 0 hit
            { value: 0 }, // 16 0 hit
            { value: 0 }, // 15 0 hit
            { value: 0 }  // B 0 hit
          ]
        }
      ]
    };
  }

  render() {
    const state = this._state || this._getSampleState();
    const players = state.players || [];
    const activePlayerIdx = state.actualplayer ?? 0;
    const rawHeaders = state.headers || ['20', '19', '18', '17', '16', '15', 'B'];
    const targets = rawHeaders.slice(0, 7);

    // Determine for each target if it is closed for all players (dead)
    const isTargetDead = targets.map((_, colIdx) =>
      players.length > 0 && players.every(pl => Number(pl.columns?.[colIdx]?.value || 0) >= 3)
    );

    const headersHtml = targets.map((t, colIdx) => {
      if (isTargetDead[colIdx]) {
        return `<th class="th-target th-target-dead"><span class="cricket-header-dead">-</span></th>`;
      }
      return `<th class="th-target"><span class="cricket-header-num">${this._escapeHtml(String(t))}</span></th>`;
    }).join('');

    const rowsHtml = players.map((p, idx) => {
      const isActive = idx === activePlayerIdx;

      const colsHtml = targets.map((_, colIdx) => {
        const hits = Math.min(3, Math.max(0, Number(p.columns?.[colIdx]?.value || 0)));

        if (isTargetDead[colIdx]) {
          // Closed by all players: red laser-crimson capsule
          return `
            <td class="td-target">
              <div class="cricket-capsule cricket-capsule-all-closed"></div>
            </td>
          `;
        }

        if (hits >= 3) {
          // Closed by this player: green neon capsule
          return `
            <td class="td-target">
              <div class="cricket-capsule cricket-capsule-player-closed"></div>
            </td>
          `;
        }

        // 0, 1, or 2 hits: 3 dots indicator
        return `
          <td class="td-target">
            <div class="cricket-dots-col">
              <span class="cricket-dot ${hits >= 1 ? 'is-lit' : 'is-off'}"></span>
              <span class="cricket-dot ${hits >= 2 ? 'is-lit' : 'is-off'}"></span>
              <span class="cricket-dot ${hits >= 3 ? 'is-lit' : 'is-off'}"></span>
            </div>
          </td>
        `;
      }).join('');

      return `
        <tr class="${isActive ? 'is-active' : 'is-inactive'}">
          <td class="td-player">
            <div class="player-identity-wrap">
              <span class="player-num-badge">${idx + 1}</span>
              <span class="player-name-text">${this._escapeHtml(p.PlayerName)}</span>
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
    }).join('');

    const appI18n = (typeof window !== 'undefined' && (window.dartotronApp?.i18n || window.app?.i18n || window.dartotron?.i18n));
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    const thPlayer = appI18n ? appI18n.t('match.th_player') : (isEn ? 'PLAYER' : 'JOUEUR');
    const thPoints = appI18n ? appI18n.t('match.th_points') : 'POINTS';

    this.innerHTML = `
      <table class="game-board-table">
        <thead>
          <tr>
            <th class="th-player">
              <span class="material-symbols-outlined header-player-icon">sports_score</span>
              <span data-i18n="match.th_player">${thPlayer}</span>
            </th>
            ${headersHtml}
            <th class="th-score" data-i18n="match.th_points">${thPoints}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }
}

if (!customElements.get('o-scoreboard-cricket')) {
  customElements.define('o-scoreboard-cricket', ScoreboardCricket);
}
if (!customElements.get('scoreboard-cricket')) {
  try {
    customElements.define('scoreboard-cricket', ScoreboardCricket);
  } catch (e) {
    customElements.define('scoreboard-cricket', class extends ScoreboardCricket {});
  }
}

