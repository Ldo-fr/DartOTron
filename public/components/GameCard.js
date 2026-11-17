/**
 * GameCard Component (<game-card>)
 * Composant de tuile de sélection de jeu CyberHUD Stitch avec effet de 3D Flip in-situ.
 * Spécification : "Sélection des 6 Jeux - Flip Cards 3D Corrigé"
 *
 * Fonctionnalités :
 * - Face avant : En-tête avec badge de jeu, bouton Variantes [sync], bouton Réglages [settings]
 *   Corps : Grand titre Space Grotesk (reflétant la variante active), badge d'état, description
 *   Filigrane géométrique SVG subtil
 * - Face arrière : Grille 2x2 des variantes de jeu, bouton fermeture [close]
 * - Persistance automatique de la dernière variante choisie (localStorage)
 * - Événements émis :
 *   - 'game-select' : sélection de la carte
 *   - 'game-variant-change' : changement de variante
 *   - 'game-configure' : ouverture de la modale d'options
 *   - 'card-flip' : notification du retournement (pour exclusivité)
 */

const GAME_WATERMARKS = {
  Ho_One: `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-width="2.5" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" stroke-dasharray="4 2"></circle>
      <circle cx="50" cy="50" r="34"></circle>
      <circle cx="50" cy="50" r="22" stroke-width="3.5"></circle>
      <circle cx="50" cy="50" fill="#FFFFFF" r="10" stroke="none"></circle>
      <line stroke-width="1.5" x1="50" x2="50" y1="0" y2="100"></line>
      <line stroke-width="1.5" x1="0" x2="100" y1="50" y2="50"></line>
    </svg>
  `,
  Cricket: `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-width="2.5" viewBox="0 0 100 100">
      <rect height="80" rx="4" stroke-dasharray="3 3" width="80" x="10" y="10"></rect>
      <line x1="10" x2="90" y1="37" y2="37"></line>
      <line x1="10" x2="90" y1="64" y2="64"></line>
      <line x1="37" x2="37" y1="10" y2="90"></line>
      <line x1="64" x2="64" y1="10" y2="90"></line>
      <circle cx="50.5" cy="50.5" fill="#FFFFFF" r="8"></circle>
    </svg>
  `,
  Kinito: `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-width="2.5" viewBox="0 0 100 100">
      <polygon points="50,15 82,32 50,49 18,32"></polygon>
      <polygon points="18,32 50,49 50,83 18,66"></polygon>
      <polygon points="82,32 50,49 50,83 82,66"></polygon>
      <circle cx="50" cy="32" fill="#FFFFFF" r="3"></circle>
      <circle cx="34" cy="50" fill="#FFFFFF" r="2.5"></circle>
      <circle cx="34" cy="65" fill="#FFFFFF" r="2.5"></circle>
      <circle cx="66" cy="50" fill="#FFFFFF" r="2.5"></circle>
      <circle cx="66" cy="65" fill="#FFFFFF" r="2.5"></circle>
    </svg>
  `,
  '321_Zlip': `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 100 100">
      <path d="M22 26 L78 26 L22 74 L78 74"></path>
      <path d="M72 16 L84 26 L72 36"></path>
      <path d="M28 64 L16 74 L28 84"></path>
      <circle cx="50" cy="50" r="14" stroke-dasharray="3 3"></circle>
    </svg>
  `,
  By_Fives: `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="5" viewBox="0 0 100 100">
      <path d="M72 18 L28 18 L25 46 C32 40 48 40 58 46 C68 52 72 64 68 76 C64 88 48 92 34 88 C26 84 20 78 18 72"></path>
    </svg>
  `,
  Practice: `
    <svg class="w-full h-full" fill="none" stroke="#FFFFFF" stroke-width="2" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44"></circle>
      <circle cx="50" cy="50" r="30" stroke-dasharray="2 3"></circle>
      <circle cx="50" cy="50" r="16"></circle>
      <circle cx="50" cy="50" fill="#FFFFFF" r="4"></circle>
      <line stroke-width="2.5" x1="50" x2="50" y1="2" y2="30"></line>
      <line stroke-width="2.5" x1="50" x2="50" y1="70" y2="98"></line>
      <line stroke-width="2.5" x1="2" x2="30" y1="50" y2="50"></line>
      <line stroke-width="2.5" x1="70" x2="98" y1="50" y2="50"></line>
    </svg>
  `
};

