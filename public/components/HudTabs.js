/**
 * HudTabs Component (<hud-tabs>, alias <o-hud-tabs>)
 * Conteneur d'onglets dossier Stitch CyberHUD (Barre d'onglets + Panneaux de contenu).
 *
 * Fonctionnalités :
 * - Gestion automatique de la barre d'onglets et de l'affichage des panneaux (<hud-tab-panel>).
 * - Esthétique Stitch CyberHUD "dossier physique" avec contour néon continu et masque .tab-bottom-cover.
 * - API JavaScript : méthode .selectTab(tabId) et attribut réactif active="tabId".
 * - Événement personnalisé 'tab-change' (detail: { tab, previousTab }).
 * - Rétrocompatibilité totale avec les IDs de boutons existants (ex: #tab-btn-settings-audio).
 */

if (typeof globalThis !== 'undefined' && typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class HTMLElement {
    constructor() {
      this.attributes = {};
    }
    getAttribute(name) { return this.attributes ? (this.attributes[name] || null) : null; }
    setAttribute(name, val) {
      if (!this.attributes) this.attributes = {};
      this.attributes[name] = String(val);
    }
    hasAttribute(name) { return this.attributes ? (name in this.attributes) : false; }
    removeAttribute(name) { if (this.attributes) delete this.attributes[name]; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    appendChild(el) { return el; }
    dispatchEvent() { return true; }
    addEventListener() {}
    removeEventListener() {}
  };
}

export class HudTabPanel extends HTMLElement {
  static get observedAttributes() {
    return ['tab', 'label', 'icon', 'button-id'];
  }

  get tab() {
    return this.getAttribute('tab') || '';
  }

  set tab(val) {
    this.setAttribute('tab', val);
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get icon() {
    return this.getAttribute('icon') || '';
  }

  set icon(val) {
    this.setAttribute('icon', val);
  }

  get buttonId() {
    return this.getAttribute('button-id') || '';
  }

  set buttonId(val) {
    this.setAttribute('button-id', val);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.closest('hud-tabs')?.render();
    }
  }
}

export class HudTabs extends HTMLElement {
  static get observedAttributes() {
    return ['active'];
  }

  constructor() {
    super();
    this._activeTab = null;
    this._isRendering = false;
    this._handleBarClick = this._handleBarClick.bind(this);
    this._handleI18nChange = () => {
      this.render();
    };
  }

  get active() {
    return this.getAttribute('active') || this._activeTab || '';
  }

  set active(val) {
    if (val) {
      this.setAttribute('active', val);
    } else {
      this.removeAttribute('active');
    }
  }

  connectedCallback() {
    if (typeof window !== 'undefined') {
      window.addEventListener('i18n:change', this._handleI18nChange);
    }
    this.render();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('i18n:change', this._handleI18nChange);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'active' && oldVal !== newVal && !this._isRendering) {
      this.selectTab(newVal, false);
    }
  }

  getPanels() {
    return Array.from(this.querySelectorAll('hud-tab-panel, m-hud-tab-panel, [data-hud-panel]'));
  }

  render() {
    this._isRendering = true;

    // Détection ou création de la barre de navigation
    let tabBar = this.querySelector(':scope > .kiosk-tab-bar');
    if (!tabBar) {
      tabBar = document.createElement('nav');
      tabBar.className = 'kiosk-tab-bar';
      tabBar.setAttribute('aria-label', this.getAttribute('aria-label') || 'Onglets');
      this.prepend(tabBar);
    }
    this._tabBar = tabBar;

    // Détection ou création du conteneur de panneaux
    let panelContainer = this.querySelector(':scope > .tab-panel-container');
    const panels = this.getPanels();

    if (!panelContainer) {
      panelContainer = document.createElement('section');
      panelContainer.className = 'tab-panel-container';
      panels.forEach(p => panelContainer.appendChild(p));
      this.appendChild(panelContainer);
    }
    this._panelContainer = panelContainer;

    // Onglet actif initial
    const initialActive = this.getAttribute('active') || (panels[0]?.getAttribute('tab')) || '';
    this._activeTab = initialActive;

    // Génération des boutons d'onglets
    const buttonsHtml = panels.map((panel, idx) => {
      const tabKey = panel.getAttribute('tab') || `tab-${idx}`;
      const label = panel.getAttribute('label') || tabKey;
      const icon = panel.getAttribute('icon') || '';
      const customBtnId = panel.getAttribute('button-id');
      const tabsId = this.id ? this.id.replace(/-tabs$/, '') : 'kiosk';
      const btnId = customBtnId || `tab-btn-${tabsId}-${tabKey}`;
      const isActive = (tabKey === initialActive);

      return `
        <button
          type="button"
          class="tab-btn ${isActive ? 'active-tab' : 'inactive-tab'}"
          id="${btnId}"
          data-settings-tab="${tabKey}"
          data-tab="${tabKey}"
        >
          <div class="tab-bottom-cover ${isActive ? '' : 'hidden'}"></div>
          <span class="tab-indicator ${isActive ? '' : 'hidden'}"></span>
          ${icon ? `<span class="material-symbols-outlined tab-icon">${icon}</span>` : ''}
          <span class="tab-label">${label}</span>
        </button>
      `;
    }).join('');

    tabBar.innerHTML = buttonsHtml;

    // Mise à jour de la visibilité des panneaux
    panels.forEach(panel => {
      const tabKey = panel.getAttribute('tab');
      const isActive = (tabKey === initialActive);
      panel.classList.toggle('hidden', !isActive);
      panel.classList.toggle('active-panel', isActive);
    });

    // Attachement des écouteurs de clic sur la barre
    tabBar.removeEventListener('click', this._handleBarClick);
    tabBar.addEventListener('click', this._handleBarClick);

    this._isRendering = false;
  }

  _handleBarClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabKey = btn.getAttribute('data-tab') || btn.getAttribute('data-settings-tab') || btn.getAttribute('data-records-tab');
    if (tabKey) {
      this.selectTab(tabKey, true);
    }
  }

  /**
   * Bascule programmatiquement vers un onglet spécifique
   * @param {string} tabKey Identifiant de l'onglet cible
   * @param {boolean} [emitEvent=true] Émettre l'événement 'tab-change'
   */
  selectTab(tabKey, emitEvent = true) {
    if (!tabKey || tabKey === this._activeTab) return;

    const previousTab = this._activeTab;
    this._activeTab = tabKey;

    if (this.getAttribute('active') !== tabKey) {
      this._isRendering = true;
      this.setAttribute('active', tabKey);
      this._isRendering = false;
    }

    // Mise à jour visuelle des boutons
    const buttons = this.querySelectorAll(':scope > .kiosk-tab-bar .tab-btn');
    buttons.forEach(btn => {
      const k = btn.getAttribute('data-tab') || btn.getAttribute('data-settings-tab') || btn.getAttribute('data-records-tab');
      const isActive = (k === tabKey);
      btn.classList.toggle('active-tab', isActive);
      btn.classList.toggle('inactive-tab', !isActive);

      const cover = btn.querySelector('.tab-bottom-cover');
      if (cover) cover.classList.toggle('hidden', !isActive);

      const indicator = btn.querySelector('.tab-indicator');
      if (indicator) indicator.classList.toggle('hidden', !isActive);
    });

    // Mise à jour visuelle des panneaux
    const panels = this.getPanels();
    panels.forEach(panel => {
      const k = panel.getAttribute('tab');
      const isActive = (k === tabKey);
      panel.classList.toggle('hidden', !isActive);
      panel.classList.toggle('active-panel', isActive);
    });

    if (emitEvent) {
      this.dispatchEvent(new CustomEvent('tab-change', {
        detail: { tab: tabKey, previousTab },
        bubbles: true,
        composed: true
      }));
    }
  }
}

// Enregistrement officiel des Custom Elements natifs
if (typeof customElements !== 'undefined') {
  if (!customElements.get('m-hud-tab-panel')) {
    customElements.define('m-hud-tab-panel', HudTabPanel);
  }
  if (!customElements.get('hud-tab-panel')) {
    try {
      customElements.define('hud-tab-panel', HudTabPanel);
    } catch {
      customElements.define('hud-tab-panel', class extends HudTabPanel {});
    }
  }

  if (!customElements.get('o-hud-tabs')) {
    customElements.define('o-hud-tabs', HudTabs);
  }
  if (!customElements.get('hud-tabs')) {
    try {
      customElements.define('hud-tabs', HudTabs);
    } catch {
      customElements.define('hud-tabs', class extends HudTabs {});
    }
  }
}
