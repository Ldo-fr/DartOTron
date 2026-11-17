import fs from 'node:fs';
import path from 'node:path';

/**
 * JS Scanner for E2E testing of DartOTron controllers, components, and modules.
 * Scans for:
 * 1. Static inline styles in template literals (Requirement R3)
 * 2. Static host style assignments (`this.style.*` in connectedCallback)
 * 3. Permitted dynamic runtime styles (gauges, countdown, calibration)
 * 4. Custom Element definitions and dual registration (Requirement R2)
 * 5. Light DOM exclusivity (0 attachShadow/shadowRoot)
 */

/**
 * Permitted dynamic runtime styles whitelist.
 * Returns true if the style assignment matches an authorized dynamic pattern.
 * @param {string} filePath
 * @param {string} codeSnippet
 * @returns {boolean}
 */
export function isPermittedDynamicStyle(filePath, codeSnippet) {
  const normPath = filePath.replace(/\\/g, '/');

  // 1. HudStatsGauge: gauge progress fill width
  if (normPath.includes('HudStatsGauge.js') && /width:\s*\$\{progress\}%/.test(codeSnippet)) {
    return true;
  }
  if (normPath.includes('HudStatsGauge.js') && /\.style\.width\s*=\s*`\$\{progress\}%`/.test(codeSnippet)) {
    return true;
  }

  // 2. app.js: countdown bar transition and width animation
  if (normPath.includes('app.js')) {
    if (/bar\.style\.transition\s*=\s*/.test(codeSnippet) || /bar\.style\.width\s*=\s*/.test(codeSnippet)) {
      return true;
    }
    // Dynamic player text color
    if (/txt\.style\.color\s*=\s*/.test(codeSnippet)) {
      return true;
    }
  }

  // 3. SettingsController.js: calibration wizard progress fill width
  if (normPath.includes('SettingsController.js') && /fillEl\.style\.width\s*=\s*`\$\{pct\}%`/.test(codeSnippet)) {
    return true;
  }
  if (normPath.includes('SettingsController.js') && /fillEl\.style\.width\s*=\s*/.test(codeSnippet)) {
    return true;
  }

  return false;
}

/**
 * Scans a JS file or code string for `style="..."` attributes inside template literals.
 * @param {string} code - JS code or file path
 * @param {string} [filePath]
 * @returns {Array<{line: number, file: string, match: string, styleValue: string, isPermitted: boolean}>}
 */
export function scanTemplateInlineStyles(code, filePath = 'unknown') {
  let jsContent = code;
  if (!code.includes('\n') && fs.existsSync(code)) {
    filePath = code;
    jsContent = fs.readFileSync(code, 'utf-8');
  }

  const results = [];
  const lines = jsContent.split('\n');

  // Match style="..." inside template literals or strings
  const styleRegex = /style\s*=\s*(["'`])([\s\S]*?)\1/gi;
  let match;

  while ((match = styleRegex.exec(jsContent)) !== null) {
    const styleValue = match[2];
    const matchLine = jsContent.substring(0, match.index).split('\n').length;
    const raw = match[0];

    const isPermitted = isPermittedDynamicStyle(filePath, raw);

    results.push({
      file: filePath,
      line: matchLine,
      match: raw,
      styleValue: styleValue.trim(),
      isPermitted
    });
  }

  return results;
}

/**
 * Scans a JS file for direct DOM `.style.` property assignments.
 * Categorizes them into static host styles (violations) and permitted dynamic runtime styles.
 * @param {string} code - JS code or file path
 * @param {string} [filePath]
 * @returns {Array<{line: number, file: string, target: string, property: string, value: string, isHostStyle: boolean, isPermitted: boolean, raw: string}>}
 */
export function scanJsStyleAssignments(code, filePath = 'unknown') {
  let jsContent = code;
  if (!code.includes('\n') && fs.existsSync(code)) {
    filePath = code;
    jsContent = fs.readFileSync(code, 'utf-8');
  }

  const results = [];
  // Match assignments like: `this.style.display = 'block'` or `el.style.width = ...`
  const assignRegex = /([a-zA-Z0-9_$]+|\bthis)\.style(?:\.([a-zA-Z0-9_$]+)|\[['"]([a-zA-Z0-9_$-]+)['"]\])\s*=\s*([^;\n]+)/g;
  let match;

  while ((match = assignRegex.exec(jsContent)) !== null) {
    const target = match[1];
    const property = match[2] || match[3];
    const value = match[4].trim();
    const raw = match[0];
    const line = jsContent.substring(0, match.index).split('\n').length;

    const isHostStyle = target === 'this';
    const isPermitted = isPermittedDynamicStyle(filePath, raw);

    results.push({
      file: filePath,
      line,
      target,
      property,
      value,
      isHostStyle,
      isPermitted,
      raw
    });
  }

  return results;
}

/**
 * Scans a JS file for custom element definitions: `customElements.define('tag-name', ClassName)`.
 * @param {string} code - JS code or file path
 * @param {string} [filePath]
 * @returns {Array<{line: number, file: string, tag: string, className: string, isAtomic: boolean, atomicPrefix: string|null}>}
 */
export function scanCustomElementRegistrations(code, filePath = 'unknown') {
  let jsContent = code;
  if (!code.includes('\n') && fs.existsSync(code)) {
    filePath = code;
    jsContent = fs.readFileSync(code, 'utf-8');
  }

  const results = [];
  const defineRegex = /customElements\.define\s*\(\s*['"]([a-zA-Z0-9-]+)['"]\s*,\s*([a-zA-Z0-9_$]+)/g;
  let match;

  while ((match = defineRegex.exec(jsContent)) !== null) {
    const tag = match[1];
    const className = match[2];
    const line = jsContent.substring(0, match.index).split('\n').length;

    let atomicPrefix = null;
    let isAtomic = false;
    if (/^[am-ot]-/.test(tag)) {
      atomicPrefix = tag.slice(0, 2);
      isAtomic = true;
    }

    results.push({
      file: filePath,
      line,
      tag,
      className,
      isAtomic,
      atomicPrefix
    });
  }

  return results;
}
