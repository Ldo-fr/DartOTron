export class CHandicap {
  constructor(gamename, config) {
    this.Config = config;
    this.GameName = gamename;
    this.LSThandimarks = [];
    this.LSTHandiPoints = [];
    this.LSTteammpr = [];
    this.maxid = 0;
  }

  findcrickethandicap(lstmpr) {
    let handicol = 0;
    this.LSTteammpr = [];
    this.LSTteammpr.push(Math.round(((parseFloat(lstmpr[0] || 0) + parseFloat(lstmpr[2] || 0)) / 2) * 100) / 100);
    this.LSTteammpr.push(Math.round(((parseFloat(lstmpr[1] || 0) + parseFloat(lstmpr[3] || 0)) / 2) * 100) / 100);

    for (const i of this.LSTteammpr) {
      if (i <= 1.99) handicol += 0.5;
      else if (i >= 2.0 && i <= 2.99) handicol += 1;
      else if (i >= 3.0) handicol += 1.5;
    }

    const maxval = Math.max(...this.LSTteammpr);
    this.maxid = this.LSTteammpr.indexOf(maxval);
    const minval = Math.min(...this.LSTteammpr);
    const diff = maxval - minval;

    if (handicol < 1.5) {
      if (diff >= 0.10 && diff <= 0.19) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 0];
      else if (diff >= 0.20 && diff <= 0.29) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 1];
      else if (diff >= 0.30 && diff <= 0.39) this.LSThandimarks = [1, 1, 0, 0, 0, 0, 1];
      else if (diff >= 0.40 && diff <= 0.49) this.LSThandimarks = [1, 1, 1, 0, 0, 0, 1];
      else if (diff >= 0.50 && diff <= 0.59) this.LSThandimarks = [1, 1, 1, 1, 0, 0, 1];
      else if (diff >= 0.60 && diff <= 0.69) this.LSThandimarks = [1, 1, 1, 1, 1, 0, 1];
      else if (diff >= 0.70 && diff <= 0.79) this.LSThandimarks = [1, 1, 1, 1, 1, 1, 1];
      else if (diff >= 0.80 && diff <= 0.89) this.LSThandimarks = [2, 1, 1, 1, 1, 1, 1];
      else if (diff >= 0.90 && diff <= 0.99) this.LSThandimarks = [2, 2, 1, 1, 1, 1, 1];
      else if (diff >= 1.00 && diff <= 1.09) this.LSThandimarks = [2, 2, 2, 1, 1, 1, 1];
      else if (diff >= 1.10 && diff <= 1.19) this.LSThandimarks = [2, 2, 2, 2, 1, 1, 1];
      else if (diff >= 1.20 && diff <= 1.29) this.LSThandimarks = [2, 2, 2, 2, 2, 1, 1];
      else if (diff >= 1.30 && diff <= 1.39) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 1];
      else if (diff >= 1.40) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 2];
      else this.LSThandimarks = [0, 0, 0, 0, 0, 0, 0];
    } else if (handicol >= 1.5 && handicol < 3.0) {
      if (diff >= 0.10 && diff <= 0.29) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 0];
      else if (diff >= 0.30 && diff <= 0.39) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 1];
      else if (diff >= 0.40 && diff <= 0.59) this.LSThandimarks = [1, 1, 0, 0, 0, 0, 1];
      else if (diff >= 0.60 && diff <= 0.69) this.LSThandimarks = [1, 1, 1, 0, 0, 0, 1];
      else if (diff >= 0.70 && diff <= 0.89) this.LSThandimarks = [1, 1, 1, 1, 0, 0, 1];
      else if (diff >= 0.90 && diff <= 0.99) this.LSThandimarks = [1, 1, 1, 1, 1, 0, 1];
      else if (diff >= 1.00 && diff <= 1.19) this.LSThandimarks = [1, 1, 1, 1, 1, 1, 1];
      else if (diff >= 1.20 && diff <= 1.29) this.LSThandimarks = [2, 1, 1, 1, 1, 1, 1];
      else if (diff >= 1.30 && diff <= 1.49) this.LSThandimarks = [2, 2, 1, 1, 1, 1, 1];
      else if (diff >= 1.50 && diff <= 1.59) this.LSThandimarks = [2, 2, 2, 1, 1, 1, 1];
      else if (diff >= 1.60 && diff <= 1.79) this.LSThandimarks = [2, 2, 2, 2, 1, 1, 1];
      else if (diff >= 1.80 && diff <= 1.89) this.LSThandimarks = [2, 2, 2, 2, 2, 1, 1];
      else if (diff >= 1.90 && diff <= 2.09) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 1];
      else if (diff >= 2.10) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 2];
      else this.LSThandimarks = [0, 0, 0, 0, 0, 0, 0];
    } else {
      if (diff >= 0.20 && diff <= 0.39) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 0];
      else if (diff >= 0.40 && diff <= 0.59) this.LSThandimarks = [1, 0, 0, 0, 0, 0, 1];
      else if (diff >= 0.60 && diff <= 0.79) this.LSThandimarks = [1, 1, 0, 0, 0, 0, 1];
      else if (diff >= 0.80 && diff <= 0.99) this.LSThandimarks = [1, 1, 1, 0, 0, 0, 1];
      else if (diff >= 1.00 && diff <= 1.19) this.LSThandimarks = [1, 1, 1, 1, 0, 0, 1];
      else if (diff >= 1.20 && diff <= 1.39) this.LSThandimarks = [1, 1, 1, 1, 1, 0, 1];
      else if (diff >= 1.40 && diff <= 1.59) this.LSThandimarks = [1, 1, 1, 1, 1, 1, 1];
      else if (diff >= 1.60 && diff <= 1.79) this.LSThandimarks = [2, 1, 1, 1, 1, 1, 1];
      else if (diff >= 1.80 && diff <= 1.99) this.LSThandimarks = [2, 2, 1, 1, 1, 1, 1];
      else if (diff >= 2.00 && diff <= 2.19) this.LSThandimarks = [2, 2, 2, 1, 1, 1, 1];
      else if (diff >= 2.20 && diff <= 2.39) this.LSThandimarks = [2, 2, 2, 2, 1, 1, 1];
      else if (diff >= 2.40 && diff <= 2.59) this.LSThandimarks = [2, 2, 2, 2, 2, 1, 1];
      else if (diff >= 2.60 && diff <= 2.79) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 1];
      else if (diff >= 2.80) this.LSThandimarks = [2, 2, 2, 2, 2, 2, 2];
      else this.LSThandimarks = [0, 0, 0, 0, 0, 0, 0];
    }
    return this.LSThandimarks;
  }

  FindCricketHandicap(lstmpr) {
    return this.findcrickethandicap(lstmpr);
  }

  returnmaxid() {
    return this.maxid;
  }

  ReturnMaxid() {
    return this.maxid;
  }

  hoonehandicap(lstppd, ogstartscore) {
    this.LSTHandiPoints = [];
    const team1avg = ((lstppd[0] || 0) + (lstppd[2] || 0)) / 2;
    const team2avg = ((lstppd[1] || 0) + (lstppd[3] || 0)) / 2;
    const pointsperdart = [team1avg, team2avg];
    let startpercent = 40;
    try {
      const cfgVal = parseFloat(this.Config?.GetValue('Ho_One', 'startpercent'));
      if (Number.isFinite(cfgVal) && cfgVal > 0) startpercent = cfgVal;
    } catch {
      startpercent = 40;
    }
    const startratio = Math.round((startpercent / 100) * 100) / 100;
    const og = parseInt(ogstartscore, 10) || 301;
    const minstartscore = Math.trunc((og - 1) * startratio + 1);
    const maxval = Math.max(...pointsperdart);
    this.maxid = pointsperdart.indexOf(maxval);

    const teamScores = [og, og];
    for (let idx = 0; idx < pointsperdart.length; idx++) {
      const val = pointsperdart[idx];
      if (idx !== this.maxid && val > 0 && maxval > 0) {
        const playerstartscore = Math.trunc(og * (val / maxval) + 0.5);
        teamScores[idx] = Math.max(playerstartscore, minstartscore);
      } else {
        teamScores[idx] = og;
      }
    }
    // Map to 4 players: P0 & P2 are Team 0, P1 & P3 are Team 1
    this.LSTHandiPoints = [teamScores[0], teamScores[1], teamScores[0], teamScores[1]];
    return this.LSTHandiPoints;
  }
}