export class GameCard extends HTMLElement {
  static get observedAttributes() {
    return [
      'game-id',
      'selected',
      'title',
      'category',
      'badge-main',
      'glow',
      'subtitle',
      'desc',
      'has-settings',
      'has-variants',
      'variants',
      'current-variant',
      'flipped'
    ];
  }

  constructor() {
    super();
    this._variantsData = null;
    this._isFlipped = false;
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    this._isFlipped = this.hasAttribute('flipped');

    // Récupérer la variante mémorisée si non définie
    if (!this.getAttribute('current-variant') && this.gameId) {
      const saved = localStorage.getItem(`dartotron_variant_${this.gameId}`);
      if (saved) {
        this.setAttribute('current-variant', saved);
      }
    }

    this.render();
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      if (name === 'flipped') {
        this._isFlipped = this.hasAttribute('flipped');
        this._updateFlipClass();
        return;
      }
      if (name === 'selected') {
        const isSel = this.hasAttribute('selected');
        this.querySelector('.flip-card-container')?.classList.toggle('selected', isSel);
        this.querySelector('.card-front')?.classList.toggle('selected', isSel);
        return;
      }
      if (name === 'current-variant') {
        this._updateVariantDisplay();
        return;
      }
      this.render();
    }
  }

  get gameId() {
    return this.getAttribute('game-id') || '';
  }

  set gameId(val) {
    this.setAttribute('game-id', val);
  }

  get selected() {
    return this.hasAttribute('selected');
  }

  set selected(val) {
    if (val) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
  }

  get hasSettings() {
    return this.hasAttribute('has-settings');
  }

  set hasSettings(val) {
    if (val) this.setAttribute('has-settings', '');
    else this.removeAttribute('has-settings');
  }

  get hasVariants() {
    return this.hasAttribute('has-variants') || (this.variants && this.variants.length > 0);
  }

  set hasVariants(val) {
    if (val) this.setAttribute('has-variants', '');
    else this.removeAttribute('has-variants');
  }

  get isFlipped() {
    return this._isFlipped;
  }

  get variants() {
    if (this._variantsData) return this._variantsData;
    const attr = this.getAttribute('variants');
    if (attr) {
      try {
        return JSON.parse(attr);
      } catch {
        return [];
      }
    }
    return [];
  }

  set variants(data) {
    this._variantsData = Array.isArray(data) ? data : [];
    if (this.isConnected) {
      this.render();
    }
  }

  get currentVariantId() {
    const attr = this.getAttribute('current-variant');
    if (attr) return attr;
    const vars = this.variants;
    if (vars.length > 0) return vars[0].id;
    return '';
  }

  set currentVariantId(val) {
    this.setAttribute('current-variant', val);
    if (this.gameId) {
      try {
        localStorage.setItem(`dartotron_variant_${this.gameId}`, val);
      } catch {}
    }
  }

  flip(shouldFlip) {
    const nextState = shouldFlip !== undefined ? Boolean(shouldFlip) : !this._isFlipped;
    if (this._isFlipped === nextState) return;

    this._isFlipped = nextState;
    if (this._isFlipped) {
      this.setAttribute('flipped', '');
    } else {
      this.removeAttribute('flipped');
    }
    this._updateFlipClass();

    this.dispatchEvent(new CustomEvent('card-flip', {
      detail: { gameId: this.gameId, isFlipped: this._isFlipped },
      bubbles: true,
      composed: true
    }));
  }

  _updateFlipClass() {
    const inner = this.querySelector('.flip-card-inner');
    if (inner) {
      if (this._isFlipped) inner.classList.add('flipped');
      else inner.classList.remove('flipped');
    }
  }

  _handleClick(e) {
    // 1. Bouton bascule flip (sync)
    const flipBtn = e.target.closest('.btn-card-flip-toggle');
    if (flipBtn) {
      e.stopPropagation();
      this.flip(true);
      return;
    }

    // 2. Bouton réglages (roue crantée)
    const settingsBtn = e.target.closest('.btn-card-gear');
    if (settingsBtn) {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('game-configure', {
        detail: { gameId: this.gameId },
        bubbles: true,
        composed: true
      }));
      return;
    }

    // 3. Clic sur une cellule de variante au dos
    const variantBtn = e.target.closest('.btn-variant-cell');
    if (variantBtn) {
      e.stopPropagation();
      const variantId = variantBtn.getAttribute('data-variant-id');
      this._selectVariant(variantId);
      return;
    }

    // 4. Clic sur la face avant : sélectionne la carte
    if (!this._isFlipped) {
      const curVar = this._getCurrentVariantObj();
      this.dispatchEvent(new CustomEvent('game-select', {
        detail: {
          gameId: this.gameId,
          variantId: this.currentVariantId,
          variantTitle: curVar?.title || this.getAttribute('title') || this.gameId,
          variantOptions: curVar?.options || {}
        },
        bubbles: true,
        composed: true
      }));
    }
  }

  _selectVariant(variantId) {
    const vars = this.variants;
    const variant = vars.find(v => v.id === variantId);
    if (!variant) return;

    this.currentVariantId = variantId;
    this._updateVariantDisplay();

    // Retournement 3D fluide vers la face avant
    this.flip(false);

    // Émettre l'événement de changement de variante & sélection
    this.dispatchEvent(new CustomEvent('game-variant-change', {
      detail: {
        gameId: this.gameId,
        variantId: variant.id,
        variantTitle: variant.title,
        variantOptions: variant.options || {}
      },
      bubbles: true,
      composed: true
    }));

    this.dispatchEvent(new CustomEvent('game-select', {
      detail: {
        gameId: this.gameId,
        variantId: variant.id,
        variantTitle: variant.title,
        variantOptions: variant.options || {}
      },
      bubbles: true,
      composed: true
    }));
  }

  _updateVariantDisplay() {
    const curVariant = this._getCurrentVariantObj();
    if (!curVariant) return;

    const titleEl = this.querySelector('.tile-game-title');
    if (titleEl) {
      titleEl.textContent = curVariant.title || this.getAttribute('title') || this.gameId;
    }

    const badgeEl = this.querySelector('.tile-variant-badge');
    if (badgeEl) {
      badgeEl.textContent = curVariant.badge || curVariant.subtitle || '';
    }

    // Mettre à jour l'état actif des boutons de variante au dos
    const curId = this.currentVariantId;
    this.querySelectorAll('.btn-variant-cell').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-variant-id') === curId);
    });
  }

  _getCurrentVariantObj() {
    const vars = this.variants;
    if (!vars || vars.length === 0) return null;
    const curId = this.currentVariantId;
    return vars.find(v => v.id === curId) || vars[0];
  }

  _escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render() {
    const isSel = this.selected;
    const gameId = this.gameId;
    const glow = this.getAttribute('glow') || 'neon';
    const category = this.getAttribute('category') || gameId;
    const badgeMain = this.getAttribute('badge-main') || 'OFFICIEL';
    const subtitle = this.getAttribute('subtitle') || this.getAttribute('desc') || '';
    const hasSettings = this.hasSettings;
    const hasVariants = this.hasVariants;
    const variants = this.variants;
    const curVariant = this._getCurrentVariantObj();

    // Déterminer le titre et le badge affichés sur la face avant
    let displayTitle = this.getAttribute('title') || gameId;
    let displayBadge = badgeMain;

    if (curVariant) {
      displayTitle = curVariant.title || displayTitle;
      displayBadge = curVariant.badge || curVariant.subtitle || badgeMain;
    }

    const svgWatermark = GAME_WATERMARKS[gameId] || GAME_WATERMARKS.Practice;

    this.innerHTML = `
      <div class="flip-card-container ${isSel ? 'selected' : ''}" data-game-id="${this._escapeHtml(gameId)}">
        <div class="flip-card-inner rounded-xl ${this._isFlipped ? 'flipped' : ''}">

          <!-- Face Avant (Visible au repos, lancement direct & clic sélection) -->
          <article class="card-face card-front bg-surface-high border-2 border-${this._escapeHtml(glow)} p-3 flex flex-col justify-between shadow-lg relative group select-none cursor-pointer active:scale-[0.98] ${isSel ? 'selected' : ''} glow-${this._escapeHtml(glow)}" role="button" tabindex="0" aria-label="${this._escapeHtml(displayTitle)}">

            <!-- Filigrane Monochrome SVG -->
            <div class="tile-watermark-svg">
              ${svgWatermark}
            </div>

            <!-- Accent Glow & Border -->
            <div class="tile-glow-orb glow-${this._escapeHtml(glow)}"></div>
            <div class="tile-accent-border border-${this._escapeHtml(glow)}"></div>

            <!-- Header Carte -->
            <div class="tile-top-row relative z-10">
              <span class="tile-badge-main badge-${this._escapeHtml(glow)}">
                <span class="tile-badge-dot dot-${this._escapeHtml(glow)}"></span>
                ${this._escapeHtml(badgeMain)}
              </span>
              <div class="tile-top-actions flex items-center gap-1">
                ${hasVariants ? `
                  <button type="button" class="btn-card-flip-toggle" title="${variants.length} Variantes disponibles">
                    <span class="material-symbols-outlined icon-sync">sync</span>
                    <span class="flip-badge">${variants.length} VAR.</span>
                  </button>
                ` : ''}
                ${hasSettings ? `
                  <button type="button" class="btn-card-gear" title="Options et règles de jeu" aria-label="Configurer ${this._escapeHtml(displayTitle)}">
                    <span class="material-symbols-outlined">settings</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Main Body -->
            <div class="tile-center-col my-auto py-1 relative z-10">
              <div class="tile-title-row">
                <h2 class="tile-game-title">${this._escapeHtml(displayTitle)}</h2>
                ${displayBadge ? `<span class="tile-variant-badge badge-${this._escapeHtml(glow)}">${this._escapeHtml(displayBadge)}</span>` : ''}
              </div>
              ${subtitle ? `<p class="tile-subtitle-desc">${this._escapeHtml(subtitle)}</p>` : ''}
            </div>
          </article>

          <!-- Face Arrière (Grille 2x2 des variantes au flip 3D sans header) -->
          ${hasVariants ? `
            <article class="card-face card-back bg-surface-container-high border-2 border-${this._escapeHtml(glow)} p-2 flex flex-col shadow-2xl relative select-none">
              <div class="card-back-variants-grid">
                ${variants.map(v => {
                  const isActive = v.id === this.currentVariantId;
                  return `
                    <button type="button" class="btn-variant-cell ${isActive ? 'active' : ''} glow-${this._escapeHtml(glow)}" data-variant-id="${this._escapeHtml(v.id)}">
                      <span class="variant-cell-title">${this._escapeHtml(v.title)}</span>
                      <span class="variant-cell-sub">${this._escapeHtml(v.subtitle || v.badge || '')}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </article>
          ` : ''}

        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-game-card')) {
  customElements.define('m-game-card', GameCard);
}
if (!customElements.get('game-card')) {
  try {
    customElements.define('game-card', GameCard);
  } catch (e) {
    customElements.define('game-card', class extends GameCard {});
  }
}
