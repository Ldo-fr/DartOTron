import fs from 'node:fs';
import path from 'node:path';

/**
 * DOM Scanner for E2E testing of DartOTron HTML files and templates.
 * Provides opaque-box analysis of HTML structures, Light DOM adherence,
 * Atomic Design tags, and static/dynamic inline style detection.
 */

/**
 * Scans an HTML string or file for `style="..."` attributes.
 * @param {string} content - HTML content or file path
 * @param {string} [filePath] - Optional file path for error reporting
 * @returns {Array<{line: number, tag: string, styleValue: string, isDynamic: boolean, raw: string, file: string}>}
 */
export function scanInlineStylesInHtml(content, filePath = 'unknown') {
  let html = content;
  if (!content.includes('<') && fs.existsSync(content)) {
    filePath = content;
    html = fs.readFileSync(content, 'utf-8');
  }

  const results = [];
  const lines = html.split('\n');

  // Regex to match tags with style attribute
  // Handles multi-line or single-line style="..." or style='...'
  const tagRegex = /<([a-zA-Z0-9-]+)\b([^>]*?)>/gs;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const attributes = match[2];

    // Find style attribute within tag attributes
    const styleAttrRegex = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let styleMatch;
    while ((styleMatch = styleAttrRegex.exec(attributes)) !== null) {
      const styleValue = (styleMatch[1] !== undefined ? styleMatch[1] : styleMatch[2]) || '';
      
      // Calculate 1-based line number
      const matchIndex = match.index + styleMatch.index;
      const lineNumber = html.substring(0, matchIndex).split('\n').length;

      // Determine if dynamic: contains template literal interpolation ${...}
      const isDynamic = /\$\{[^}]+\}/.test(styleValue);

      results.push({
        file: filePath,
        line: lineNumber,
        tag: tagName,
        styleValue: styleValue.trim(),
        isDynamic,
        raw: styleMatch[0]
      });
    }
  }

  return results;
}

/**
 * Scans an HTML content or file for all tags matching custom element syntax.
 * @param {string} content - HTML content or file path
 * @param {string} [filePath]
 * @returns {Array<{tag: string, category: string, line: number, isAtomic: boolean}>}
 */
export function scanCustomElementsInHtml(content, filePath = 'unknown') {
  let html = content;
  if (!content.includes('<') && fs.existsSync(content)) {
    filePath = content;
    html = fs.readFileSync(content, 'utf-8');
  }

  const results = [];
  const tagRegex = /<([a-zA-Z0-9]+-[a-zA-Z0-9-]+)\b/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const lineNumber = html.substring(0, match.index).split('\n').length;

    let category = 'legacy';
    let isAtomic = false;
    if (tag.startsWith('a-')) {
      category = 'atom';
      isAtomic = true;
    } else if (tag.startsWith('m-')) {
      category = 'molecule';
      isAtomic = true;
    } else if (tag.startsWith('o-')) {
      category = 'organism';
      isAtomic = true;
    } else if (tag.startsWith('t-')) {
      category = 'template';
      isAtomic = true;
    }

    results.push({
      tag,
      category,
      line: lineNumber,
      isAtomic,
      file: filePath
    });
  }

  return results;
}

/**
 * Checks for any Shadow DOM constructs in HTML or script content.
 * @param {string} content - HTML or JS content
 * @param {string} [filePath]
 * @returns {Array<{line: number, type: string, match: string, file: string}>}
 */
export function scanShadowDomViolations(content, filePath = 'unknown') {
  let text = content;
  if (fs.existsSync(content)) {
    filePath = content;
    text = fs.readFileSync(content, 'utf-8');
  }

  const violations = [];
  const patterns = [
    { type: 'attachShadow', regex: /\battachShadow\s*\(/g },
    { type: 'shadowRoot', regex: /\bshadowRoot\b/g },
    { type: 'shadowrootmode', regex: /<template\b[^>]*\bshadowrootmode\s*=/gi },
    { type: 'shadowroot_legacy', regex: /<template\b[^>]*\bshadowroot\s*=/gi }
  ];

  for (const { type, regex } of patterns) {
    let m;
    while ((m = regex.exec(text)) !== null) {
      const line = text.substring(0, m.index).split('\n').length;
      violations.push({
        line,
        type,
        match: m[0],
        file: filePath
      });
    }
  }

  return violations;
}

/**
 * Parses basic HTML element nodes from an HTML string for inspection.
 * @param {string} html
 * @returns {Array<{tag: string, id: string|null, classList: string[], attributes: Record<string, string>, innerText: string}>}
 */
export function extractHtmlNodes(html) {
  const nodes = [];
  const tagRegex = /<([a-zA-Z0-9-]+)\b([^>]*)>(?:([\s\S]*?)<\/\1>)?/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const rawAttrs = match[2];
    const inner = match[3] || '';

    const attributes = {};
    const attrRegex = /([a-zA-Z0-9-:]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const name = attrMatch[1];
      const val = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attributes[name] = val;
    }

    const id = attributes.id || null;
    const classList = attributes.class ? attributes.class.split(/\s+/).filter(Boolean) : [];

    nodes.push({
      tag,
      id,
      classList,
      attributes,
      innerText: inner.replace(/<[^>]+>/g, '').trim()
    });
  }

  return nodes;
}
