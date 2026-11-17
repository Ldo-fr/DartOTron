/**
 * HudStatsColumn Component (<hud-stats-column>)
 * Colonne de statistiques CyberHUD déclinable en 4 couleurs (neon, cyan, amber, crimson).
 * Comprend un en-tête (icône, titre, badge), un corps accueillant librement les sous-blocs enfants,
 * et un footer flush en bas de 72px (trophée/icône, libellé, tag et valeur mise en avant).
 */
export class HudStatsColumn extends HTMLElement {
  static get observedAttributes() {
    return [
      'color',
      'icon',
      'title',
      'badge',
      'footer-icon',
      'footer-title',
      'footer-badge',
      'footer-main',
      'footer-val'
    ];
  }

  constructor() {
    super();
    this._initialChildren = null;
  }

  connectedCallback() {
    if (!this._initialChildren) {
      this._initialChildren = Array.from(this.childNodes);
    }
    this.render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      // Capture current body children before re-rendering
      const currentBody = this.querySelector('.hud-stats-column-body');
      if (currentBody) {
        this._initialChildren = Array.from(currentBody.childNodes);
      }
      this.render();
    }
  }

  get color() {
    return this.getAttribute('color') || 'neon';
  }

  set color(val) {
    this.setAttribute('color', val);
  }

  get icon() {
    return this.getAttribute('icon') || 'speed';
  }

  set icon(val) {
    this.setAttribute('icon', val);
  }

  get title() {
    return this.getAttribute('title') || 'MOYENNES X01';
  }

  set title(val) {
    this.setAttribute('title', val);
  }

  get badge() {
    return this.getAttribute('badge') || '';
  }

  set badge(val) {
    this.setAttribute('badge', val);
  }

  get footerIcon() {
    return this.getAttribute('footer-icon') || 'workspace_premium';
  }

  set footerIcon(val) {
    this.setAttribute('footer-icon', val);
  }

  get footerTitle() {
    return this.getAttribute('footer-title') || 'Volée Maximale';
  }

  set footerTitle(val) {
    this.setAttribute('footer-title', val);
  }

  get footerBadge() {
    return this.getAttribute('footer-badge') || 'RECORD';
  }

  set footerBadge(val) {
    this.setAttribute('footer-badge', val);
  }

  get footerMain() {
    return this.getAttribute('footer-main') || 'T20 · T20 · T20';
  }

  set footerMain(val) {
    this.setAttribute('footer-main', val);
  }

  get footerVal() {
    return this.getAttribute('footer-val') || '180 pts';
  }

  set footerVal(val) {
    this.setAttribute('footer-val', val);
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const colorClass = `variant-${this.color}`;
    const icon = this._escapeHtml(this.icon);
    const title = this._escapeHtml(this.title);
    const badge = this.badge ? this._escapeHtml(this.badge) : '';
    const footerIcon = this._escapeHtml(this.footerIcon);
    const footerTitle = this._escapeHtml(this.footerTitle);
    const footerBadge = this.footerBadge ? this._escapeHtml(this.footerBadge) : '';
    const footerMain = this._escapeHtml(this.footerMain);
    const footerVal = this._escapeHtml(this.footerVal);

    const hasFooter = Boolean(footerTitle || footerMain || footerVal);

    this.innerHTML = `
      <section class="hud-stats-column-card ${colorClass}">
        <div class="hud-stats-column-inner">
          <header class="hud-stats-column-header">
            <div class="hud-col-title-group">
              <span class="material-symbols-outlined hud-col-icon">${icon}</span>
              <h2 class="hud-col-title">${title}</h2>
            </div>
            ${badge ? `<span class="hud-col-badge">${badge}</span>` : ''}
          </header>

          <div class="hud-stats-column-body"></div>
        </div>

        ${hasFooter ? `
          <footer class="hud-stats-column-footer">
            <div class="hud-col-footer-top">
              <div class="hud-col-footer-label-group">
                <span class="material-symbols-outlined hud-col-footer-icon">${footerIcon}</span>
                <span class="hud-col-footer-title">${footerTitle}</span>
              </div>
              ${footerBadge ? `<span class="hud-col-footer-badge">${footerBadge}</span>` : ''}
            </div>
            <div class="hud-col-footer-bottom">
              <span class="hud-col-footer-main">${footerMain}</span>
              <span class="hud-col-footer-val">${footerVal}</span>
            </div>
          </footer>
        ` : ''}
      </section>
    `;

    const body = this.querySelector('.hud-stats-column-body');
    if (body && this._initialChildren) {
      for (const node of this._initialChildren) {
        body.appendChild(node);
      }
    }
  }

  setBodyHTML(html) {
    const body = this.querySelector('.hud-stats-column-body');
    if (body) {
      body.innerHTML = html;
      this._initialChildren = Array.from(body.childNodes);
    }
  }
}

if (!customElements.get('o-hud-stats-column')) {
  customElements.define('o-hud-stats-column', HudStatsColumn);
}
if (!customElements.get('o-stats-column')) {
  try {
    customElements.define('o-stats-column', HudStatsColumn);
  } catch (e) {
    customElements.define('o-stats-column', class extends HudStatsColumn {});
  }
}
if (!customElements.get('hud-stats-column')) {
  try {
    customElements.define('hud-stats-column', HudStatsColumn);
  } catch (e) {
    customElements.define('hud-stats-column', class extends HudStatsColumn {});
  }
}

