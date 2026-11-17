/**
 * Dartboard Component (<dart-board>, alias <dartboard-matrix>, <o-dartboard>)
 * Cible de fléchettes interactive et dynamique CyberHUD (Stitch Design System).
 *
 * Supporte :
 * - Style ardoise & acier ("target-gris") par défaut pour l'ensemble des segments.
 * - `targets` : Tableau ou chaîne des numéros actifs (ex: ['20', '19', '18', 'B']) avec illumination vive
 *   et fusion automatique des bordures extérieures pour les secteurs consécutifs.
 * - `highlightSegment` / `.highlight(key, color)` : Illumine un segment spécifique (ex: 'S20', 'T20', 'DB')
 *   avec contour néon et halo pulsé (utilisé par l'assistant de calibration et le simulateur).
 * - `hits` : Tableau des segments touchés dans le tour courant (ex: ['T20', 'D18', 'DB']).
 *   Chaque hit affiche un point d'impact lumineux vibrant avec algorithme anti-chevauchement.
 * - `interactive` : Si actif, permet de cliquer sur les segments (émet l'événement 'segment-hit').
 * - `hide-inactive-numbers` : Si présent, masque les numéros non ciblés (utilisé en Cricket).
 */

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Rayons SVG normalisés (viewBox 0 0 800 800, centre cx=400, cy=400)
const RADII = {
  db: 13,
  sb: 28,
  innerSingle: { rIn: 28, rOut: 144 },
  triple: { rIn: 144, rOut: 162 },
  outerSingle: { rIn: 162, rOut: 242 },
  double: { rIn: 242, rOut: 260 },
  numberRing: 300,
  wireOuter: 260
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function createWedgePath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  const p1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z'
  ].join(' ');
}

