/**
 * DartOTron CyberHUD Kiosk Application (public/js/app.js)
 * Coordinateur central : WebSocket RFC 6455, routage de vues, annonces CyberHUD et notifications.
 */

import { AudioManager } from './audio.js';
import { VirtualKeyboard } from './virtual-keyboard.js';
import { LobbyController } from './modules/LobbyController.js';
import { MatchController } from './modules/MatchController.js';
import { SettingsController } from './modules/SettingsController.js';
import { i18n } from './lib/i18n.js';
import '../components/index.js';

class DartOTronApp {
  constructor() {
    this.redirectingToCompanion = false;
    this.tabId = this.initTabSessionId();

    // Si l'hôte n'est pas localhost / 127.0.0.1, rediriger immédiatement vers /companion
    const host = window.location.hostname.toLowerCase();
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' && host !== '::1') {
      this.redirectToCompanion();
      return;
    }

    this.setupSingleTabGuard();

    this.i18n = i18n;
    this.audio = new AudioManager();
    this.vk = document.querySelector('virtual-keyboard') || new VirtualKeyboard(this.audio);
    if (this.vk) this.vk.audio = this.audio;
    this.config = null;
    this.orderedDartKeys = [];
    this.games = [];
    this.selectedGameId = 'Ho_One';
    this.customGameOptions = {};
    this.players = ['Joueur 1'];
    this.knownPlayers = ['Joueur 1'];
    this.playersStatsMap = new Map();
    this.matchState = null;
    this.serialStatus = null;
    this.updateStatus = null;
    this._notifiedAvailableVersion = null;
    this._notifiedDownloadedVersion = null;
    this.restartingForUpdate = false;
    this.ws = null;

    // Contrôleurs spécialisés
    this.lobbyController = new LobbyController(this);
    this.matchController = new MatchController(this);
    this.settingsController = new SettingsController(this);

