/**
 * DartOTron Simulator — Simulateur Cible Arduino & Télécommande de Match
 * Communique avec le serveur DartOTron via HTTP (/api/serial/simulate) et WebSocket.
 */
import '../components/Dartboard.js';

// État de l'application
const state = {
  activeMultiplier: 'T', // 'S', 'D' ou 'T'
  ws: null,
  wsReconnectTimer: null,
  audioCtx: null
};

// =============================================================================
// 1. Initialisation Web Audio pour feedback instantané
// =============================================================================
function playImpactSound(isBull = false) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!state.audioCtx) {
      state.audioCtx = new AudioContextClass();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }

    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    const now = state.audioCtx.currentTime;

    osc.type = isBull ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isBull ? 880 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(isBull ? 220 : 80, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // ignore
  }

  // Vibration haptique légère sur smartphone tactile
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(20);
    } catch {
      // ignore
    }
  }
}

// =============================================================================
// 2. Gestion de la Cible Interactive <dart-board>
// =============================================================================

function buildDartboardGeometry() {
  const dartboard = document.getElementById('interactive-dartboard') || document.getElementById('sim-dartboard');
  if (!dartboard) return;

  dartboard.addEventListener('segment-hit', (e) => {
    const key = e.detail?.segment;
    if (key) {
      simulateHit(key);
    }
  });
}

// =============================================================================
// 3. Matrice de Chiffres 1 à 20
// =============================================================================

function renderNumbersGrid() {
  const container = document.getElementById('numbers-grid');
  if (!container) return;

  container.innerHTML = '';
  const mult = state.activeMultiplier; // 'S', 'D' ou 'T'
  const factor = mult === 'T' ? 3 : mult === 'D' ? 2 : 1;

  for (let n = 1; n <= 20; n++) {
    const key = `${mult}${n}`;
    const pts = n * factor;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'num-cell-btn';
    btn.dataset.simKey = key;
    btn.innerHTML = `<span class="num-lbl">${n}</span><span class="num-pts">(${pts})</span>`;
    container.appendChild(btn);
  }
}

function setupMultiplierTabs() {
  const tabs = document.querySelectorAll('#mult-tabs .mult-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeMultiplier = tab.dataset.mult || 'T';
      renderNumbersGrid();
    });
  });
}

// =============================================================================
// 4. Envoi de Simulation vers le Serveur
// =============================================================================

async function simulateHit(key, raw = null) {
  playImpactSound(key === 'DB' || key === 'SB');

  // Flash visuel sur l'élément cliqué
  highlightVisualElement(key);

  // Mise à jour préventive immédiate du dernier impact
  updateLastHitBadge(key, raw || (key ? `[${key}]` : ''));

  try {
    const payload = {};
    if (key) payload.key = key;
    if (raw) payload.raw = raw;

    const res = await fetch('/api/serial/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erreur de simulation', true);
      return;
    }

    if (data.simulated && data.simulated.char) {
      updateLastHitBadge(data.simulated.key, data.simulated.char);
    }
  } catch (err) {
    console.error('Erreur simulateHit:', err);
    showToast('Erreur réseau / communication', true);
  }
}

function highlightVisualElement(key) {
  if (!key) return;
  const dartboard = document.getElementById('interactive-dartboard') || document.getElementById('sim-dartboard');
  if (dartboard) {
    dartboard.highlight(key);
    setTimeout(() => {
      dartboard.highlight(null);
    }, 300);
  }
  const els = document.querySelectorAll(`[data-sim-key="${key}"]`);
  els.forEach((el) => {
    el.classList.add('segment-flash');
    setTimeout(() => {
      el.classList.remove('segment-flash');
    }, 280);
  });
}

