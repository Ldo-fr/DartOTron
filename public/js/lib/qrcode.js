/**
 * Micro QR Code Generator (public/js/lib/qrcode.js)
 * Générateur QR Code autonome en pur Vanilla JS (sans dépendance externe).
 * Produit un SVG vectoriel propre ou un rendu Canvas.
 */

// Corps de Galois GF(256) avec polynôme primitif 0x11d (285)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMultiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsComputeGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const root = GF256_EXP[i];
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data, polyDegree) {
  const genPoly = rsComputeGeneratorPoly(polyDegree);
  const result = new Uint8Array(polyDegree);
  for (const b of data) {
    const factor = b ^ result[0];
    for (let i = 0; i < polyDegree - 1; i++) {
      result[i] = result[i + 1] ^ gfMultiply(factor, genPoly[polyDegree - 1 - i]);
    }
    result[polyDegree - 1] = gfMultiply(factor, genPoly[0]);
  }
  return result;
}

// Table des capacités pour le mode Byte (8-bit) avec niveau de correction M
// [version, totalCodewords, dataCodewords, ecCodewordsPerBlock, numBlocks]
const QR_SPECS_M = [
  null,
  { version: 1, size: 21, dataCap: 14, totalCW: 26, ecCW: 10, blocks: 1, align: [] },
  { version: 2, size: 25, dataCap: 26, totalCW: 44, ecCW: 16, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, dataCap: 42, totalCW: 70, ecCW: 26, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, dataCap: 62, totalCW: 100, ecCW: 18, blocks: 2, align: [6, 26] },
  { version: 5, size: 37, dataCap: 84, totalCW: 134, ecCW: 24, blocks: 2, align: [6, 30] },
  { version: 6, size: 41, dataCap: 106, totalCW: 172, ecCW: 16, blocks: 4, align: [6, 34] }
];