    this.init();
  }

  initTabSessionId() {
    try {
      let id = sessionStorage.getItem('dartotron_kiosk_tab_id');
      if (!id) {
        id = `kiosk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('dartotron_kiosk_tab_id', id);
      }
      return id;
    } catch {
      return `kiosk_${Date.now()}`;
    }
  }

  setupSingleTabGuard() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.lockChannel = new BroadcastChannel('dartotron_kiosk_lock');
      this.lockChannel.addEventListener('message', (ev) => {
        const msg = ev.data;
        if (!msg || msg.tabId === this.tabId) return;
        if (msg.type === 'kiosk_ping' && !this.redirectingToCompanion) {
          this.lockChannel.postMessage({ type: 'kiosk_taken', tabId: this.tabId });
        } else if (msg.type === 'kiosk_taken') {
          this.redirectToCompanion();
        }
      });
      this.lockChannel.postMessage({ type: 'kiosk_ping', tabId: this.tabId });
    } catch {
      // BroadcastChannel non disponible
    }
  }

  redirectToCompanion() {
    if (this.redirectingToCompanion) return;
    this.redirectingToCompanion = true;
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
      this.announcementTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    window.location.replace('/companion');
  }

  async init() {
    if (this.redirectingToCompanion) return;
    this.connectWebSocket();

    try {
      const bootRes = await fetch('/api/bootstrap');
      const boot = await bootRes.json();
      if (boot.isLocalhost === false) {
        this.redirectToCompanion();
        return;
      }
      this.isDev = Boolean(boot.isDev);
      this.config = boot.config || {};
      this.orderedDartKeys = boot.orderedDartKeys || [];
      this.companionUrl = boot.companionUrl || '';
      this.localIp = boot.localIp || '';

      const rawLocale = this.config?.SectionGlobals?.locale || 'fr';
      await this.i18n.init(rawLocale);

      if (boot.update) {
        this.handleUpdateStatus(boot.update, { isStartup: true });
      }

      this.applyThemeAndAudio();

      const devSimulatorBtn = document.getElementById('btn-dev-simulator');
      if (devSimulatorBtn) {
        devSimulatorBtn.classList.toggle('hidden', !this.isDev);
      }
      const devShowcaseBtn = document.getElementById('btn-dev-showcase');
      if (devShowcaseBtn) {
        devShowcaseBtn.classList.toggle('hidden', !this.isDev);
      }
    } catch (err) {
      console.warn('Bootstrap load error:', err);
    }

    try {
      const gamesRes = await fetch('/api/games');
      const gamesData = await gamesRes.json();
      this.games = Array.isArray(gamesData?.games) ? gamesData.games : (Array.isArray(gamesData) ? gamesData : []);
    } catch (err) {
      console.warn('Games load error:', err);
    }

    try {
      const playersRes = await fetch('/api/players');
      const playersData = await playersRes.json();
      this.applyPlayersData(playersData);
    } catch (err) {
      console.warn('Players load error:', err);
    }

    this.lobbyController.goToLobbyStep(1);
    this.bindDOMEvents();
    this.lobbyController.bindEvents();
    this.matchController.bindEvents();
    this.settingsController.bindEvents();

    window.addEventListener('i18n:change', () => {
      this.lobbyController?.renderGamesGrid();
      this.lobbyController?.updatePlayersSummaryUI();
      this.settingsController?.renderSettingsModalControls();
    });
  }

  /* ==================== WEBSOCKET RFC 6455 ==================== */
  connectWebSocket() {
    if (this.redirectingToCompanion) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/?role=kiosk&tabId=${encodeURIComponent(this.tabId)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.addEventListener('open', () => {
      if (this.restartingForUpdate) {
        window.location.reload();
      }
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handleServerEvent(msg.type, msg.data);
      } catch {
        // ignore
      }
    });

    this.ws.addEventListener('close', () => {
      if (this.redirectingToCompanion) return;
      setTimeout(() => this.connectWebSocket(), 2000);
    });
  }

  handleServerEvent(type, data) {
    if (type === 'redirect_companion') {
      this.redirectToCompanion();
      return;
    }
    if (type === 'init') {
      if (data.dbInitialized) {
        setTimeout(() => {
          this.notify({
            title: 'INITIALISATION',
            subtitle: 'Base de données initialisée (Joueur 1)',
            icon: 'storage',
            type: 'info',
            duration: 4000
          });
        }, 300);
      }
      if (data.serial) {
        this.serialStatus = data.serial;
        this.updateSerialBadge(data.serial);
        this.settingsController.refreshSerialStatusUI();
      }
      if (data.update) {
        this.handleUpdateStatus(data.update, { isStartup: true });
      }
      if (data.match && data.match.status !== 'lobby') {
        this.applyMatchState(data.match);
      }
    } else if (type === 'update_status') {
      this.handleUpdateStatus(data);
    } else if (type === 'serial_status') {
      const wasConnected = this.serialStatus ? Boolean(this.serialStatus.connected) : null;
      const isConnected = Boolean(data?.connected);
      this.serialStatus = data;
      this.updateSerialBadge(data);
      this.settingsController.refreshSerialStatusUI();

      if (wasConnected !== null && wasConnected !== isConnected) {
        if (isConnected) {
          const portLabel = data.port ? `Port ${data.port} synchronisé` : 'Matrice piezo synchronisée';
          this.notify({
            title: 'CIBLE CONNECTÉE',
            subtitle: portLabel,
            icon: 'sensors',
            type: 'info'
          });
        } else {
          this.notify({
            title: 'CIBLE DÉCONNECTÉE',
            subtitle: 'Liaison USB interrompue',
            icon: 'sensors_off',
            type: 'danger'
          });
        }
      }
    } else if (type === 'match_state') {
      this.applyMatchState(data);
    } else if (type === 'serial_raw') {
      if (this.settingsController.wizardOpen && data?.raw) {
        this.settingsController.handleWizardSerialChar(data.raw);
      }
    } else if (type === 'config_updated') {
      this.config = data;
      this.applyThemeAndAudio();
    } else if (type === 'players_updated' || type === 'lobby_updated') {
      this.applyPlayersData(data);
    }
  }

  /* ==================== ROUTAGE DES VUES ==================== */
  switchView(viewId) {
    const views = ['view-lobby', 'view-game', 'view-finished'];
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', id === viewId);
    });

    const isLobby = viewId === 'view-lobby';
    const isGame = viewId === 'view-game';

    // Masque la topbar et applique plein écran durant le match & victoire
    document.body.classList.toggle('in-match-mode', !isLobby);

    const btnQuit = document.getElementById('btn-topbar-quit');
    if (btnQuit) btnQuit.classList.toggle('hidden', !isGame);

    const btnPlayers = document.getElementById('btn-open-players');
    if (btnPlayers) btnPlayers.classList.toggle('hidden', !isLobby);
  }

  /* ==================== NOTIFICATIONS & ANNONCES CYBERHUD ==================== */
  handleUpdateStatus(status) {
    if (!status) return;
    this.updateStatus = status;
    this.settingsController?.refreshUpdateStatusUI();

    const versionTag = status.latestTag || (status.latestVersion ? `v${status.latestVersion}` : '');

    if (
      status.status === 'available' &&
      (!status.autoDownload || status.isDev) &&
      versionTag &&
      this._notifiedAvailableVersion !== versionTag
    ) {
      this._notifiedAvailableVersion = versionTag;
      this.notify({
        title: this.i18n?.t('settings.updates.notif_available_title', {}, 'MISE À JOUR DISPONIBLE'),
        subtitle: this.i18n?.t(
          'settings.updates.notif_available_sub',
          { version: versionTag },
          `DartOTron ${versionTag} est disponible dans les Paramètres`
        ),
        icon: 'system_update',
        type: 'info',
        duration: 10000
      });
    } else if (
      status.status === 'downloaded' &&
      status.downloadedVersion &&
      this._notifiedDownloadedVersion !== status.downloadedVersion
    ) {
      this._notifiedDownloadedVersion = status.downloadedVersion;
      const dlTag = `v${status.downloadedVersion}`;
      this.notify({
        title: this.i18n?.t('settings.updates.notif_ready_title', {}, 'MISE À JOUR PRÊTE'),
        subtitle: this.i18n?.t(
          'settings.updates.notif_ready_sub',
          { version: dlTag },
          `DartOTron ${dlTag} a été téléchargée et sera installée au prochain redémarrage`
        ),
        icon: 'download_done',
        type: 'info',
        duration: 10000
      });
    }
  }

  notify({ title, subtitle, icon, type = 'info', duration = 3000 } = {}) {
    this.audio.playNotification();
    const notif = document.getElementById('app-notification');
    if (notif && typeof notif.show === 'function') {
      notif.show({ title, subtitle, icon, type, duration });
    }
  }

  showAnnouncement(text, duration = 1600, color = null) {
    const overlay = document.getElementById('announcement-overlay');
    const txt = document.getElementById('announcement-text');
    const bar = document.getElementById('announcement-progress-bar');
    const track = document.querySelector('.announcement-progress-track');
    if (!overlay || !txt) return;

    let translated = text;
    if (text === 'Retirez les flèches') {
      translated = this.i18n?.t('match.release_darts', {}, 'Retirez les flèches');
    } else if (text === 'MATCH NUL !') {
      translated = this.i18n?.t('match.draw', {}, 'MATCH NUL !');
    } else if (text === 'Game interrupted') {
      translated = this.i18n?.t('match.interrupted', {}, 'Partie interrompue');
    } else if (text === 'Retour au tour précédent !') {
      translated = this.i18n?.t('match.backup_turn', {}, 'Retour au tour précédent !');
    } else if (text === 'Dernier tour atteint...') {
      translated = this.i18n?.t('match.last_round_reached', {}, 'Dernier tour atteint...');
    } else if (text === 'Impossible de revenir en arrière au tout premier lancer !') {
      translated = this.i18n?.t('match.first_turn_cannot_undo', {}, text);
    } else if (typeof text === 'string' && text.startsWith('Victoire : ')) {
      const winnerName = text.replace('Victoire : ', '').replace(' !', '');
      translated = this.i18n?.t('match.winner_announcement', { name: winnerName }, text);
    }

    txt.textContent = translated;
    txt.style.color = color || '';

    const dur = Number(duration);
    const isSpecial = dur > 2000;

    overlay.classList.remove('hidden');
    overlay.classList.toggle('is-waiting', isSpecial);

    if (track && bar) {
      if (isSpecial) {
        track.classList.remove('hidden');
        bar.style.transition = 'none';
        bar.style.width = '100%';
        void bar.offsetWidth;
        bar.style.transition = `width ${dur}ms linear`;
        bar.style.width = '0%';
      } else {
        track.classList.add('hidden');
      }
    }

    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
      this.announcementTimeout = null;
    }

    this.announcementTimeout = setTimeout(() => {
      this.hideAnnouncement();
      // Auto-avance au joueur suivant à l'expiration du temps de retrait des fléchettes
      if (this.matchState?.status === 'waiting_player') {
        this.matchController.sendInput('WAITING_PLAYER_ADVANCE');
      }
    }, dur);
  }

  hideAnnouncement() {
    const overlay = document.getElementById('announcement-overlay');
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
      this.announcementTimeout = null;
    }
    const bottomBar = document.querySelector('.game-bottom-bar-stitch');
    if (bottomBar && this.matchState?.status !== 'waiting_player') {
      bottomBar.classList.remove('is-waiting-player');
    }
    if (overlay) {
      overlay.classList.remove('is-waiting');
      overlay.classList.add('hidden');
    }
  }

  applyThemeAndAudio() {
    const globals = this.config?.SectionGlobals || {};
    const vol = Number(globals.soundvolume ?? 100);
    this.audio.setVolume(vol);

    const onscreenButtons = globals.onscreenbuttons !== false && globals.onscreenbuttons !== 'false';
    document.body.classList.toggle('hide-onscreen-buttons', !onscreenButtons);
  }

  updateSerialBadge(status) {
    const dot = document.getElementById('serial-status-dot');
    const txt = document.getElementById('serial-status-text');
    if (!dot || !txt) return;

    if (status && status.connected) {
      dot.className = 'status-dot connected';
      txt.textContent = `Connectée (${status.port || 'USB'})`;
    } else {
      dot.className = 'status-dot disconnected';
      txt.textContent = 'Non connectée';
    }
  }

  // ==================== DÉLÉGATION VERS CONTRÔLEURS ====================
  goToLobbyStep(stepNum) {
    return this.lobbyController.goToLobbyStep(stepNum);
  }

  renderGamesGrid() {
    return this.lobbyController.renderGamesGrid();
  }

  renderStep2Options() {
    return this.lobbyController.renderStep2Options();
  }

  updatePlayersSummaryUI() {
    return this.lobbyController.updatePlayersSummaryUI();
  }

  applyPlayersData(playersData) {
    return this.lobbyController.applyPlayersData(playersData);
  }

  openPlayersModal() {
    return this.lobbyController.openPlayersModal();
  }

  closePlayersModal() {
    return this.lobbyController.closePlayersModal();
  }

  applyMatchState(state) {
    return this.matchController.applyMatchState(state);
  }

  showHitAnimation(key, state = null) {
    return this.matchController.showHitAnimation(key, state);
  }

  hideHitAnimation() {
    return this.matchController.hideHitAnimation();
  }

  openSettingsModal(initialTab = 'audio') {
    return this.settingsController.openSettingsModal(initialTab);
  }

  closeSettingsModal() {
    return this.settingsController.closeSettingsModal();
  }

  openRecordsModal(initialTab = 'general', targetPlayer = null) {
    return this.settingsController.openRecordsModal(initialTab, targetPlayer);
  }

  switchSettingsTab(tabName) {
    return this.settingsController.switchSettingsTab(tabName);
  }

  /* ==================== BINDINGS GLOBAUX ==================== */
  bindDOMEvents() {
    // Feedback tactile global (clic.wav) sur tous les boutons et éléments tactiles
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button, [role="button"], .btn, .touch-btn, .vk-btn, .stepper-btn, .btn-touch, .tab-btn, .touch-btn-key, .step-pill, game-card, .card-front, player-select-card, .player-select-card, .hud-dropdown-item, .hud-preset-pill');
      if (btn) {
        this.audio.playClick();
      }
    }, { passive: true });

    // Bouton Abandon match en direct
    document.getElementById('btn-topbar-quit')?.addEventListener('click', () => {
      this.matchController.sendInput('GAMEBUTTON');
    });

    // Modale des règles
    document.getElementById('btn-open-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.add('hidden');
    });

    // Boutons de fermeture génériques de modales [data-close]
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.close;
        if (id === 'modal-settings') {
          this.closeSettingsModal();
        } else if (id === 'modal-players') {
          if (!this.closePlayersModal()) return;
        } else {
          if (id === 'modal-records') this.settingsController?.closeRecordsDropdowns?.();
          document.getElementById(id)?.classList.add('hidden');
        }
      });
    });

    // Fermeture des modales au clic sur le backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          if (backdrop.getAttribute('data-backdrop-dismiss') === 'false') {
            const dialog = backdrop.querySelector('.modal-window, .modal-large-stitch');
            if (dialog) {
              dialog.classList.remove('modal-shake-reject');
              void dialog.offsetWidth;
              dialog.classList.add('modal-shake-reject');
            }
            return;
          }

          const id = backdrop.id;
          if (id === 'modal-settings') {
            this.closeSettingsModal();
          } else if (id === 'modal-players') {
            if (!this.closePlayersModal()) return;
          } else {
            if (id === 'modal-records') this.settingsController?.closeRecordsDropdowns?.();
            backdrop.classList.add('hidden');
          }
        }
      });
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.dartotronApp = new DartOTronApp();
  window.app = window.dartotronApp;
  window.dartotron = window.dartotronApp;
});
