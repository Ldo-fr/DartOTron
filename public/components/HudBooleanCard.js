/**
 * HudBooleanCard Component (<hud-boolean-card>)
 * Carte d'option binaire CyberHUD avec titre, tag/badge, description et switch toggle tactile.
 * Un simple clic sur la carte ou le switch bascule l'état (true <-> false).
 */
export class HudBooleanCard extends HTMLElement {
  static get observedAttributes() {
    return [
      'label',
      'tag',
      'strict',
      'desc',
      'checked',
      'yes-label',
      'no-label',
      'opt-key'
    ];
  }

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
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
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined' && this._handleI18n) {
      window.removeEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined' && this._handleI18n) {
      document.removeEventListener('i18n:change', this._handleI18n);
    }
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get optKey() {
    return this.getAttribute('opt-key') || '';
  }

  set optKey(val) {
    this.setAttribute('opt-key', val);
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get tag() {
    return this.getAttribute('tag') || '';
  }

  set tag(val) {
    this.setAttribute('tag', val);
  }

  get strict() {
    return this.hasAttribute('strict');
  }

  set strict(val) {
    if (val) this.setAttribute('strict', '');
    else this.removeAttribute('strict');
  }

  get desc() {
    return this.getAttribute('desc') || '';
  }

  set desc(val) {
    this.setAttribute('desc', val);
  }

  get checked() {
    return this.hasAttribute('checked');
  }

  set checked(val) {
    if (val) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
  }

  get value() {
    return this.checked;
  }

  set value(val) {
    this.checked = Boolean(val);
  }

  get yesLabel() {
    if (this.hasAttribute('yes-label')) {
      const custom = this.getAttribute('yes-label');
      if (custom && custom !== 'OUI' && custom !== 'YES') return custom;
    }
    const appI18n = (typeof window !== 'undefined' && (window.dartotron?.i18n || window.app?.i18n));
    if (appI18n) return appI18n.t('common.yes', {}, 'OUI');
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    return isEn ? 'YES' : 'OUI';
  }

  set yesLabel(val) {
    this.setAttribute('yes-label', val);
  }

  get noLabel() {
    if (this.hasAttribute('no-label')) {
      const custom = this.getAttribute('no-label');
      if (custom && custom !== 'NON' && custom !== 'NO') return custom;
    }
    const appI18n = (typeof window !== 'undefined' && (window.dartotron?.i18n || window.app?.i18n));
    if (appI18n) return appI18n.t('common.no', {}, 'NON');
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    return isEn ? 'NO' : 'NON';
  }

  set noLabel(val) {
    this.setAttribute('no-label', val);
  }

  toggle() {
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('toggle-change', {
      detail: {
        key: this.optKey,
        value: this.checked,
        checked: this.checked
      },
      bubbles: true,
      composed: true
    }));
  }

  _handleClick(e) {
    e.stopPropagation();
    this.toggle();
  }

  _handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const isTrue = this.checked;
    const label = this._escapeHtml(this.label);
    const tag = this._escapeHtml(this.tag);
    const isStrict = this.strict;
    const desc = this._escapeHtml(this.desc);
    const yesLabel = this._escapeHtml(this.yesLabel);
    const noLabel = this._escapeHtml(this.noLabel);

    const isStrictTag = isStrict ? 'tag-strict' : '';

    this.innerHTML = `
      <div class="hud-card hud-boolean-card ${isTrue ? 'active' : ''}" role="switch" aria-checked="${isTrue}" tabindex="0">
        <div class="hud-boolean-text-col">
          <div class="hud-card-title-group">
            <span class="hud-card-title">${label}</span>
            ${tag ? `<span class="hud-card-tag-badge ${isStrictTag}">${tag}</span>` : ''}
          </div>
          ${desc ? `<div class="hud-card-desc">${desc}</div>` : ''}
        </div>
        <div class="hud-toggle-group ${isTrue ? 'active' : ''}" aria-hidden="true">
          <button
            type="button"
            class="hud-toggle-btn is-yes ${isTrue ? 'active' : ''}"
            tabindex="-1"
            data-i18n="common.yes"
          >${yesLabel}</button>
          <button
            type="button"
            class="hud-toggle-btn is-no ${!isTrue ? 'active' : ''}"
            tabindex="-1"
            data-i18n="common.no"
          >${noLabel}</button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-boolean-card')) {
  customElements.define('m-boolean-card', HudBooleanCard);
}
if (!customElements.get('hud-boolean-card')) {
  try {
    customElements.define('hud-boolean-card', HudBooleanCard);
  } catch (e) {
    customElements.define('hud-boolean-card', class extends HudBooleanCard {});
  }
}