export class QRCodeModel {
  constructor(text) {
    this.text = String(text || '');
    const utf8Bytes = new TextEncoder().encode(this.text);
    const dataLen = utf8Bytes.length;

    // Trouver la version minimale nécessaire
    let spec = null;
    for (let v = 1; v < QR_SPECS_M.length; v++) {
      if (QR_SPECS_M[v].dataCap >= dataLen + 2) { // 2 octets pour en-tête mode 8-bit & longueur
        spec = QR_SPECS_M[v];
        break;
      }
    }
    if (!spec) {
      spec = QR_SPECS_M[QR_SPECS_M.length - 1];
    }
    this.spec = spec;
    this.size = spec.size;

    // Matrices du QR code
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));

    this._generate(utf8Bytes);
  }

  _setFunction(r, c, val) {
    this.modules[r][c] = val;
    this.isFunction[r][c] = true;
  }

  _drawFinderPattern(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
          const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          this._setFunction(row, col, isBlack);
        }
      }
    }
  }

  _drawAlignmentPattern(r0, c0) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBlack = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        this._setFunction(r0 + r, c0 + c, isBlack);
      }
    }
  }

  _generate(dataBytes) {
    // 1. Finder patterns
    this._drawFinderPattern(0, 0);
    this._drawFinderPattern(0, this.size - 7);
    this._drawFinderPattern(this.size - 7, 0);

    // 2. Alignment patterns
    const alignCoords = this.spec.align;
    for (const r of alignCoords) {
      for (const c of alignCoords) {
        if ((r === 6 && c === 6) ||
            (r === 6 && c === this.size - 7) ||
            (r === this.size - 7 && c === 6)) {
          continue; // Eviter chevauchement avec finders
        }
        if (!this.isFunction[r][c]) {
          this._drawAlignmentPattern(r, c);
        }
      }
    }

    // 3. Timing patterns
    for (let i = 8; i < this.size - 8; i++) {
      if (!this.isFunction[6][i]) this._setFunction(6, i, i % 2 === 0);
      if (!this.isFunction[i][6]) this._setFunction(i, 6, i % 2 === 0);
    }

    // Dark module fixe
    this._setFunction(4 * this.spec.version + 9, 8, true);

    // Réservation format info
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        this.isFunction[8][i] = true;
        this.isFunction[i][8] = true;
      }
    }
    for (let i = 0; i < 8; i++) {
      this.isFunction[8][this.size - 1 - i] = true;
      this.isFunction[this.size - 1 - i][8] = true;
    }

    // 4. Encodage des données (Mode Byte = 0100)
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    };

    pushBits(0b0100, 4); // Indicateur mode Byte
    pushBits(dataBytes.length, 8); // Longueur en version 1-9
    for (const b of dataBytes) {
      pushBits(b, 8);
    }

    // Terminaison
    const totalDataBits = (this.spec.totalCW - (this.spec.ecCW * this.spec.blocks)) * 8;
    const termLen = Math.min(4, totalDataBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }

    // Octets de remplissage (Pad bytes 0xEC, 0x11)
    const dataWords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataWords.push(b);
    }
    const maxDataWords = totalDataBits / 8;
    let pad = 0xec;
    while (dataWords.length < maxDataWords) {
      dataWords.push(pad);
      pad = pad === 0xec ? 0x11 : 0xec;
    }

    // 5. Calcul de code de correction Reed-Solomon par bloc
    const numBlocks = this.spec.blocks;
    const ecPerBlock = this.spec.ecCW;
    const blockDataLen = Math.floor(dataWords.length / numBlocks);

    const dataBlocks = [];
    const ecBlocks = [];
    for (let b = 0; b < numBlocks; b++) {
      const slice = dataWords.slice(b * blockDataLen, (b + 1) * blockDataLen);
      dataBlocks.push(slice);
      ecBlocks.push(Array.from(rsComputeRemainder(slice, ecPerBlock)));
    }

    // Entrelacement (Interleaving)
    const finalCodewords = [];
    for (let i = 0; i < blockDataLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalCodewords.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalCodewords.push(ecBlocks[b][i]);
      }
    }

    // 6. Placement des données en zigzag
    const allBits = [];
    for (const cw of finalCodewords) {
      for (let i = 7; i >= 0; i--) {
        allBits.push((cw >> i) & 1);
      }
    }

    let bitIdx = 0;
    let upward = true;
    for (let right = this.size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Colonne verticale de timing
      for (let vert = 0; vert < this.size; vert++) {
        const r = upward ? this.size - 1 - vert : vert;
        for (let c = right; c >= right - 1; c--) {
          if (!this.isFunction[r][c]) {
            const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
            this.modules[r][c] = bit === 1;
          }
        }
      }
      upward = !upward;
    }

    // 7. Masque (Masque standard 0 : (row + col) % 2 === 0)
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (!this.isFunction[r][c]) {
          if ((r + c) % 2 === 0) {
            this.modules[r][c] = !this.modules[r][c];
          }
        }
      }
    }

    // 8. Écriture de l'information de format (Niveau M = 00, Masque 0 = 000 -> 00000 -> code BCH 0x46d5 avec masque 0x5412)
    // Format pour M-0 : 0x5412 ^ 0x0000 = 0x5412 (101010000010010 en binaire)
    const formatBits = 0x5412;
    for (let i = 0; i < 15; i++) {
      const bit = ((formatBits >> i) & 1) === 1;
      // Première copie autour du coin supérieur gauche
      if (i < 6) this._setFunction(i, 8, bit);
      else if (i < 8) this._setFunction(i + 1, 8, bit);
      else if (i === 8) this._setFunction(8, 7, bit);
      else this._setFunction(8, 14 - i, bit);

      // Seconde copie sur les bords droit et inférieur
      if (i < 8) this._setFunction(8, this.size - 1 - i, bit);
      else this._setFunction(this.size - 15 + i, 8, bit);
    }
  }

  toSVG(options = {}) {
    const margin = Number(options.margin ?? 4);
    const size = this.size + margin * 2;
    const fg = options.color || '#00ff87'; // Bullseye Neon par défaut
    const bg = options.background || '#060a12'; // Surface cyber sombre

    let rects = '';
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.modules[r][c]) {
          rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${fg}"/>`;
        }
      }
    }

    return `
      <svg class="qr-code-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
        <rect width="${size}" height="${size}" fill="${bg}"/>
        ${rects}
      </svg>
    `.trim();
  }
}

export function generateQRCodeSVG(text, options = {}) {
  const model = new QRCodeModel(text);
  return model.toSVG(options);
}

