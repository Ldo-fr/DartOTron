/**
 * DartOTron CyberHUD Virtual Keyboard (<virtual-keyboard>)
 * Clavier virtuel tactile CyberHUD plein écran / overlay W3C Custom Element.
 * Conçu pour les bornes d'arcade / interfaces tactiles sans clavier physique.
 * 
 * Fonctionnalités :
 * - Disposition AZERTY optimisée :
 *   - Ligne 1 : chiffres (sans MAJ) / symboles (avec MAJ : - _ @ # & ( ) / . !)
 *   - Lignes 2 & 3 : lettres AZERTY (minuscules sans MAJ / majuscules avec MAJ)
 *   - Ligne 4 : [MAJ] w x c v b n [ESPACE] [EFFACER] (lettres de largeur strictement identique aux lignes 1-3)
 * - Mode Pavé Numérique dédié (détecté automatiquement sur <input type="number">).
 * - Intercepteur global : clic/tap sur n'importe quel <input> ouvre l'overlay.
 * - Son de clic unique synchronisé avec le retour haptique/audio global.
 * - Z-index 2000 superposé à toutes les modales, sous-modales et backdrops.
 */

const KEYBOARD_LAYOUTS = {
  azerty: {
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    symbols: ['-', '_', '@', '#', '&', '(', ')', '/', '.', '!'],
    row2Lower: ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    row2Upper: ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    row3Lower: ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    row3Upper: ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    row4Lower: ['w', 'x', 'c', 'v', 'b', 'n'],
    row4Upper: ['W', 'X', 'C', 'V', 'B', 'N']
  },
  qwerty: {
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    symbols: ['-', '_', '@', '#', '&', '(', ')', '/', '.', '!'],
    row2Lower: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    row2Upper: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    row3Lower: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    row3Upper: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    row4Lower: ['z', 'x', 'c', 'v', 'b', 'n'],
    row4Upper: ['Z', 'X', 'C', 'V', 'B', 'N']
  },
  qwertz: {
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    symbols: ['-', '_', '@', '#', '&', '(', ')', '/', '.', '!'],
    row2Lower: ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
    row2Upper: ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
    row3Lower: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    row3Upper: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    row4Lower: ['y', 'x', 'c', 'v', 'b', 'n'],
    row4Upper: ['Y', 'X', 'C', 'V', 'B', 'N']
  }
};

const NUMERIC_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['-', '0', '.', '⌫']
];

export class VirtualKeyboard extends HTMLElement {
  static instance = null;

  static getInstance() {
    return VirtualKeyboard.instance || document.querySelector('o-virtual-keyboard, virtual-keyboard');
  }

  constructor(audioManager = null) {
    super();
    if (VirtualKeyboard.instance && VirtualKeyboard.instance.isConnected) {
      return VirtualKeyboard.instance;
    }
    VirtualKeyboard.instance = this;
    this.audio = audioManager;
    this.value = '';
    this.maxLength = 32;
    this.mode = 'text'; // 'text' ou 'numeric'
    this.shiftActive = false; // MAJ désactivé par défaut
    this.onConfirm = null;
    this.targetInput = null;
    this._globalBound = false;
  }

  get i18n() {
    return (typeof window !== 'undefined' && (window.dartotronApp?.i18n || window.app?.i18n || window.dartotron?.i18n));
  }

  get activeLayoutType() {
    const lang = (this.i18n?.currentLang || (typeof document !== 'undefined' ? document.documentElement?.lang : '') || 'fr').toLowerCase();
    if (lang.startsWith('de')) return 'qwertz';
    if (lang.startsWith('en') || lang.startsWith('nl')) return 'qwerty';
    return 'azerty';
  }

