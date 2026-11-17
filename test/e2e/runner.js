#!/usr/bin/env node

/**
 * DartOTron Modernized E2E Test Suite Runner
 * Executes 4-tier requirement-driven E2E tests for CSS and Web Components refactoring.
 *
 * Usage:
 *   node test/e2e/runner.js [options]
 *
 * Options:
 *   --tier <1|2|3|4>        Run only tests from specified tier
 *   --feature <1-18>        Run only tests covering specified feature ID
 *   --milestone <M1..M5>    Run only tests associated with milestone
 *   --json                  Output raw JSON results
 *   --exit-zero             Exit code 0 regardless of failures (for baseline audit)
 *   --verbose               Show detailed traces for all tests
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import { registeredSuites, FEATURE_METADATA } from './core/test-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Parse CLI flags
const args = process.argv.slice(2);
const filterTier = args.includes('--tier') ? parseInt(args[args.indexOf('--tier') + 1], 10) : null;
const filterFeature = args.includes('--feature') ? parseInt(args[args.indexOf('--feature') + 1], 10) : null;
const filterMilestone = args.includes('--milestone') ? args[args.indexOf('--milestone') + 1].toUpperCase() : null;
const isJson = args.includes('--json');
const isExitZero = args.includes('--exit-zero');
const isVerbose = args.includes('--verbose');

// Find all test files
function collectTestFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files.push(...collectTestFiles(full));
    } else if (item.startsWith('test-') && item.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = [
  ...collectTestFiles(path.join(__dirname, 'tier1-features')),
  ...collectTestFiles(path.join(__dirname, 'tier2-boundaries')),
  ...collectTestFiles(path.join(__dirname, 'tier3-combinations')),
  ...collectTestFiles(path.join(__dirname, 'tier4-scenarios'))
];

async function main() {
  const startTime = Date.now();

  // Import all test files to populate registeredSuites
  for (const file of testFiles) {
    await import(pathToFileURL(file).href);
  }

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    byTier: { 1: { total: 0, passed: 0, failed: 0 }, 2: { total: 0, passed: 0, failed: 0 }, 3: { total: 0, passed: 0, failed: 0 }, 4: { total: 0, passed: 0, failed: 0 } },
    byFeature: {},
    byMilestone: { M1: { total: 0, passed: 0, failed: 0 }, M2: { total: 0, passed: 0, failed: 0 }, M3: { total: 0, passed: 0, failed: 0 }, M4: { total: 0, passed: 0, failed: 0 }, M5: { total: 0, passed: 0, failed: 0 } },
    failures: []
  };

  for (let i = 1; i <= 18; i++) {
    results.byFeature[i] = { total: 0, passed: 0, failed: 0, name: FEATURE_METADATA[i]?.name || `Feature ${i}` };
  }

  // Execute suites
  for (const suite of registeredSuites) {
    for (const test of suite.tests) {
      // Filters
      if (filterTier && test.tier !== filterTier) continue;
      if (filterFeature && test.featureId !== filterFeature) continue;
      if (filterMilestone && test.milestone !== filterMilestone) continue;

      results.total++;
      if (results.byTier[test.tier]) results.byTier[test.tier].total++;
      if (test.featureId && results.byFeature[test.featureId]) results.byFeature[test.featureId].total++;
      if (results.byMilestone[test.milestone]) results.byMilestone[test.milestone].total++;

      const testStart = Date.now();
      try {
        await test.fn();
        results.passed++;
        if (results.byTier[test.tier]) results.byTier[test.tier].passed++;
        if (test.featureId && results.byFeature[test.featureId]) results.byFeature[test.featureId].passed++;
        if (results.byMilestone[test.milestone]) results.byMilestone[test.milestone].passed++;

        if (isVerbose) {
          console.log(`  \x1b[32m✔\x1b[0m [T${test.tier}][${test.milestone}][F${test.featureId}] ${test.name}`);
        }
      } catch (err) {
        results.failed++;
        if (results.byTier[test.tier]) results.byTier[test.tier].failed++;
        if (test.featureId && results.byFeature[test.featureId]) results.byFeature[test.featureId].failed++;
        if (results.byMilestone[test.milestone]) results.byMilestone[test.milestone].failed++;

        const failureRecord = {
          tier: test.tier,
          featureId: test.featureId,
          milestone: test.milestone,
          suite: suite.name,
          test: test.name,
          error: err.message,
          stack: err.stack
        };
        results.failures.push(failureRecord);

        if (isVerbose) {
          console.log(`  \x1b[31m✖\x1b[0m [T${test.tier}][${test.milestone}][F${test.featureId}] ${test.name}`);
          console.log(`    \x1b[90m${err.message}\x1b[0m`);
        }
      }
    }
  }

  results.durationMs = Date.now() - startTime;

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.failed > 0 && !isExitZero ? 1 : 0);
  }

  // Formatted Console Dashboard
  printDashboard(results);

  process.exit(results.failed > 0 && !isExitZero ? 1 : 0);
}

function printDashboard(r) {
  const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
  };

  console.log('\n' + c.cyan + c.bold + '================================================================================' + c.reset);
  console.log(c.cyan + c.bold + '               DARTOTRON CYBERHUD — E2E TEST SUITE EXECUTION REPORT            ' + c.reset);
  console.log(c.cyan + c.bold + '================================================================================' + c.reset + '\n');

  // Summary by Tier
  console.log(c.bold + '── 4-TIER TEST METHODOLOGY BREAKDOWN ───────────────────────────────────────────' + c.reset);
  const tierNames = {
    1: 'Tier 1: Feature Coverage (>=5 tests / feature)',
    2: 'Tier 2: Boundary & Corner Cases',
    3: 'Tier 3: Cross-Feature Combinations',
    4: 'Tier 4: Real-World Application Scenarios'
  };

  for (let t = 1; t <= 4; t++) {
    const tierData = r.byTier[t];
    const passColor = tierData.passed === tierData.total && tierData.total > 0 ? c.green : (tierData.passed > 0 ? c.yellow : c.red);
    const passRate = tierData.total > 0 ? ((tierData.passed / tierData.total) * 100).toFixed(1) : '0.0';
    console.log(
      `  [T${t}] ${tierNames[t].padEnd(46)} ` +
      `${c.bold}${tierData.total.toString().padStart(3)}${c.reset} tests | ` +
      `${c.green}✔ ${tierData.passed.toString().padStart(3)}${c.reset} | ` +
      `${tierData.failed > 0 ? c.red : c.dim}✖ ${tierData.failed.toString().padStart(3)}${c.reset} | ` +
      `${passColor}${passRate.padStart(5)}%${c.reset}`
    );
  }

  // Summary by Feature (Tier 1)
  console.log('\n' + c.bold + '── FEATURE INVENTORY COVERAGE (TIER 1) ──────────────────────────────────────────' + c.reset);
  console.log(c.dim + '  ID  Feature Name                       Mstone  Req    Total  Pass  Fail  Rate' + c.reset);
  console.log(c.dim + '  ──  ─────────────────────────────────  ──────  ─────  ─────  ────  ────  ─────' + c.reset);

  for (let id = 1; id <= 18; id++) {
    const feat = FEATURE_METADATA[id];
    const data = r.byFeature[id];
    if (!feat || !data || data.total === 0) continue;

    const rate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(0) : '0';
    const rateColor = data.passed === data.total ? c.green : (data.passed > 0 ? c.yellow : c.red);

    console.log(
      `  #${id.toString().padStart(2, '0')} ` +
      `${feat.name.padEnd(33)} ` +
      `${feat.milestone.padEnd(7)} ` +
      `${feat.requirement.padEnd(6)} ` +
      `${data.total.toString().padStart(4)}  ` +
      `${c.green}${data.passed.toString().padStart(4)}${c.reset}  ` +
      `${data.failed > 0 ? c.red : c.dim}${data.failed.toString().padStart(4)}${c.reset}  ` +
      `${rateColor}${rate.padStart(4)}%${c.reset}`
    );
  }

  // Summary by Milestone
  console.log('\n' + c.bold + '── MILESTONE READINESS BREAKDOWN ───────────────────────────────────────────────' + c.reset);
  const mstoneNames = {
    M1: 'M1: CSS Foundation & Design Tokens',
    M2: 'M2: Atomic Web Components & Scoped CSS',
    M3: 'M3: Views, Layouts & Inline Styles Eradication',
    M4: 'M4: Visual Polish & Satellite Integration',
    M5: 'M5: Final E2E Pass & Hardening'
  };

  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5']) {
    const data = r.byMilestone[m];
    const mRate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0.0';
    const mColor = data.passed === data.total && data.total > 0 ? c.green : (data.passed > 0 ? c.yellow : c.red);
    console.log(
      `  ${m}  ${mstoneNames[m].padEnd(48)} ` +
      `${c.bold}${data.total.toString().padStart(3)}${c.reset} tests | ` +
      `${c.green}✔ ${data.passed.toString().padStart(3)}${c.reset} | ` +
      `${data.failed > 0 ? c.red : c.dim}✖ ${data.failed.toString().padStart(3)}${c.reset} | ` +
      `${mColor}${mRate.padStart(5)}%${c.reset}`
    );
  }

  // Discovered Defects / Pending Implementations
  if (r.failures.length > 0) {
    console.log('\n' + c.yellow + c.bold + `── DETECTED IMPLEMENTATION GAPS & DEFECTS (${r.failures.length}) ────────────────────────────────` + c.reset);
    console.log(c.dim + '  (These represent expected refactoring milestones pending completion)\n' + c.reset);

    // Group by milestone
    const byM = {};
    for (const f of r.failures) {
      byM[f.milestone] = byM[f.milestone] || [];
      byM[f.milestone].push(f);
    }

    for (const [m, list] of Object.entries(byM)) {
      console.log(`  ${c.magenta}${c.bold}[${m}] Pending Refactoring Items (${list.length}):${c.reset}`);
      for (const item of list.slice(0, 10)) {
        console.log(`    ${c.red}✖${c.reset} [F${item.featureId}] ${item.test}`);
        console.log(`      ${c.dim}${item.error.slice(0, 120)}${c.reset}`);
      }
      if (list.length > 10) {
        console.log(`      ${c.dim}... and ${list.length - 10} more items for ${m}${c.reset}`);
      }
      console.log('');
    }
  }

  // Final Scorecard
  const overallRate = ((r.passed / r.total) * 100).toFixed(1);
  const scoreColor = r.failed === 0 ? c.green : (r.passed > 0 ? c.yellow : c.red);

  console.log(c.cyan + '================================================================================' + c.reset);
  console.log(
    `  ${c.bold}TOTAL TESTS:${c.reset} ${r.total}   |   ` +
    `${c.green}${c.bold}PASSED:${c.reset} ${r.passed}   |   ` +
    `${r.failed > 0 ? c.red : c.green}${c.bold}FAILED:${c.reset} ${r.failed}   |   ` +
    `${scoreColor}${c.bold}COMPLIANCE:${c.reset} ${overallRate}%   |   ` +
    `${c.dim}TIME: ${r.durationMs}ms${c.reset}`
  );
  console.log(c.cyan + '================================================================================\n' + c.reset);
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
