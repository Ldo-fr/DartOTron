/**
 * ScoreboardX01 Component (<scoreboard-x01>)
 * Tableau des scores CyberHUD pour les modes X01 (301, 501, 701, 1001).
 * Inclut le calcul PPD/PPR, le détail des 3 flèches et le guide de checkout WDF.
 */

export const CHECKOUT_GUIDE = {
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
  111: 'T20 • 19 • D16', 110: 'T20 • 18 • D16', 109: 'T20 • 17 • D16', 108: 'T19 • 19 • D16',
  107: 'T19 • 18 • D16', 106: 'T20 • 14 • D16', 105: 'T20 • 13 • D16', 104: 'T18 • 18 • D16',
  103: 'T19 • 14 • D16', 102: 'T20 • 10 • D16', 101: 'T17 • 18 • D16', 100: 'T20 • D20',
  99: 'T19 • 10 • D16', 98: 'T20 • D19', 97: 'T19 • D20', 96: 'T20 • D18', 95: 'T19 • D19',
  94: 'T18 • D20', 93: 'T19 • D18', 92: 'T20 • D16', 91: 'T17 • D20', 90: 'T18 • D18',
  89: 'T19 • D16', 88: 'T16 • D20', 87: 'T17 • D18', 86: 'T18 • D16', 85: 'T15 • D20',
  84: 'T16 • D18', 83: 'T17 • D16', 82: 'Bull • D16', 81: 'T15 • D18', 80: 'T20 • D10',
  79: 'T19 • D11', 78: 'T18 • D12', 77: 'T15 • D16', 76: 'T20 • D8', 75: 'T17 • D12',
  74: 'T14 • D16', 73: 'T19 • D8', 72: 'T16 • D12', 71: 'T13 • D16', 70: 'T18 • D8',
  69: 'T19 • D6', 68: 'T20 • D4', 67: 'T17 • D8', 66: 'T10 • D18', 65: '25 • D20',
  64: 'T16 • D8', 63: 'T13 • D12', 62: 'T10 • D16', 61: 'T15 • D8', 60: '20 • D20',
  59: '19 • D20', 58: '18 • D20', 57: '17 • D20', 56: '16 • D20', 55: '15 • D20',
  54: '14 • D20', 53: '13 • D20', 52: '12 • D20', 51: '11 • D20', 50: 'Bull',
  49: '9 • D20', 48: '16 • D16', 47: '15 • D16', 46: '14 • D16', 45: '13 • D16',
  44: '12 • D16', 43: '11 • D16', 42: '10 • D16', 41: '9 • D16', 40: 'D20',
  39: '7 • D16', 38: 'D19', 37: '5 • D16', 36: 'D18', 35: '3 • D16',
  34: 'D17', 33: '1 • D16', 32: 'D16', 31: '15 • D8', 30: 'D15',
  29: '13 • D8', 28: 'D14', 27: '11 • D8', 26: 'D13', 25: '9 • D8',
  24: 'D12', 23: '7 • D8', 22: 'D11', 21: '5 • D8', 20: 'D10',
  19: '3 • D8', 18: 'D9', 17: '1 • D8', 16: 'D8', 15: '7 • D4',
  14: 'D7', 13: '5 • D4', 12: 'D6', 11: '3 • D4', 10: 'D5',
  9: '1 • D4', 8: 'D4', 7: '3 • D2', 6: 'D3', 5: '1 • D2',
  4: 'D2', 3: '1 • D1', 2: 'D1'
};

