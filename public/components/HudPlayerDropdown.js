/**
 * HudPlayerDropdown Component (<hud-player-dropdown>)
 * Menu tactile CyberHUD de sélection de joueur pour barre supérieure.
 * Affiche le joueur sélectionné, pastille d'activité, badge niveau/moyenne et menu déroulant.
 */
export class HudPlayerDropdown extends HTMLElement {
  static get observedAttributes() {
    return ['selected-player', 'selected-stat', 'disabled'];
  }

  constructor() {
    super();
    this._isOpen = false;
    this._players = [];
    this._handleTriggerClick = this._handleTriggerClick.bind(this);
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    this._handleItemClick = this._handleItemClick.bind(this);
  }

  connectedCallback() {
    this.render();
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._handleOutsideClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get selectedPlayer() {
    return this.getAttribute('selected-player') || '';
  }

  set selectedPlayer(val) {
    this.setAttribute('selected-player', val);
  }

  get selectedStat() {
    return this.getAttribute('selected-stat') || '—';
  }

  set selectedStat(val) {
    this.setAttribute('selected-stat', val);
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get players() {
    return this._players;
  }

  set players(val) {
    this._players = Array.isArray(val) ? val : [];
    this.render();
  }

  toggle() {
    if (this.disabled) return;
    this._isOpen = !this._isOpen;
    this.renderDropdownVisibility();
  }

  open() {
    if (this.disabled || this._isOpen) return;
    this._isOpen = true;
    this.renderDropdownVisibility();
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.renderDropdownVisibility();
  }

  _handleTriggerClick(e) {
    e.stopPropagation();
    this.toggle();
  }

  _handleOutsideClick(e) {
    if (this._isOpen && !this.contains(e.target)) {
      this.close();
    }
  }

  _handleItemClick(e) {
    const itemBtn = e.target.closest('[data-player-name]');
    if (!itemBtn) return;
    e.stopPropagation();

    const name = itemBtn.dataset.playerName;
    const stat = itemBtn.dataset.playerStat || '—';

    this.selectedPlayer = name;
    this.selectedStat = stat;
    this.close();

    this.dispatchEvent(new CustomEvent('player-select', {
      detail: { playerName: name, stat },
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

  renderDropdownVisibility() {
    const menu = this.querySelector('.hud-dropdown-menu');
    const chevron = this.querySelector('.hud-dropdown-chevron');
    const trigger = this.querySelector('.hud-dropdown-trigger');
    if (menu) {
      menu.classList.toggle('is-open', this._isOpen);
    }
    if (chevron) {
      chevron.classList.toggle('is-rotated', this._isOpen);
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(this._isOpen));
    }
  }

  render() {
    const currentName = this.selectedPlayer || (this._players[0]?.name ?? 'JOUEUR');
    const currentStat = this.selectedStat !== '—' ? this.selectedStat : (this._players[0]?.stat ?? '—');
    const safeCurrentName = this._escapeHtml(currentName);
    const safeCurrentStat = this._escapeHtml(currentStat);

    const itemsHtml = this._players.map(p => {
      const pName = typeof p === 'string' ? p : p.name;
      const pStat = typeof p === 'string' ? '—' : (p.stat || '—');
      const isSelected = pName.toLowerCase() === currentName.toLowerCase();
      const safeName = this._escapeHtml(pName);
      const safeStat = this._escapeHtml(pStat);

      return `
        <button
          type="button"
          class="hud-dropdown-item ${isSelected ? 'is-selected' : ''}"
          data-player-name="${safeName}"
          data-player-stat="${safeStat}"
        >
          <player-name name="${safeName}" stat="${safeStat}" size="sm" ${isSelected ? 'highlight' : ''}></player-name>
        </button>
      `;
    }).join('');

    this.innerHTML = `
      <div class="hud-player-dropdown-root ${this.disabled ? 'is-disabled' : ''}">
        <button
          type="button"
          class="hud-dropdown-trigger"
          ${this.disabled ? 'disabled' : ''}
          aria-haspopup="listbox"
          aria-expanded="${this._isOpen}"
        >
          <div class="hud-dropdown-dot animate-pulse"></div>
          <player-name name="${safeCurrentName}" stat="${safeCurrentStat}" size="md" highlight></player-name>
          <span class="material-symbols-outlined hud-dropdown-chevron ${this._isOpen ? 'is-rotated' : ''}">expand_more</span>
        </button>

        <div class="hud-dropdown-menu ${this._isOpen ? 'is-open' : ''}" role="listbox">
          ${itemsHtml || '<div class="hud-dropdown-empty">Aucun joueur</div>'}
        </div>
      </div>
    `;

    const trigger = this.querySelector('.hud-dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', this._handleTriggerClick);
    }

    const menu = this.querySelector('.hud-dropdown-menu');
    if (menu) {
      menu.addEventListener('click', this._handleItemClick);
    }
  }
}

if (!customElements.get('m-player-dropdown')) {
  customElements.define('m-player-dropdown', HudPlayerDropdown);
}
if (!customElements.get('hud-player-dropdown')) {
  try {
    customElements.define('hud-player-dropdown', HudPlayerDropdown);
  } catch (e) {
    customElements.define('hud-player-dropdown', class extends HudPlayerDropdown {});
  }
}

