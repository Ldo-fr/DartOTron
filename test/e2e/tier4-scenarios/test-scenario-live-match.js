import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanTemplateInlineStyles, scanJsStyleAssignments } from '../core/js-scanner.js';
import { scanShadowDomViolations } from '../core/dom-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

describeSuite('Tier 4 - Scenario 3: Live Match Flow & Scoreboard Rendering', { tier: 4 }, (suite) => {

  suite.test('S3.1: In-game view container (#view-game) is defined in index.html', { featureId: 15, milestone: 'M3' }, () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    assert.match(html, /id=["']view-game["']|<t-game\b/, 'Game view container must exist in index.html');
  });

  suite.test('S3.2: ScoreboardX01 renders Light DOM table with player scores and checkout advice', { featureId: 6, milestone: 'M2' }, () => {
    const x01Js = path.join(COMPONENTS_DIR, 'ScoreboardX01.js');
    const content = fs.readFileSync(x01Js, 'utf-8');

    assert.equal(scanShadowDomViolations(x01Js).length, 0, 'ScoreboardX01 must use Light DOM');
    assert.match(content, /game-board-table|scoreboard-x01-table/, 'ScoreboardX01 must render scoreboard table');
    assert.match(content, /checkout/i, 'ScoreboardX01 must support checkout calculations');
  });

  suite.test('S3.3: ScoreboardCricket renders targets (15-20, Bull) and closed status capsules', { featureId: 7, milestone: 'M2' }, () => {
    const cricketJs = path.join(COMPONENTS_DIR, 'ScoreboardCricket.js');
    const content = fs.readFileSync(cricketJs, 'utf-8');

    assert.equal(scanShadowDomViolations(cricketJs).length, 0, 'ScoreboardCricket must use Light DOM');
    assert.match(content, /cricket-capsule/, 'ScoreboardCricket must render cricket capsules');
    assert.match(content, /TARGETS|15.*20.*B/s, 'ScoreboardCricket must track standard targets');
  });

  suite.test('S3.4: Countdown animation in app.js transitions smoothly with dynamic runtime values', { featureId: 14, milestone: 'M3' }, () => {
    const appJs = path.join(PUBLIC_DIR, 'js', 'app.js');
    const content = fs.readFileSync(appJs, 'utf-8');

    assert.match(content, /bar\.style\.transition\s*=\s*`width \$\{dur\}ms linear`|bar\.style\.transition/, 'app.js must dynamically set transition duration');
    assert.match(content, /bar\.style\.width\s*=\s*['"]0%['"]/, 'app.js must animate width to 0%');
  });

  suite.test('S3.5: MatchController.js contains 0 static inline style attributes in template strings', { featureId: 13, milestone: 'M3' }, () => {
    const matchJs = path.join(MODULES_DIR, 'MatchController.js');
    const styles = scanTemplateInlineStyles(matchJs, matchJs);
    const forbidden = styles.filter(s => !s.isPermitted);

    assert.equal(forbidden.length, 0, `MatchController still contains static inline styles: ${forbidden.map(f => f.match).join(', ')}`);
  });

});
