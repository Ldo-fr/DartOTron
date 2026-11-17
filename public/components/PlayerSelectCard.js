/**
 * PlayerSelectCard Component (<player-select-card>)
 * Carte joueur tactile CyberHUD avec badge d'ordre, stats et actions rapides.
 */
export class PlayerSelectCard extends HTMLElement {
  static get observedAttributes() {
    return [
      'player-name',
      'selected',
      'order',
      'stat',
      'disable-delete'
    ];
  }

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get playerName() {
    return this.getAttribute('player-name') || '';
  }

  set playerName(val) {
    this.setAttribute('player-name', val);
  }

  get selected() {
    return this.hasAttribute('selected');
  }

  set selected(val) {
    if (val) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
  }

  get disableDelete() {
    return this.hasAttribute('disable-delete');
  }

  set disableDelete(val) {
    if (val) this.setAttribute('disable-delete', '');
    else this.removeAttribute('disable-delete');
  }

  get order() {
    return this.getAttribute('order') || (this.selected ? '1' : '+');
  }

  set order(val) {
    this.setAttribute('order', val);
  }

  get stat() {
    return this.getAttribute('stat') || '—';
  }

  set stat(val) {
    this.setAttribute('stat', val);
  }

  _handleClick(e) {
    const actionBtn = e.target.closest('[data-player-action]');
    if (actionBtn) {
      e.stopPropagation();
      if (actionBtn.disabled || actionBtn.classList.contains('is-disabled')) {
        return;
      }
      const action = actionBtn.dataset.playerAction;
      this.dispatchEvent(new CustomEvent(`player-${action}`, {
        detail: { playerName: this.playerName },
        bubbles: true,
        composed: true
      }));
      return;
    }

    // Default card click -> toggle
    this.dispatchEvent(new CustomEvent('player-toggle', {
      detail: { playerName: this.playerName },
      bubbles: true,
      composed: true
    }));
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const isSelected = this.selected;
    const name = this.playerName;
    const safeName = this._escapeHtml(name);
    const orderText = isSelected ? this._escapeHtml(this.order) : '+';
    const statText = this._escapeHtml(this.stat);
    const isDeleteDisabled = this.disableDelete;

    this.innerHTML = `
      <div class="player-select-card" role="button" tabindex="0" data-player-card="${safeName}" data-selected="${isSelected}">
        <div class="player-card-left">
          <div class="player-slot-badge">${orderText}</div>
          <div class="player-card-meta">
            <player-name name="${safeName}" stat="${statText}" size="lg" ${isSelected ? 'highlight' : ''}></player-name>
          </div>
        </div>
        <div class="player-card-actions">
          <button type="button" class="player-action-btn player-btn-stats" data-player-action="stats" title="Statistiques">
            <span class="material-symbols-outlined text-[18px]">query_stats</span>
            <span class="btn-stats-label">STATS</span>
          </button>
          <button type="button" class="player-action-btn player-btn-edit" data-player-action="rename" title="Renommer">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" class="player-action-btn player-btn-delete ${isDeleteDisabled ? 'is-disabled' : ''}" data-player-action="delete" title="${isDeleteDisabled ? 'Dernier joueur actif' : 'Supprimer de la base'}" ${isDeleteDisabled ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-player-select-card')) {
  customElements.define('m-player-select-card', PlayerSelectCard);
}
if (!customElements.get('player-select-card')) {
  try {
    customElements.define('player-select-card', PlayerSelectCard);
  } catch (e) {
    customElements.define('player-select-card', class extends PlayerSelectCard {});
  }
}