  connectedCallback() {
    this.classList.add('vk-overlay', 'hidden');
    this._handleI18n = () => {
      this.render();
      this.bindEvents();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('i18n:change', this._handleI18n);
    }
    this.render();
    this.bindEvents();
    this.attachGlobalInputInterceptor();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined' && this._handleI18n) {
      window.removeEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined' && this._handleI18n) {
      document.removeEventListener('i18n:change', this._handleI18n);
    }
  }

  render() {
    const i18n = this.i18n;
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');

    const lblTitle = i18n ? i18n.t('vk.title') : (isEn ? 'INPUT' : 'SAISIE');
    const lblClear = i18n ? i18n.t('vk.clear') : (isEn ? 'CLEAR' : 'VIDER');
    const lblCancel = i18n ? i18n.t('vk.cancel') : (isEn ? 'CANCEL' : 'ANNULER');
    const lblValidate = i18n ? i18n.t('vk.validate') : (isEn ? 'CONFIRM' : 'VALIDER');

    this.innerHTML = `
      <div class="vk-container">
        <div class="vk-header">
          <div class="vk-title" id="vk-title">${lblTitle}</div>
          <div class="vk-display-box">
            <span id="vk-display-text" class="vk-display-text"></span>
            <span class="vk-cursor">|</span>
          </div>
          <div class="vk-header-actions">
            <button type="button" class="vk-btn-action vk-btn-clear" id="vk-btn-clear">
              <span class="material-symbols-outlined">delete_sweep</span>
              <span data-i18n="vk.clear">${lblClear}</span>
            </button>
            <button type="button" class="vk-btn-action vk-btn-cancel" id="vk-btn-cancel">
              <span class="material-symbols-outlined">close</span>
              <span data-i18n="vk.cancel">${lblCancel}</span>
            </button>
            <button type="button" class="vk-btn-action vk-btn-ok" id="vk-btn-ok">
              <span class="material-symbols-outlined">check</span>
              <span data-i18n="vk.validate">${lblValidate}</span>
            </button>
          </div>
        </div>
        <div class="vk-board" id="vk-board">
          <!-- Dynamically populated rows -->
        </div>
      </div>
    `;

    this.renderBoard();
    this.updateDisplay();
  }

  renderBoard() {
    const boardEl = this.querySelector('#vk-board');
    if (!boardEl) return;

    if (this.mode === 'numeric') {
      boardEl.className = 'vk-board vk-board-numeric';
      boardEl.innerHTML = NUMERIC_ROWS.map(row => {
        const keysHtml = row.map(k => {
          let extraClass = '';
          let label = k;
          if (k === '⌫') {
            extraClass = 'vk-key-back';
            label = '<span class="material-symbols-outlined vk-back-icon">backspace</span>';
          }
          return `<button type="button" class="vk-key ${extraClass}" data-vk="${k}">${label}</button>`;
        }).join('');
        return `<div class="vk-row">${keysHtml}</div>`;
      }).join('');
    } else {
      boardEl.className = 'vk-board vk-board-text';

      const layout = KEYBOARD_LAYOUTS[this.activeLayoutType] || KEYBOARD_LAYOUTS.azerty;

      // Ligne 1 : chiffres (sans MAJ) ou symboles (avec MAJ)
      const row1Data = this.shiftActive ? layout.symbols : layout.numbers;
      const row1Html = row1Data.map(k => `<button type="button" class="vk-key" data-vk="${k}">${k}</button>`).join('');

      // Ligne 2 : lettres
      const row2Data = this.shiftActive ? layout.row2Upper : layout.row2Lower;
      const row2Html = row2Data.map(k => `<button type="button" class="vk-key" data-vk="${k}">${k}</button>`).join('');

      // Ligne 3 : lettres
      const row3Data = this.shiftActive ? layout.row3Upper : layout.row3Lower;
      const row3Html = row3Data.map(k => `<button type="button" class="vk-key" data-vk="${k}">${k}</button>`).join('');

      // Ligne 4 : [MAJ] lettres [ESPACE] [EFFACER]
      const row4Letters = this.shiftActive ? layout.row4Upper : layout.row4Lower;
      const row4LettersHtml = row4Letters.map(k => `<button type="button" class="vk-key" data-vk="${k}">${k}</button>`).join('');

      const i18n = this.i18n;
      const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
      const lblShift = i18n ? i18n.t('vk.shift') : (isEn ? 'SHIFT' : 'MAJ');
      const lblSpace = i18n ? i18n.t('vk.space') : (isEn ? 'SPACE' : 'ESPACE');
      const lblBack = i18n ? i18n.t('vk.backspace') : (isEn ? 'DELETE' : 'EFFACER');

      const shiftClass = `vk-key vk-key-shift ${this.shiftActive ? 'active' : ''}`;
      const shiftHtml = `<button type="button" class="${shiftClass}" data-vk="SHIFT"><span class="material-symbols-outlined">arrow_upward</span><span>${lblShift}</span></button>`;
      const spaceHtml = `<button type="button" class="vk-key vk-key-space" data-vk="ESPACE">${lblSpace}</button>`;
      const backHtml = `<button type="button" class="vk-key vk-key-back" data-vk="⌫"><span class="material-symbols-outlined vk-back-icon">backspace</span><span>${lblBack}</span></button>`;

      const row4Html = `${shiftHtml}${row4LettersHtml}${spaceHtml}${backHtml}`;

      boardEl.innerHTML = `
        <div class="vk-row">${row1Html}</div>
        <div class="vk-row">${row2Html}</div>
        <div class="vk-row">${row3Html}</div>
        <div class="vk-row vk-row-bottom">${row4Html}</div>
      `;
    }

    // Attache les listeners sur les touches
    boardEl.querySelectorAll('[data-vk]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.vk;
        this.handleKey(key);
      });
    });
  }

  bindEvents() {
    this.querySelector('#vk-btn-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.value = '';
      this.updateDisplay();
    });

    this.querySelector('#vk-btn-cancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.querySelector('#vk-btn-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirm();
    });

    // Clic sur le fond noir / overlay pour fermer
    this.addEventListener('click', (e) => {
      if (e.target === this) {
        this.close();
      }
    });

    // Support optionnel du clavier physique pour le debug
    window.addEventListener('keydown', (e) => {
      if (this.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleKey('⌫');
      } else if (e.key === ' ') {
        e.preventDefault();
        this.handleKey('ESPACE');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (this.value.length < this.maxLength) {
          this.value += e.key;
          this.updateDisplay();
        }
      }
    });
  }

  handleKey(key) {
    if (key === '⌫') {
      this.value = this.value.slice(0, -1);
    } else if (key === 'ESPACE') {
      if (this.value.length > 0 && this.value.length < this.maxLength && !this.value.endsWith(' ')) {
        this.value += ' ';
      }
    } else if (key === 'SHIFT') {
      this.shiftActive = !this.shiftActive;
      this.renderBoard();
      return;
    } else {
      if (this.value.length < this.maxLength) {
        this.value += key;
      }
    }
    this.updateDisplay();
  }

  updateDisplay() {
    const disp = this.querySelector('#vk-display-text');
    if (disp) disp.textContent = this.value;
  }

  confirm() {
    const finalVal = this.value.trim();
    const cb = this.onConfirm;
    const input = this.targetInput;

    this.close();

    if (input) {
      input.value = finalVal;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (cb) {
      cb(finalVal);
    }
  }

  open({
    title = null,
    initialValue = '',
    maxLength = 32,
    mode = 'text',
    onConfirm = null,
    targetInput = null
  } = {}) {
    if (!this.isConnected && document.body) {
      document.body.appendChild(this);
    }

    this.value = String(initialValue || '');
    this.maxLength = maxLength;
    this.mode = mode;
    this.shiftActive = false; // Initialisé avec MAJ inactif
    this.onConfirm = onConfirm;
    this.targetInput = targetInput;

    const i18n = this.i18n;
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    const defaultTitle = i18n ? i18n.t('vk.title') : (isEn ? 'INPUT' : 'SAISIE');

    const titleEl = this.querySelector('#vk-title');
    if (titleEl) titleEl.textContent = title || defaultTitle;

    this.renderBoard();
    this.updateDisplay();
    this.classList.remove('hidden');

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }

  close() {
    this.classList.add('hidden');
    this.onConfirm = null;
    this.targetInput = null;
  }

  attachGlobalInputInterceptor() {
    if (this._globalBound) return;
    this._globalBound = true;

    document.addEventListener('pointerdown', (e) => {
      if (this.contains(e.target)) return;

      const input = e.target.closest('input, textarea');
      if (!input) return;

      if (input.matches('[data-no-vk], [readonly], [disabled], input[type="checkbox"], input[type="radio"], input[type="file"], input[type="hidden"], input[type="range"], input[type="button"], input[type="submit"]')) {
        return;
      }

      input.setAttribute('inputmode', 'none');

      let title = input.dataset.vkTitle;
      if (!title) {
        if (input.id) {
          const lbl = document.querySelector(`label[for="${input.id}"]`);
          if (lbl) title = lbl.textContent.replace(/[*:]/g, '').trim();
        }
      }
      if (!title && input.placeholder) {
        title = input.placeholder.replace(/^Ex:\s*/i, '').trim();
      }
      if (!title && input.name) {
        title = input.name;
      }
      if (!title && input.id) {
        title = input.id.replace(/[-_]/g, ' ');
      }
      if (!title) {
        title = this.i18n ? this.i18n.t('vk.title') : (document.documentElement.lang?.startsWith('en') ? 'INPUT' : 'SAISIE');
      }
      title = title.toUpperCase();

      const maxLen = Number(input.maxLength > 0 ? input.maxLength : (input.getAttribute('maxlength') || (input.type === 'number' ? 10 : 32)));
      const isNumeric = input.type === 'number' || input.dataset.vkMode === 'numeric';
      const mode = isNumeric ? 'numeric' : 'text';

      this.open({
        title,
        initialValue: input.value || '',
        maxLength: maxLen,
        mode,
        targetInput: input
      });
    }, { passive: true });
  }
}

if (!customElements.get('o-virtual-keyboard')) {
  customElements.define('o-virtual-keyboard', VirtualKeyboard);
}
if (!customElements.get('virtual-keyboard')) {
  try {
    customElements.define('virtual-keyboard', VirtualKeyboard);
  } catch (e) {
    customElements.define('virtual-keyboard', class extends VirtualKeyboard {});
  }
}
