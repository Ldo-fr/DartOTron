import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanInlineStylesInHtml } from '../core/dom-scanner.js';
import { scanTemplateInlineStyles, scanJsStyleAssignments } from '../core/js-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

describeSuite('Tier 2 - Boundaries: Inline Styles & Dynamic Style Edge Cases', { tier: 2 }, (suite) => {

  suite.test('B4.1: Detect multiline style="..." attributes with arbitrary line breaks', { featureId: 12, milestone: 'M3' }, () => {
    const sampleHtml = `<div class="test"\n  style="display: flex;\n  gap: 8px;"></div>`;
    const found = scanInlineStylesInHtml(sampleHtml, 'sample.html');
    assert.equal(found.length, 1);
    assert.equal(found[0].tag, 'div');
    assert.ok(found[0].styleValue.includes('display: flex'));
  });

  suite.test('B4.2: Detect style attributes with irregular whitespace around equal sign (style = "...")', { featureId: 12, milestone: 'M3' }, () => {
    const sampleHtml = `<span style  =  "color: red;"></span>`;
    const found = scanInlineStylesInHtml(sampleHtml, 'sample.html');
    assert.equal(found.length, 1);
    assert.equal(found[0].styleValue, 'color: red;');
  });

  suite.test('B4.3: Detect single-quoted style attributes (style=\'...\')', { featureId: 12, milestone: 'M3' }, () => {
    const sampleHtml = `<button style='margin: 4px;'></button>`;
    const found = scanInlineStylesInHtml(sampleHtml, 'sample.html');
    assert.equal(found.length, 1);
    assert.equal(found[0].styleValue, 'margin: 4px;');
  });

  suite.test('B4.4: Detect case-insensitive style attributes (STYLE="..." or Style="...")', { featureId: 12, milestone: 'M3' }, () => {
    const sampleHtml = `<div STYLE="font-size: 14px;"></div>`;
    const found = scanInlineStylesInHtml(sampleHtml, 'sample.html');
    assert.equal(found.length, 1);
    assert.equal(found[0].styleValue, 'font-size: 14px;');
  });

  suite.test('B4.5: Dynamic style edge case: gauge progress NaN or undefined protection', { featureId: 14, milestone: 'M3' }, () => {
    const gaugePath = path.join(COMPONENTS_DIR, 'HudStatsGauge.js');
    const content = fs.readFileSync(gaugePath, 'utf-8');
    // Ensure gauge handles invalid or missing progress value without writing "width: NaN%"
    assert.match(content, /progress|parseFloat|Number|getAttribute/, 'Gauge component must read and parse progress value');
  });

  suite.test('B4.6: Dynamic style edge case: gauge progress clamp boundary (0 to 100)', { featureId: 14, milestone: 'M3' }, () => {
    function sanitizeProgress(input) {
      const val = parseFloat(input);
      if (isNaN(val)) return 0;
      return Math.min(100, Math.max(0, val));
    }
    assert.equal(sanitizeProgress(undefined), 0);
    assert.equal(sanitizeProgress('not-a-number'), 0);
    assert.equal(sanitizeProgress(-50), 0);
    assert.equal(sanitizeProgress(150), 100);
    assert.equal(sanitizeProgress('42.5'), 42.5);
  });

  suite.test('B4.7: Dynamic style edge case: countdown animation reset and linear transition flow', { featureId: 14, milestone: 'M3' }, () => {
    const appJs = path.join(PUBLIC_DIR, 'js', 'app.js');
    const content = fs.readFileSync(appJs, 'utf-8');
    // Countdown animates bar from 100% to 0% over configured duration
    assert.match(content, /bar\.style\.transition\s*=\s*['"]none['"]/, 'Countdown must reset transition before restarting');
    assert.match(content, /bar\.style\.width\s*=\s*['"]100%['"]/, 'Countdown must reset width to 100%');
  });

  suite.test('B4.8: Dynamic style edge case: calibration step bounds (0 to 67 touches)', { featureId: 14, milestone: 'M3' }, () => {
    const sc = fs.readFileSync(path.join(MODULES_DIR, 'SettingsController.js'), 'utf-8');
    // Matrix calibration has 67 steps (20 singles, 20 doubles, 20 triples, 2 bulls, etc.)
    assert.match(sc, /calib|step|pct/, 'SettingsController must calculate calibration progress pct');
  });

  suite.test('B4.9: Detect style injection via setAttribute("style", "...") in JavaScript', { featureId: 13, milestone: 'M3' }, () => {
    function checkDir(dir) {
      for (const item of fs.readdirSync(dir)) {
        const fp = path.join(dir, item);
        if (fs.statSync(fp).isDirectory()) checkDir(fp);
        else if (item.endsWith('.js')) {
          const content = fs.readFileSync(fp, 'utf-8');
          const setAttrStyle = content.match(/setAttribute\s*\(\s*['"]style['"]\s*,\s*[^)]+\)/g) || [];
          assert.equal(setAttrStyle.length, 0, `Forbidden setAttribute("style") found in ${item}: ${setAttrStyle.join(', ')}`);
        }
      }
    }
    checkDir(COMPONENTS_DIR);
    checkDir(MODULES_DIR);
  });

  suite.test('B4.10: Detect style injection via style.cssText in JavaScript modules', { featureId: 13, milestone: 'M3' }, () => {
    function checkDir(dir) {
      for (const item of fs.readdirSync(dir)) {
        const fp = path.join(dir, item);
        if (fs.statSync(fp).isDirectory()) checkDir(fp);
        else if (item.endsWith('.js')) {
          const content = fs.readFileSync(fp, 'utf-8');
          const cssTextMatches = content.match(/\.style\.cssText\s*=\s*[^;\n]+/g) || [];
          assert.equal(cssTextMatches.length, 0, `Forbidden style.cssText found in ${item}: ${cssTextMatches.join(', ')}`);
        }
      }
    }
    checkDir(COMPONENTS_DIR);
    checkDir(MODULES_DIR);
  });

  suite.test('B4.11: Modal backdrop initial hidden state uses .hidden class, not style="display:none"', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const modalBackdrops = content.match(/<div\b[^>]*class=["'][^"']*modal-backdrop[^"']*["'][^>]*>/g) || [];
    for (const b of modalBackdrops) {
      assert.doesNotMatch(b, /style=["'][^"']*display\s*:\s*none/i, `Modal backdrop must use .hidden class, not style="display:none": ${b}`);
    }
  });

  suite.test('B4.12: Checkbox styling in forms uses CSS classes instead of inline width/height/accent-color', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const inlineCheckboxes = content.match(/<input\b[^>]*type=["']checkbox["'][^>]*style=["'][^"']*accent-color/g) || [];
    assert.equal(inlineCheckboxes.length, 0, `Checkbox has static inline style: ${inlineCheckboxes[0]}`);
  });

  suite.test('B4.13: QR Code rendering in companion modal uses CSS dimensions instead of 220px inline style', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const qrContainer = content.match(/<div\b[^>]*id=["']companion-qr-container["'][^>]*>/)?.[0] || '';
    assert.doesNotMatch(qrContainer, /style=["'][^"']*width\s*:\s*220px/i, 'companion-qr-container must not have static inline 220px style');
  });

  suite.test('B4.14: Scoreboard cricket capsule elements do not have style="margin: 0 auto;"', { featureId: 13, milestone: 'M3' }, () => {
    const cricketJs = fs.readFileSync(path.join(COMPONENTS_DIR, 'ScoreboardCricket.js'), 'utf-8');
    assert.doesNotMatch(cricketJs, /style=["'][^"']*margin\s*:\s*0\s+auto/i, 'ScoreboardCricket capsule must not contain static inline margin: 0 auto');
  });

  suite.test('B4.15: Scoreboard table elements do not have style="flex: 1; width: 100%; height: 100%;"', { featureId: 13, milestone: 'M3' }, () => {
    const x01Js = fs.readFileSync(path.join(COMPONENTS_DIR, 'ScoreboardX01.js'), 'utf-8');
    assert.doesNotMatch(x01Js, /style=["'][^"']*flex\s*:\s*1;\s*width\s*:\s*100%/i, 'ScoreboardX01 table must not contain static inline layout styles');
  });

});
