import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { startTestServer } from '../core/server-fixture.js';
import { scanInlineStylesInHtml } from '../core/dom-scanner.js';
import { extractCssImports } from '../core/css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

describeSuite('Tier 4 - Scenario 5: Satellite Screens Integration (Companion, Simulator, Showcase)', { tier: 4 }, (suite) => {

  let server;

  suite.test('S5.1: Test server starts and serves all 3 satellite entrypoints with HTTP 200', { featureId: 17, milestone: 'M4' }, async () => {
    server = await startTestServer();

    const companionRes = await server.verifyAsset('/companion/index.html', 'text/html');
    assert.ok(companionRes.ok, 'Companion screen must be served with 200 OK');

    const simulatorRes = await server.verifyAsset('/simulator/index.html', 'text/html');
    assert.ok(simulatorRes.ok, 'Simulator screen must be served with 200 OK');

    const showcaseRes = await server.verifyAsset('/showcase/index.html', 'text/html');
    assert.ok(showcaseRes.ok, 'Showcase screen must be served with 200 OK');
  });

  suite.test('S5.2: Companion spectator screen contains 0 static inline styles and links valid assets', { featureId: 17, milestone: 'M4' }, async () => {
    const companionHtml = path.join(PUBLIC_DIR, 'companion', 'index.html');
    const styles = scanInlineStylesInHtml(companionHtml);
    const staticStyles = styles.filter(s => !s.isDynamic);
    assert.equal(staticStyles.length, 0, `Companion screen has static styles: ${staticStyles[0]?.raw}`);

    const cssRes = await server.verifyAsset('/companion/companion.css', 'text/css');
    assert.ok(cssRes.ok, 'companion.css must load via HTTP');

    const jsRes = await server.verifyAsset('/companion/companion.js', 'application/javascript');
    assert.ok(jsRes.ok, 'companion.js must load via HTTP');
  });

  suite.test('S5.3: Hardware simulator screen contains 0 static inline styles and links valid assets', { featureId: 17, milestone: 'M4' }, async () => {
    const simHtml = path.join(PUBLIC_DIR, 'simulator', 'index.html');
    const styles = scanInlineStylesInHtml(simHtml);
    const staticStyles = styles.filter(s => !s.isDynamic);
    assert.equal(staticStyles.length, 0, `Simulator screen has static styles: ${staticStyles[0]?.raw}`);

    const cssRes = await server.verifyAsset('/simulator/simulator.css', 'text/css');
    assert.ok(cssRes.ok, 'simulator.css must load via HTTP');

    const jsRes = await server.verifyAsset('/simulator/simulator.js', 'application/javascript');
    assert.ok(jsRes.ok, 'simulator.js must load via HTTP');
  });

  suite.test('S5.4: Component showcase screen contains 0 static inline styles and links valid assets', { featureId: 17, milestone: 'M4' }, async () => {
    const scHtml = path.join(PUBLIC_DIR, 'showcase', 'index.html');
    const styles = scanInlineStylesInHtml(scHtml);
    const staticStyles = styles.filter(s => !s.isDynamic);
    assert.equal(staticStyles.length, 0, `Showcase screen has static styles: ${staticStyles[0]?.raw}`);

    const cssRes = await server.verifyAsset('/showcase/showcase.css', 'text/css');
    assert.ok(cssRes.ok, 'showcase.css must load via HTTP');

    const jsRes = await server.verifyAsset('/showcase/showcase.js', 'application/javascript');
    assert.ok(jsRes.ok, 'showcase.js must load via HTTP');
  });

  suite.test('S5.5: Satellite stylesheets connect to shared design tokens system', { featureId: 17, milestone: 'M4' }, () => {
    const satCssFiles = [
      path.join(PUBLIC_DIR, 'companion', 'companion.css'),
      path.join(PUBLIC_DIR, 'simulator', 'simulator.css'),
      path.join(PUBLIC_DIR, 'showcase', 'showcase.css')
    ];

    for (const f of satCssFiles) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        const imports = extractCssImports(content, path.dirname(f));
        const importsTokens = imports.some(i => i.importPath.includes('tokens.css') || i.importPath.includes('style.css'));
        const usesSysVars = /--sys-color-|--accent-primary|--bg-main/i.test(content);
        assert.ok(importsTokens || usesSysVars, `${path.basename(f)} must link to shared tokens`);
      }
    }
  });

  suite.test('S5.6: Teardown test server', { featureId: 18, milestone: 'M5' }, async () => {
    if (server) {
      await server.stop();
    }
  });

});
