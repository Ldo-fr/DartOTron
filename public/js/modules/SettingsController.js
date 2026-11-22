/**
 * Contrôleur Réglages, Cible USB, Calibration & Records DartOTron (public/js/modules/SettingsController.js)
 * Gère la modale unifiée de réglages, l'assistant de calibration, et le catalogue/leaderboard des records.
 */

import { DartboardSVG } from '../dartboard-svg.js';

export class SettingsController {
  constructor(app) {
    this.app = app;
    this.draftSettings = {};
    this.wizardOpen = false;
    this.wizardStep = 0;
    this.wizardKeys = {};
    this.wizardBoard = null;
    this.recordDefinitions = [];
    this.pendingDeleteRecordDefId = null;
    this.recordDefIdManuallyEdited = false;
    this.selectedRecordsPlayer = null;
    this.selectedRecordsGame = '';
    this.recordsVariants = { ho_one: '501', cricket: 'standard' };
  }

  /* ==================== MODALE DE RÉGLAGES ==================== */
  openSettingsModal(initialTab = 'audio') {
    const globals = this.app.config?.SectionGlobals || {};
    const rawRelease = Number(globals.releasedartstime);
    const releaseTime = !isNaN(rawRelease) && rawRelease >= 3000 ? rawRelease : 10000;
    this.draftSettings = {
      serialport: globals.serialport || '/dev/ttyACM0',
      serialspeed: Number(globals.serialspeed || 9600),
      soundvolume: Number(globals.soundvolume ?? 100),
      releasedartstime: releaseTime,
      onscreenbuttons: globals.onscreenbuttons !== false && globals.onscreenbuttons !== 'false',
      autoupdate: globals.autoupdate === true || globals.autoupdate === 'true',
      locale: this.app.i18n?.currentLang || globals.locale || 'fr'
    };

    this.renderSettingsModalControls();
    this.switchSettingsTab(initialTab);
    document.getElementById('modal-settings')?.classList.remove('hidden');
  }

  async closeSettingsModal() {
    await this.stopCalibrationWizard();
    document.getElementById('modal-settings')?.classList.add('hidden');
    this.app.applyThemeAndAudio();
  }

  updateTabVisual(btn, isActive) {
    if (!btn) return;
    btn.classList.toggle('active-tab', isActive);
    btn.classList.toggle('inactive-tab', !isActive);
    const cover = btn.querySelector('.tab-bottom-cover');
    if (cover) cover.classList.toggle('hidden', !isActive);
    const indicator = btn.querySelector('.tab-indicator');
    if (indicator) indicator.classList.toggle('hidden', !isActive);
  }

  switchSettingsTab(tabName) {
    const tabs = document.getElementById('settings-tabs');
    if (tabs && typeof tabs.selectTab === 'function') {
      tabs.selectTab(tabName, false);
    } else {
      const audioBtn = document.getElementById('tab-btn-settings-audio');
      const serialBtn = document.getElementById('tab-btn-settings-serial');
      const calibBtn = document.getElementById('tab-btn-settings-calib');

      this.updateTabVisual(audioBtn, tabName === 'audio');
      this.updateTabVisual(serialBtn, tabName === 'serial');
      this.updateTabVisual(calibBtn, tabName === 'calib');

      document.getElementById('settings-view-audio')?.classList.toggle('hidden', tabName !== 'audio');
      document.getElementById('settings-view-serial')?.classList.toggle('hidden', tabName !== 'serial');
      document.getElementById('settings-view-calib')?.classList.toggle('hidden', tabName !== 'calib');
    }

    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnSaveCalib = document.getElementById('btn-save-calibration');
    if (btnSaveSettings) btnSaveSettings.classList.toggle('hidden', tabName === 'calib');
    if (btnSaveCalib) btnSaveCalib.classList.toggle('hidden', tabName !== 'calib');

    if (tabName === 'calib') {
      this.startCalibrationWizard();
    } else {
      this.stopCalibrationWizard();
    }
  }

