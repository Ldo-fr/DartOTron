import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const PORT = 8189;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_DIR = '/tmp/dartotron_screenshots_data';

// Clean temporary data dir to guarantee pristine state
if (fs.existsSync(DATA_DIR)) {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DATA_DIR, { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved screenshot: ${outputPath} (${buffer.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function throwDart(key) {
  await fetch(`${BASE_URL}/api/match/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });
  await wait(250);
}

async function advanceNext() {
  await fetch(`${BASE_URL}/api/match/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'PLAYERBUTTON' })
  });
  await wait(450);
}

async function run() {
  console.log(`Starting isolated DartOTron server on port ${PORT} with clean data in ${DATA_DIR}...`);
  const server = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DARTOTRON_DATA_DIR: DATA_DIR },
    stdio: 'ignore'
  });

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const res = await fetch(`${BASE_URL}/api/config`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
  }
  if (!serverReady) {
    server.kill();
    throw new Error('Failed to start isolated server');
  }

  // Ensure anonymized players "Joueur 1" and "Joueur 2" are saved in lobby
  await fetch(`${BASE_URL}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      knownPlayers: ['Joueur 1', 'Joueur 2'],
      activePlayers: ['Joueur 1', 'Joueur 2']
    })
  });

  console.log('Launching headless chrome...');
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1024,600',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let connected = false;
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      await wait(300);
      try {
        versionData = await fetchJson('http://127.0.0.1:9222/json/list');
        if (versionData && versionData.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {}
    }

    if (!connected) throw new Error('Could not connect to Chrome debugging port 9222');

    const pageTarget = versionData.find(t => t.type === 'page') || versionData[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // 1. CAPTURE LOBBY (1024x600 - Raspberry Pi 7" display)
    console.log('1. Capturing Lobby (1024x600)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 600,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Page.navigate', { url: `${BASE_URL}/` });
    await wait(2000);
    await client.evaluate(`
      document.querySelectorAll('m-notification, hud-notification, .notification-item').forEach(n => n.remove());
    `);
    await wait(800);
    await client.captureScreenshot('docs/assets/screenshots/lobby.png');

    // 2. SIMULATE MULTIPLE TURNS IN CRICKET CRAZY MASTER
    console.log('2. Simulating Cricket Crazy Master match with multiple turns...');
    await fetch(`${BASE_URL}/api/match/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'Cricket',
        players: ['Joueur 1', 'Joueur 2'],
        options: {
          optioncutthroat: 'True',
          optioncrazy: 'True',
          optioncrazycutthroatmaster: 'True'
        }
      })
    });
    await wait(1000);

    // Round 1 - Joueur 1: 3 darts (S<h0>, T<h0>, S<h1 >)
    let st = await (await fetch(`${BASE_URL}/api/state`)).json();
    let h = st.match?.headers || ['20', '19', '18', '17', '16', '15', 'B'];
    await throwDart(`S${h[0]}`);
    await throwDart(`T${h[0]}`);
    await throwDart(`S${h[1]}`);
    await advanceNext();

    // Round 1 - Joueur 2: 3 darts (S<h1 >, T<h1 >, S<h2 >)
    st = await (await fetch(`${BASE_URL}/api/state`)).json();
    h = st.match?.headers || ['20', '19', '18', '17', '16', '15', 'B'];
    await throwDart(`S${h[1]}`);
    await throwDart(`T${h[1]}`);
    await throwDart(`S${h[2]}`);
    await advanceNext();

    // Round 2 - Joueur 1 throws 2 darts out of 3 (active turn in progress, NO waiting_player!)
    st = await (await fetch(`${BASE_URL}/api/state`)).json();
    const h2 = st.match?.headers || ['20', '19', '18', '17', '16', '15', 'B'];
    await throwDart(`S${h2[0]}`);
    await throwDart(`D${h2[1]}`);
    await wait(1800); // let animations settle

    // Capture Match Screen at 1024x600
    console.log('Capturing Live Match Cricket Crazy Master (1024x600)...');
    await client.captureScreenshot('docs/assets/screenshots/game-cricket-crazy.png');

    // 3. CAPTURE MOBILE COMPANION IN LANDSCAPE (844x390, iPhone / Android landscape)
    console.log('3. Capturing Mobile Companion in Landscape (844x390)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { angle: 90, type: 'landscapePrimary' }
    });
    await client.send('Page.navigate', { url: `${BASE_URL}/companion` });
    await wait(3000);
    await client.captureScreenshot('docs/assets/screenshots/companion-mobile.png');

    // Remove obsolete screenshots if any
    const obsolete = [
      'docs/assets/screenshots/records-stats.png',
      'docs/assets/screenshots/victory-screen.png'
    ];
    for (const file of obsolete) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Deleted obsolete screenshot: ${file}`);
      }
    }

    console.log('All 3 screenshots updated successfully!');
    client.close();
  } finally {
    chrome.kill();
    server.kill();
  }
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
