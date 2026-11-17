/**
 * HudNotification Component (<hud-notification>)
 * Notification toast tactile CyberHUD animée en bottom-sheet (bas gauche de l'écran).
 * Supporte les modes 'info' et 'danger' avec temporisation automatique de 3 secondes.
 */
export class HudNotification extends HTMLElement {
  static get observedAttributes() {
    return [
      'title',
      'subtitle',
      'icon',
      'type',
      'duration',
      'fixed'
    ];
  }

  constructor() {
    super();
    this._timer = null;
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    this._clearTimer();
    this.removeEventListener('click', this._handleClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get title() {
    return this.getAttribute('title') || 'CIBLE CONNECTÉE';
  }

  set title(val) {
    this.setAttribute('title', val);
  }

  get subtitle() {
    return this.getAttribute('subtitle') || 'Matrice piezo synchronisée';
  }

  set subtitle(val) {
    this.setAttribute('subtitle', val);
  }

  get type() {
    return this.getAttribute('type') === 'danger' ? 'danger' : 'info';
  }

  set type(val) {
    this.setAttribute('type', String(val).toLowerCase() === 'danger' ? 'danger' : 'info');
  }

  // Le type et le label ne font qu'un : si type = danger alors label = danger (et inversement)
  get label() {
    return this.type;
  }

  set label(val) {
    this.type = val;
  }

  get icon() {
    if (this.hasAttribute('icon') && this.getAttribute('icon')) {
      return this.getAttribute('icon');
    }
    return this.type === 'danger' ? 'warning' : 'sensors';
  }

  set icon(val) {
    this.setAttribute('icon', val);
  }

  get duration() {
    const d = Number(this.getAttribute('duration'));
    return isNaN(d) || d <= 0 ? 3000 : d;
  }

  set duration(val) {
    this.setAttribute('duration', String(val));
  }

  get isFixed() {
    return this.getAttribute('fixed') !== 'false';
  }

  set isFixed(val) {
    if (val) this.removeAttribute('fixed');
    else this.setAttribute('fixed', 'false');
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _handleClick() {
    // Click on notification dismisses it
    this.hide();
  }

  show(options = {}) {
    if (options.title) this.title = options.title;
    if (options.subtitle) this.subtitle = options.subtitle;
    if (options.icon) this.icon = options.icon;
    if (options.type) this.type = options.type;
    if (options.label) this.label = options.label;
    if (options.duration) this.duration = options.duration;

    this.render();

    const sheet = this.querySelector('.hud-notification-sheet');
    if (!sheet) return;

    this._clearTimer();

    // Force reflow for CSS transition
    void sheet.offsetHeight;

    sheet.classList.remove('is-hidden');
    sheet.classList.add('is-visible');

    this.dispatchEvent(new CustomEvent('notification-show', {
      detail: {
        title: this.title,
        subtitle: this.subtitle,
        type: this.type,
        label: this.label
      },
      bubbles: true,
      composed: true
    }));

    this._timer = setTimeout(() => {
      this.hide();
    }, this.duration);
  }

  hide() {
    this._clearTimer();
    const sheet = this.querySelector('.hud-notification-sheet');
    if (sheet) {
      sheet.classList.remove('is-visible');
      sheet.classList.add('is-hidden');
    }

    this.dispatchEvent(new CustomEvent('notification-hide', {
      detail: {
        title: this.title,
        type: this.type
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
    const isDanger = this.type === 'danger';
    const typeClass = isDanger ? 'type-danger' : 'type-info';
    const fixedClass = this.isFixed ? 'is-fixed' : 'is-inline';

    const title = this._escapeHtml(this.title);
    const subtitle = this._escapeHtml(this.subtitle);
    const icon = this._escapeHtml(this.icon);
    const label = this._escapeHtml(this.label);

    // Preserve visibility state during re-renders if already visible
    const existing = this.querySelector('.hud-notification-sheet');
    const isVisible = existing ? existing.classList.contains('is-visible') : false;

    this.innerHTML = `
      <aside class="hud-notification-sheet ${typeClass} ${fixedClass} ${isVisible ? 'is-visible' : 'is-hidden'}" role="alert" aria-live="assertive">
        <div class="hud-notif-main">
          <div class="hud-notif-icon-box">
            <span class="material-symbols-outlined hud-notif-icon">${icon}</span>
          </div>
          <div class="hud-notif-text-col">
            <div class="hud-notif-title-row">
              <span class="hud-notif-title">${title}</span>
            </div>
            <p class="hud-notif-subtitle">${subtitle}</p>
          </div>
        </div>
        <div class="hud-notif-badge-col">
          <span class="hud-notif-badge">${label}</span>
        </div>
      </aside>
    `;
  }
}

if (!customElements.get('m-notification')) {
  customElements.define('m-notification', HudNotification);
}
if (!customElements.get('hud-notification')) {
  try {
    customElements.define('hud-notification', HudNotification);
  } catch (e) {
    customElements.define('hud-notification', class extends HudNotification {});
  }
}

