/**
 * PlayerName Component (<player-name>)
 * Composant standardisé d'affichage d'un joueur DartOTron.
 * Affiche systématiquement le nom du joueur accompagné de son badge "3-Dart Average" (ex: 50+, 85+).
 */
export class PlayerName extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'stat', 'highlight', 'size', 'show-stat'];
  }

  static formatStat(rawAvg) {
    const num = Number(rawAvg || 0);
    if (num > 0) {
      const roundedFloor5 = Math.floor(num / 5) * 5;
      return `${roundedFloor5}+`;
    }
    return '—';
  }

  connectedCallback() {
    this.render();

    this._onStatsUpdate = () => {
      if (!this.getAttribute('stat') || this.getAttribute('stat') === '—') {
        this.render();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('dartotron-players-updated', this._onStatsUpdate);
    }
  }

  disconnectedCallback() {
    if (this._onStatsUpdate && typeof window !== 'undefined') {
      window.removeEventListener('dartotron-players-updated', this._onStatsUpdate);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  set name(val) {
    this.setAttribute('name', val);
  }

  get stat() {
    return this.getAttribute('stat');
  }

  set stat(val) {
    if (val === null || val === undefined) {
      this.removeAttribute('stat');
    } else {
      this.setAttribute('stat', val);
    }
  }

  get highlight() {
    return this.hasAttribute('highlight');
  }

  set highlight(val) {
    if (val) this.setAttribute('highlight', '');
    else this.removeAttribute('highlight');
  }

  get size() {
    return this.getAttribute('size') || 'md';
  }

  set size(val) {
    this.setAttribute('size', val);
  }

  get showStat() {
    return this.getAttribute('show-stat') !== 'false';
  }

  set showStat(val) {
    this.setAttribute('show-stat', val ? 'true' : 'false');
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  resolveStat() {
    // Si la stat est explicitement fournie en attribut et n'est pas un placeholder vide
    const attrStat = this.stat;
    if (attrStat !== null && attrStat !== undefined && attrStat !== '' && attrStat !== '—') {
      return attrStat;
    }

    // Sinon résolution dynamique depuis le store de l'application
    const pName = this.name;
    const store = (typeof window !== 'undefined') && (window.dartotronApp?.playersStatsMap || window.app?.playersStatsMap);
    if (pName && store) {
      const st = store.get(pName.toLowerCase());
      if (st) {
        const rawAvg = Number(st.avg3DAllTime ?? st.avgPPR ?? 0);
        return PlayerName.formatStat(rawAvg);
      }
    }

    return attrStat || '—';
  }

  render() {
    const rawName = this.name || 'JOUEUR';
    const safeName = this._escapeHtml(rawName);
    const resolvedStat = this.resolveStat();
    const safeStat = this._escapeHtml(resolvedStat);
    const isHighlight = this.highlight;
    const isEmpty = resolvedStat === '—' || !resolvedStat;
    const showStat = this.showStat;

    this.innerHTML = `
      <span class="player-name-wrapper" data-size="${this.size}">
        <span class="player-name-text" title="${safeName}">${safeName}</span>
        ${showStat ? `
          <span class="player-name-stat ${isHighlight ? 'is-highlight' : ''} ${isEmpty ? 'is-empty' : ''}" title="3-Dart Average: ${safeStat}">
            ${safeStat}
          </span>
        ` : ''}
      </span>
    `;
  }
}

if (!customElements.get('a-player-name')) {
  customElements.define('a-player-name', PlayerName);
}
if (!customElements.get('player-name')) {
  try {
    customElements.define('player-name', PlayerName);
  } catch (e) {
    customElements.define('player-name', class extends PlayerName {});
  }
}