if (typeof globalThis !== 'undefined' && typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class HTMLElement {
    constructor() {
      this.attributes = {};
    }
    getAttribute(name) { return this.attributes ? (this.attributes[name] || null) : null; }
    setAttribute(name, val) {
      if (!this.attributes) this.attributes = {};
      this.attributes[name] = String(val);
    }
    hasAttribute(name) { return Boolean(this.attributes && name in this.attributes); }
    removeAttribute(name) { if (this.attributes) delete this.attributes[name]; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    appendChild(el) { return el; }
    dispatchEvent() { return true; }
  };
}

export class Dartboard extends HTMLElement {
  static get observedAttributes() {
    return ['targets', 'hits', 'interactive', 'highlight-segment', 'hide-inactive-numbers'];
  }

  constructor() {
    super();
    this._targets = [];
    this._hits = [];
    this._interactive = false;
    this._highlightedKey = null;
    this._cachedHitDots = []; // { key, x, y } pour préserver l'emplacement au sein du tour
  }

  connectedCallback() {
    this.parseAttributes();
    this.render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.isConnected) {
      this.parseAttributes();
      this.render();
    }
  }

  parseAttributes() {
    const rawTargets = this.getAttribute('targets');
    if (rawTargets) {
      try {
        const parsed = JSON.parse(rawTargets);
        this._targets = Array.isArray(parsed) ? parsed.map(v => String(v).trim().toUpperCase()) : [];
      } catch {
        this._targets = rawTargets.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      }
    } else {
      this._targets = [];
    }

    const rawHits = this.getAttribute('hits');
    if (rawHits) {
      try {
        const parsed = JSON.parse(rawHits);
        this._hits = Array.isArray(parsed) ? parsed.map(v => String(v).trim().toUpperCase()) : [];
      } catch {
        this._hits = rawHits.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      }
    } else {
      this._hits = [];
    }

    const rawHigh = this.getAttribute('highlight-segment');
    this._highlightedKey = rawHigh ? String(rawHigh).trim().toUpperCase() : null;

    this._interactive = this.hasAttribute('interactive') && this.getAttribute('interactive') !== 'false';
  }

  get targets() {
    return this._targets;
  }

  set targets(val) {
    this._targets = Array.isArray(val) ? val.map(v => String(v).trim().toUpperCase()) : [];
    this.setAttribute('targets', JSON.stringify(this._targets));
  }

  get hits() {
    return this._hits;
  }

  set hits(val) {
    this._hits = Array.isArray(val) ? val.map(v => String(v).trim().toUpperCase()) : [];
    this.setAttribute('hits', JSON.stringify(this._hits));
  }

  get interactive() {
    return this._interactive;
  }

  set interactive(val) {
    this._interactive = Boolean(val);
    if (this._interactive) {
      this.setAttribute('interactive', '');
    } else {
      this.removeAttribute('interactive');
    }
  }

  get highlightSegment() {
    return this._highlightedKey;
  }

  set highlightSegment(val) {
    this._highlightedKey = val ? String(val).trim().toUpperCase() : null;
    if (this._highlightedKey) {
      this.setAttribute('highlight-segment', this._highlightedKey);
    } else {
      this.removeAttribute('highlight-segment');
    }
    this.render();
  }

  highlight(segmentKey) {
    this._highlightedKey = segmentKey ? String(segmentKey).trim().toUpperCase() : null;
    this.render();
  }

  get hideInactiveNumbers() {
    return this.hasAttribute('hide-inactive-numbers');
  }

  set hideInactiveNumbers(val) {
    if (val) {
      this.setAttribute('hide-inactive-numbers', '');
    } else {
      this.removeAttribute('hide-inactive-numbers');
    }
  }

  /**
   * Identifie les groupes contigus de numéros actifs pour fusionner leurs contours
   */
  getMergedContiguousTargetSlices() {
    const targetSet = new Set(this._targets.map(t => (t === '25' || t === 'BULL' ? 'B' : t)));
    const activeIndices = new Set();

    BOARD_ORDER.forEach((num, idx) => {
      if (targetSet.has(String(num))) {
        activeIndices.add(idx);
      }
    });

    if (activeIndices.size === 0) return [];
    if (activeIndices.size === 20) {
      // Tous les numéros actifs : un seul anneau complet de 0° à 360°
      return [{ startAngle: -9, endAngle: 351, isFullCircle: true }];
    }

    // Regroupement en intervalles circulaires continus
    const visited = new Set();
    const slices = [];

    for (let i = 0; i < 20; i++) {
      if (activeIndices.has(i) && !visited.has(i)) {
        // Recherche du début de la chaîne
        let start = i;
        while (activeIndices.has((start - 1 + 20) % 20) && !visited.has((start - 1 + 20) % 20)) {
          start = (start - 1 + 20) % 20;
          if (start === i) break;
        }

        let curr = start;
        let count = 0;
        while (activeIndices.has(curr) && !visited.has(curr) && count < 20) {
          visited.add(curr);
          curr = (curr + 1) % 20;
          count++;
        }

        const startAngle = start * 18 - 9;
        const endAngle = startAngle + count * 18;
        slices.push({ startAngle, endAngle, count });
      }
    }

    return slices;
  }

  /**
   * Génère les coordonnées d'un point d'impact aléatoire sans collision dans le segment
   */
  getHitDotCoords(hitKey, existingDots) {
    const cx = 400;
    const cy = 400;
    const key = String(hitKey || '').trim().toUpperCase();

    let rMin = 30;
    let rMax = 140;
    let startAngle = 0;
    let endAngle = 360;

    if (key === 'DB' || key === 'DOUBLEBULLSEYE' || key === '50' || key === 'DBULL' || key === 'D-BULL') {
      rMin = 2;
      rMax = RADII.db - 2;
    } else if (key === 'SB' || key === 'BULLSEYE' || key === 'BULL' || key === 'B' || key === '25' || key === 'S-BULL' || key === 'SBULL') {
      rMin = RADII.db + 2;
      rMax = RADII.sb - 2;
    } else if (key === 'MISS' || key === 'MISSDART' || key === '0') {
      rMin = 355;
      rMax = 370;
      startAngle = 0;
      endAngle = 360;
    } else {
      let mult = 'S';
      let num = null;

      const prefixMatch = key.match(/^([SDT])-?(\d+)$/);
      const suffixMatch = key.match(/^(\d+)-?([SDT])$/);
      const plainNumMatch = key.match(/^(\d+)$/);

      if (prefixMatch) {
        mult = prefixMatch[1];
        num = parseInt(prefixMatch[2], 10);
      } else if (suffixMatch) {
        num = parseInt(suffixMatch[1], 10);
        mult = suffixMatch[2];
      } else if (plainNumMatch) {
        num = parseInt(plainNumMatch[1], 10);
        mult = 'S';
      }

      if (num !== null) {
        const idx = BOARD_ORDER.indexOf(num);
        if (idx !== -1) {
          const centerAngle = idx * 18;
          startAngle = centerAngle - 7;
          endAngle = centerAngle + 7;

          if (mult === 'T') {
            rMin = RADII.triple.rIn + 2;
            rMax = RADII.triple.rOut - 2;
          } else if (mult === 'D') {
            rMin = RADII.double.rIn + 2;
            rMax = RADII.double.rOut - 2;
          } else {
            // Pour simple, répartir soit inner soit outer
            if (Math.random() > 0.4) {
              rMin = RADII.outerSingle.rIn + 4;
              rMax = RADII.outerSingle.rOut - 4;
            } else {
              rMin = RADII.innerSingle.rIn + 4;
              rMax = RADII.innerSingle.rOut - 4;
            }
          }
        }
      }
    }

    // Essayer jusqu'à 25 fois pour éviter les chevauchements
    const MIN_DIST = 9; // distance minimale entre 2 points
    let bestX = cx;
    let bestY = cy;
    let maxDist = -1;

    for (let attempt = 0; attempt < 25; attempt++) {
      const r = rMin + Math.random() * (rMax - rMin);
      const angle = startAngle + Math.random() * (endAngle - startAngle);
      const pt = polarToCartesian(cx, cy, r, angle);

      let closest = 9999;
      for (const d of existingDots) {
        const dist = Math.hypot(pt.x - d.x, pt.y - d.y);
        if (dist < closest) closest = dist;
      }

      if (closest >= MIN_DIST) {
        return pt;
      }
      if (closest > maxDist) {
        maxDist = closest;
        bestX = pt.x;
        bestY = pt.y;
      }
    }

    return { x: bestX, y: bestY };
  }

  render() {
    const cx = 400;
    const cy = 400;
    const targetSet = new Set(this._targets.map(t => (t === '25' || t === 'BULL' ? 'B' : t)));
    const hasTargets = targetSet.size > 0;
    const highKey = this._highlightedKey;
    const hideInactive = this.hasAttribute('hide-inactive-numbers');

    const isBullTarget = targetSet.has('B');
    const isBullHighlighted = highKey === 'B' || highKey === 'BULL' || highKey === 'SB' || highKey === 'DB' || highKey === '25' || highKey === '50';
    const isBullActive = isBullTarget || isBullHighlighted;
    const bullDimClass = (hasTargets && !isBullTarget) ? 'is-dimmed' : '';

    const sbFill = (isBullTarget || highKey === 'SB' || highKey === 'B' || highKey === '25')
      ? 'url(#bd-outer-bull)'
      : 'url(#bd-outer-bull-dimmed)';

    const dbFill = (isBullTarget || highKey === 'DB' || highKey === 'B' || highKey === '50')
      ? 'url(#bd-inner-bull)'
      : 'url(#bd-inner-bull-dimmed)';

    const sbHighlightClass = (highKey === 'SB' || highKey === 'B' || highKey === '25') ? 'is-highlighted' : '';
    const dbHighlightClass = (highKey === 'DB' || highKey === 'B' || highKey === '50') ? 'is-highlighted' : '';

    // 1. Segments du plateau
    let sectorsHtml = '';
    BOARD_ORDER.forEach((num, idx) => {
      const centerAngle = idx * 18;
      const startAngle = centerAngle - 9;
      const endAngle = centerAngle + 9;
      const isEven = idx % 2 === 0;
      const isTarget = targetSet.has(String(num));
      const dimClass = (hasTargets && !isTarget) ? 'is-dimmed' : '';

      const isSHighlighted = highKey === `S${num}` || highKey === String(num);
      const isTHighlighted = highKey === `T${num}`;
      const isDHighlighted = highKey === `D${num}`;

      // Nuances CyberHUD ardoise & acier par défaut pour toute la cible
      let innerSingleFill = isEven ? '#10141f' : '#161c2b';
      let outerSingleFill = isEven ? '#10141f' : '#161c2b';
      let tripleFill = isEven ? '#3b4760' : '#232a3b';
      let doubleFill = isEven ? '#3b4760' : '#232a3b';

      let innerSingleClass = '';
      let outerSingleClass = '';
      let tripleClass = '';
      let doubleClass = '';

      // Si le numéro est actif (Cricket)
      if (isTarget) {
        innerSingleFill = isEven ? '#111622' : '#242C3C';
        outerSingleFill = isEven ? '#111622' : '#242C3C';
        tripleFill = isEven ? '#FF3366' : '#00e478';
        doubleFill = isEven ? '#FF3366' : '#00e478';
      }

      // Si un segment spécifique est ciblé/highlighté (Calibration wizard ou simulation)
      if (isSHighlighted) {
        innerSingleFill = isEven ? '#111622' : '#242C3C';
        outerSingleFill = isEven ? '#111622' : '#242C3C';
        innerSingleClass = 'is-highlighted';
        outerSingleClass = 'is-highlighted';
      }
      if (isTHighlighted) {
        tripleFill = isEven ? '#FF3366' : '#00e478';
        tripleClass = 'is-highlighted';
      }
      if (isDHighlighted) {
        doubleFill = isEven ? '#FF3366' : '#00e478';
        doubleClass = 'is-highlighted';
      }

      const dInnerSingle = createWedgePath(cx, cy, RADII.innerSingle.rIn, RADII.innerSingle.rOut, startAngle, endAngle);
      const dTriple = createWedgePath(cx, cy, RADII.triple.rIn, RADII.triple.rOut, startAngle, endAngle);
      const dOuterSingle = createWedgePath(cx, cy, RADII.outerSingle.rIn, RADII.outerSingle.rOut, startAngle, endAngle);
      const dDouble = createWedgePath(cx, cy, RADII.double.rIn, RADII.double.rOut, startAngle, endAngle);

      sectorsHtml += `
        <path class="dart-segment ${dimClass} ${innerSingleClass}" data-seg="S${num}" d="${dInnerSingle}" fill="${innerSingleFill}" />
        <path class="dart-segment ${dimClass} ${tripleClass}" data-seg="T${num}" d="${dTriple}" fill="${tripleFill}" />
        <path class="dart-segment ${dimClass} ${outerSingleClass}" data-seg="S${num}" d="${dOuterSingle}" fill="${outerSingleFill}" />
        <path class="dart-segment ${dimClass} ${doubleClass}" data-seg="D${num}" d="${dDouble}" fill="${doubleFill}" />
      `;
    });

    // 2. Numéros en périphérie (affichés par défaut ; masqués si inactifs uniquement avec hide-inactive-numbers)
    let labelsHtml = '';
    BOARD_ORDER.forEach((num, idx) => {
      const centerAngle = idx * 18;
      const pos = polarToCartesian(cx, cy, RADII.numberRing, centerAngle);
      const isActive = targetSet.has(String(num)) || (highKey && (highKey.includes(String(num))));

      // Si l'option hide-inactive-numbers est active ET que des cibles sont définies, masquer les inactifs
      if (hideInactive && hasTargets && !isActive) {
        return;
      }

      const fillClass = isActive ? 'num-label is-active-target' : 'num-label';
      labelsHtml += `
        <text
          x="${pos.x.toFixed(2)}"
          y="${(pos.y + 7).toFixed(2)}"
          class="${fillClass}"
          data-num="${num}"
        >${num}</text>
      `;
    });

    // 3. Fusion des bordures pour les numéros actifs contigus
    const contiguousSlices = this.getMergedContiguousTargetSlices();
    let mergedOutlinesHtml = '';

    for (const slice of contiguousSlices) {
      if (slice.isFullCircle) {
        mergedOutlinesHtml += `
          <circle cx="${cx}" cy="${cy}" r="${RADII.wireOuter}" class="target-merged-contour" />
          <circle cx="${cx}" cy="${cy}" r="${RADII.innerSingle.rIn}" class="target-merged-contour" />
        `;
      } else {
        const outerWedge = createWedgePath(cx, cy, RADII.innerSingle.rIn, RADII.wireOuter, slice.startAngle, slice.endAngle);
        mergedOutlinesHtml += `
          <path d="${outerWedge}" class="target-merged-contour" />
        `;
      }
    }

    // Si le Bull est actif
    let bullOutlineHtml = '';
    if (isBullActive) {
      bullOutlineHtml = `
        <circle cx="${cx}" cy="${cy}" r="${RADII.sb + 1}" class="target-merged-contour target-bull-contour" />
      `;
    }

    // 4. Points d'impacts (Hit Dots) avec mise en mémoire cache pour persistance de la volée
    const currentHits = this._hits.slice(0, 3);
    const validDots = [];

    // Réutilisation des dots existants si même préfixe
    for (let i = 0; i < currentHits.length; i++) {
      const hitKey = currentHits[i];
      if (this._cachedHitDots[i] && this._cachedHitDots[i].key === hitKey) {
        validDots.push(this._cachedHitDots[i]);
      } else {
        const pt = this.getHitDotCoords(hitKey, validDots);
        const newDot = { key: hitKey, x: pt.x, y: pt.y };
        validDots.push(newDot);
      }
    }
    this._cachedHitDots = validDots;

    let hitsHtml = '';
    validDots.forEach((dot, index) => {
      const isLatest = index === validDots.length - 1;
      const latestClass = isLatest ? 'is-latest-hit' : '';
      hitsHtml += `
        <g class="hit-dot-group ${latestClass}" data-hit-x="${dot.x.toFixed(1)}" data-hit-y="${dot.y.toFixed(1)}">
          <circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="14" class="hit-dot-glow" />
          <circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="7.5" class="hit-dot-core" />
          <circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="2.5" class="hit-dot-pin" />
        </g>
      `;
    });

    this.innerHTML = `
      <div class="dartboard-container ${this._interactive ? 'is-interactive' : ''}">
        <svg class="dartboard-svg" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="neon-glow-filter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="bd-board-rim" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stop-color="#0F131D" />
              <stop offset="95%" stop-color="#171B26" />
              <stop offset="100%" stop-color="#262A35" />
            </radialGradient>
            <radialGradient id="bd-inner-bull" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FF5C8A" />
              <stop offset="100%" stop-color="#FF3366" />
            </radialGradient>
            <radialGradient id="bd-outer-bull" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#55FFB0" />
              <stop offset="100%" stop-color="#00FF87" />
            </radialGradient>
            <!-- Bullseyes harmonisés ardoise / acier Stitch target-gris pour segments inactifs -->
            <radialGradient id="bd-outer-bull-dimmed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#36435c" />
              <stop offset="100%" stop-color="#232a3b" />
            </radialGradient>
            <radialGradient id="bd-inner-bull-dimmed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#5a6c91" />
              <stop offset="100%" stop-color="#3b4760" />
            </radialGradient>
          </defs>

          <!-- Fond du cerclage -->
          <circle cx="${cx}" cy="${cy}" r="388" fill="#0A0E18" />
          <circle cx="${cx}" cy="${cy}" r="375" fill="url(#bd-board-rim)" stroke="#353944" stroke-width="3" />
          <circle class="dart-segment board-catch-ring" data-seg="MISSDART" cx="${cx}" cy="${cy}" r="350" fill="#0A0E18" stroke="#1E293B" stroke-width="1.5" />

          <!-- Couche des secteurs -->
          <g id="dartboard-sectors">
            ${sectorsHtml}
          </g>

          <!-- Bulls -->
          <circle class="dart-segment ${bullDimClass} ${sbHighlightClass}" data-seg="SB" cx="${cx}" cy="${cy}" r="${RADII.sb}" fill="${sbFill}" />
          <circle class="dart-segment ${bullDimClass} ${dbHighlightClass}" data-seg="DB" cx="${cx}" cy="${cy}" r="${RADII.db}" fill="${dbFill}" />

          <!-- Spider Wires métalliques -->
          <g class="spider-wires" pointer-events="none">
            <circle cx="${cx}" cy="${cy}" r="${RADII.double.rOut}" stroke="#526079" stroke-width="2" fill="none" />
            <circle cx="${cx}" cy="${cy}" r="${RADII.double.rIn}" stroke="#526079" stroke-width="1.5" fill="none" />
            <circle cx="${cx}" cy="${cy}" r="${RADII.triple.rOut}" stroke="#526079" stroke-width="1.5" fill="none" />
            <circle cx="${cx}" cy="${cy}" r="${RADII.triple.rIn}" stroke="#526079" stroke-width="1.5" fill="none" />
            <circle cx="${cx}" cy="${cy}" r="${RADII.sb}" stroke="#526079" stroke-width="2" fill="none" />
            <circle cx="${cx}" cy="${cy}" r="${RADII.db}" stroke="#526079" stroke-width="1.5" fill="none" />
            ${BOARD_ORDER.map((_, i) => {
              const a = i * 18 - 9;
              return `<line x1="${cx}" y1="${cy - RADII.sb}" x2="${cx}" y2="${cy - RADII.double.rOut}" stroke="#526079" stroke-width="1.5" transform="rotate(${a} ${cx} ${cy})" />`;
            }).join('')}
          </g>

          <!-- Contours fusionnés des numéros actifs (Cricket) -->
          <g id="dartboard-target-contours" pointer-events="none">
            ${mergedOutlinesHtml}
            ${bullOutlineHtml}
          </g>

          <!-- Numéros en périphérie -->
          <g id="dartboard-number-labels">
            ${labelsHtml}
          </g>

          <!-- Points d'impact (Hits de la volée) -->
          <g id="dartboard-hits-layer" pointer-events="none">
            ${hitsHtml}
          </g>
        </svg>
      </div>
    `;

    // Écouteur interactif si activé
    if (this._interactive) {
      this.querySelectorAll('.dart-segment').forEach(seg => {
        seg.addEventListener('click', (e) => {
          e.stopPropagation();
          const segKey = seg.getAttribute('data-seg');
          if (segKey) {
            seg.classList.add('is-clicked');
            setTimeout(() => seg.classList.remove('is-clicked'), 250);

            this.dispatchEvent(new CustomEvent('segment-hit', {
              detail: { segment: segKey },
              bubbles: true,
              composed: true
            }));
          }
        });
      });
    }
  }
}

// Enregistrement officiel de la balise principale <dart-board> et rétrocompatibilité
if (typeof customElements !== 'undefined') {
  if (!customElements.get('dart-board')) {
    customElements.define('dart-board', Dartboard);
  }
  if (!customElements.get('o-dartboard')) {
    try {
      customElements.define('o-dartboard', class extends Dartboard {});
    } catch {
      // ignore
    }
  }
  if (!customElements.get('dartboard-matrix')) {
    try {
      customElements.define('dartboard-matrix', class extends Dartboard {});
    } catch {
      // ignore
    }
  }
}
