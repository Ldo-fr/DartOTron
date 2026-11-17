import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';
import { CHandicap } from '../engine/CHandicap.js';

const LSTRandom = ['B', 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const Headers = ['20', '19', '18', '17', '16', '15', 'B'];
export const GameOpts = {
  max_round: '20',
  optioncutthroat: 'False',
  optioncrazy: 'False',
  optioncrazycutthroatmaster: 'False'
};
export const nbdarts = 3;
export const GameRecords = {
  MPR: 'DESC',
  'Least Rounds': 'ASC'
};

export class CPlayerExtended extends CPlayer {
  constructor(x, nbplayers, Config) {
    super(x, nbplayers, Config);
    this.PayDrink = false;
    this.DistribPoints = 0;
    for (const GR of Object.keys(GameRecords)) {
      this.Stats[GR] = '0';
    }
  }
}

export class Game extends CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores) {
    super(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores);
    this.Handicap = new CHandicap('Cricket', Config);
    this.GameRecords = { ...GameRecords };
    this.nbdarts = nbdarts;
    this.Headers = [...Headers];
    this.nbplayers = nbplayers;
    this.maxround = parseInt(this.GameOpts.max_round, 10) || 20;

    if (nbplayers >= 4 && nbplayers % 2 === 0 && this.GameOptions('Teaming') === 'True') {
      this.myDisplay.Teaming = true;
    } else if (this.GameOptions('Teaming') === 'True') {
      this.Logs.Log('WARNING', 'Teaming requires at least 4 players and an even number. Disabling Teaming.');
      this.GameOpts.Teaming = 'False';
    }
  }

  GameOptions(code) {
    if (
      (code === 'optioncrazy' || code === 'optioncutthroat' || code === 'optionmaster') &&
      String(this.GameOpts.optioncrazycutthroatmaster) === 'True'
    ) {
      return 'True';
    }
    if (this.GameOpts[code] !== undefined) {
      return String(this.GameOpts[code]);
    }
    if (code === 'drinkscore') return '200';
    return 'False';
  }

  PostDartsChecks(hit, Players, actualround, actualplayer, playerlaunch) {
    const mate = this.Mate(actualplayer, Players.length);
    let PlayClosed = false;
    let PlayOpen = false;
    let PlayHit = false;
    let PlayScored = false;
    let return_code = 0;
    let touchcount4total = false;

    const TouchedColumn = String(hit).slice(1);
    const MultipleColumn = String(hit).slice(0, 1);

    if (this.Headers.includes(TouchedColumn)) {
      const IndexColTouched = this.Headers.indexOf(TouchedColumn);
      let TouchToAdd = 1;
      if (MultipleColumn === 'D') TouchToAdd = 2;
      else if (MultipleColumn === 'T') TouchToAdd = 3;

      let overtouched = 0;
      for (let x = 0; x < TouchToAdd; x++) {
        if (Number(Players[actualplayer].GetColVal(IndexColTouched)) < 3) {
          Players[actualplayer].IncrementColTouch(IndexColTouched);
          if (this.GameOptions('Teaming') === 'True' && this.GameOptions('optionteamscore') === 'True' && mate !== -1) {
            Players[mate].IncrementColTouch(IndexColTouched);
          }
          Players[actualplayer].IncrementHits();
          Players[actualplayer].roundhits += 1;

          if (Number(Players[actualplayer].GetColVal(IndexColTouched)) === 3) {
            const state = this.GetColumnState(actualplayer, Players, IndexColTouched);
            if (state === 3) {
              PlayOpen = true;
              PlayHit = false;
            } else if (state === 4) {
              PlayClosed = true;
              PlayHit = false;
            }
          } else if (x === 0) {
            PlayHit = true;
          }
        } else if (Number(Players[actualplayer].GetColVal(IndexColTouched)) === 3) {
          overtouched += 1;
        }
      }

      if (
        !PlayClosed &&
        overtouched > 0 &&
        this.GameOptions('optioncrazycutthroatmaster') === 'True' &&
        this.GetColumnState(actualplayer, Players, IndexColTouched) === 4
      ) {
        const valueofsimplehit = this.ScoreMap['S' + hit.slice(1)] || 0;
        const overtouchedpts = overtouched * valueofsimplehit;
        Players[actualplayer].ModifyScore(overtouchedpts);
      }

      if (overtouched > 0) {
        const valueofsimplehit = this.ScoreMap['S' + hit.slice(1)] || 0;
        for (const LSTobj of Players) {
          const y = Number(LSTobj.GetColVal(IndexColTouched));
          const MateY = this.Mate(LSTobj.ident, Players.length);
          const YourMateClosed = MateY !== -1 ? Number(Players[MateY].GetColVal(IndexColTouched)) : 0;
          let overtouchedpts = overtouched * valueofsimplehit;

          if (this.GameOptions('Teaming') === 'True' && this.GameOptions('optioncutthroat') === 'True') {
            overtouchedpts = overtouchedpts / 2;
          }

          if (
            this.GameOptions('optioncutthroat') === 'True' &&
            ((y < 3 && this.GameOptions('Teaming') === 'False') ||
              (this.GameOptions('Teaming') === 'True' &&
                mate !== -1 &&
                Number(Players[mate].GetColVal(IndexColTouched)) >= 3 &&
                (y < 3 || YourMateClosed < 3)))
          ) {
            LSTobj.ModifyScore(overtouchedpts);
            if (this.GameOptions('Teaming') === 'True' && MateY !== -1) {
              Players[MateY].ModifyScore(overtouchedpts);
            }
            Players[actualplayer].DistribPoints += overtouchedpts;
            touchcount4total = true;
            PlayScored = true;
          } else if (
            this.GameOptions('optioncutthroat') === 'False' &&
            LSTobj.ident === Players[actualplayer].ident &&
            (this.GameOptions('Teaming') === 'False' ||
              (this.GameOptions('Teaming') === 'True' && mate !== -1 && Number(Players[mate].GetColVal(IndexColTouched)) >= 3))
          ) {
            let TotallyClosed = true;
            for (const LSTobj2 of Players) {
              const z = Number(LSTobj2.GetColVal(IndexColTouched));
              if (
                z < 3 &&
                (this.GameOptions('Teaming') === 'False' ||
                  (this.GameOptions('Teaming') === 'True' && LSTobj2.ident !== mate))
              ) {
                TotallyClosed = false;
              }
            }
            if (!TotallyClosed) {
              LSTobj.ModifyScore(overtouchedpts);
              if (this.GameOptions('Teaming') === 'True' && mate !== -1) {
                Players[mate].ModifyScore(overtouchedpts);
              }
              touchcount4total = true;
            }
          }

          if (
            !LSTobj.PayDrink &&
            LSTobj.score >= parseInt(this.GameOptions('drinkscore'), 10) &&
            this.GameOptions('optioncutthroat') === 'True'
          ) {
            LSTobj.PayDrink = true;
          }
        }
      }

      if (overtouched > 0 && touchcount4total) {
        Players[actualplayer].IncrementHits(overtouched);
        Players[actualplayer].roundhits += 1;
        PlayHit = true;
      }

      if (PlayScored || PlayOpen || PlayClosed || PlayHit) {
        this.myDisplay.Sound4Touch(hit);
      }
    } else if (this.GameOptions('optioncrazycutthroatmaster') === 'True') {
      const valueofsimplehit = this.ScoreMap['S' + hit.slice(1)] || 0;
      let TouchToAdd = 1;
      if (MultipleColumn === 'D') TouchToAdd = 2;
      else if (MultipleColumn === 'T') TouchToAdd = 3;
      Players[actualplayer].ModifyScore(TouchToAdd * valueofsimplehit);
    }

    Players[actualplayer].dartsthrown += 1;
    this.RefreshStats(Players, actualround);

    if (actualround >= parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1 && playerlaunch === this.nbdarts) {
      return_code = 2;
    }

    const winner = this.CheckWinner(Players);
    if (winner !== -1) {
      this.winner = winner;
      return_code = 3;
    }

    return return_code;
  }

  CheckWinner(Players) {
    let bestscoreid = -1;
    let ClosedCols = true;
    for (const ObjJoueur of Players) {
      if ((bestscoreid === -1 || ObjJoueur.score < Players[bestscoreid].score) && this.GameOptions('optioncutthroat') === 'True') {
        bestscoreid = ObjJoueur.ident;
      } else if ((bestscoreid === -1 || ObjJoueur.score > Players[bestscoreid].score) && this.GameOptions('optioncutthroat') === 'False') {
        bestscoreid = ObjJoueur.ident;
      }
    }
    if (bestscoreid === -1) return -1;
    for (const LSTColVal of Players[bestscoreid].LSTColVal) {
      if (Number(LSTColVal[0]) !== 3) {
        ClosedCols = false;
      }
    }
    return ClosedCols ? bestscoreid : -1;
  }

  RandomHeaderMaster(actualplayer, Players) {
    const totalCols = this.Headers.length;
    for (let x = 0; x < totalCols; x++) {
      const State = this.GetColumnState(actualplayer, Players, x);
      if (State < 3) {
        let randomisdone = false;
        while (!randomisdone) {
          const RandomNumber = LSTRandom[Math.floor(Math.random() * LSTRandom.length)];
          if (!this.Headers.includes(String(RandomNumber))) {
            this.Headers[x] = String(RandomNumber);
            randomisdone = true;
          }
        }
      }
    }
  }

  RandomHeader(actualplayer, Players, force = false) {
    const totalCols = this.Headers.length;
    for (let x = 0; x < totalCols; x++) {
      let randomize = false;
      const State = this.GetColumnState(actualplayer, Players, x);
      if (!force) {
        if (State === 2) randomize = true;
      } else {
        randomize = true;
      }
      if (randomize) {
        let randomisdone = false;
        while (!randomisdone) {
          const RandomNumber = LSTRandom[Math.floor(Math.random() * LSTRandom.length)];
          if (!this.Headers.includes(String(RandomNumber))) {
            this.Headers[x] = String(RandomNumber);
            randomisdone = true;
          }
        }
      }
    }
  }

  GetColumnState(actualplayer, Players, col) {
    let State = 1;
    let nbclosed = 0;
    for (const P of Players) {
      const val = Number(P.GetColVal(col));
      if (this.GameOptions('Teaming') === 'True') {
        const mate = this.Mate(P.ident, Players.length);
        if ((val === 1 || val === 2) && State !== 3) {
          State = 2;
        } else if (val === 3 && mate !== -1 && Number(Players[mate].GetColVal(col)) === 3) {
          State = 3;
          nbclosed += 1;
        }
      } else {
        if ((val === 1 || val === 2) && State !== 3) {
          State = 2;
        } else if (val === 3) {
          State = 3;
          nbclosed += 1;
        }
      }
    }
    if (nbclosed === Players.length) {
      State = 4;
    }
    return State;
  }

  PreDartsChecks(Players, actualround, actualplayer, playerlaunch) {
    this.TxtRecap = '';
    if (playerlaunch === 1 && actualround === 1 && actualplayer === 0) {
      for (const Player of Players) {
        for (let Column = 0; Column < Player.LSTColVal.length; Column++) {
          Player.LSTColVal[Column] = [0, 'leds', 'grey2'];
        }
      }
      if (this.GameOptions('optionhandicap') === 'True' && this.GameOptions('Teaming') === 'True') {
        this.CheckHandicap(Players);
      }
    }
    if (playerlaunch === 1) {
      Players[actualplayer].roundhits = 0;
      if (this.GameOptions('optionmaster') === 'True') {
        if (actualplayer === 0 && playerlaunch === 1) {
          this.RandomHeaderMaster(actualplayer, Players);
        }
      } else if (this.GameOptions('optioncrazy') === 'True') {
        if (actualround === 1 && actualplayer === 0 && playerlaunch === 1) {
          this.RandomHeader(actualplayer, Players, true);
        } else {
          this.RandomHeader(actualplayer, Players, false);
        }
      }
      if (this.GameOptions('optionmaster') === 'True' && actualplayer === 0 && playerlaunch === 1) {
        this.InitMasterRound(actualplayer, Players);
      }
      this.SaveTurn(Players);
    }
    return 0;
  }

  InitMasterRound(actualplayer, players) {
    const totalCols = this.Headers.length;
    for (let x = 0; x < totalCols; x++) {
      const state = this.GetColumnState(actualplayer, players, x);
      for (const P of players) {
        const colval = Number(P.GetColVal(x));
        if ((colval === 1 || colval === 2) && state !== 3) {
          P.InitCol(x);
        }
      }
    }
  }

  GetMissPenalty(Players, actualplayer, playerlaunch) {
    if (this.GameOptions('optioncrazycutthroatmaster') === 'True') {
      return 25;
    }
    return 0;
  }

  MissButtonPressed(Players, actualplayer, actualround, playerlaunch) {
    const pen = this.GetMissPenalty(Players, actualplayer, playerlaunch);
    if (pen > 0) {
      Players[actualplayer].ModifyScore(pen);
    }
    return super.MissButtonPressed(Players, actualplayer, actualround, playerlaunch);
  }

  NotFisnished(Players, actualplayer, actualround, playerlaunch) {
    if (this.GameOptions('optionmaster') === 'True' && playerlaunch <= this.nbdarts) {
      Players[actualplayer].ModifyScore(25 * (this.nbdarts + 1 - playerlaunch));
    }
    return null;
  }

  EarlyPlayerButton(Players, actualplayer, actualround) {
    const winner = this.CheckWinner(Players);
    if (winner !== -1) {
      this.winner = winner;
      return 3;
    }
    if (actualround === parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1) {
      return 2;
    }
    return 1;
  }

  RefreshStats(Players, actualround) {
    for (const P of Players) {
      const hasStarted = P.hits > 0 || P.TotalPoints > 0 || P.score > 0;
      P.Stats.MPR = hasStarted ? P.ShowMPR() : 0.0;
      P.Stats['Marks Per Round'] = P.Stats.MPR;
      P.Stats['Hits per round'] = hasStarted ? P.HitsPerRound(actualround) : 0.0;
      P.Stats.GiveOut = P.DistribPoints;
      if (this.winner === P.ident) {
        P.Stats['Least Rounds'] = actualround;
      }
    }
  }

  DefineNextGameOrder(Players) {
    const cut = this.GameOptions('optioncutthroat') === 'True';
    return [...Players]
      .sort((a, b) => (cut ? b.score - a.score : a.score - b.score))
      .map(p => p.PlayerName);
  }

  Mate(actualplayer, nbplayers) {
    if (this.GameOptions('Teaming') === 'True') {
      const half = Math.trunc(nbplayers / 2);
      return actualplayer < half ? actualplayer + half : actualplayer - half;
    }
    return -1;
  }

  CheckHandicap(Players) {
    if (Players.length !== 4) return false;
    const LSTmpr = Players.map(p => (this.Scores ? this.Scores.getPlayerHandicapStat(p.PlayerName, 'MPR') : 0.0));
    const LSThandimarks = this.Handicap.FindCricketHandicap(LSTmpr);
    const maxid = this.Handicap.ReturnMaxid();

    for (let column = 0; column <= this.nbcol; column++) {
      const marks = LSThandimarks[column] || 0;
      for (let h = 0; h < marks; h++) {
        if (maxid === 0) {
          Players[1].IncrementColTouch(column);
          Players[3].IncrementColTouch(column);
        } else {
          Players[0].IncrementColTouch(column);
          Players[2].IncrementColTouch(column);
        }
      }
    }
    return true;
  }
}

