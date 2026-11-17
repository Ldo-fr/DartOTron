/**
 * HudStatsTelemetry Component (<hud-stats-telemetry>)
 * Pavé de télémétrie compact pour la barre supérieure CyberHUD.
 * Affiche une boîte d'icône carrée arrondie, un libellé uppercase et une valeur principale.
 */
export class HudStatsTelemetry extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'label', 'value', 'sub', 'color'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get icon() {
    return this.getAttribute('icon') || 'analytics';
  }

  set icon(val) {
    this.setAttribute('icon', val);
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

  get sub() {
    return this.getAttribute('sub') || '';
  }

  set sub(val) {
    this.setAttribute('sub', val);
  }

  get color() {
    return this.getAttribute('color') || 'default';
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
    const icon = this._escapeHtml(this.icon);
    const label = this._escapeHtml(this.label);
    const value = this._escapeHtml(this.value);
    const sub = this.sub ? this._escapeHtml(this.sub) : '';
    const colorClass = `color-${this.color}`;

    this.innerHTML = `
      <div class="hud-stats-telemetry-root ${colorClass}">
        <div class="hud-telemetry-icon-box">
          <span class="material-symbols-outlined hud-telemetry-icon">${icon}</span>
        </div>
        <div class="hud-telemetry-text-col">
          <span class="hud-telemetry-label">${label}</span>
          <div class="hud-telemetry-val-row">
            <span class="hud-telemetry-value">${value}</span>
            ${sub ? `<span class="hud-telemetry-sub">${sub}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-stats-telemetry')) {
  customElements.define('m-stats-telemetry', HudStatsTelemetry);
}
if (!customElements.get('hud-stats-telemetry')) {
  try {
    customElements.define('hud-stats-telemetry', HudStatsTelemetry);
  } catch (e) {
    customElements.define('hud-stats-telemetry', class extends HudStatsTelemetry {});
  }
}