function updateLastHitBadge(key, char = '') {
  const nameEl = document.getElementById('last-hit-name');
  const charEl = document.getElementById('last-hit-char');
  if (nameEl) nameEl.textContent = key || '—';
  if (charEl) charEl.textContent = char ? `char: '${char}'` : '';
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('companion-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle('toast--error', isError);
  toast.classList.toggle('toast--success', !isError);
  toast.classList.remove('hidden');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

// =============================================================================
// 5. Synchronisation WebSocket & Live HUD
// =============================================================================

function updateLiveHUD(matchState) {
  if (!matchState) return;

  const statusEl = document.getElementById('live-status');
  const playerEl = document.getElementById('live-player');
  const scoreEl = document.getElementById('live-score');
  const dartEl = document.getElementById('live-dart');

  // Statut
  if (statusEl) {
    const s = matchState.status || 'lobby';
    let label = 'LOBBY';
    let colorClass = 'highlight-neon';

    if (s === 'playing') {
      label = 'EN JEU';
      colorClass = 'highlight-neon';
    } else if (s === 'waiting_player') {
      label = 'RETIREZ FLÉCHETTES';
      colorClass = 'highlight-amber';
    } else if (s === 'finished' || s === 'victory') {
      label = 'VICTOIRE';
      colorClass = 'highlight-cyan';
    } else if (s === 'interrupted') {
      label = 'ARRÊTÉ';
      colorClass = 'highlight-laser';
    }

    statusEl.textContent = label;
  }

  // Joueur Actuel & Score
  if (Array.isArray(matchState.players) && matchState.players.length > 0) {
    const curIdx = matchState.actualplayer ?? 0;
    const curPlayer = matchState.players[curIdx] || matchState.players[0];
    if (playerEl) playerEl.textContent = curPlayer.PlayerName || `J${curIdx + 1}`;

    if (scoreEl) {
      const sVal = curPlayer.score ?? curPlayer.Score;
      if (sVal !== undefined && sVal !== null) {
        scoreEl.textContent = String(sVal);
      } else {
        scoreEl.textContent = '—';
      }
    }
  } else {
    if (playerEl) playerEl.textContent = '—';
    if (scoreEl) scoreEl.textContent = '—';
  }

  // Fléchette courante
  if (dartEl) {
    const launch = matchState.playerlaunch ?? 1;
    const nb = matchState.nbdarts ?? 3;
    if (matchState.status === 'waiting_player') {
      dartEl.textContent = 'VALIDATION';
    } else {
      dartEl.textContent = `${launch} / ${nb}`;
    }
  }

  // Dernier impact remonté par le moteur de match
  if (matchState.lastHit) {
    updateLastHitBadge(matchState.lastHit.key, '');
  }
}

function updateConnectionIndicator(connected) {
  const pill = document.getElementById('conn-pill');
  const text = document.getElementById('conn-status-text');
  if (!pill || !text) return;

  if (connected) {
    pill.classList.remove('offline');
    pill.classList.add('online');
    text.textContent = 'CONNECTÉ (SÉRIE/WS)';
  } else {
    pill.classList.remove('online');
    pill.classList.add('offline');
    text.textContent = 'DÉCONNECTÉ (RECONNEXION...)';
  }
}

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      updateConnectionIndicator(true);
    };

    state.ws.onclose = () => {
      updateConnectionIndicator(false);
      clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = setTimeout(initWebSocket, 2000);
    };

    state.ws.onerror = () => {
      updateConnectionIndicator(false);
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'match_state' && msg.data) {
          updateLiveHUD(msg.data);
        } else if (msg.type === 'serial_raw' && msg.data) {
          updateLastHitBadge(msg.data.key, msg.data.char);
        } else if (msg.type === 'board_button' && msg.data) {
          updateLastHitBadge(msg.data.key, msg.data.raw);
          highlightVisualElement(msg.data.key);
        }
      } catch (err) {
        console.error('Erreur parsing message WS:', err);
      }
    };
  } catch (err) {
    console.error('Erreur initWebSocket:', err);
    clearTimeout(state.wsReconnectTimer);
    state.wsReconnectTimer = setTimeout(initWebSocket, 2000);
  }
}

async function fetchInitialState() {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const data = await res.json();
      if (data.match) {
        updateLiveHUD(data.match);
      }
    }
  } catch {
    // ignore
  }
}

// =============================================================================
// 6. Gestion des Événements Utilisateur
// =============================================================================

function setupEventHandlers() {
  // Délégation de clics sur tous les boutons/segments ayant un [data-sim-key]
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-sim-key]');
    if (!target) return;

    const key = target.getAttribute('data-sim-key');
    if (key) {
      simulateHit(key);
    }
  });

  // Injection de caractère brut
  const rawInput = document.getElementById('raw-char-input');
  const btnSendRaw = document.getElementById('btn-send-raw');

  const sendRawChar = () => {
    if (!rawInput) return;
    const val = rawInput.value.trim();
    if (!val) {
      showToast('Veuillez entrer un caractère', true);
      return;
    }
    const char = val[0];
    simulateHit(null, char);
    rawInput.value = '';
    rawInput.focus();
  };

  if (btnSendRaw) {
    btnSendRaw.addEventListener('click', sendRawChar);
  }

  if (rawInput) {
    rawInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendRawChar();
      }
    });
  }
}

// =============================================================================
// 7. Démarrage de l'Application Compagnon
// =============================================================================

window.addEventListener('DOMContentLoaded', () => {
  buildDartboardGeometry();
  setupMultiplierTabs();
  renderNumbersGrid();
  setupEventHandlers();
  initWebSocket();
  fetchInitialState();
});
