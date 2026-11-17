import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { startTestServer } from '../core/server-fixture.js';
import { scanInlineStylesInHtml, scanShadowDomViolations, extractHtmlNodes } from '../core/dom-scanner.js';
import { extractCssImports, extractCssCustomProperties } from '../core/css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

describeSuite('Tier 4 - Scenario 1: Kiosk Arcade Startup & Shell Navigation', { tier: 4 }, (suite) => {

  let server;

  suite.test('S1.1: Server starts cleanly and serves index.html with 200 OK and text/html UTF-8', { featureId: 18, milestone: 'M5' }, async () => {
    server = await startTestServer();
    const res = await server.verifyAsset('/index.html', 'text/html');
    assert.ok(res.ok, 'Server must serve index.html with 200 OK');
    assert.ok(res.typeOk, `Expected text/html, got: ${res.contentType}`);
  });

  suite.test('S1.2: All linked stylesheets in index.html resolve and load successfully via HTTP', { featureId: 5, milestone: 'M1' }, async () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    // Extract all local css links
    const linkMatches = [...html.matchAll(/<link\s+[^>]*href=["']([^"']+\.css)["']/gi)].map(m => m[1]);
    for (const href of linkMatches) {
      if (!href.startsWith('http')) {
        const res = await server.verifyAsset(href, 'text/css');
        assert.ok(res.ok, `Failed to load linked stylesheet: ${href} (HTTP ${res.status})`);
      }
    }
  });

  suite.test('S1.3: All linked script modules in index.html resolve and load successfully via HTTP', { featureId: 1, milestone: 'M1' }, async () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    const scriptMatches = [...html.matchAll(/<script\s+[^>]*src=["']([^"']+\.js)["']/gi)].map(m => m[1]);
    for (const src of scriptMatches) {
      if (!src.startsWith('http')) {
        const res = await server.verifyAsset(src, 'application/javascript');
        assert.ok(res.ok, `Failed to load linked script: ${src} (HTTP ${res.status})`);
      }
    }
  });

  suite.test('S1.4: Main kiosk shell DOM structure exists (#app-shell, .topbar, footer)', { featureId: 15, milestone: 'M3' }, () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    const nodes = extractHtmlNodes(html);

    const hasAppShell = html.includes('id="app-shell"') || html.includes('class="kiosk-container"');
    const hasTopbar = html.includes('class="topbar"') || html.includes('<o-topbar');
    const hasFooter = html.includes('class="footer"') || html.includes('kiosk-footer') || html.includes('lobby-footer');

    assert.ok(hasAppShell, 'Kiosk app-shell container must exist');
    assert.ok(hasTopbar, 'Topbar CyberHUD component/header must exist');
    assert.ok(hasFooter, 'Action footer bar must exist');
  });

  suite.test('S1.5: Verify shell has 0 static inline style attributes and 0 Shadow DOM usage', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const styles = scanInlineStylesInHtml(indexPath);
    const staticStyles = styles.filter(s => !s.isDynamic);
    assert.equal(staticStyles.length, 0, `Shell still contains ${staticStyles.length} static inline styles`);

    const shadowViolations = scanShadowDomViolations(indexPath);
    assert.equal(shadowViolations.length, 0, 'Shell must have 0 Shadow DOM references');
  });

  suite.test('S1.6: Teardown test server', { featureId: 18, milestone: 'M5' }, async () => {
    if (server) {
      await server.stop();
    }
  });

});
