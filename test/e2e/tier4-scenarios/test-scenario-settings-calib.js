import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanTemplateInlineStyles } from '../core/js-scanner.js';
import { scanInlineStylesInHtml, scanShadowDomViolations } from '../core/dom-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

describeSuite('Tier 4 - Scenario 4: Settings & Matrix Calibration Wizard', { tier: 4 }, (suite) => {

  suite.test('S4.1: Settings and options modal dialogs exist in index.html', { featureId: 15, milestone: 'M3' }, () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    assert.match(html, /id=["']modal-settings["']/, 'Settings modal must exist in index.html');
    assert.match(html, /id=["']modal-game-options["']/, 'Game options modal must exist in index.html');
  });

  suite.test('S4.2: Calibration wizard dynamically updates progress fill element without static styles', { featureId: 14, milestone: 'M3' }, () => {
    const scJs = path.join(MODULES_DIR, 'SettingsController.js');
    const content = fs.readFileSync(scJs, 'utf-8');

    assert.match(content, /calib-progress-fill|fillEl/, 'SettingsController must reference calibration progress fill');
    assert.match(content, /fillEl\.style\.width\s*=\s*`\$\{pct\}%`|fillEl\.style\.width/, 'Calibration progress must update dynamically via pct');
  });

  suite.test('S4.3: DartboardSVG renders interactive SVG segments directly into Light DOM container', { featureId: 6, milestone: 'M2' }, () => {
    const dartSvgJs = path.join(PUBLIC_DIR, 'js', 'dartboard-svg.js');
    assert.ok(fs.existsSync(dartSvgJs), 'dartboard-svg.js must exist');
    const content = fs.readFileSync(dartSvgJs, 'utf-8');

    assert.equal(scanShadowDomViolations(dartSvgJs).length, 0, 'DartboardSVG must not use Shadow DOM');
    assert.match(content, /createElementNS\(['"]http:\/\/www\.w3\.org\/2000\/svg['"]/, 'DartboardSVG must create SVG elements');
    assert.match(content, /\.appendChild\(|\.innerHTML/, 'DartboardSVG must append into container');
  });

  suite.test('S4.4: SettingsController.js contains 0 static inline style attributes in template literals', { featureId: 13, milestone: 'M3' }, () => {
    const scJs = path.join(MODULES_DIR, 'SettingsController.js');
    const styles = scanTemplateInlineStyles(scJs, scJs);
    const forbidden = styles.filter(s => !s.isPermitted);

    assert.equal(
      forbidden.length,
      0,
      `SettingsController contains ${forbidden.length} static inline styles: ${forbidden.map(f => `L${f.line}: ${f.match}`).join(', ')}`
    );
  });

  suite.test('S4.5: Modal dialogs in index.html use modifier classes instead of static inline styles', { featureId: 12, milestone: 'M3' }, () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    const modalMatches = html.match(/<div\b[^>]*class=["'][^"']*modal-window[^"']*["'][^>]*>/g) || [];

    for (const m of modalMatches) {
      assert.doesNotMatch(m, /style=/i, `Modal window contains static inline style: ${m}`);
    }
  });

});
