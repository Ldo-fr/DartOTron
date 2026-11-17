/**
 * HudStatsPreference Component (<hud-stats-preference>)
 * Bloc de prédilection / préférence joueur CyberHUD (inspiré du bloc Stitch "Pire Volée").
 * Affiche :
 * - Label en haut à gauche + badge de touches/parties ("TRIPLE PRÉFÉRÉ • 85 touches")
 * - Valeur géante en dessous ("T20" ou "Cricket")
 * - Icône thématique à droite
 */
export class HudStatsPreference extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'count', 'unit', 'color', 'icon'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get label() {
    return this.getAttribute('label') || 'PRÉFÉRENCE';
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get value() {
    return this.getAttribute('value') || '—';
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  get count() {
    return this.getAttribute('count') || '';
  }

  set count(val) {
    if (val) this.setAttribute('count', val);
    else this.removeAttribute('count');
  }

  get unit() {
    return this.getAttribute('unit') || '';
  }

  set unit(val) {
    if (val) this.setAttribute('unit', val);
    else this.removeAttribute('unit');
  }

  get color() {
    return this.getAttribute('color') || 'neon';
  }

  set color(val) {
    this.setAttribute('color', val);
  }

  get icon() {
    return this.getAttribute('icon') || 'stars';
  }

  set icon(val) {
    if (val) this.setAttribute('icon', val);
    else this.removeAttribute('icon');
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const label = this._escapeHtml(this.label);
    const value = this._escapeHtml(this.value);
    const count = this.count ? this._escapeHtml(this.count) : '';
    const unit = this.unit ? this._escapeHtml(this.unit) : '';
    const icon = this.icon ? this._escapeHtml(this.icon) : '';
    const colorClass = `color-${this.color}`;

    const badgeText = count ? (unit ? `${count} ${unit}` : count) : '';

    this.innerHTML = `
      <div class="hud-stats-preference-card ${colorClass}">
        <div class="hud-pref-text-group">
          <div class="hud-pref-header-row">
            <span class="hud-pref-label">${label}</span>
            ${badgeText ? `<span class="hud-pref-count-badge">${badgeText}</span>` : ''}
          </div>
          <span class="hud-pref-value">${value}</span>
        </div>
        ${icon ? `<span class="material-symbols-outlined hud-pref-icon">${icon}</span>` : ''}
      </div>
    `;
  }
}

if (!customElements.get('m-stats-preference')) {
  customElements.define('m-stats-preference', HudStatsPreference);
}
if (!customElements.get('hud-stats-preference')) {
  try {
    customElements.define('hud-stats-preference', HudStatsPreference);
  } catch (e) {
    customElements.define('hud-stats-preference', class extends HudStatsPreference {});
  }
}