  renderSettingsModalControls() {
    const s = this.draftSettings;

    const settingMute = document.getElementById('setting-sound-mute');
    if (settingMute) {
      settingMute.checked = !Boolean(this.app.audio.muted);
    }

    const settingVol = document.getElementById('setting-sound-volume');
    if (settingVol) {
      settingVol.value = Number(s.soundvolume ?? 100);
    }

    const settingTouch = document.getElementById('setting-onscreen-buttons') || document.getElementById('setting-touch-buttons');
    if (settingTouch) {
      settingTouch.checked = Boolean(s.onscreenbuttons);
    }

    const settingAutoUpdate = document.getElementById('setting-auto-update');
    if (settingAutoUpdate) {
      settingAutoUpdate.checked = Boolean(s.autoupdate);
    }

    const settingRelease = document.getElementById('setting-release-darts-time');
    if (settingRelease) {
      settingRelease.value = String(s.releasedartstime || 10000);
    }

    // Sélecteur tactile de langue (Français / English / Nederlands / Deutsch)
    const curLang = this.app.i18n?.normalizeLang(s.locale || this.app.config?.SectionGlobals?.locale || 'fr') || 'fr';
    document.querySelectorAll('#settings-lang-selector [data-lang]').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === curLang);
    });

    // Liste des ports USB disponibles
    const portContainer = document.getElementById('settings-port-pills');
    if (portContainer) {
      const defaultPorts = ['/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0', '/dev/ttyAMA0'];
      const currentPort = s.serialport || this.app.config?.SectionGlobals?.serialport || '/dev/ttyACM0';
      const ports = Array.from(
        new Set([
          currentPort,
          ...(this.app.serialStatus?.availablePorts || []),
          ...defaultPorts
        ])
      ).filter(Boolean);

      const existingButtons = Array.from(portContainer.querySelectorAll('[data-port-val]'));
      const existingPorts = existingButtons.map(b => b.dataset.portVal);
      const isSameList = existingPorts.length === ports.length && existingPorts.every((p, idx) => p === ports[idx]);

      if (!isSameList) {
        portContainer.innerHTML = ports
          .map(p => `
            <button type="button" class="hud-preset-pill ${p === currentPort ? 'active' : ''}" data-port-val="${this.app.escapeHtml(p)}" tabindex="0">
              <span class="material-symbols-outlined u-icon-14 u-pointer-events-none">usb</span>
              <span class="u-pointer-events-none">${this.app.escapeHtml(p)}</span>
            </button>
          `)
          .join('');

        portContainer.querySelectorAll('[data-port-val]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('[data-port-val]');
            if (!targetBtn) return;
            const chosenPort = targetBtn.dataset.portVal;
            this.draftSettings.serialport = chosenPort;

            portContainer.querySelectorAll('[data-port-val]').forEach(b => {
              b.classList.toggle('active', b.dataset.portVal === chosenPort);
            });
            targetBtn.focus();
          });
        });
      } else {
        existingButtons.forEach(b => {
          b.classList.toggle('active', b.dataset.portVal === currentPort);
        });
      }
    }

    // Vitesse en Bauds (Baudrate)
    const baudContainer = document.getElementById('settings-baud-pills');
    if (baudContainer) {
      const currentSpeed = Number(s.serialspeed || this.app.config?.SectionGlobals?.serialspeed || 9600);
      baudContainer.querySelectorAll('[data-baud]').forEach(btn => {
        const baud = Number(btn.dataset.baud);
        btn.classList.toggle('active', baud === currentSpeed);
      });
    }

    this.refreshSerialStatusUI();
    this.refreshUpdateStatusUI();
  }

  refreshUpdateStatusUI() {
    const u = this.app.updateStatus;
    const i18n = this.app.i18n;
    const versionBadge = document.getElementById('settings-current-version');
    const statusText = document.getElementById('settings-update-status-text');
    const btnCheck = document.getElementById('btn-update-check');
    const btnDownload = document.getElementById('btn-update-download');
    const btnDownloadLabel = document.getElementById('btn-update-download-label');
    const btnRestart = document.getElementById('btn-update-restart');

    if (!u) return;

    const curTag = u.currentVersion ? `v${u.currentVersion}` : 'v1.0.0';
    const latTag = u.latestTag || (u.latestVersion ? `v${u.latestVersion}` : curTag);
    const dlTag = u.downloadedVersion ? `v${u.downloadedVersion}` : latTag;

    if (versionBadge) {
      versionBadge.textContent = curTag;
    }

    if (statusText) {
      statusText.classList.remove('is-available', 'is-ready', 'is-error');
      if (this.app.restartingForUpdate) {
        statusText.textContent = i18n?.t('settings.updates.status_restarting', {}, 'Redémarrage en cours...');
        statusText.classList.add('is-ready');
      } else if (u.status === 'checking') {
        statusText.textContent = i18n?.t('settings.updates.status_checking', {}, 'Recherche d\'une mise à jour...');
      } else if (u.status === 'downloading') {
        statusText.textContent = i18n?.t('settings.updates.status_downloading', { version: latTag }, `Téléchargement de ${latTag}...`);
        statusText.classList.add('is-available');
      } else if (u.status === 'downloaded') {
        statusText.textContent = i18n?.t('settings.updates.status_downloaded', { version: dlTag }, `Mise à jour ${dlTag} prête — sera installée au prochain démarrage`);
        statusText.classList.add('is-ready');
      } else if (u.status === 'available') {
        statusText.textContent = i18n?.t('settings.updates.status_available', { version: latTag }, `Mise à jour ${latTag} disponible`);
        statusText.classList.add('is-available');
      } else if (u.status === 'up_to_date') {
        statusText.textContent = i18n?.t('settings.updates.status_up_to_date', { version: curTag }, `DartOTron est à jour (${curTag})`);
      } else if (u.status === 'error') {
        statusText.textContent = i18n?.t('settings.updates.status_error', { error: u.error || 'réseau' }, `Vérification impossible (${u.error || 'réseau'})`);
        statusText.classList.add('is-error');
      } else {
        statusText.textContent = i18n?.t('settings.updates.status_idle', {}, 'Vérification disponible');
      }
    }

    const busy = u.status === 'checking' || u.status === 'downloading' || this.app.restartingForUpdate;
    if (btnCheck) {
      btnCheck.disabled = busy;
    }
    if (btnDownload) {
      const showDownload = u.status === 'available' && !u.downloaded;
      btnDownload.classList.toggle('hidden', !showDownload);
      btnDownload.disabled = busy;
      if (btnDownloadLabel && showDownload) {
        btnDownloadLabel.textContent = i18n?.t('settings.updates.btn_download_version', { version: latTag }, `Télécharger ${latTag}`);
      }
    }
    if (btnRestart) {
      const showRestart = u.status === 'downloaded' && !this.app.restartingForUpdate;
      btnRestart.classList.toggle('hidden', !showRestart);
      btnRestart.disabled = busy;
    }
  }

  async checkUpdatesManually() {
    try {
      const res = await fetch('/api/update/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDownload: false })
      });
      const status = await res.json();
      if (status) {
        this.app.handleUpdateStatus(status);
      }
    } catch (err) {
      this.app.notify({
        title: this.app.i18n?.t('settings.updates.notif_error_title', {}, 'ERREUR MISE À JOUR'),
        subtitle: err.message,
        icon: 'error',
        type: 'danger',
        duration: 5000
      });
    }
  }

  async downloadUpdateManually() {
    try {
      const res = await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const status = await res.json();
      if (status) {
        this.app.handleUpdateStatus(status);
      }
    } catch (err) {
      this.app.notify({
        title: this.app.i18n?.t('settings.updates.notif_error_title', {}, 'ERREUR MISE À JOUR'),
        subtitle: err.message,
        icon: 'error',
        type: 'danger',
        duration: 5000
      });
    }
  }

  async restartForUpdate() {
    this.app.restartingForUpdate = true;
    this.refreshUpdateStatusUI();
    try {
      await fetch('/api/update/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch {
      // Le serveur coupe la connexion lors de l'arrêt
    }
  }

  refreshSerialStatusUI() {
    const status = this.app.serialStatus;
    const dot = document.getElementById('serial-dot');
    const text = document.getElementById('serial-text');
    const pill = document.getElementById('btn-serial-status');
    const i18n = this.app.i18n;

    if (dot && text) {
      if (status && status.connected) {
        dot.className = 'status-dot connected';
        const conn = i18n ? i18n.t('settings.serial.connected') : 'Connectée';
        text.textContent = `${conn} (${status.port || 'USB'})`;
        pill?.classList.add('connected');
      } else {
        dot.className = 'status-dot disconnected';
        const disconn = i18n ? i18n.t('settings.serial.disconnected') : 'Non connectée';
        text.textContent = status?.error ? `Erreur (${status.error})` : disconn;
        pill?.classList.remove('connected');
      }
    }
  }

  async saveSettingsDraft() {
    const globals = this.app.config?.SectionGlobals || {};
    const settingRelease = document.getElementById('setting-release-darts-time');
    const parsedRelease = Number(settingRelease?.value);
    const releaseTime = !isNaN(parsedRelease) && parsedRelease >= 3000 ? parsedRelease : 10000;

    const newGlobals = {
      ...globals,
      soundvolume: Number(this.draftSettings.soundvolume ?? 100),
      onscreenbuttons: Boolean(this.draftSettings.onscreenbuttons),
      autoupdate: Boolean(this.draftSettings.autoupdate),
      releasedartstime: releaseTime,
      serialport: this.draftSettings.serialport || globals.serialport || '/dev/ttyACM0',
      serialspeed: Number(this.draftSettings.serialspeed || globals.serialspeed || 9600),
      locale: this.draftSettings.locale || globals.locale || 'fr'
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SectionGlobals: newGlobals,
          reconnectSerial: true
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erreur sauvegarde');
      }

      this.app.config = {
        ...this.app.config,
        SectionGlobals: newGlobals
      };
      if (this.app.i18n && newGlobals.locale) {
        await this.app.i18n.setLanguage(newGlobals.locale);
      }
      this.app.applyThemeAndAudio();
      this.closeSettingsModal();
      this.app.notify({
        title: this.app.i18n?.t('settings.saved_success', {}, 'CONFIGURATION ENREGISTRÉE'),
        subtitle: this.app.i18n?.t('settings.saved_desc', {}, 'Les paramètres système ont été synchronisés'),
        icon: 'tune',
        type: 'info'
      });
    } catch (err) {
      this.app.notify({
        title: this.app.i18n?.t('settings.save_error', {}, 'ERREUR SAUVEGARDE'),
        subtitle: err.message,
        icon: 'error',
        type: 'danger'
      });
    }
  }

  /* ==================== GESTION DES DÉFINITIONS DE RECORDS ==================== */
  async loadRecordDefinitions() {
    try {
      const res = await fetch('/api/records/definitions');
      const data = await res.json();
      this.recordDefinitions = data.definitions || [];
    } catch {
      this.recordDefinitions = [];
    }
    this.renderRecordDefinitions();
  }

  renderRecordDefinitions() {
    const container = document.getElementById('records-definitions-list');
    if (!container) return;

    const PATTERN_LABELS = {
      triples_same: '3 Triples Identiques',
      triples_any: '3 Triples Quelconques',
      hat_trick: '3 Bulls (Hat-trick)',
      consecutive_suite: 'Suite de 3 Chiffres',
      shanghai: 'Shanghai (S+D+T même chiffre)',
      simple_double_triple: 'Simple + Double + Triple',
      ton_80: '180 (3 × T20)',
      none: 'Statistique'
    };

    const GAME_SECTIONS = [
      { key: '*', title: 'Multi-jeux (Tous les jeux)', icon: 'all_inclusive' },
      { key: 'Ho_One', title: 'Ho One (X01)', icon: 'track_changes' },
      { key: 'Cricket', title: 'Cricket', icon: 'sports_cricket' },
      { key: '321_Zlip', title: '321 Zlip', icon: 'flash_on' },
      { key: 'By_Fives', title: 'By Fives', icon: 'looks_5' },
      { key: 'Kinito', title: 'Kinito', icon: 'casino' },
      { key: 'Practice', title: 'Practice', icon: 'fitness_center' }
    ];

    const defs = this.recordDefinitions || [];

    container.innerHTML = GAME_SECTIONS.map(sec => {
      const gameDefs = defs.filter(d => (d.game_name || '*') === sec.key);
      const rowsHtml = gameDefs.length === 0
        ? `<div class="record-def-empty">Aucun record configuré pour ce jeu</div>`
        : gameDefs.map(rd => {
            const isSystem = Boolean(Number(rd.is_system) === 1);
            let typeBadge = '';
            if (rd.calc_type === 'preference' || ['fav_triple', 'fav_game', 'fav_double', 'fav_number'].includes(rd.pattern)) {
              typeBadge = `<span class="record-def-pattern-badge pattern-badge--amber">Affinité / Profil</span>`;
            } else if (rd.calc_type === 'match_result') {
              const condLabel = rd.match_condition === 'loss' ? 'Défaite' : (rd.match_condition === 'win' ? 'Victoire' : 'Fin de match');
              typeBadge = `<span class="record-def-pattern-badge pattern-badge--cyan">${condLabel}</span>`;
            } else if (rd.pattern && rd.pattern !== 'none') {
              typeBadge = `<span class="record-def-pattern-badge">${this.app.escapeHtml(PATTERN_LABELS[rd.pattern] || rd.pattern)}</span>`;
            }
            const statusBadge = isSystem
              ? `<span class="record-def-badge system">Système</span>`
              : `<span class="record-def-badge custom">Personnalisé</span>`;
            const sortLabel = rd.sort_order === 'ASC' ? 'Croissant (min)' : 'Décroissant (max)';

            const actionBtn = isSystem
              ? `<button type="button" class="btn-def-locked" disabled title="Les records système sont protégés">
                   <span class="material-symbols-outlined">lock</span>
                 </button>`
              : `<button type="button" class="btn-def-delete" data-record-id="${this.app.escapeHtml(rd.id)}" data-record-name="${this.app.escapeHtml(rd.name)}" title="Supprimer ce type de record">
                   <span class="material-symbols-outlined">delete_forever</span>
                 </button>`;

            return `
              <div class="record-def-card">
                <div class="record-def-info">
                  <div class="record-def-title-row">
                    <span class="record-def-name">${this.app.escapeHtml(rd.name)}</span>
                    ${statusBadge}
                    ${typeBadge}
                  </div>
                  <div class="record-def-meta">
                    <span>Code : <code>${this.app.escapeHtml(rd.id)}</code></span>
                    <span>•</span>
                    <span>Unité : <strong>${this.app.escapeHtml(rd.unit || 'fois')}</strong></span>
                    <span>•</span>
                    <span>Classement : <strong>${this.app.escapeHtml(sortLabel)}</strong></span>
                  </div>
                </div>
                <div class="record-def-actions">
                  ${actionBtn}
                </div>
              </div>
            `;
          }).join('');

      return `
        <div class="hud-settings-block">
          <div class="settings-block-header">
            <div class="settings-header-title">
              <span class="material-symbols-outlined text-bullseye-neon">${sec.icon}</span>
              <h3>${this.app.escapeHtml(sec.title)}</h3>
            </div>
          </div>
          <div class="settings-block-content">
            ${rowsHtml}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-def-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.recordId;
        const name = btn.dataset.recordName;
        this.promptDeleteRecordDef(id, name);
      });
    });
  }

  promptDeleteRecordDef(id, name) {
    this.pendingDeleteRecordDefId = id;
    this.pendingDeleteRecordDefName = name || id;
    const nameEl = document.getElementById('delete-record-def-modal-name');
    if (nameEl) nameEl.textContent = name || id;
    document.getElementById('modal-confirm-delete-record-def')?.classList.remove('hidden');
  }

  async confirmDeleteRecordDef() {
    const id = this.pendingDeleteRecordDefId;
    const name = this.pendingDeleteRecordDefName || id;
    document.getElementById('modal-confirm-delete-record-def')?.classList.add('hidden');
    this.pendingDeleteRecordDefId = null;
    this.pendingDeleteRecordDefName = null;
    if (!id) return;

    try {
      const res = await fetch('/api/records/definitions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      this.app.notify({
        title: 'TYPE DE RECORD SUPPRIMÉ',
        subtitle: `Le record « ${name} » a été supprimé avec succès`,
        icon: 'delete',
        type: 'info'
      });
      await this.loadRecordDefinitions();
    } catch (err) {
      this.app.notify({
        title: 'ERREUR SUPPRESSION',
        subtitle: err.message,
        icon: 'error',
        type: 'danger'
      });
    }
  }

  openAddRecordDefModal() {
    const calcTypeEl = document.getElementById('record-def-calc-type');
    if (calcTypeEl) calcTypeEl.value = 'pattern';
    document.getElementById('record-def-game').value = '*';
    document.getElementById('record-def-pattern').value = 'none';
    const matchCondEl = document.getElementById('record-def-match-cond');
    if (matchCondEl) matchCondEl.value = 'loss';
    const matchMetricEl = document.getElementById('record-def-match-metric');
    if (matchMetricEl) matchMetricEl.value = 'total_points';
    const prefEl = document.getElementById('record-def-pref');
    if (prefEl) prefEl.value = 'fav_triple';

    document.getElementById('record-def-name').value = '';
    document.getElementById('record-def-id').value = '';
    document.getElementById('record-def-unit').value = 'fois';
    document.getElementById('record-def-sort').value = 'DESC';
    const backfillEl = document.getElementById('record-def-backfill');
    if (backfillEl) backfillEl.checked = true;
    const errEl = document.getElementById('record-def-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    this.recordDefIdManuallyEdited = false;
    this.handleCalcTypeChange();
    document.getElementById('modal-add-record-def')?.classList.remove('hidden');
    document.getElementById('record-def-name')?.focus();
  }

  handleCalcTypeChange() {
    const calcType = document.getElementById('record-def-calc-type')?.value || 'pattern';
    const groupPattern = document.getElementById('group-record-def-pattern');
    const groupMatch = document.getElementById('group-record-def-match');
    const groupPref = document.getElementById('group-record-def-pref');

    if (groupPattern) groupPattern.classList.toggle('hidden', calcType !== 'pattern');
    if (groupMatch) groupMatch.classList.toggle('hidden', calcType !== 'match_result');
    if (groupPref) groupPref.classList.toggle('hidden', calcType !== 'preference');

    if (calcType === 'preference') {
      this.handlePrefTypeChange();
    } else if (calcType === 'match_result') {
      const cond = document.getElementById('record-def-match-cond')?.value;
      const game = document.getElementById('record-def-game')?.value;
      const nameInput = document.getElementById('record-def-name');
      const unitInput = document.getElementById('record-def-unit');
      if (!this.recordDefIdManuallyEdited) {
        if (cond === 'loss') {
          if (nameInput) nameInput.value = game === 'Cricket' ? 'Pire Défaite Cut-Throat' : 'Plus Grosse Défaite';
        } else if (cond === 'win') {
          if (nameInput) nameInput.value = 'Plus Large Victoire';
        } else {
          if (nameInput) nameInput.value = 'Record de Match';
        }
      }
      if (unitInput) unitInput.value = 'pts';
      this.updateAutoRecordId();
    } else {
      const unitInput = document.getElementById('record-def-unit');
      if (unitInput) unitInput.value = 'fois';
      this.updateAutoRecordId();
    }
  }

  handlePrefTypeChange() {
    const pref = document.getElementById('record-def-pref')?.value || 'fav_triple';
    const nameInput = document.getElementById('record-def-name');
    const unitInput = document.getElementById('record-def-unit');
    const sortSelect = document.getElementById('record-def-sort');

    if (pref === 'fav_triple') {
      if (nameInput && !this.recordDefIdManuallyEdited) nameInput.value = 'Triple Préféré';
      if (unitInput) unitInput.value = 'touches';
    } else if (pref === 'fav_game') {
      if (nameInput && !this.recordDefIdManuallyEdited) nameInput.value = 'Jeu Préféré';
      if (unitInput) unitInput.value = 'parties';
    } else if (pref === 'fav_double') {
      if (nameInput && !this.recordDefIdManuallyEdited) nameInput.value = 'Double Préféré';
      if (unitInput) unitInput.value = 'touches';
    } else if (pref === 'fav_number') {
      if (nameInput && !this.recordDefIdManuallyEdited) nameInput.value = 'Numéro Préféré';
      if (unitInput) unitInput.value = 'touches';
    }
    if (sortSelect) sortSelect.value = 'DESC';
    this.updateAutoRecordId();
  }

  updateAutoRecordId() {
    if (this.recordDefIdManuallyEdited) return;
    const calcType = document.getElementById('record-def-calc-type')?.value || 'pattern';
    if (calcType === 'preference') {
      const pref = document.getElementById('record-def-pref')?.value || 'fav_triple';
      const idEl = document.getElementById('record-def-id');
      if (idEl) idEl.value = pref;
      return;
    }

    const name = document.getElementById('record-def-name')?.value.trim() || '';
    const game = document.getElementById('record-def-game')?.value || '*';
    const prefix = game === '*' ? 'all' : game.toLowerCase();
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const idEl = document.getElementById('record-def-id');
    if (idEl) idEl.value = slug ? `${prefix}_${slug}` : '';
  }

  async saveRecordDef() {
    const calcType = document.getElementById('record-def-calc-type')?.value || 'pattern';
    const game = document.getElementById('record-def-game')?.value || '*';
    const pattern = calcType === 'pattern'
      ? (document.getElementById('record-def-pattern')?.value || 'none')
      : (calcType === 'preference' ? (document.getElementById('record-def-pref')?.value || 'fav_triple') : 'none');
    const matchCondition = document.getElementById('record-def-match-cond')?.value || 'any';
    const matchMetric = document.getElementById('record-def-match-metric')?.value || 'total_points';

    const name = document.getElementById('record-def-name')?.value.trim() || '';
    const id = document.getElementById('record-def-id')?.value.trim() || '';
    const unit = document.getElementById('record-def-unit')?.value.trim() || 'fois';
    const sort = document.getElementById('record-def-sort')?.value || 'DESC';
    const backfill = Boolean(document.getElementById('record-def-backfill')?.checked);
    const errEl = document.getElementById('record-def-error');

    if (!name || !id) {
      if (errEl) {
        errEl.textContent = 'Le nom et le code technique sont obligatoires';
        errEl.classList.remove('hidden');
      }
      this.app.notify({
        title: 'CHAMPS REQUIS',
        subtitle: 'Le nom et le code technique sont obligatoires',
        icon: 'warning',
        type: 'danger'
      });
      return;
    }

    try {
      const res = await fetch('/api/records/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          game_name: game,
          record_type: id,
          name,
          unit,
          sort_order: sort,
          is_highlight: 1,
          is_system: 0,
          pattern,
          calc_type: calcType,
          match_condition: matchCondition,
          match_metric: matchMetric,
          backfill
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du record');
      }

      document.getElementById('modal-add-record-def')?.classList.add('hidden');
      const count = Number(data.backfilledCount || 0);
      const subtitle = count > 0
        ? `Record ajouté : ${count} accomplissement(s) historique(s) attribué(s) !`
        : `Le record « ${name} » a été ajouté au catalogue`;
      this.app.notify({
        title: 'RECORD CRÉÉ',
        subtitle,
        icon: 'emoji_events',
        type: 'info'
      });
      await this.loadRecordDefinitions();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
      this.app.notify({
        title: 'ERREUR CRÉATION RECORD',
        subtitle: err.message,
        icon: 'error',
        type: 'danger'
      });
    }
  }

  /* ==================== ASSISTANT DE CALIBRATION ==================== */
  initWizardBoard() {
    if (this.wizardBoard) return;
    const container = document.getElementById('wizard-dartboard-container');
    if (container) {
      this.wizardBoard = new DartboardSVG(container);
    }
  }

  async startCalibrationWizard() {
    this.wizardOpen = true;
    this.wizardStep = 0;
    this.wizardKeys = { ...(this.app.config?.SectionKeys || {}) };
    this.initWizardBoard();

    try {
      await fetch('/api/calibration/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'wizard' })
      });
    } catch {
      // ignore
    }
    this.renderCalibrationStep();
  }

  async stopCalibrationWizard() {
    if (!this.wizardOpen) return;
    this.wizardOpen = false;
    try {
      await fetch('/api/calibration/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'game' })
      });
    } catch {
      // ignore
    }
  }

  renderCalibrationStep() {
    const total = this.app.orderedDartKeys?.length || 0;
    const currentKey = this.app.orderedDartKeys?.[this.wizardStep] || 'S20';
    const i18n = this.app.i18n;

    const counter = document.getElementById('calib-step-counter');
    if (counter) {
      counter.textContent = i18n
        ? i18n.t('settings.calib.step_badge', { current: this.wizardStep + 1, total })
        : `Étape ${this.wizardStep + 1} / ${total}`;
    }

    // Instruction lisible selon la touche demandée
    let displayTarget = currentKey;
    let bannerText = i18n ? i18n.t('settings.calib.press_target') : 'Appuyez sur la cible :';
    if (currentKey === 'PLAYERBUTTON') {
      displayTarget = i18n ? i18n.t('settings.calib.btn_player') : 'BOUTON JOUEUR SUIVANT';
      bannerText = i18n ? i18n.t('settings.calib.press_button') : 'Appuyez sur le :';
    } else if (currentKey === 'BACKUPBUTTON') {
      displayTarget = i18n ? i18n.t('settings.calib.btn_backup') : 'BOUTON ANNULER';
      bannerText = i18n ? i18n.t('settings.calib.press_button') : 'Appuyez sur le :';
    } else if (currentKey === 'GAMEBUTTON') {
      displayTarget = i18n ? i18n.t('settings.calib.btn_game') : 'BOUTON JEU';
      bannerText = i18n ? i18n.t('settings.calib.press_button') : 'Appuyez sur le :';
    } else if (currentKey === 'MISSDART') {
      displayTarget = i18n ? i18n.t('settings.calib.btn_miss') : 'BOUTON MANQUÉ';
      bannerText = i18n ? i18n.t('settings.calib.press_button') : 'Appuyez sur le :';
    }

    const bannerEl = document.querySelector('.calib-target-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `${this.app.escapeHtml(bannerText)} <strong id="calib-target-key" class="highlight-target">${this.app.escapeHtml(displayTarget)}</strong>`;
    } else {
      const keyEl = document.getElementById('calib-target-key');
      if (keyEl) keyEl.textContent = displayTarget;
    }

    const pct = total > 0 ? Math.round(((this.wizardStep + 1) / total) * 100) : 0;
    const fillEl = document.getElementById('calib-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;

    this.initWizardBoard();
    if (this.wizardBoard) {
      this.wizardBoard.highlight(currentKey, '#00FF87');
    }

    const grid = document.getElementById('calib-keys-grid');
    if (grid && Array.isArray(this.app.orderedDartKeys)) {
      const renderCell = (k, idx) => {
        const val = this.wizardKeys[k] || '';
        const isConfigured = Boolean(val && val.trim());
        const isCurrent = idx === this.wizardStep;
        let label = k;
        if (k === 'PLAYERBUTTON') label = 'SUIVANT';
        else if (k === 'BACKUPBUTTON') label = 'ANNULER';
        else if (k === 'GAMEBUTTON') label = 'JEU';
        else if (k === 'EXTRABUTTON') label = 'EXTRA';
        else if (k === 'MISSDART') label = 'MANQUÉ';

        return `
          <button type="button" class="calib-key-cell ${isCurrent ? 'active-target' : ''} ${isConfigured ? 'is-configured' : ''}" data-step-idx="${idx}" title="${k}">
            <span class="calib-cell-label">${label}</span>
            <span class="calib-cell-val ${isConfigured ? 'has-char' : ''}"><code>${isConfigured ? this.app.escapeHtml(val) : '—'}</code></span>
          </button>
        `;
      };

      const columns = [
        { id: 'simples', title: 'Simples', keys: [] },
        { id: 'doubles', title: 'Doubles', keys: [] },
        { id: 'triples', title: 'Triples', keys: [] },
        { id: 'speciaux', title: 'Spéciaux', keys: [] }
      ];

      this.app.orderedDartKeys.forEach((k, idx) => {
        if (/^S\d+$/.test(k)) {
          columns[0].keys.push({ k, idx });
        } else if (/^D\d+$/.test(k)) {
          columns[1].keys.push({ k, idx });
        } else if (/^T\d+$/.test(k)) {
          columns[2].keys.push({ k, idx });
        } else {
          columns[3].keys.push({ k, idx });
        }
      });

      grid.innerHTML = columns.map(col => `
        <div class="calib-column calib-column-${col.id}">
          <div class="calib-col-header">${col.title}</div>
          <div class="calib-col-cells">
            ${col.keys.map(item => renderCell(item.k, item.idx)).join('')}
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('[data-step-idx]').forEach(cell => {
        cell.addEventListener('click', () => {
          this.wizardStep = Number(cell.dataset.stepIdx);
          this.renderCalibrationStep();
        });
      });
    }
  }

  handleWizardSerialChar(rawChar) {
    if (!this.wizardOpen) return;
    const charEl = document.getElementById('calib-last-char');
    if (charEl) charEl.textContent = `${rawChar} (0x${rawChar.charCodeAt(0).toString(16)})`;

    const currentKey = this.app.orderedDartKeys?.[this.wizardStep];
    if (currentKey) {
      this.wizardKeys[currentKey] = rawChar;
      this.app.audio.playClick();
      if (this.wizardStep < (this.app.orderedDartKeys?.length || 0) - 1) {
        this.wizardStep += 1;
      }
      this.renderCalibrationStep();
    }
  }

  async saveCalibration() {
    try {
      const res = await fetch('/api/calibration/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: this.wizardKeys })
      });
      const data = await res.json();
      if (data.config) this.app.config = data.config;
      await this.closeSettingsModal();
      this.app.notify({
        title: 'CALIBRATION ENREGISTRÉE',
        subtitle: 'La matrice de la cible a été configurée avec succès',
        icon: 'check_circle',
        type: 'info'
      });
    } catch (err) {
      this.app.notify({
        title: 'ERREUR CALIBRATION',
        subtitle: err.message,
        icon: 'error',
        type: 'danger'
      });
    }
  }

  async quitApplication() {
    this.app.notify({
      title: 'FERMETURE',
      subtitle: 'Fermeture de l\'application...',
      icon: 'power_settings_new',
      type: 'danger'
    });
    try {
      await fetch('/api/system/quit', { method: 'POST' });
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.close();
    }, 400);
  }

  /* ==================== HALL OF FAME & RECORDS MODALE (#modal-records) ==================== */
  syncRecordsVariantsWithLobby() {
    const hoOneCard = document.querySelector('game-card[game-id="Ho_One"]');
    const cricketCard = document.querySelector('game-card[game-id="Cricket"]');

    let hoOneVariant = hoOneCard?.currentVariantId;
    if (!hoOneVariant && this.app?.customGameOptions?.Ho_One?.startingat) {
      hoOneVariant = String(this.app.customGameOptions.Ho_One.startingat);
    }
    if (!hoOneVariant) {
      try {
        hoOneVariant = localStorage.getItem('dartotron_variant_Ho_One');
      } catch {}
    }

    let cricketVariant = cricketCard?.currentVariantId;
    if (!cricketVariant) {
      try {
        cricketVariant = localStorage.getItem('dartotron_variant_Cricket');
      } catch {}
    }

    this.recordsVariants = {
      ho_one: hoOneVariant || '501',
      cricket: cricketVariant || 'standard'
    };
    return this.recordsVariants;
  }

  async openRecordsModal(initialTab = 'general', targetPlayer = null) {
    this.syncRecordsVariantsWithLobby();
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      this.app.applyPlayersData(data);
    } catch {
      // ignore
    }

    const allNames = this.app.knownPlayers.length > 0
      ? this.app.knownPlayers
      : (this.app.players.length > 0 ? this.app.players : ['Joueur 1']);

    const selectedPlayer = targetPlayer || this.selectedRecordsPlayer || allNames[0];
    this.selectedRecordsPlayer = selectedPlayer;

    // Initialisation du composant <hud-player-dropdown>
    const playerDropdown = document.getElementById('records-player-dropdown');
    if (playerDropdown) {
      playerDropdown.players = allNames.map(name => {
        const st = this.app.playersStatsMap.get(name.toLowerCase());
        const rawAvg = Number(st?.avg3DAllTime ?? st?.avgPPR ?? 0);
        let avgLabel = '—';
        if (rawAvg > 0) {
          const roundedFloor5 = Math.floor(rawAvg / 5) * 5;
          avgLabel = `${roundedFloor5}+`;
        }
        return { name, stat: avgLabel };
      });
      playerDropdown.selectedPlayer = selectedPlayer;
      playerDropdown.selectedStat = playerDropdown.players.find(p => p.name.toLowerCase() === selectedPlayer.toLowerCase())?.stat || '—';
    }

    this.switchRecordsTab(initialTab);

    if (initialTab === 'general') {
      await this.loadGeneralRecords();
    } else if (initialTab === 'player') {
      await this.loadPlayerProfile(selectedPlayer);
    } else if (initialTab === 'definitions') {
      await this.loadRecordDefinitions();
    }

    document.getElementById('modal-records')?.classList.remove('hidden');
  }

  switchRecordsTab(tabName) {
    const tabs = document.getElementById('records-tabs');
    if (tabs && typeof tabs.selectTab === 'function') {
      tabs.selectTab(tabName, false);
    } else {
      const generalBtn = document.getElementById('tab-btn-records-general');
      const playerBtn = document.getElementById('tab-btn-records-player');
      const defsBtn = document.getElementById('tab-btn-records-definitions');

      this.updateTabVisual(generalBtn, tabName === 'general');
      this.updateTabVisual(playerBtn, tabName === 'player');
      this.updateTabVisual(defsBtn, tabName === 'definitions');

      document.getElementById('records-view-general')?.classList.toggle('hidden', tabName !== 'general');
      document.getElementById('records-view-player')?.classList.toggle('hidden', tabName !== 'player');
      document.getElementById('records-view-definitions')?.classList.toggle('hidden', tabName !== 'definitions');
    }

    if (tabName === 'general') {
      this.loadGeneralRecords();
    } else if (tabName === 'player') {
      const target = this.selectedRecordsPlayer || this.app.knownPlayers[0] || this.app.players[0] || 'Joueur 1';
      this.loadPlayerProfile(target);
    } else if (tabName === 'definitions') {
      this.loadRecordDefinitions();
    }
  }

  async loadGeneralRecords(opts = {}) {
    const grid = document.getElementById('records-general-cards-grid');
    if (!grid) return;
    if (!this.recordsVariants) {
      this.syncRecordsVariantsWithLobby();
    }
    if (opts.ho_one) this.recordsVariants.ho_one = opts.ho_one;
    if (opts.cricket) this.recordsVariants.cricket = opts.cricket;

    try {
      const q = new URLSearchParams({
        ho_one_variant: this.recordsVariants.ho_one,
        cricket_variant: this.recordsVariants.cricket
      });
      const res = await fetch(`/api/records/hall-of-fame?${q.toString()}`);
      const data = await res.json();
      const sections = data.sections;
      const categories = data.categories || [];

      if (categories.length === 0) {
        grid.innerHTML = `
          <div class="records-empty-state">
            <div class="records-empty-icon-box">
              <span class="material-symbols-outlined">emoji_events</span>
            </div>
            <h3 class="records-empty-title">Aucun Record Enregistré</h3>
            <p class="records-empty-desc">Jouez des parties pour établir les premiers records du club !</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = '';

      const createCard = (cat) => {
        const card = document.createElement('record-card');
        card.setAttribute('title', cat.title);
        card.setAttribute('badge', cat.badge || 'Top 3 All-Time');
        card.setAttribute('icon', cat.icon || 'emoji_events');
        card.setAttribute('color', cat.color || 'cyan');
        if (cat.unit) card.setAttribute('unit', cat.unit);
        card.records = cat.records || [];
        return card;
      };

      if (sections) {
        // Section X01
        if (sections.ho_one && sections.ho_one.categories?.length > 0) {
          const header = document.createElement('div');
          header.className = 'records-section-header';
          const pillsHtml = sections.ho_one.variants.map(v => `
            <button type="button" class="records-variant-pill ${v.id === sections.ho_one.activeVariant ? 'is-active' : ''}" data-game="ho_one" data-variant="${v.id}">
              ${v.label}
            </button>
          `).join('');

          header.innerHTML = `
            <div class="records-section-title-group">
              <span class="material-symbols-outlined text-neon">adjust</span>
              <span class="records-section-title">X01 SÉRIES</span>
            </div>
            <div class="records-variant-pills">
              ${pillsHtml}
            </div>
          `;
          header.querySelectorAll('[data-variant]').forEach(btn => {
            btn.addEventListener('click', () => {
              this.loadGeneralRecords({ ho_one: btn.dataset.variant });
            });
          });
          grid.appendChild(header);

          sections.ho_one.categories.forEach(cat => {
            grid.appendChild(createCard(cat));
          });
        }

        // Section Cricket
        if (sections.cricket && sections.cricket.categories?.length > 0) {
          const header = document.createElement('div');
          header.className = 'records-section-header';
          header.classList.add('records-section-header--spaced');
          const pillsHtml = sections.cricket.variants.map(v => `
            <button type="button" class="records-variant-pill ${v.id === sections.cricket.activeVariant ? 'is-active' : ''}" data-game="cricket" data-variant="${v.id}">
              ${v.label}
            </button>
          `).join('');

          header.innerHTML = `
            <div class="records-section-title-group">
              <span class="material-symbols-outlined text-cyan">radar</span>
              <span class="records-section-title">CRICKET</span>
            </div>
            <div class="records-variant-pills">
              ${pillsHtml}
            </div>
          `;
          header.querySelectorAll('[data-variant]').forEach(btn => {
            btn.addEventListener('click', () => {
              this.loadGeneralRecords({ cricket: btn.dataset.variant });
            });
          });
          grid.appendChild(header);

          sections.cricket.categories.forEach(cat => {
            grid.appendChild(createCard(cat));
          });
        }

        // Section Multi & Divers
        if (sections.multi && sections.multi.categories?.length > 0) {
          const header = document.createElement('div');
          header.className = 'records-section-header';
          header.classList.add('records-section-header--spaced');
          header.innerHTML = `
            <div class="records-section-title-group">
              <span class="material-symbols-outlined text-amber">military_tech</span>
              <span class="records-section-title">EXPLOITS & MOTIFS DU CLUB</span>
            </div>
          `;
          grid.appendChild(header);

          sections.multi.categories.forEach(cat => {
            grid.appendChild(createCard(cat));
          });
        }
      } else {
        categories.forEach(cat => {
          grid.appendChild(createCard(cat));
        });
      }
    } catch (err) {
      console.error('Erreur chargement records généraux:', err);
    }
  }

  async loadPlayerProfile(playerName) {
    if (!playerName) return;
    try {
      const res = await fetch(`/api/players/profile?name=${encodeURIComponent(playerName)}`);
      const data = await res.json();
      const prof = data.profile;
      if (!prof) return;

      this.selectedRecordsPlayer = prof.name || playerName;

      // Mise à jour de <hud-player-dropdown>
      const playerDropdown = document.getElementById('records-player-dropdown');
      if (playerDropdown) {
        playerDropdown.selectedPlayer = prof.name;
        const rawAvg = Number(prof.avg3DAllTime ?? prof.avgPPR ?? 0);
        let avgLabel = '—';
        if (rawAvg > 0) {
          avgLabel = `${Math.floor(rawAvg / 5) * 5}+`;
        }
        playerDropdown.selectedStat = avgLabel;
      }

      // 1. Télémétrie en-tête (Parties jouées & % Victoires)
      const gamesTelem = document.getElementById('player-telemetry-games');
      if (gamesTelem) {
        gamesTelem.value = String(prof.gamesPlayed || 0);
      }

      const winsTelem = document.getElementById('player-telemetry-wins');
      if (winsTelem) {
        winsTelem.value = `${prof.winRate || 0}%`;
        winsTelem.sub = `(${prof.wins || 0})`;
      }

      // 2. Rendu récursif et dynamique des 3 colonnes de statistiques
      this.renderPlayerColumns(prof);
    } catch (err) {
      console.error('Erreur chargement profil joueur records:', err);
    }
  }

  renderPlayerColumns(prof) {
    const playerRecs = prof.playerRecords || [];

    // ==================== 1. COLONNE 1 : RECORDS MULTI-JEUX ====================
    const colCustom = document.getElementById('records-col-custom');
    if (colCustom) {
      let customHtml = '';

      // A) Préférences de joueur (1 stat par ligne)
      const hasFavGame = Boolean(prof.favoriteGame);
      const hasFavTriple = Boolean(prof.favoriteTriple && prof.favoriteTriple.hit);
      if (hasFavGame) {
        customHtml += `
          <hud-stats-preference
            label="JEU PRÉFÉRÉ"
            value="${this.app.escapeHtml(prof.favoriteGame)}"
            count="${prof.favoriteGameCount ? prof.favoriteGameCount + ' parties' : ''}"
            color="amber"
            icon="sports_esports"
          ></hud-stats-preference>
        `;
      }
      if (hasFavTriple) {
        customHtml += `
          <hud-stats-preference
            label="TRIPLE FAVORIT"
            value="${this.app.escapeHtml(prof.favoriteTriple.hit)}"
            count="${prof.favoriteTriple.count ? prof.favoriteTriple.count + ' touches' : ''}"
            color="neon"
            icon="stars"
          ></hud-stats-preference>
        `;
      }

      // B) Records multi-jeux & autres jeux (récursif, 1 stat par ligne)
      const multiRecords = playerRecs.filter(r => r.game_name === '*' || (r.game_name !== 'Ho_One' && r.game_name !== 'Cricket'));
      const validMulti = multiRecords.filter(r => (Number(r.count || 0) > 0 || Number(r.max_val || 0) > 0) && r.id !== 'fav_triple' && r.id !== 'fav_game');

      if (validMulti.length > 0) {
        for (const r of validMulti) {
          let scoreVal = r.sort_order === 'ASC' ? (r.min_val ?? r.count) : (r.unit === 'fois' ? r.count : (r.max_val ?? r.count));
          if (typeof scoreVal === 'number' && !Number.isInteger(scoreVal)) {
            scoreVal = scoreVal.toFixed(1);
          }
          const unit = r.unit ? this.app.escapeHtml(r.unit) : '';
          const icon = r.id === 'chimay_bleu' ? 'sports_bar'
                     : r.id === '180' || r.id === 'best_round_180' ? 'stars'
                     : r.id === 'hat_trick' ? 'adjust'
                     : r.id === 'shanghai' ? 'flag'
                     : (r.calc_type === 'match_result' ? 'military_tech' : 'emoji_events');
          const color = r.id === '180' || r.id === 'best_round_180' ? 'neon'
                      : r.id === 'hat_trick' ? 'cyan'
                      : 'amber';

          customHtml += `
            <hud-stats-metric
              label="${this.app.escapeHtml(r.name)}"
              value="${scoreVal}"
              unit="${unit}"
              color="${color}"
              icon="${icon}"
              horizontal
            ></hud-stats-metric>
          `;
        }
      } else if (!hasFavGame && !hasFavTriple) {
        customHtml += `
          <div class="record-empty-row">
            Aucun exploit multi-jeux validé pour ce joueur.<br>
            <span class="record-empty-subtext">(180, Chimay, Hat-Trick, Shanghai...)</span>
          </div>
        `;
      }

      colCustom.setBodyHTML?.(customHtml);

      // Footer Exploit Ultime
      if (prof.chimayCount > 0) {
        colCustom.setAttribute('footer-icon', 'sports_bar');
        colCustom.setAttribute('footer-title', 'Exploit Ultime');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', 'Chimay Bleu (3×Triple)');
        colCustom.setAttribute('footer-val', `${prof.chimayCount}×`);
      } else if (prof.ton80Count > 0) {
        colCustom.setAttribute('footer-icon', 'stars');
        colCustom.setAttribute('footer-title', 'Exploit Ultime');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', 'Volée Maximale (180)');
        colCustom.setAttribute('footer-val', `${prof.ton80Count}×`);
      } else if (prof.hatTrickCount > 0) {
        colCustom.setAttribute('footer-icon', 'adjust');
        colCustom.setAttribute('footer-title', 'Exploit Ultime');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', 'Hat-Trick (3×Bull)');
        colCustom.setAttribute('footer-val', `${prof.hatTrickCount}×`);
      } else if (prof.shanghaiCount > 0) {
        colCustom.setAttribute('footer-icon', 'flag');
        colCustom.setAttribute('footer-title', 'Exploit Ultime');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', 'Shanghai (S+D+T)');
        colCustom.setAttribute('footer-val', `${prof.shanghaiCount}×`);
      } else if (validMulti.length > 0) {
        const topR = validMulti[0];
        colCustom.setAttribute('footer-icon', 'military_tech');
        colCustom.setAttribute('footer-title', 'Record Débloqué');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', topR.name);
        colCustom.setAttribute('footer-val', `${topR.count || topR.max_val} ${topR.unit || ''}`.trim());
      } else {
        colCustom.setAttribute('footer-icon', 'workspace_premium');
        colCustom.setAttribute('footer-title', 'Exploit Ultime');
        colCustom.setAttribute('footer-badge', 'RECORD');
        colCustom.setAttribute('footer-main', 'Aucun exploit validé');
        colCustom.setAttribute('footer-val', '0');
      }
    }

    // ==================== 2. COLONNE 2 : HO ONE (X01) ====================
    const colHoOne = document.getElementById('records-col-ho-one');
    if (colHoOne) {
      let hoOneHtml = '';

      // Base stats X01 (1 stat par ligne)
      const avgPPR = Number(prof.avgPPR || 0).toFixed(1);
      const avgPPD = prof.avgPPR ? (prof.avgPPR / 3).toFixed(1) : '0.0';

      hoOneHtml += `
        <hud-stats-metric label="PPD (POINTS / FLÉCHETTE)" value="${avgPPD}" unit="pt" color="neon" icon="speed" horizontal></hud-stats-metric>
        <hud-stats-metric label="PPR (POINTS / TOUR)" value="${avgPPR}" unit="pt" color="white" icon="trending_up" horizontal></hud-stats-metric>
      `;

      // Stats additionnelles Ho_One (si existantes pour le joueur, 1 stat par ligne)
      if (prof.bestFinish > 0) {
        hoOneHtml += `
          <hud-stats-metric
            label="MEILLEUR FINISH"
            value="${prof.bestFinish}"
            unit="pts"
            color="cyan"
            icon="check_circle"
            horizontal
          ></hud-stats-metric>
        `;
      }

      // Autres records spécifiques Ho_One (1 stat par ligne)
      const hoOneCustom = playerRecs.filter(r =>
        r.game_name === 'Ho_One' &&
        !['ho_one_least_darts', 'Least Darts', 'ho_one_ppr', 'Points Per Round', 'ppr', 'ho_one_best_finish', 'Best Finish'].includes(r.id) &&
        (Number(r.count || 0) > 0 || Number(r.max_val || 0) > 0)
      );

      if (hoOneCustom.length > 0) {
        for (const r of hoOneCustom) {
          let scoreVal = r.sort_order === 'ASC' ? (r.min_val ?? r.count) : (r.max_val ?? r.count);
          hoOneHtml += `
            <hud-stats-metric
              label="${this.app.escapeHtml(r.name)}"
              value="${scoreVal}"
              unit="${this.app.escapeHtml(r.unit || '')}"
              color="neon"
              icon="bolt"
              horizontal
            ></hud-stats-metric>
          `;
        }
      }

      colHoOne.setBodyHTML?.(hoOneHtml);

      // Footer Ultime Ho One : ho_one_least_darts
      colHoOne.setAttribute('footer-icon', 'bolt');
      colHoOne.setAttribute('footer-title', 'Moins de Fléchettes');
      colHoOne.setAttribute('footer-badge', 'RECORD');
      colHoOne.setAttribute('footer-main', 'Victoire la plus rapide');
      if (prof.leastDarts) {
        colHoOne.setAttribute('footer-val', `${prof.leastDarts} fléch.`);
      } else {
        colHoOne.setAttribute('footer-val', '—');
      }
    }

    // ==================== 3. COLONNE 3 : CRICKET ====================
    const colCricket = document.getElementById('records-col-cricket');
    if (colCricket) {
      let cricketHtml = '';

      // Base stats Cricket (1 stat par ligne)
      const avgMPR = Number(prof.avgMPR || 0).toFixed(2);
      const bestMPR = prof.cricketBestMPR ? Number(prof.cricketBestMPR).toFixed(2) : '—';

      cricketHtml += `
        <hud-stats-metric label="MPR CRICKET" value="${avgMPR}" unit="mkr" color="cyan" icon="radar" horizontal></hud-stats-metric>
        <hud-stats-metric label="MEILLEUR MPR" value="${bestMPR}" unit="mkr" color="white" icon="military_tech" horizontal></hud-stats-metric>
      `;

      // Touches Bull (si existantes, 1 stat par ligne)
      if (prof.bullHitsCount > 0) {
        cricketHtml += `
          <hud-stats-metric
            label="TOUCHES BULL (DB/SB)"
            value="${prof.bullHitsCount}"
            unit="hits"
            color="amber"
            icon="stars"
            horizontal
          ></hud-stats-metric>
        `;
      }

      // Autres records spécifiques Cricket (ex: Pire défaite Cut-Throat, 1 stat par ligne)
      const cricketCustom = playerRecs.filter(r =>
        r.game_name === 'Cricket' &&
        !['cricket_least_rounds', 'Least Rounds', 'cricket_mpr', 'Marks Per Round', 'mpr'].includes(r.id) &&
        (Number(r.count || 0) > 0 || Number(r.max_val || 0) > 0)
      );

      if (cricketCustom.length > 0) {
        for (const r of cricketCustom) {
          let scoreVal = r.sort_order === 'ASC' ? (r.min_val ?? r.count) : (r.max_val ?? r.count);
          const isLoss = r.calc_type === 'match_result' && (r.id.includes('defeat') || r.id.includes('defaite') || r.id.includes('perte'));
          const color = isLoss ? 'crimson' : 'cyan';
          const icon = isLoss ? 'sentiment_dissatisfied' : 'military_tech';
          cricketHtml += `
            <hud-stats-metric
              label="${this.app.escapeHtml(r.name)}"
              value="${scoreVal}"
              unit="${this.app.escapeHtml(r.unit || '')}"
              color="${color}"
              icon="${icon}"
              horizontal
            ></hud-stats-metric>
          `;
        }
      }

      colCricket.setBodyHTML?.(cricketHtml);

      // Footer Ultime Cricket : cricket_least_rounds
      colCricket.setAttribute('footer-icon', 'timer');
      colCricket.setAttribute('footer-title', 'Tours pour Gagner');
      colCricket.setAttribute('footer-badge', 'RECORD');
      colCricket.setAttribute('footer-main', 'Clôture la plus rapide');
      if (prof.cricketLeastRounds) {
        colCricket.setAttribute('footer-val', `${prof.cricketLeastRounds} tours`);
      } else {
        colCricket.setAttribute('footer-val', '—');
      }
    }
  }

  bindEvents() {
    document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSettingsModal('audio'));
    document.getElementById('btn-open-records')?.addEventListener('click', () => this.openRecordsModal('general'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettingsDraft());
    document.getElementById('btn-quit-app')?.addEventListener('click', () => this.quitApplication());

    // Sélecteur tactile de langue (Français / English)
    document.querySelectorAll('#settings-lang-selector [data-lang]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('[data-lang]');
        if (!targetBtn) return;
        const lang = targetBtn.dataset.lang;
        if (!lang) return;
        this.draftSettings.locale = lang;
        document.querySelectorAll('#settings-lang-selector [data-lang]').forEach(b => {
          b.classList.toggle('active', b.dataset.lang === lang);
        });
        if (this.app.i18n) {
          await this.app.i18n.setLanguage(lang);
        }
      });
    });

    window.addEventListener('i18n:change', () => {
      this.refreshSerialStatusUI();
      this.refreshUpdateStatusUI();
      if (document.getElementById('calib-step-counter')) {
        this.renderCalibrationStep();
      }
    });

    // HudTabs tab-change listeners
    document.getElementById('settings-tabs')?.addEventListener('tab-change', (e) => {
      this.switchSettingsTab(e.detail.tab);
    });
    document.getElementById('records-tabs')?.addEventListener('tab-change', (e) => {
      this.switchRecordsTab(e.detail.tab);
    });

    document.getElementById('tab-btn-settings-audio')?.addEventListener('click', () => this.switchSettingsTab('audio'));
    document.getElementById('tab-btn-settings-serial')?.addEventListener('click', () => this.switchSettingsTab('serial'));
    document.getElementById('tab-btn-settings-calib')?.addEventListener('click', () => this.switchSettingsTab('calib'));

    // Records Modal Tabs
    document.getElementById('tab-btn-records-general')?.addEventListener('click', () => this.switchRecordsTab('general'));
    document.getElementById('tab-btn-records-player')?.addEventListener('click', () => this.switchRecordsTab('player'));
    document.getElementById('tab-btn-records-definitions')?.addEventListener('click', () => this.switchRecordsTab('definitions'));

    // Dropdown joueur dans la vue Records
    const playerDropdown = document.getElementById('records-player-dropdown');
    if (playerDropdown) {
      playerDropdown.addEventListener('player-select', (e) => {
        const playerName = e.detail?.playerName;
        if (playerName) {
          this.loadPlayerProfile(playerName);
        }
      });
    }

    // Baudrate pills selection
    document.querySelectorAll('#settings-baud-pills [data-baud]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('[data-baud]');
        if (!targetBtn) return;
        const baud = Number(targetBtn.dataset.baud);
        this.draftSettings.serialspeed = baud;
        document.querySelectorAll('#settings-baud-pills [data-baud]').forEach(b => {
          b.classList.toggle('active', Number(b.dataset.baud) === baud);
        });
        targetBtn.focus();
      });
    });

    // Audio & Interface controls
    document.getElementById('setting-sound-mute')?.addEventListener('toggle-change', (e) => {
      const active = Boolean(e.detail?.checked ?? e.detail?.value);
      this.app.audio.setMuted(!active);
      this.draftSettings.soundvolume = active ? 100 : 0;
    });

    const handleOnscreenToggle = (e) => {
      const active = Boolean(e.detail?.checked ?? e.detail?.value);
      this.draftSettings.onscreenbuttons = active;
      document.body.classList.toggle('hide-onscreen-buttons', !active);
    };
    document.getElementById('setting-onscreen-buttons')?.addEventListener('toggle-change', handleOnscreenToggle);
    document.getElementById('setting-touch-buttons')?.addEventListener('toggle-change', handleOnscreenToggle);

    document.getElementById('setting-auto-update')?.addEventListener('toggle-change', (e) => {
      const active = Boolean(e.detail?.checked ?? e.detail?.value);
      this.draftSettings.autoupdate = active;
    });

    document.getElementById('btn-update-check')?.addEventListener('click', () => this.checkUpdatesManually());
    document.getElementById('btn-update-download')?.addEventListener('click', () => this.downloadUpdateManually());
    document.getElementById('btn-update-restart')?.addEventListener('click', () => this.restartForUpdate());

    document.getElementById('setting-sound-volume')?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.audio.setVolume(val);
      this.draftSettings.soundvolume = val;
    });

    // Add Record Def Modal
    document.getElementById('btn-open-add-record-def')?.addEventListener('click', () => this.openAddRecordDefModal());
    document.getElementById('btn-close-add-record-def')?.addEventListener('click', () => {
      document.getElementById('modal-add-record-def')?.classList.add('hidden');
    });
    document.getElementById('btn-cancel-add-record-def')?.addEventListener('click', () => {
      document.getElementById('modal-add-record-def')?.classList.add('hidden');
    });
    document.getElementById('btn-confirm-add-record-def')?.addEventListener('click', () => this.saveRecordDef());
    document.getElementById('btn-save-record-def')?.addEventListener('click', () => this.saveRecordDef());

    document.getElementById('record-def-name')?.addEventListener('input', () => this.updateAutoRecordId());
    document.getElementById('record-def-game')?.addEventListener('change', () => this.updateAutoRecordId());
    document.getElementById('record-def-calc-type')?.addEventListener('change', () => this.handleCalcTypeChange());
    document.getElementById('record-def-pref')?.addEventListener('change', () => this.handlePrefTypeChange());
    document.getElementById('record-def-match-cond')?.addEventListener('change', () => this.handleCalcTypeChange());
    document.getElementById('record-def-match-metric')?.addEventListener('change', () => this.updateAutoRecordId());
    document.getElementById('record-def-id')?.addEventListener('input', () => {
      this.recordDefIdManuallyEdited = true;
    });

    document.getElementById('btn-cancel-delete-record-def')?.addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-record-def')?.classList.add('hidden');
      this.pendingDeleteRecordDefId = null;
      this.pendingDeleteRecordDefName = null;
    });
    document.getElementById('btn-confirm-delete-record-def-yes')?.addEventListener('click', () => this.confirmDeleteRecordDef());
    document.getElementById('btn-confirm-delete-record-def')?.addEventListener('click', () => this.confirmDeleteRecordDef());

    // Calibration wizard controls
    const prevCalibHandler = () => {
      if (this.wizardStep > 0) {
        this.wizardStep -= 1;
        this.renderCalibrationStep();
      }
    };
    document.getElementById('btn-calib-prev')?.addEventListener('click', prevCalibHandler);
    document.getElementById('btn-calib-back')?.addEventListener('click', prevCalibHandler);

    document.getElementById('btn-calib-skip')?.addEventListener('click', () => {
      if (this.wizardStep < (this.app.orderedDartKeys?.length || 0) - 1) {
        this.wizardStep += 1;
        this.renderCalibrationStep();
      }
    });

    document.getElementById('btn-calib-restart')?.addEventListener('click', () => {
      this.wizardStep = 0;
      this.renderCalibrationStep();
    });

    document.getElementById('btn-save-calibration')?.addEventListener('click', () => {
      this.saveCalibration();
    });
  }
}

