import assert from 'node:assert/strict';

/**
 * Test Harness for DartOTron 4-Tier E2E Test Suite.
 * Organizes test cases by Tier (1-4), Feature (1-18), and Milestone (M1-M5).
 * Enables running tests either standalone, via the runner CLI, or through `node:test`.
 */

export const registeredSuites = [];

class TestSuite {
  constructor(suiteName, metadata = {}) {
    this.name = suiteName;
    this.metadata = metadata;
    this.tests = [];
  }

  /**
   * Register a test case within this suite.
   * @param {string} testName
   * @param {{tier: number, featureId: number, milestone: string, desc?: string}} options
   * @param {() => Promise<void>|void} fn
   */
  test(testName, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }
    this.tests.push({
      name: testName,
      tier: options.tier || this.metadata.tier || 1,
      featureId: options.featureId || this.metadata.featureId || 0,
      milestone: options.milestone || this.metadata.milestone || 'M1',
      desc: options.desc || '',
      fn
    });
  }
}

/**
 * Define a test suite.
 * @param {string} name
 * @param {object} [metadata]
 * @param {(suite: TestSuite) => void} fn
 */
export function describeSuite(name, metadata, fn) {
  if (typeof metadata === 'function') {
    fn = metadata;
    metadata = {};
  }
  const suite = new TestSuite(name, metadata);
  fn(suite);
  registeredSuites.push(suite);
  return suite;
}

/**
 * Feature metadata dictionary from PROJECT.md
 */
export const FEATURE_METADATA = {
  1: { id: 1, name: 'Standard CSS Architecture', milestone: 'M1', requirement: 'R1' },
  2: { id: 2, name: 'Design Tokens Specification', milestone: 'M1', requirement: 'R1' },
  3: { id: 3, name: 'Backward Compatibility Aliases', milestone: 'M1', requirement: 'R1' },
  4: { id: 4, name: 'Base Foundation Stylesheets', milestone: 'M1', requirement: 'R1' },
  5: { id: 5, name: 'Root @import Orchestration', milestone: 'M1', requirement: 'R1' },
  6: { id: 6, name: 'Light DOM Compliance', milestone: 'M2', requirement: 'R2' },
  7: { id: 7, name: 'Atomic Design Tag Taxonomy', milestone: 'M2', requirement: 'R2' },
  8: { id: 8, name: 'Dual Custom Element Registration', milestone: 'M2', requirement: 'R2' },
  9: { id: 9, name: 'Component Host Style Cleanup', milestone: 'M2', requirement: 'R2, R3' },
  10: { id: 10, name: 'Component Scoped CSS Nesting', milestone: 'M2', requirement: 'R2' },
  11: { id: 11, name: 'Component States & Modifiers', milestone: 'M2', requirement: 'R4' },
  12: { id: 12, name: 'HTML Static Inline Styles Removal', milestone: 'M3', requirement: 'R3' },
  13: { id: 13, name: 'JS Static Inline Styles Removal', milestone: 'M3', requirement: 'R3' },
  14: { id: 14, name: 'Dynamic Runtime Style Preservation', milestone: 'M3', requirement: 'R3' },
  15: { id: 15, name: 'Modular Layout & Views CSS', milestone: 'M3', requirement: 'R1, R4' },
  16: { id: 16, name: 'CyberHUD Visual Modernization', milestone: 'M4', requirement: 'R4' },
  17: { id: 17, name: 'Satellite Application Integration', milestone: 'M4', requirement: 'R1, R4' },
  18: { id: 18, name: 'E2E Testing Suite & Hardening', milestone: 'M5', requirement: 'All' }
};

export { assert };
