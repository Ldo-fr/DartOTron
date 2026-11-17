/**
 * DartOTron Internationalization (i18n) Engine
 * File: public/js/lib/i18n.js
 *
 * Moteur client léger et réactif d'internationalisation :
 * - Chargement dynamique des dictionnaires JSON hiérarchiques (/i18n/{lang}.json)
 * - Résolution par dot-notation (ex: 'lobby.start_game') avec interpolation ({param})
 * - Repli automatique (fallback) vers le français ('fr') si une clé est manquante
 * - Traduction déclarative du DOM via data-i18n et data-i18n-attr
 * - Émission de l'événement global 'i18n:change' pour mise à jour réactive sans rechargement
 */

export class I18nEngine {
  constructor() {
    this.currentLang = 'fr';
    this.fallbackLang = 'fr';
    this.dictionaries = new Map();
    this._initialized = false;
  }

  /**
   * Normalise un code de langue (ex: 'fr_FR' -> 'fr', 'en-US' -> 'en').
   */
  normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'fr';
    const clean = lang.toLowerCase().trim().replace('_', '-');
    if (clean.startsWith('en')) return 'en';
    if (clean.startsWith('fr')) return 'fr';
    if (clean.startsWith('nl')) return 'nl';
    if (clean.startsWith('de')) return 'de';
    return 'fr';
  }

  /**
   * Charge un dictionnaire JSON depuis /i18n/{lang}.json
   */
  async loadLanguage(lang) {
    const normalized = this.normalizeLang(lang);
    if (this.dictionaries.has(normalized)) {
      return this.dictionaries.get(normalized);
    }

    try {
      const res = await fetch(`/i18n/${normalized}.json`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} chargement /i18n/${normalized}.json`);
      }
      const data = await res.json();
      this.dictionaries.set(normalized, data);
      return data;
    } catch (err) {
      console.warn(`[i18n] Échec chargement dictionnaire '${normalized}':`, err.message);
      if (normalized !== this.fallbackLang && !this.dictionaries.has(this.fallbackLang)) {
        await this.loadLanguage(this.fallbackLang);
      }
      return this.dictionaries.get(this.fallbackLang) || {};
    }
  }

  /**
   * Initialise le moteur avec la langue demandée (défaut 'fr').
   */
  async init(lang = 'fr') {
    const target = this.normalizeLang(lang);
    await this.loadLanguage(this.fallbackLang);
    if (target !== this.fallbackLang) {
      await this.loadLanguage(target);
    }
    this.currentLang = this.dictionaries.has(target) ? target : this.fallbackLang;
    this._initialized = true;

    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.currentLang;
      this.translateDOM(document);
    }

    return this.currentLang;
  }

  /**
   * Modifie la langue active à chaud, traduit le DOM et notifie l'application.
   */
  async setLanguage(lang) {
    const target = this.normalizeLang(lang);
    if (!this.dictionaries.has(target)) {
      await this.loadLanguage(target);
    }
    this.currentLang = this.dictionaries.has(target) ? target : this.fallbackLang;

    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.currentLang;
      this.translateDOM(document);

      const event = new CustomEvent('i18n:change', {
        detail: { lang: this.currentLang, i18n: this },
        bubbles: true,
        composed: true
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    }

    return this.currentLang;
  }

  /**
   * Résout une clé par dot-notation dans un dictionnaire.
   */
  _resolveKey(dict, key) {
    if (!dict || !key) return undefined;
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  /**
   * Traduit une clé dot-notation (ex: 'lobby.start_game') avec interpolation ({name}).
   */
  t(key, params = {}, fallback = null) {
    if (!key) return '';

    const activeDict = this.dictionaries.get(this.currentLang) || {};
    let val = this._resolveKey(activeDict, key);

    // Repli sur le dictionnaire de fallback si non trouvé
    if (val === undefined && this.currentLang !== this.fallbackLang) {
      const fbDict = this.dictionaries.get(this.fallbackLang) || {};
      val = this._resolveKey(fbDict, key);
    }

    if (val === undefined || val === null) {
      return fallback !== null ? fallback : key;
    }

    if (typeof val !== 'string') {
      return String(val);
    }

    if (params && Object.keys(params).length > 0) {
      return val.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] !== undefined ? String(params[paramName]) : match;
      });
    }

    return val;
  }

  /**
   * Vérifie si une clé de traduction existe pour la langue active ou le fallback.
   */
  has(key) {
    if (!key) return false;
    const activeDict = this.dictionaries.get(this.currentLang);
    if (activeDict && this._resolveKey(activeDict, key) !== undefined) return true;
    const fbDict = this.dictionaries.get(this.fallbackLang);
    return fbDict ? this._resolveKey(fbDict, key) !== undefined : false;
  }

  /**
   * Parcourt et traduit tous les éléments balisés dans le DOM.
   * - [data-i18n="cle"] : remplace le textContent (ou innerHTML si [data-i18n-html])
   * - [data-i18n-attr="attr:cle;attr2:cle2"] : traduit les attributs (ex: placeholder, aria-label, title)
   */
  translateDOM(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    // 1. Traduction du contenu texte
    const textEls = root.querySelectorAll('[data-i18n]');
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const isHtml = el.hasAttribute('data-i18n-html');
      const text = this.t(key);
      if (isHtml) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    });

    // 2. Traduction des attributs
    const attrEls = root.querySelectorAll('[data-i18n-attr]');
    attrEls.forEach(el => {
      const attrSpec = el.getAttribute('data-i18n-attr');
      if (!attrSpec) return;
      // Format: "placeholder:cle.placeholder;aria-label:cle.aria;label:cle.label"
      const pairs = attrSpec.split(';');
      for (const pair of pairs) {
        const [attr, key] = pair.split(':').map(s => s?.trim());
        if (attr && key) {
          const val = this.t(key);
          el.setAttribute(attr, val);
        }
      }
    });
  }
}

export const i18n = new I18nEngine();
