import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

export class SerialManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connected = false;
    this.portPath = null;
    this.baudRate = 9600;
    this.lastError = null;
    this.fd = null;
    this.pollTimer = null;
    this.spInstance = null;
    this.mode = 'game'; // 'game' or 'wizard'
  }

  listPorts() {
    const ports = new Set();
    const configured = this.config.GetValue('SectionGlobals', 'serialport');
    if (configured && configured !== 'None' && configured !== 'false') {
      ports.add(String(configured));
    }

    if (process.platform === 'linux' || process.platform === 'darwin') {
      try {
        const devFiles = fs.readdirSync('/dev');
        for (const f of devFiles) {
          if (
            f.startsWith('ttyACM') ||
            f.startsWith('ttyUSB') ||
            f.startsWith('ttyAMA') ||
            f.startsWith('tty.usb') ||
            f.startsWith('cu.usb')
          ) {
            ports.add(`/dev/${f}`);
          }
        }
      } catch {
        // ignore
      }
    } else if (process.platform === 'win32') {
      for (let i = 1; i <= 16; i++) {
        ports.add(`COM${i}`);
      }
    }

    return Array.from(ports);
  }

  async connect(customPort = null, customBaud = null) {
    this.disconnect();

    if (this.config.GetValue('SectionAdvanced', 'noserial')) {
      this.connected = false;
      this.lastError = 'Mode sans port série (noserial activé)';
      this.emit('status', this.getStatus());
      return false;
    }

    const port = customPort || this.config.GetValue('SectionGlobals', 'serialport') || '/dev/ttyACM0';
    const baud = Number(customBaud || this.config.GetValue('SectionGlobals', 'serialspeed') || 9600);
    this.portPath = port;
    this.baudRate = baud;

    // 1. Try optional npm 'serialport' package if installed
    try {
      const { SerialPort } = await import('serialport');
      return await new Promise((resolve) => {
        const sp = new SerialPort({ path: port, baudRate: baud, autoOpen: false });
        sp.open((err) => {
          if (err) {
            this.lastError = err.message;
            this.connected = false;
            this.emit('status', this.getStatus());
            resolve(false);
            return;
          }
          this.spInstance = sp;
          this.connected = true;
          this.lastError = null;
          this.emit('status', this.getStatus());
          sp.on('data', (buf) => this.handleRawBuffer(buf));
          sp.on('close', () => {
            this.connected = false;
            this.emit('status', this.getStatus());
          });
          sp.on('error', (e) => {
            this.lastError = e.message;
            this.connected = false;
            this.emit('status', this.getStatus());
          });
          resolve(true);
        });
      });
    } catch {
      // Fallback to native POSIX serial reading (Linux / Raspberry Pi / macOS)
    }

    // 2. Native Linux / Raspberry Pi serial connection via stty + non-blocking fs.open
    try {
      if (!fs.existsSync(port)) {
        throw new Error(`Le périphérique ${port} n'est pas connecté`);
      }
      if (process.platform === 'linux') {
        try {
          execFileSync('stty', ['-F', port, String(baud), 'raw', '-echo', '-echoe', '-echok'], {
            stdio: 'ignore'
          });
        } catch {
          // stty may warn on non-tty files in test environments
        }
      }
      const constants = fs.constants;
      this.fd = fs.openSync(port, constants.O_RDONLY | constants.O_NONBLOCK);
      this.connected = true;
      this.lastError = null;
      this.emit('status', this.getStatus());

      const buf = Buffer.alloc(64);
      this.pollTimer = setInterval(() => {
        if (this.fd === null) return;
        try {
          const bytesRead = fs.readSync(this.fd, buf, 0, buf.length, null);
          if (bytesRead > 0) {
            this.handleRawBuffer(buf.subarray(0, bytesRead));
          }
        } catch (err) {
          if (err.code === 'EAGAIN' || err.code === 'EWOULDBLOCK') {
            return; // No data in buffer right now
          }
          this.lastError = err.message;
          this.disconnect();
        }
      }, 15);

      return true;
    } catch (err) {
      this.connected = false;
      this.lastError = err.message;
      this.emit('status', this.getStatus());
      return false;
    }
  }

  flush() {
    if (this.spInstance && typeof this.spInstance.flush === 'function') {
      try {
        this.spInstance.flush();
      } catch {
        // ignore
      }
    }
  }

  handleRawBuffer(buf) {
    const str = buf.toString('utf-8');
    for (const ch of str) {
      if (ch === '\r' || ch === '\n' || ch === '\0') continue;
      this.handleChar(ch);
    }
  }

  handleChar(rawChar) {
    // Emit raw char for calibration wizard
    this.emit('raw', rawChar);

    // Map char using SectionKeys
    const keysMap = this.config.data.SectionKeys || {};
    let mappedKey = null;
    for (const [theKey, theConfigChar] of Object.entries(keysMap)) {
      if (theConfigChar && theConfigChar === rawChar) {
        mappedKey = theKey.toUpperCase();
        break;
      }
    }

    // Check virtual fallback map if not mapped via SectionKeys
    if (!mappedKey && this.virtualFallbackMap && this.virtualFallbackMap.has(rawChar)) {
      mappedKey = this.virtualFallbackMap.get(rawChar);
    }

    if (mappedKey) {
      this.emit('hit', { key: mappedKey, raw: rawChar, source: 'serial' });
    } else {
      this.emit('unmapped', { raw: rawChar });
    }
  }

  simulateKey(key) {
    const cleanKey = String(key || '').toUpperCase().trim();
    if (!cleanKey) return null;

    // 1. Look for existing calibrated char in SectionKeys
    const keysMap = this.config.data.SectionKeys || {};
    let charToSend = keysMap[cleanKey] || null;

    // 2. Fallback to deterministic virtual char if not calibrated yet
    if (!charToSend) {
      const idx = this.config.OrderedDartKeys.indexOf(cleanKey);
      if (idx !== -1) {
        charToSend = String.fromCharCode(65 + (idx % 58));
        if (!this.virtualFallbackMap) this.virtualFallbackMap = new Map();
        this.virtualFallbackMap.set(charToSend, cleanKey);
      } else {
        charToSend = cleanKey[0] || '?';
        if (!this.virtualFallbackMap) this.virtualFallbackMap = new Map();
        this.virtualFallbackMap.set(charToSend, cleanKey);
      }
    }

    this.handleChar(charToSend);
    return { key: cleanKey, char: charToSend };
  }

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.fd !== null) {
      try {
        fs.closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }
    if (this.spInstance) {
      try {
        this.spInstance.close();
      } catch {
        // ignore
      }
      this.spInstance = null;
    }
    this.connected = false;
    this.emit('status', this.getStatus());
  }

  getStatus() {
    return {
      connected: this.connected,
      port: this.portPath || this.config.GetValue('SectionGlobals', 'serialport'),
      baudRate: this.baudRate,
      noserial: Boolean(this.config.GetValue('SectionAdvanced', 'noserial')),
      calibrated: this.config.isCalibrated(),
      error: this.lastError,
      availablePorts: this.listPorts()
    };
  }
}

