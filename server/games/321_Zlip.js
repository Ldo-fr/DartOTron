import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';

const WinTotal = 321;
export const Headers = ['D1', 'D2', 'D3', 'Zlip'];
export const GameOpts = {
  max_round: '10'
};
export const nbdarts = 3;
export const GameRecords = {
  Zlips: 'DESC',
  Zlipped: 'ASC'
};

export class CPlayerExtended extends CPlayer {
  constructor(x, nbjoueurs, Config) {
    super(x, nbjoueurs, Config);
    this.havezapped = 0;
    this.x = x;
    this.nbzapped = 0;
    for (const GR of Object.keys(GameRecords)) {
      this.Stats[GR] = '0';
    }
  }

  Zap(Display_Zlip = false) {
    this.havezapped += 1;
    if (Display_Zlip) {
      this.LSTColVal[3] = ['ZLIP', 'txt', 'yellow'];
    }
  }

  GetZap() {
    return this.havezapped;
  }

  SetZapped() {
    this.nbzapped += 1;
  }

  GetZapped() {
    return this.nbzapped;
  }
}

export class Game extends CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores) {
    super(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores);
    this.nbdarts = nbdarts;
    this.GameRecords = { ...GameRecords };
    this.Headers = [...Headers];
    this.ScoreMap.SB = 50;
    this.maxround = parseInt(this.GameOpts.max_round, 10) || 10;
  }

  PreDartsChecks(Players, actualround, actualplayer, playerlaunch) {
    this.playerlaunch = playerlaunch;

    if (playerlaunch === 1) {
      this.SaveTurn(Players);
    }

    for (let i = playerlaunch; i < 4; i++) {
      Players[actualplayer].LSTColVal[i - 1] = ['', 'txt', null];
    }

    for (const LSTobj of Players) {
      if (playerlaunch === 1 || LSTobj.ident !== actualplayer) {
        LSTobj.LSTColVal[0] = ['', 'txt', null];
        LSTobj.LSTColVal[1] = ['', 'txt', null];
        LSTobj.LSTColVal[2] = ['', 'txt', null];
      }
      if (LSTobj.score > Players[actualplayer].score && LSTobj.ident !== actualplayer) {
        const DiffScore = LSTobj.score - Players[actualplayer].score;
        const ZapList = this.SearchZap(DiffScore);
        if (ZapList.length >= 1) LSTobj.LSTColVal[0] = [ZapList[0], 'int', 'green'];
        if (ZapList.length >= 2) LSTobj.LSTColVal[1] = [ZapList[1], 'int', 'green'];
        if (ZapList.length >= 3) LSTobj.LSTColVal[2] = [ZapList[2], 'int', 'green'];
      } else if (LSTobj.ident !== actualplayer) {
        const ScoreUp = WinTotal - Players[actualplayer].score;
        const ScoreDown = WinTotal - LSTobj.score;
        const ZapList = this.SearchZap(ScoreUp, ScoreDown);
        if (ZapList.length >= 1) LSTobj.LSTColVal[0] = [ZapList[0], 'int', 'purple'];
        if (ZapList.length >= 2) LSTobj.LSTColVal[1] = [ZapList[1], 'int', 'purple'];
        if (ZapList.length >= 3) LSTobj.LSTColVal[2] = [ZapList[2], 'int', 'purple'];
      }
    }

    if (
      Players[actualplayer].GetZap() > 0 ||
      (String(this.GameOpts.master) === 'False' && String(this.GameOpts.advanced) === 'False')
    ) {
      const DiffScore = WinTotal - Players[actualplayer].score;
      const ZapList = this.SearchZap(DiffScore);
      if (ZapList.length >= 1) Players[actualplayer].LSTColVal[playerlaunch - 1] = [ZapList[0], 'int', 'red'];
      if (ZapList.length >= 2) Players[actualplayer].LSTColVal[playerlaunch] = [ZapList[1], 'int', 'red'];
      if (ZapList.length >= 3) Players[actualplayer].LSTColVal[playerlaunch + 1] = [ZapList[2], 'int', 'red'];
    }

    return 0;
  }

  PostDartsChecks(key, Players, actualround, actualplayer, playerlaunch) {
    let BlinkText = '';
    let return_code = 0;
    const hitPts = this.ScoreMap[key] || 0;
    const currentScore = Players[actualplayer].ModifyScore(0);

    Players[actualplayer].LSTColVal[playerlaunch - 1] = [hitPts, 'txt', null];

    if (currentScore + hitPts > WinTotal) {
      let NewScore = WinTotal - currentScore;
      NewScore = hitPts - NewScore;
      NewScore = WinTotal - NewScore;
      Players[actualplayer].SetScore(NewScore);
      BlinkText = 'Trop haut !';
      this.myDisplay.PlaySound('fail');
      return_code = 1;
    } else if (currentScore + hitPts === WinTotal) {
      Players[actualplayer].IncrementHits(key);
      if (Players[actualplayer].GetZap() === 0 && String(this.GameOpts.master) === 'True') {
        BlinkText = 'Vous devez Zlipper un joueur avant de gagner !';
        this.myDisplay.PlaySound('fail');
        Players[actualplayer].SetScore(0);
        return_code = 1;
      } else if (Players[actualplayer].GetZap() === 0 && String(this.GameOpts.advanced) === 'True') {
        BlinkText = 'Zlip gratuit gagné ! Retour à 0 !';
        this.myDisplay.PlaySound('fail');
        Players[actualplayer].SetScore(0);
        Players[actualplayer].Zap(true);
        return_code = 1;
      } else {
        this.myDisplay.PlaySound('victory');
        BlinkText = `${Players[actualplayer].PlayerName} gagne avec ${Players[actualplayer].GetZap()} zlip(s) !`;
        this.winner = Players[actualplayer].ident;
        Players[actualplayer].ModifyScore(hitPts);
        Players[actualplayer].TotalPoints += hitPts;
        Players[actualplayer].IncrementHits(key);
        return_code = 3;
      }
    } else {
      this.myDisplay.Sound4Touch(key);
      Players[actualplayer].TotalPoints += hitPts;
      Players[actualplayer].IncrementHits(key);
      Players[actualplayer].ModifyScore(hitPts);
    }

    for (const LSTobj of Players) {
      if (
        LSTobj.score === Players[actualplayer].score &&
        LSTobj.ident !== Players[actualplayer].ident &&
        Players[actualplayer].score > 0
      ) {
        LSTobj.SetScore(0);
        BlinkText = 'ZLIPPÉ !';
        if (String(this.GameOpts.master) === 'True' || String(this.GameOpts.advanced) === 'True') {
          Players[actualplayer].Zap(true);
        } else {
          Players[actualplayer].Zap();
        }
        LSTobj.SetZapped();
        this.myDisplay.PlaySound('fail');
      }
    }

    if (BlinkText !== '') {
      this.myDisplay.InfoMessage([BlinkText], null, null, 'middle', 'big');
    }

    Players[actualplayer].dartsthrown += 1;
    this.RefreshStats(Players, actualround);

    if (
      actualround >= parseInt(this.maxround, 10) &&
      actualplayer === this.nbplayers - 1 &&
      playerlaunch === this.nbdarts &&
      return_code !== 3
    ) {
      return_code = 2;
    }

    return return_code;
  }

  SearchZap(ScoreUp, ScoreDown = 0) {
    const total = ScoreUp + ScoreDown;
    const entries = Object.entries(this.ScoreMap);

    for (const [Hit, DicKey] of entries) {
      if (total === DicKey) return [Hit];
    }

    if (this.playerlaunch === 2 || this.playerlaunch === 1) {
      for (const [Hit, DicKey] of entries) {
        if (total > DicKey && DicKey < ScoreUp) {
          const firstrest = total - DicKey;
          for (const [Hit2, DicKey2] of entries) {
            if (firstrest === DicKey2) return [Hit, Hit2];
          }
        }
      }
    }

    if (this.playerlaunch === 1) {
      for (const [Hit, DicKey] of entries) {
        if (total > DicKey && DicKey < ScoreUp) {
          const firstrest = total - DicKey;
          for (const [Hit3, DicKey3] of entries) {
            if (firstrest > DicKey3 && DicKey + DicKey3 < ScoreUp) {
              const secondrest = firstrest - DicKey3;
              for (const [Hit4, DicKey4] of entries) {
                if (secondrest === DicKey4) return [Hit, Hit3, Hit4];
              }
            }
          }
        }
      }
    }

    return [];
  }

  RefreshStats(Players, actualround) {
    for (const P of Players) {
      P.Stats.Zlips = P.havezapped;
      P.Stats.Zlipped = P.nbzapped;
      P.Stats['Points Per Round'] = P.TotalPoints > 0 ? P.AVG(actualround) : 0.0;
    }
  }
}

