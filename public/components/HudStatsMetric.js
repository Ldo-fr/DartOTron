/**
 * HudStatsMetric Component (<hud-stats-metric>)
 * Bloc de métrique individuelle CyberHUD.
 * Affiche un libellé, une valeur géante avec son unité, et une icône d'état optionnelle.
 */
export class HudStatsMetric extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'unit', 'color', 'icon', 'horizontal'];
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
    return this.getAttribute('label') || 'MÉTRIQUE';
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get value() {
    return this.getAttribute('value') || '0';
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  get unit() {
    return this.getAttribute('unit') || '';
  }

  set unit(val) {
    this.setAttribute('unit', val);
  }

  get color() {
    return this.getAttribute('color') || 'white';
  }

  set color(val) {
    this.setAttribute('color', val);
  }

  get icon() {
    return this.getAttribute('icon') || '';
  }

  set icon(val) {
    if (val) this.setAttribute('icon', val);
    else this.removeAttribute('icon');
  }

  get horizontal() {
    return this.hasAttribute('horizontal');
  }

  set horizontal(val) {
    if (val) this.setAttribute('horizontal', '');
    else this.removeAttribute('horizontal');
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
    const unit = this.unit ? this._escapeHtml(this.unit) : '';
    const icon = this.icon ? this._escapeHtml(this.icon) : '';
    const colorClass = `color-${this.color}`;
    const isHorizontal = this.horizontal || Boolean(icon);

    if (isHorizontal) {
      this.innerHTML = `
        <div class="hud-stats-metric-card layout-horizontal ${colorClass}">
          <div class="hud-metric-text-group">
            <span class="hud-metric-label">${label}</span>
            <div class="hud-metric-value-row">
              <span class="hud-metric-value">${value}</span>
              ${unit ? `<span class="hud-metric-unit">${unit}</span>` : ''}
            </div>
          </div>
          ${icon ? `<span class="material-symbols-outlined hud-metric-status-icon">${icon}</span>` : ''}
        </div>
      `;
    } else {
      this.innerHTML = `
        <div class="hud-stats-metric-card layout-vertical ${colorClass}">
          <span class="hud-metric-label">${label}</span>
          <div class="hud-metric-value-row">
            <span class="hud-metric-value">${value}</span>
            ${unit ? `<span class="hud-metric-unit">${unit}</span>` : ''}
          </div>
        </div>
      `;
    }
  }
}

if (!customElements.get('m-stats-metric')) {
  customElements.define('m-stats-metric', HudStatsMetric);
}
if (!customElements.get('hud-stats-metric')) {
  try {
    customElements.define('hud-stats-metric', HudStatsMetric);
  } catch (e) {
    customElements.define('hud-stats-metric', class extends HudStatsMetric {});
  }
}

