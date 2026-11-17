/**
 * RecordCard Component (<record-card> / <hud-record-card>)
 * Composant CyberHUD de présentation d'une catégorie de records avec son Top 3 (ou classement All-Time).
 * Utilisé sur l'écran de victoire (fin de partie) et dans l'onglet Général de la modale Records.
 */
export class RecordCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'badge', 'icon', 'color', 'unit', 'empty-text'];
  }

  constructor() {
    super();
    this._records = [];
  }

  connectedCallback() {
    this._handleI18n = () => this.render();
    if (typeof window !== 'undefined') {
      window.addEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('i18n:change', this._handleI18n);
    }
    this.render();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined' && this._handleI18n) {
      window.removeEventListener('i18n:change', this._handleI18n);
    }
    if (typeof document !== 'undefined' && this._handleI18n) {
      document.removeEventListener('i18n:change', this._handleI18n);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.render();
    }
  }

  get title() {
    return this.getAttribute('title') || 'Records';
  }

  set title(val) {
    this.setAttribute('title', val);
  }

  get badge() {
    return this.getAttribute('badge') || 'Top 3 All-Time';
  }

  set badge(val) {
    this.setAttribute('badge', val);
  }

  get icon() {
    return this.getAttribute('icon') || 'emoji_events';
  }

  set icon(val) {
    this.setAttribute('icon', val);
  }

  get color() {
    return this.getAttribute('color') || 'cyan';
  }

  set color(val) {
    this.setAttribute('color', val);
  }

  get unit() {
    return this.getAttribute('unit') || '';
  }

  set unit(val) {
    this.setAttribute('unit', val);
  }

  get emptyText() {
    return this.getAttribute('empty-text') || 'Aucun record';
  }

  set emptyText(val) {
    this.setAttribute('empty-text', val);
  }

  get records() {
    return this._records;
  }

  set records(val) {
    this._records = Array.isArray(val) ? val : [];
    this.render();
  }

  setRecords(list) {
    this.records = list;
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const title = this.title;
    const badge = this.badge;
    const icon = this.icon;
    const color = this.color;
    const unit = this.unit;
    const rows = this._records || [];
    const appI18n = (typeof window !== 'undefined' && (window.dartotronApp?.i18n || window.app?.i18n || window.dartotron?.i18n));
    const isEn = typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en');
    const newRecordLabel = appI18n ? appI18n.t('records.new_record') : (isEn ? 'NEW RECORD' : 'NOUVEAU RECORD');

    const rowsHtml = rows.length === 0
      ? `<span class="record-empty-row">${this._escapeHtml(this.emptyText)}</span>`
      : rows.map((r, idx) => {
          const isHiscore = Boolean(r.hiscore || r.isNew || r.is_new);
          const rankNum = r.rank ?? (idx + 1);
          const pName = r.playername || r.player_name || '—';
          const safeName = this._escapeHtml(pName);
          const dateStr = r.date ? String(r.date).slice(0, 10) : '';
          const scoreNum = r.score !== undefined ? Number(r.score).toFixed(1).replace(/\.0$/, '') : (r.value ?? '-');
          const isNew = isHiscore;
          const detailStr = r.details ? this._escapeHtml(r.details) : '';
          const scoreHtml = detailStr
            ? `<span class="record-detail-highlight">${detailStr}</span> <span class="record-detail-sub">(${scoreNum}${unit ? ' ' + this._escapeHtml(unit) : ''})</span>`
            : `${scoreNum}${unit ? ' ' + this._escapeHtml(unit) : ''}`;

          return `
            <div class="record-row-entry ${isHiscore ? 'is-hiscore' : ''}">
              <div class="record-entry-left">
                <span class="record-pos-pill">#${rankNum}</span>
                <player-name name="${safeName}" size="sm" ${isHiscore ? 'highlight' : ''} ${r.stat ? `stat="${this._escapeHtml(r.stat)}"` : 'show-stat="false"'}></player-name>
                ${isNew ? `<span class="record-badge-new" data-i18n="records.new_record">${newRecordLabel}</span>` : ''}
                ${!isNew && dateStr ? `<span class="record-date-tag">• ${this._escapeHtml(dateStr)}</span>` : ''}
              </div>
              <div class="record-entry-right">
                <span class="record-score-number">${scoreHtml}</span>
              </div>
            </div>
          `;
        }).join('');

    this.innerHTML = `
      <div class="record-cat-card" data-color="${this._escapeHtml(color)}">
        <div class="record-cat-header">
          <div class="record-cat-title-group">
            <span class="material-symbols-outlined">${this._escapeHtml(icon)}</span>
            <span class="record-cat-title">${this._escapeHtml(title)}</span>
          </div>
          <span class="record-cat-badge">${this._escapeHtml(badge)}</span>
        </div>
        <div class="record-card-list">
          ${rowsHtml}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('m-record-card')) {
  customElements.define('m-record-card', RecordCard);
}
if (!customElements.get('record-card')) {
  try {
    customElements.define('record-card', RecordCard);
  } catch (e) {
    customElements.define('record-card', class extends RecordCard {});
  }
}
if (!customElements.get('hud-record-card')) {
  try {
    customElements.define('hud-record-card', RecordCard);
  } catch (e) {
    customElements.define('hud-record-card', class extends RecordCard {});
  }
}

