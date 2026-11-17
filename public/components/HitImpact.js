/**
 * HitImpact Component (<m-hit-impact>, <hit-impact>)
 * Animation d'impact centrale CyberHUD avec médaillon flouté localisé (backdrop-filter)
 * et coloration contextuelle selon la validité de la touche :
 * - 'scored'  (vert néon)  : Touche qui marque / compte dans le jeu
 * - 'penalty' (rouge néon) : Bust, pénalité (Crazy Master), hors cible (Miss) ou non multiple de 5
 * - 'neutral' (gris acier) : Touche sur cible mais ignorée sans pénalité (hors contrat Cricket, avant Double-In...)
 */
export class HitImpact extends HTMLElement {
  static get observedAttributes() {
    return ['badge', 'value', 'variant', 'active', 'static'];
  }

  constructor() {
    super();
    this._timer = null;
  }

  connectedCallback() {
    if (!this.hasAttribute('variant')) {
      this.setAttribute('variant', 'scored');
    }
    this.render();
  }

  disconnectedCallback() {
    this._clearTimer();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get badge() {
    return this.getAttribute('badge') || 'IMPACT';
  }

  set badge(val) {
    this.setAttribute('badge', String(val || 'IMPACT'));
  }

  get value() {
    return this.getAttribute('value') || '0';
  }

  set value(val) {
    this.setAttribute('value', String(val ?? '0'));
  }

  get variant() {
    const v = String(this.getAttribute('variant') || 'scored').toLowerCase();
    if (v === 'penalty' || v === 'neutral' || v === 'scored') return v;
    return 'scored';
  }

  set variant(val) {
    const v = String(val || 'scored').toLowerCase();
    const normalized = (v === 'penalty' || v === 'neutral' || v === 'scored') ? v : 'scored';
    this.setAttribute('variant', normalized);
  }

  get isStatic() {
    return this.hasAttribute('static') && this.getAttribute('static') !== 'false';
  }

  set isStatic(val) {
    if (val) {
      this.setAttribute('static', '');
    } else {
      this.removeAttribute('static');
    }
  }

  get active() {
    if (this.isStatic) return true;
    return this.hasAttribute('active') && this.getAttribute('active') !== 'false';
  }

  set active(val) {
    if (val) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  show(options = {}) {
    this._clearTimer();

    if (options.badge !== undefined) this.badge = options.badge;
    if (options.number !== undefined) this.value = options.number;
    else if (options.value !== undefined) this.value = options.value;
    if (options.variant !== undefined) this.variant = options.variant;

    const duration = Number(options.duration) > 0 ? Number(options.duration) : 1200;

    // Force fresh DOM mount so keyframe animations restart cleanly on consecutive hits
    this.active = true;
    this.innerHTML = '';
    void this.offsetWidth;
    this.render();

    const overlay = this.closest('#hit-animation-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    this.dispatchEvent(new CustomEvent('hit-impact-show', {
      detail: {
        badge: this.badge,
        value: this.value,
        variant: this.variant,
        duration
      },
      bubbles: true,
      composed: true
    }));

    if (!this.isStatic) {
      this._timer = setTimeout(() => {
        this.hide();
      }, duration);
    }
  }

  hide() {
    this._clearTimer();
    this.active = false;
    const overlay = this.closest('#hit-animation-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    this.render();

    this.dispatchEvent(new CustomEvent('hit-impact-hide', {
      detail: {
        badge: this.badge,
        value: this.value,
        variant: this.variant
      },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const badge = this._escapeHtml(this.badge);
    const val = this._escapeHtml(this.value);
    const variant = this.variant;
    const isActive = this.active;

    if (!isActive) {
      this.innerHTML = '';
      return;
    }

    this.innerHTML = `
      <div class="hit-animation-container variant-${variant}">
        <div class="hit-backdrop-halo"></div>
        <div class="hit-shockwave-ring ring-wave-1"></div>
        <div class="hit-shockwave-ring ring-wave-2"></div>
        <div class="hit-shockwave-ring ring-wave-3"></div>
        <div class="hit-pop-content impact-pop">
          <div id="hit-badge" class="hit-badge">
            <span class="hit-badge-dot"></span>
            <span id="hit-badge-text" class="font-bold">${badge}</span>
          </div>
          <span id="hit-number-text" class="hit-number-text">${val}</span>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-hit-impact')) {
  customElements.define('m-hit-impact', HitImpact);
}
if (!customElements.get('hit-impact')) {
  try {
    customElements.define('hit-impact', HitImpact);
  } catch (e) {
    customElements.define('hit-impact', class extends HitImpact {});
  }
}
