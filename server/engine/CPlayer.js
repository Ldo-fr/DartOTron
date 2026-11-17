export class CPlayer {
  constructor(ident, nbjoueurs, config) {
    this.ident = ident;
    this.nbcol = Number(config?.GetValue('SectionGlobals', 'nbcol') || 6);
    this.LSTColVal = [];
    for (let x = 0; x <= this.nbcol; x++) {
      this.LSTColVal.push(['', 'txt', null]);
    }
    this.PlayerName = `Joueur ${this.ident + 1}`;
    this.Stats = {};

    // Player properties
    this.score = 0;
    this.TotalPoints = 0;
    this.hits = 0;
    this.roundhits = 0;
    this.pointsinround = 0;
    this.dartsthrown = 0;
  }

  GetColVal(col) {
    const entry = this.LSTColVal[col];
    if (!entry) return '';
    if (entry[1] === 'int') {
      const parsed = parseInt(entry[0], 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return entry[0];
  }

  IncrementColTouch(col) {
    const entry = this.LSTColVal[col];
    if (!entry) return false;
    if (entry[1] === 'int' || entry[1] === 'leds') {
      const thetype = entry[1];
      const nb = (Number(entry[0]) || 0) + 1;
      const color = entry[2] ?? null;
      this.LSTColVal[col] = [nb, thetype, color];
      return true;
    }
    return false;
  }

  IncrementHits(hit = 1) {
    const s = String(hit);
    if (s.startsWith('S')) {
      this.hits += 1;
    } else if (s.startsWith('D')) {
      this.hits += 2;
    } else if (s.startsWith('T')) {
      this.hits += 3;
    } else {
      this.hits += Number(hit) || 0;
    }
  }

  IncrementCol(nb, col) {
    const entry = this.LSTColVal[col];
    if (entry && entry[1] === 'int') {
      const color = entry[2] ?? null;
      const oldnb = Number(entry[0]) || 0;
      this.LSTColVal[col] = [oldnb + nb, 'int', color];
      return true;
    }
    return false;
  }

  DecrementCol(nb, col) {
    const entry = this.LSTColVal[col];
    if (entry && entry[1] === 'int') {
      const color = entry[2] ?? null;
      const oldnb = Number(entry[0]) || 0;
      this.LSTColVal[col] = [oldnb - nb, 'int', color];
      return true;
    }
    return false;
  }

  InitCol(col) {
    const entry = this.LSTColVal[col];
    if (entry && (entry[1] === 'int' || entry[1] === 'leds')) {
      this.LSTColVal[col] = [0, entry[1], entry[2] ?? null];
      return true;
    }
    return false;
  }

  GetTotalHit() {
    return this.hits;
  }

  ModifyScore(qty) {
    this.score += Number(qty) || 0;
    return this.score;
  }

  SetScore(score) {
    this.score = Number(score) || 0;
    return this.score;
  }

  GetScore() {
    return Math.trunc(this.score);
  }

  ShowMPR() {
    if (!this.dartsthrown || !this.hits) return 0.0;
    return Math.round(((this.hits / this.dartsthrown) * 3) * 100) / 100;
  }

  ShowPPD() {
    if (!this.dartsthrown || !this.TotalPoints) return 0.0;
    return Math.round((this.TotalPoints / this.dartsthrown) * 10) / 10;
  }

  ShowPPR(actualround = null) {
    if (!this.TotalPoints) return 0.0;
    if (actualround && Number(actualround) > 0) {
      return Math.round((this.TotalPoints / Number(actualround)) * 10) / 10;
    }
    if (!this.dartsthrown) return 0.0;
    return Math.round(((this.TotalPoints / this.dartsthrown) * 3) * 10) / 10;
  }

  ScorePerRound(actualround) {
    if (!actualround || !this.TotalPoints) return 0.0;
    return Math.round((this.TotalPoints / actualround) * 100) / 100;
  }

  AVG(actualround) {
    return this.ScorePerRound(actualround);
  }

  HitsPerRound(actualround) {
    if (!actualround || !this.hits) return 0.0;
    return Math.round((this.hits / actualround) * 100) / 100;
  }

  clone() {
    const copy = Object.create(Object.getPrototypeOf(this));
    for (const [k, v] of Object.entries(this)) {
      if (k === 'Config') {
        copy[k] = v;
      } else {
        copy[k] = structuredClone(v);
      }
    }
    return copy;
  }

  toJSON(actualround = 1) {
    const columns = this.LSTColVal.map(col => {
      const val = col?.[0] ?? '';
      const rawType = col?.[1] ?? 'txt';
      const extra = col?.[2] ?? null;
      const type = rawType === 'leds' ? 'led' : rawType;
      return {
        value: val,
        type,
        color: extra
      };
    });

    return {
      ident: this.ident,
      PlayerName: this.PlayerName,
      score: Math.round(this.score * 100) / 100,
      TotalPoints: this.TotalPoints,
      hits: this.hits,
      roundhits: this.roundhits,
      pointsinround: this.pointsinround,
      dartsthrown: this.dartsthrown,
      scorePerRound: this.ScorePerRound(actualround),
      columns,
      LSTColVal: this.LSTColVal.map(col => [
        col?.[0] ?? '',
        col?.[1] ?? 'txt',
        col?.[2] ?? null
      ]),
      Stats: { ...this.Stats },
      // Game-specific badges properties
      havezapped: this.havezapped,
      nbzapped: this.nbzapped,
      kinito: this.kinito,
      KinitoScore: this.KinitoScore,
      minscore: this.minscore
    };
  }
}
