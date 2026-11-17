/**
 * HudStepper Component (<hud-stepper>)
 * Contrôle tactile CyberHUD avec boutons +/- et pilules de présélection instantanée.
 */
export class HudStepper extends HTMLElement {
  static get observedAttributes() {
    return [
      'label',
      'tag',
      'desc',
      'value',
      'unit',
      'min',
      'max',
      'step',
      'presets',
      'opt-key'
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

  get desc() {
    return this.getAttribute('desc') || '';
  }

  set desc(val) {
    this.setAttribute('desc', val);
  }

  get value() {
    const val = Number(this.getAttribute('value'));
    return isNaN(val) ? 0 : val;
  }

  set value(val) {
    this.setAttribute('value', String(val));
  }

  get unit() {
    return this.getAttribute('unit') || '';
  }

  set unit(val) {
    this.setAttribute('unit', val);
  }

  get min() {
    const v = Number(this.getAttribute('min'));
    return isNaN(v) ? -Infinity : v;
  }

  set min(val) {
    this.setAttribute('min', String(val));
  }

  get max() {
    const v = Number(this.getAttribute('max'));
    return isNaN(v) ? Infinity : v;
  }

  set max(val) {
    this.setAttribute('max', String(val));
  }

  get step() {
    const v = Number(this.getAttribute('step'));
    return isNaN(v) || v <= 0 ? 1 : v;
  }

  set step(val) {
    this.setAttribute('step', String(val));
  }

  get presets() {
    const p = this.getAttribute('presets');
    if (!p) return [];
    return p.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }

  set presets(arr) {
    if (Array.isArray(arr)) {
      this.setAttribute('presets', arr.join(','));
    }
  }

  _handleClick(e) {
    const stepBtn = e.target.closest('[data-step-dir]');
    if (stepBtn) {
      e.stopPropagation();
      const dir = Number(stepBtn.dataset.stepDir);
      const nextVal = Math.min(this.max, Math.max(this.min, this.value + dir * this.step));
      if (nextVal !== this.value) {
        this.value = nextVal;
        this._notifyChange(nextVal);
      }
      return;
    }

    const presetBtn = e.target.closest('[data-preset-value]');
    if (presetBtn) {
      e.stopPropagation();
      const nextVal = Number(presetBtn.dataset.presetValue);
      if (!isNaN(nextVal) && nextVal !== this.value) {
        this.value = nextVal;
        this._notifyChange(nextVal);
      }
    }
  }

  _notifyChange(val) {
    this.dispatchEvent(new CustomEvent('stepper-change', {
      detail: {
        value: val,
        key: this.optKey
      },
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
    const currentVal = this.value;
    const unit = this.unit;
    const displayVal = unit ? `${currentVal}${unit}` : String(currentVal);
    const presets = this.presets;
    const label = this.label;
    const tag = this.tag;
    const desc = this.desc;

    let headerHtml = '';
    if (label || tag || desc) {
      headerHtml = `
        <div class="hud-card-header">
          <div class="hud-card-title-group">
            ${label ? `<span class="hud-card-title">${this._escapeHtml(label)}</span>` : ''}
            ${tag ? `<span class="hud-card-tag-badge">${this._escapeHtml(tag)}</span>` : ''}
          </div>
          ${desc ? `<div class="hud-card-desc">${this._escapeHtml(desc)}</div>` : ''}
        </div>
      `;
    }

    let presetsHtml = '';
    if (presets.length > 0) {
      presetsHtml = `
        <div class="hud-presets">
          ${presets.map(p => `
            <button
              type="button"
              class="hud-preset-pill ${p === currentVal ? 'active' : ''}"
              data-preset-value="${p}"
            >${p}${unit}</button>
          `).join('')}
        </div>
      `;
    }

    this.innerHTML = `
      <div class="hud-card hud-stepper-card">
        ${headerHtml}
        <div class="hud-numeric-row">
          <div class="hud-stepper">
            <button type="button" class="hud-step-btn" data-step-dir="-1" aria-label="Diminuer">−</button>
            <span class="hud-step-val">${displayVal}</span>
            <button type="button" class="hud-step-btn" data-step-dir="1" aria-label="Augmenter">+</button>
          </div>
          ${presetsHtml}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-stepper')) {
  customElements.define('m-stepper', HudStepper);
}
if (!customElements.get('hud-stepper')) {
  try {
    customElements.define('hud-stepper', HudStepper);
  } catch (e) {
    customElements.define('hud-stepper', class extends HudStepper {});
  }
}
