/**
 * HudStatsGauge Component (<hud-stats-gauge>)
 * Jauge de précision avec barre de progression horizontale CyberHUD.
 * Affiche une pilule de cible, un libellé descriptif, le pourcentage et la barre de progression.
 */
export class HudStatsGauge extends HTMLElement {
  static get observedAttributes() {
    return ['target', 'label', 'value', 'progress', 'color'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get target() {
    return this.getAttribute('target') || 'T20';
  }

  set target(val) {
    this.setAttribute('target', val);
  }

  get label() {
    return this.getAttribute('label') || 'Précision';
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get value() {
    return this.getAttribute('value') || '0%';
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  get progress() {
    const p = parseFloat(this.getAttribute('progress') ?? this.value);
    return isNaN(p) ? 0 : Math.max(0, Math.min(100, p));
  }

  set progress(val) {
    this.setAttribute('progress', String(val));
  }

  get color() {
    return this.getAttribute('color') || 'cyan';
  }

  set color(val) {
    this.setAttribute('color', val);
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const target = this._escapeHtml(this.target);
    const label = this._escapeHtml(this.label);
    const value = this._escapeHtml(this.value);
    const progress = this.progress;
    const colorClass = `color-${this.color}`;

    this.innerHTML = `
      <div class="hud-stats-gauge-card ${colorClass}">
        <div class="hud-gauge-header">
          <div class="hud-gauge-target-group">
            <span class="hud-gauge-target-pill">${target}</span>
            <span class="hud-gauge-label">${label}</span>
          </div>
          <span class="hud-gauge-value">${value}</span>
        </div>
        <div class="hud-gauge-track">
          <div class="hud-gauge-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-stats-gauge')) {
  customElements.define('m-stats-gauge', HudStatsGauge);
}
if (!customElements.get('hud-stats-gauge')) {
  try {
    customElements.define('hud-stats-gauge', HudStatsGauge);
  } catch (e) {
    customElements.define('hud-stats-gauge', class extends HudStatsGauge {});
  }
}

