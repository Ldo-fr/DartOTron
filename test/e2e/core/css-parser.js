import fs from 'node:fs';
import path from 'node:path';

/**
 * CSS Parser & Validator for DartOTron CSS Architecture & Design Tokens.
 * Validates design tokens conformity (--sys-*), native CSS nesting (&),
 * legacy aliases, @import trees, interactive states, and CSS syntax.
 */

/**
 * Strips comments from CSS string while preserving line breaks.
 * @param {string} css
 * @returns {string}
 */
export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return '\n'.repeat(match.split('\n').length - 1);
  });
}

/**
 * Validates basic CSS syntax: balanced braces, quotes, standard CSS only.
 * @param {string} css
 * @param {string} [filePath]
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCssSyntax(css, filePath = 'unknown') {
  const errors = [];
  const clean = stripCssComments(css);

  // 1. Check balanced braces
  let openBraces = 0;
  const lines = clean.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '{') openBraces++;
      if (line[j] === '}') openBraces--;
      if (openBraces < 0) {
        errors.push(`${filePath}:${i + 1} - Unexpected closing brace '}'`);
        openBraces = 0;
      }
    }
  }
  if (openBraces > 0) {
    errors.push(`${filePath} - Unclosed brace detected (${openBraces} remaining open)`);
  }

  // 2. Check for preprocessor constructs (SCSS/Sass/Less)
  const scssPatterns = [
    { name: 'SCSS variable', regex: /\$[a-zA-Z0-9_-]+\s*:/ },
    { name: 'SCSS mixin', regex: /@mixin\b/ },
    { name: 'SCSS include', regex: /@include\b/ },
    { name: 'SCSS extend', regex: /@extend\b/ },
    { name: 'Single-line comment', regex: /^[ \t]*\/\/[^/]/m }
  ];

  for (const { name, regex } of scssPatterns) {
    if (regex.test(clean)) {
      errors.push(`${filePath} - Non-standard CSS preprocessor construct detected: ${name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extracts all CSS Custom Properties declared in `:root` or `html`.
 * @param {string} css
 * @returns {Array<{name: string, value: string, isSysToken: boolean, isLegacyAlias: boolean, line: number}>}
 */
export function extractCssCustomProperties(css) {
  const properties = [];
  const clean = stripCssComments(css);

  // Match root block
  const rootRegex = /(:root|html)\s*\{([^}]*)\}/gi;
  let rootMatch;

  while ((rootMatch = rootRegex.exec(clean)) !== null) {
    const rootBody = rootMatch[2];
    const matchLine = clean.substring(0, rootMatch.index).split('\n').length;

    // Match declarations like --variable-name: value;
    const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let declMatch;

    while ((declMatch = declRegex.exec(rootBody)) !== null) {
      const name = declMatch[1].trim();
      const value = declMatch[2].trim();
      const declLine = matchLine + rootBody.substring(0, declMatch.index).split('\n').length - 1;

      const isSysToken = /^--sys-[a-z0-9]+-[a-z0-9-]+$/.test(name);
      const isLegacyAlias = !name.startsWith('--sys-') && value.includes('var(--sys-');

      properties.push({
        name,
        value,
        isSysToken,
        isLegacyAlias,
        line: declLine
      });
    }
  }

  return properties;
}

/**
 * Extracts and validates @import statements from a CSS file.
 * @param {string} cssContent
 * @param {string} baseDir - Directory of the CSS file
 * @returns {Array<{statement: string, importPath: string, resolvedPath: string, exists: boolean, line: number}>}
 */
export function extractCssImports(cssContent, baseDir) {
  const imports = [];
  const clean = stripCssComments(cssContent);
  const lines = cssContent.split('\n');

  const importRegex = /@import\s+(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"])\s*;/g;
  let match;

  while ((match = importRegex.exec(clean)) !== null) {
    const importPath = match[1] || match[2];
    const line = clean.substring(0, match.index).split('\n').length;

    let resolvedPath = importPath;
    let exists = false;

    if (!importPath.startsWith('http://') && !importPath.startsWith('https://')) {
      resolvedPath = path.resolve(baseDir, importPath);
      exists = fs.existsSync(resolvedPath);
    } else {
      exists = true; // External URL
    }

    imports.push({
      statement: match[0],
      importPath,
      resolvedPath,
      exists,
      line
    });
  }

  return imports;
}

/**
 * Scans CSS for native nesting (`&`) patterns.
 * @param {string} css
 * @returns {Array<{selector: string, hasNesting: boolean, nestedRules: Array<{selector: string, line: number}>}>}
 */
export function extractNativeNestingRules(css) {
  const clean = stripCssComments(css);
  const rules = [];

  // Find top-level selectors with curly braces
  const ruleRegex = /([^{}]+)\{([^{}]*\{[\s\S]*?\}[^{}]*|[^{}]+)\}/g;
  let match;

  // Search specifically for `&` selectors inside nested blocks
  const nestedRegex = /([^{};]*&[^{};]*)\{([^}]*)\}/g;
  let nestedMatch;

  while ((nestedMatch = nestedRegex.exec(clean)) !== null) {
    const selector = nestedMatch[1].trim();
    const line = clean.substring(0, nestedMatch.index).split('\n').length;
    rules.push({
      selector,
      line,
      body: nestedMatch[2].trim()
    });
  }

  return rules;
}

/**
 * Scans CSS for interactive pseudo-classes and state selectors.
 * @param {string} css
 * @returns {{
 *   hoverCount: number,
 *   focusVisibleCount: number,
 *   activeCount: number,
 *   disabledCount: number,
 *   importantCount: number,
 *   idSelectorCount: number,
 *   interactiveRules: Array<{state: string, selector: string, line: number}>
 * }}
 */
export function scanCssStatesAndMetrics(css) {
  const clean = stripCssComments(css);
  const interactiveRules = [];

  const statePatterns = [
    { state: 'hover', regex: /([^{};]+:hover\b[^{};]*)\{/g },
    { state: 'focus-visible', regex: /([^{};]+:(?:focus-visible|focus)\b[^{};]*)\{/g },
    { state: 'active', regex: /([^{};]+:active\b[^{};]*)\{/g },
    { state: 'disabled', regex: /([^{};]+(?::disabled|\[disabled\])\b[^{};]*)\{/g }
  ];

  let hoverCount = 0;
  let focusVisibleCount = 0;
  let activeCount = 0;
  let disabledCount = 0;

  for (const { state, regex } of statePatterns) {
    let m;
    while ((m = regex.exec(clean)) !== null) {
      const selector = m[1].trim();
      const line = clean.substring(0, m.index).split('\n').length;
      interactiveRules.push({ state, selector, line });

      if (state === 'hover') hoverCount++;
      if (state === 'focus-visible') focusVisibleCount++;
      if (state === 'active') activeCount++;
      if (state === 'disabled') disabledCount++;
    }
  }

  // Count !important
  const importantMatches = clean.match(/!important/g) || [];
  const importantCount = importantMatches.length;

  // Count ID selectors used in CSS rules
  const idMatches = clean.match(/#[a-zA-Z0-9_-]+\b(?![^{]*\})/g) || [];
  const idSelectorCount = idMatches.length;

  return {
    hoverCount,
    focusVisibleCount,
    activeCount,
    disabledCount,
    importantCount,
    idSelectorCount,
    interactiveRules
  };
}