export class ScoreboardX01 extends HTMLElement {
  static get observedAttributes() {
    return ['active-player', 'starting-at'];
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
      gameOptions: {
        startingat: Number(this.getAttribute('starting-at') || 501)
      },
      players: [
        {
          PlayerName: 'Joueur 1',
          score: 164,
          TotalPoints: 337,
          dartsthrown: 9,
          pointsinround: 60,
          LSTColVal: [['20'], ['20'], ['20'], [], [60], ['37.4'], ['112.3']],
          Stats: { 'Points Per Dart': '37.4', 'Points Per Round': '112.3' }
        },
        {
          PlayerName: 'Joueur 2',
          score: 301,
          TotalPoints: 200,
          dartsthrown: 6,
          pointsinround: 45,
          LSTColVal: [['T15'], ['0'], ['0'], [], [45], ['33.3'], ['100.0']],
          Stats: { 'Points Per Dart': '33.3', 'Points Per Round': '100.0' }
        }
      ]
    };
  }

  render() {
    const state = this._state || this._getSampleState();
    const players = state.players || [];
    const activePlayerIdx = state.actualplayer ?? 0;
    const startingAt = Number(state.gameOptions?.startingat) || 501;
    const currentRound = Number(state.actualround) || 1;

    const rowsHtml = players.map((p, idx) => {
      const isActive = idx === activePlayerIdx;
      const hasStarted = Number(p.TotalPoints) > 0 && Number(p.score) !== startingAt;

      let ppd = '-';
      let ppr = '-';
      if (hasStarted) {
        const col5 = p.LSTColVal?.[5]?.[0];
        const col6 = p.LSTColVal?.[6]?.[0];
        if (col5 !== undefined && col5 !== '' && col5 !== '-' && Number.isFinite(Number(col5))) {
          ppd = Number(col5).toFixed(1);
        } else if (p.Stats?.['Points Per Dart'] && p.Stats['Points Per Dart'] !== '-' && Number(p.Stats['Points Per Dart']) > 0) {
          ppd = Number(p.Stats['Points Per Dart']).toFixed(1);
        } else if (p.dartsthrown > 0 && p.TotalPoints > 0) {
          ppd = (p.TotalPoints / p.dartsthrown).toFixed(1);
        }

        if (col6 !== undefined && col6 !== '' && col6 !== '-' && Number.isFinite(Number(col6))) {
          ppr = Number(col6).toFixed(1);
        } else if (p.Stats?.['Points Per Round'] && p.Stats['Points Per Round'] !== '-' && Number(p.Stats['Points Per Round']) > 0) {
          ppr = Number(p.Stats['Points Per Round']).toFixed(1);
        } else if (currentRound > 0 && p.TotalPoints > 0) {
          ppr = (p.TotalPoints / currentRound).toFixed(1);
        }
      }

      const lastPts = p.LSTColVal?.[4]?.[0] !== '' && p.LSTColVal?.[4]?.[0] !== undefined
        ? p.LSTColVal[4][0]
        : (p.pointsinround || '-');

      const d1 = p.LSTColVal?.[0]?.[0] || '';
      const d2 = p.LSTColVal?.[1]?.[0] || '';
      const d3 = p.LSTColVal?.[2]?.[0] || '';
      const dartsDetail = [d1, d2, d3].filter(Boolean).join(' • ');

      let checkoutHtml = '';
      if (isActive && Number(p.score) <= 170 && Number(p.score) >= 2) {
        const combo = CHECKOUT_GUIDE[Number(p.score)];
        if (combo) {
          checkoutHtml = `
            <div class="checkout-badge">
              <span class="material-symbols-outlined">bolt</span>
              <span>${this._escapeHtml(combo)}</span>
            </div>
          `;
        }
      }

      return `
        <tr class="${isActive ? 'is-active' : 'is-inactive'}">
          <td class="td-player">
            <div class="player-identity-wrap">
              <span class="player-num-badge">${idx + 1}</span>
              <span class="player-name-text">${this._escapeHtml(p.PlayerName)}</span>
            </div>
          </td>
          <td class="td-stat">
            <div class="stat-cell-wrap">
              <span class="stat-val-text">${ppd}</span>
            </div>
          </td>
          <td class="td-stat">
            <div class="stat-cell-wrap">
              <span class="stat-val-text">${ppr}</span>
            </div>
          </td>
          <td class="td-stat">
            <div class="stat-cell-wrap">
              <span class="stat-val-text">${lastPts}</span>
              ${dartsDetail ? `<span class="stat-sub-text">${this._escapeHtml(dartsDetail)}</span>` : ''}
            </div>
          </td>
          <td class="td-score">
            <div class="score-cell-wrap">
              <span class="player-score-giant">${p.score}</span>
              ${checkoutHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const appI18n = (typeof window !== 'undefined' && (window.dartotronApp?.i18n || window.app?.i18n || window.dartotron?.i18n));
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    const thPlayer = appI18n ? appI18n.t('match.th_player') : (isEn ? 'PLAYER' : 'JOUEUR');
    const thLast = appI18n ? appI18n.t('match.th_last') : (isEn ? 'LAST' : 'DERNIÈRE');
    const thRemaining = appI18n ? appI18n.t('match.th_remaining') : (isEn ? 'REMAINING' : 'SCORE RESTANT');

    this.innerHTML = `
      <table class="game-board-table">
        <thead>
          <tr>
            <th class="th-player">
              <span class="material-symbols-outlined header-player-icon">sports_score</span>
              <span data-i18n="match.th_player">${thPlayer}</span>
            </th>
            <th class="th-stat">PPD</th>
            <th class="th-stat">PPR</th>
            <th class="th-stat" data-i18n="match.th_last">${thLast}</th>
            <th class="th-score" data-i18n="match.th_remaining">${thRemaining}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }
}

if (!customElements.get('o-scoreboard-x01')) {
  customElements.define('o-scoreboard-x01', ScoreboardX01);
}
if (!customElements.get('scoreboard-x01')) {
  try {
    customElements.define('scoreboard-x01', ScoreboardX01);
  } catch (e) {
    customElements.define('scoreboard-x01', class extends ScoreboardX01 {});
  }
}

