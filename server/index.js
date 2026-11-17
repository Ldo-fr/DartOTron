import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, execFileSync } from 'node:child_process';

import { CConfig, ORDERED_DART_KEYS, DEFAULT_SCORE_MAP } from './config.js';
import { CScores } from './scores.js';
import { SerialManager } from './serial.js';
import { MatchEngine } from './engine/MatchEngine.js';
import { getGamesList } from './games/index.js';
import { FR_LOCALE } from './locale.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

export function createDartOTronServer(options = {}) {
  const isDev = Boolean(
    options.isDev ?? (process.argv.includes('--dev') || process.env.NODE_ENV === 'development')
  );
  const config = options.config || new CConfig();
  const scores = options.scores || new CScores(config);
  const serial = options.serial || new SerialManager(config);
  const engine = options.engine || new MatchEngine(config, scores);

  const wsClients = new Set();
  let activeKioskSocket = null;
  let activeKioskTabId = null;

  const isLocalhostRequest = (req) => {
    const forwardedFor = (req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    const remoteAddr = forwardedFor || req.socket?.remoteAddress || '';
    const isLoopbackIp =
      remoteAddr === '127.0.0.1' ||
      remoteAddr === '::1' ||
      remoteAddr === '::ffff:127.0.0.1';
    if (!isLoopbackIp) return false;
    const hostHeader = (req.headers?.host || '').split(':')[0].toLowerCase();
    if (hostHeader && hostHeader !== 'localhost' && hostHeader !== '127.0.0.1' && hostHeader !== '[::1]') {
      return false;
    }
    return true;
  };

  function encodeWsFrame(payloadStr) {
    const payload = Buffer.from(payloadStr, 'utf-8');
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text frame
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
  }

  function broadcast(type, data) {
    const msg = JSON.stringify({ type, data });
    const frame = encodeWsFrame(msg);
    for (const socket of wsClients) {
      try {
        if (!socket.destroyed && socket.writable) {
          socket.write(frame);
        } else {
          wsClients.delete(socket);
        }
      } catch {
        wsClients.delete(socket);
      }
    }
  }

  function sendWs(socket, type, data) {
    try {
      if (!socket.destroyed && socket.writable) {
        socket.write(encodeWsFrame(JSON.stringify({ type, data })));
      }
    } catch {
      wsClients.delete(socket);
    }
  }

  // Wire SerialManager events
  serial.on('status', (status) => {
    broadcast('serial_status', status);
  });

  serial.on('raw', (rawChar) => {
    broadcast('serial_raw', {
      raw: rawChar,
      mode: serial.mode
    });
  });

  serial.on('hit', ({ key, raw, source }) => {
    if (serial.mode === 'wizard') {
      broadcast('serial_hit_wizard', { key, raw, source });
      return;
    }
    if (engine.status === 'playing' || engine.status === 'waiting_player') {
      const state = engine.handleInput(key);
      broadcast('match_state', state);
    } else {
      broadcast('board_button', { key, raw, source });
    }
  });

  serial.on('unmapped', ({ raw }) => {
    broadcast('serial_unmapped', { raw });
  });

  function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1e6) {
          reject(new Error('Payload too large'));
          req.destroy();
        }
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  function serveStaticFile(req, res, filePath) {
    let stat;
    try {
      stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    } catch {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      if (start >= total || end >= total) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  const getLocalIpAddress = () => {
    const nets = os.networkInterfaces();
    let fallbackIp = '127.0.0.1';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
          if (name.startsWith('wlan') || name.startsWith('wl') || name.startsWith('en') || name.startsWith('eth')) {
            return net.address;
          }
          if (fallbackIp === '127.0.0.1') fallbackIp = net.address;
        }
      }
    }
    return fallbackIp;
  };

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);

      // API Routes
      const getPlayersPayload = () => {
        const lobby = scores.GetLobbyState();
        const allPlayers = scores.GetPlayers();
        const stats = scores.GetPlayersStats();
        return {
          activePlayers: lobby.activePlayers.length > 0 ? lobby.activePlayers : ['Joueur 1'],
          activePlayerIds: lobby.activePlayerIds,
          knownPlayers: allPlayers.map(p => p.name),
          players: allPlayers,
          selectedGame: lobby.selectedGame,
          stats
        };
      };

      if (pathname === '/api/bootstrap' && req.method === 'GET') {
        const localIp = getLocalIpAddress();
        const address = server.address();
        const listeningPort = (address && typeof address === 'object') ? address.port : null;
        const hostHeader = req.headers.host || '';
        const reqPort = hostHeader.includes(':') ? Number(hostHeader.split(':')[1]) : null;
        const port = Number(config.GetValue('SectionGlobals', 'http_port')) || reqPort || listeningPort || Number(process.env.PORT || 8180);
        const portSuffix = (port === 80 || port === 443) ? '' : `:${port}`;
        return sendJson(res, 200, {
          version: config.dartotronVersion,
          isDev,
          isLocalhost: isLocalhostRequest(req),
          localIp,
          companionUrl: `http://${localIp}${portSuffix}/companion`,
          config: config.data,
          orderedDartKeys: ORDERED_DART_KEYS,
          scoreMap: DEFAULT_SCORE_MAP,
          serial: serial.getStatus(),
          games: getGamesList(config),
          playersData: getPlayersPayload(),
          match: engine.getStateAndFlushEvents(),
          locale: FR_LOCALE
        });
      }

      if (pathname === '/api/lobby' && req.method === 'GET') {
        return sendJson(res, 200, scores.GetLobbyState());
      }

      if (pathname === '/api/lobby' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const updated = scores.SaveLobbyState({
          selectedGame: body.selectedGame,
          playerNames: body.activePlayers,
          playerIds: body.activePlayerIds
        });
        broadcast('lobby_updated', updated);
        return sendJson(res, 200, updated);
      }

      if (pathname === '/api/players' && req.method === 'GET') {
        return sendJson(res, 200, getPlayersPayload());
      }

      if (pathname === '/api/players/profile' && req.method === 'GET') {
        const name = parsedUrl.searchParams.get('name') || '';
        const profile = scores.GetPlayerProfile(name);
        if (!profile) {
          return sendJson(res, 404, { error: 'Joueur introuvable' });
        }
        return sendJson(res, 200, { profile });
      }

      if (pathname === '/api/players' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (Array.isArray(body.knownPlayers)) {
          for (const name of body.knownPlayers) {
            scores.AddPlayer(name);
          }
        }
        if (Array.isArray(body.activePlayers) && body.activePlayers.length > 0) {
          scores.SaveLobbyState({ playerNames: body.activePlayers });
        }
        const payload = getPlayersPayload();
        broadcast('players_updated', payload);
        return sendJson(res, 200, payload);
      }

      if (pathname === '/api/players/delete' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const targetName = String(body.name || '').trim();
        if (!targetName) {
          return sendJson(res, 400, { error: 'Nom de joueur manquant' });
        }
        const targetLow = targetName.toLowerCase();

        const lobby = scores.GetLobbyState();
        if (lobby.activePlayers.some(p => p.toLowerCase() === targetLow)) {
          return sendJson(res, 400, {
            error: 'Ce joueur est actuellement sélectionné EN JEU. Désélectionnez-le avant de le supprimer.'
          });
        }

        scores.DeletePlayer(targetName);

        const payload = getPlayersPayload();
        broadcast('players_updated', payload);
        return sendJson(res, 200, payload);
      }

      if (pathname === '/api/players/rename' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const oldName = String(body.oldName || '').trim();
        const newName = String(body.newName || '').trim().replace(/,/g, '');
        if (!oldName || !newName) {
          return sendJson(res, 400, { error: 'Nom de joueur invalide' });
        }

        const oldLow = oldName.toLowerCase();
        const newLow = newName.toLowerCase();

        const currentPayload = getPlayersPayload();
        if (oldLow !== newLow && currentPayload.knownPlayers.some(p => p.toLowerCase() === newLow)) {
          return sendJson(res, 400, { error: `Un joueur nommé « ${newName} » existe déjà !` });
        }

        try {
          scores.RenamePlayer(oldName, newName);
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }

        const payload = getPlayersPayload();
        broadcast('players_updated', payload);
        return sendJson(res, 200, payload);
      }

      if (pathname === '/api/games' && req.method === 'GET') {
        return sendJson(res, 200, { games: getGamesList(config) });
      }

      if (pathname === '/api/state' && req.method === 'GET') {
        return sendJson(res, 200, {
          match: engine.getStateAndFlushEvents(),
          serial: serial.getStatus()
        });
      }

      if (pathname === '/api/match/start' && req.method === 'POST') {
        const body = await readJsonBody(req);
        serial.mode = 'game';
        serial.flush();
        const state = engine.startMatch({
          gameId: body.gameId,
          players: body.players,
          options: body.options || {}
        });
        broadcast('match_state', state);
        return sendJson(res, 200, { match: state });
      }

      if (pathname === '/api/match/restart' && req.method === 'POST') {
        serial.mode = 'game';
        serial.flush();
        const state = engine.restartMatch();
        broadcast('match_state', state);
        return sendJson(res, 200, { match: state });
      }

      if (pathname === '/api/match/lobby' && req.method === 'POST') {
        engine.reset();
        const state = engine.getStateAndFlushEvents();
        broadcast('match_state', state);
        return sendJson(res, 200, { match: state });
      }

      if (pathname === '/api/match/input' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const state = engine.handleInput(body.key || body.char);
        broadcast('match_state', state);
        return sendJson(res, 200, { match: state });
      }

      if (pathname === '/api/config' && req.method === 'GET') {
        return sendJson(res, 200, {
          config: config.data,
          orderedDartKeys: ORDERED_DART_KEYS,
          serial: serial.getStatus()
        });
      }

      if (pathname === '/api/config' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.SectionGlobals) {
          Object.assign(config.data.SectionGlobals, body.SectionGlobals);
        }
        if (body.SectionAdvanced) {
          Object.assign(config.data.SectionAdvanced, body.SectionAdvanced);
        }
        if (body.SectionKeys) {
          config.updateKeys(body.SectionKeys);
        }
        config.save();
        if (body.reconnectSerial) {
          await serial.connect();
        }
        broadcast('config_updated', {
          config: config.data,
          serial: serial.getStatus()
        });
        return sendJson(res, 200, {
          config: config.data,
          serial: serial.getStatus()
        });
      }

      if (pathname === '/api/calibration/mode' && req.method === 'POST') {
        const body = await readJsonBody(req);
        serial.mode = body.mode === 'wizard' ? 'wizard' : 'game';
        return sendJson(res, 200, { mode: serial.mode });
      }

      if (pathname === '/api/serial/simulate' && req.method === 'POST') {
        if (!isDev) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        const body = await readJsonBody(req);
        const key = body?.key;
        const raw = body?.raw;
        let result = null;
        if (raw) {
          serial.handleChar(String(raw));
          result = { raw: String(raw) };
        } else if (key) {
          result = serial.simulateKey(key);
        } else {
          return sendJson(res, 400, { error: 'Paramètre "key" ou "raw" requis' });
        }
        return sendJson(res, 200, { ok: true, simulated: result });
      }

      if (pathname === '/api/calibration/save' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.keys && typeof body.keys === 'object') {
          config.updateKeys(body.keys);
        }
        serial.mode = 'game';
        broadcast('config_updated', {
          config: config.data,
          serial: serial.getStatus()
        });
        return sendJson(res, 200, {
          config: config.data,
          serial: serial.getStatus()
        });
      }

      if (pathname === '/api/serial/connect' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.port) {
          config.SetValue('SectionGlobals', 'serialport', body.port);
        }
        if (body.baudRate) {
          config.SetValue('SectionGlobals', 'serialspeed', Number(body.baudRate));
        }
        if (typeof body.noserial === 'boolean') {
          config.SetValue('SectionAdvanced', 'noserial', body.noserial);
        }
        config.save();
        await serial.connect();
        return sendJson(res, 200, { serial: serial.getStatus() });
      }

      if (pathname === '/api/system/quit' && req.method === 'POST') {
        sendJson(res, 200, { ok: true });
        setTimeout(() => {
          exec('pkill -f "chromium" || pkill -f "chrome" || killall chromium-browser || true', () => {});
        }, 300);
        return;
      }

      if (pathname === '/api/records/hall-of-fame' && req.method === 'GET') {
        const hoOneVariant = parsedUrl.searchParams.get('ho_one_variant') || parsedUrl.searchParams.get('variant') || null;
        const cricketVariant = parsedUrl.searchParams.get('cricket_variant') || null;
        const hof = scores.GetHallOfFame ? scores.GetHallOfFame({ hoOneVariant, cricketVariant }) : [];
        const categories = Array.isArray(hof) ? [...hof] : (hof.categories || []);
        const sections = hof.sections || null;
        return sendJson(res, 200, { categories, sections });
      }

      if (pathname === '/api/records' && req.method === 'GET') {
        const game = parsedUrl.searchParams.get('game') || null;
        const type = parsedUrl.searchParams.get('type') || null;
        const playerId = parsedUrl.searchParams.get('playerId') || null;
        const limit = Number(parsedUrl.searchParams.get('limit') || 50);

        if (scores.GetRecords) {
          const rows = scores.GetRecords({ gameName: game, recordType: type, playerId, limit });
          return sendJson(res, 200, { records: rows });
        }
        const rows = scores.GetAllRecords(game, limit);
        return sendJson(res, 200, { records: rows });
      }

      if (pathname === '/api/records/delete' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const success = scores.DeleteRecord(body.id);
        return sendJson(res, 200, { success });
      }

      if (pathname === '/api/records/definitions' && req.method === 'GET') {
        const game = parsedUrl.searchParams.get('game') || null;
        const definitions = scores.GetRecordDefinitions(game);
        return sendJson(res, 200, { definitions });
      }

      if (pathname === '/api/records/definitions' && req.method === 'POST') {
        const body = await readJsonBody(req);
        try {
          scores.AddRecordDefinition(body);
          let backfilledCount = 0;
          if (body.backfill !== false) {
            backfilledCount = scores.BackfillRecord(body.id);
          }
          return sendJson(res, 200, { success: true, backfilledCount });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      if (pathname === '/api/records/definitions/backfill' && req.method === 'POST') {
        const body = await readJsonBody(req);
        try {
          const count = scores.BackfillRecord(body.id);
          return sendJson(res, 200, { success: true, backfilledCount: count });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      if (pathname === '/api/records/definitions/delete' && req.method === 'POST') {
        const body = await readJsonBody(req);
        try {
          const success = scores.DeleteRecordDefinition(body.id);
          return sendJson(res, 200, { success });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      if (pathname === '/api/records/chimay' && req.method === 'GET') {
        const limit = Number(parsedUrl.searchParams.get('limit') || 100);
        return sendJson(res, 200, scores.GetAllChimayRecords(limit));
      }

      // Static Asset Routes (/sounds)
      for (const assetPrefix of ['/sounds/']) {
        if (pathname.startsWith(assetPrefix)) {
          const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
          const assetPath = path.join(ROOT_DIR, safeRel);
          if (assetPath.startsWith(ROOT_DIR)) {
            return serveStaticFile(req, res, assetPath);
          }
        }
      }

      // Companion Mobile Mirror Screen (Disponible partout, PROD & DEV)
      if (pathname === '/companion' || pathname === '/companion/') {
        return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'companion', 'index.html'));
      }

      // Simulator Web Application (DEV ONLY - Simulateur matériel cible Arduino)
      if (pathname === '/simulator' || pathname.startsWith('/simulator/')) {
        if (!isDev) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        if (pathname === '/simulator' || pathname === '/simulator/') {
          return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'simulator', 'index.html'));
        }
      }

      // Component Showcase (CyberHUD Web Components workbench - DEV ONLY)
      if (pathname === '/showcase' || pathname.startsWith('/showcase/')) {
        if (!isDev) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        if (pathname === '/showcase' || pathname === '/showcase/') {
          return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'showcase', 'index.html'));
        }
      }

      // Redirect non-localhost (Wi-Fi / LAN) requests for main kiosk entrypoint to /companion
      if ((pathname === '/' || pathname === '/index.html') && !isLocalhostRequest(req)) {
        res.writeHead(302, {
          Location: '/companion',
          'Cache-Control': 'no-store'
        });
        res.end();
        return;
      }

      // Public Frontend Static Files
      const relPublic = pathname === '/' ? '/index.html' : pathname;
      const safePublicRel = path.normalize(relPublic).replace(/^(\.\.(\/|\\|$))+/, '');
      const publicPath = path.join(PUBLIC_DIR, safePublicRel);
      if (publicPath.startsWith(PUBLIC_DIR) && fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        return serveStaticFile(req, res, publicPath);
      }

      // SPA Fallback to index.html (or redirect remote devices to /companion)
      if (!isLocalhostRequest(req)) {
        res.writeHead(302, {
          Location: '/companion',
          'Cache-Control': 'no-store'
        });
        res.end();
        return;
      }
      return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
    } catch (err) {
      console.error('[Server Error]', err);
      sendJson(res, 500, { error: err.message || 'Erreur interne du serveur' });
    }
  });

  // Native RFC 6455 WebSocket upgrade handler
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];
    socket.write(headers.join('\r\n'));

    const wsUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const role = wsUrl.searchParams.get('role');
    const tabId = wsUrl.searchParams.get('tabId') || '';

    if (role === 'kiosk') {
      if (!isLocalhostRequest(req)) {
        sendWs(socket, 'redirect_companion', { reason: 'remote_ip' });
        socket.end();
        return;
      }

      const hasActiveKiosk =
        activeKioskSocket &&
        !activeKioskSocket.destroyed &&
        activeKioskSocket.writable;

      if (hasActiveKiosk && activeKioskTabId && tabId && activeKioskTabId !== tabId) {
        sendWs(socket, 'redirect_companion', { reason: 'already_active' });
        socket.end();
        return;
      }

      activeKioskSocket = socket;
      activeKioskTabId = tabId || activeKioskTabId;
    }

    const cleanupSocket = () => {
      wsClients.delete(socket);
      if (activeKioskSocket === socket) {
        activeKioskSocket = null;
      }
    };

    wsClients.add(socket);

    // Send initial state
    sendWs(socket, 'init', {
      serial: serial.getStatus(),
      match: engine.getStateAndFlushEvents(),
      dbInitialized: scores.consumeFirstCreationFlag ? scores.consumeFirstCreationFlag() : false
    });

    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        const opcode = firstByte & 0x0f;
        const isMasked = Boolean(secondByte & 0x80);
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (opcode === 0x08) {
          // Close frame
          cleanupSocket();
          socket.end();
          return;
        }

        if (payloadLen === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        const maskLen = isMasked ? 4 : 0;
        if (buffer.length < offset + maskLen + payloadLen) return;

        let payload = buffer.subarray(offset + maskLen, offset + maskLen + payloadLen);
        if (isMasked) {
          const mask = buffer.subarray(offset, offset + 4);
          const unmasked = Buffer.alloc(payloadLen);
          for (let i = 0; i < payloadLen; i++) {
            unmasked[i] = payload[i] ^ mask[i % 4];
          }
          payload = unmasked;
        }

        buffer = buffer.subarray(offset + maskLen + payloadLen);

        if (opcode === 0x09) {
          // Ping -> Pong
          const pong = Buffer.from([0x8a, 0x00]);
          socket.write(pong);
          continue;
        }

        if (opcode === 0x01) {
          try {
            const msg = JSON.parse(payload.toString('utf-8'));
            handleWsMessage(socket, msg);
          } catch {
            // ignore malformed JSON
          }
        }
      }
    });

    socket.on('close', cleanupSocket);
    socket.on('error', cleanupSocket);
  });

  function handleWsMessage(socket, msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'input' && msg.key) {
      const state = engine.handleInput(msg.key);
      broadcast('match_state', state);
    } else if (msg.type === 'simulate_serial' && msg.char) {
      serial.handleChar(String(msg.char));
    } else if (msg.type === 'wizard_mode') {
      serial.mode = msg.enabled ? 'wizard' : 'game';
    }
  }

  return {
    server,
    config,
    scores,
    serial,
    engine,
    isDev,
    async start(port = Number(process.env.PORT || 8180), host = process.env.HOST || '0.0.0.0') {
      await serial.connect();
      return new Promise((resolve, reject) => {
        let retries = 0;
        const onError = (err) => {
          if (err.code === 'EADDRINUSE' && port !== 0 && retries < 10) {
            retries++;
            setTimeout(() => {
              server.close();
              server.listen(port, host);
            }, 250);
          } else {
            reject(err);
          }
        };
        server.on('error', onError);
        server.listen(port, host, () => {
          server.removeListener('error', onError);
          console.log(`Serveur DartOTron démarré sur http://localhost:${port}`);
          resolve(server);
        });
      });
    },
    stop() {
      serial.disconnect();
      for (const s of wsClients) {
        try {
          s.destroy();
        } catch {
          // ignore
        }
      }
      wsClients.clear();
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      return new Promise((resolve) => server.close(resolve));
    }
  };
}

// Start server if invoked directly (resolves symlinks)
const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  const resolvedArg = path.resolve(process.argv[1]);
  if (resolvedArg === __filename) return true;
  try {
    return fs.realpathSync(resolvedArg) === fs.realpathSync(__filename);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  const app = createDartOTronServer();
  app.start();

  const shutdown = () => {
    app.stop().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

