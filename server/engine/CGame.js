export class CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOpts, Config, Logs, Scores = null) {
    this.Logs = Logs;
    this.GameOpts = { ...GameOpts };
    this.GameChoice = GameChoice;
    this.nbplayers = nbplayers;
    this.Config = Config;
    this.myDisplay = myDisplay;
    this.Scores = Scores;
    this.TxtRecap = '';
    this.nbcol = 6;
    this.ScoreMap = { ...this.Config.DefaultScoreMap };
    this.winner = -1;
    this.BackUpPlayer = null;
    this.PreviousBackUpPlayer = null;
  }

  PreDartsChecks(players, actualround, actualplayer, playerlaunch) {
    this.TxtRecap = '';
    if (playerlaunch === 1) {
      this.SaveTurn(players);
    }
    return 0;
  }

  PostDartsChecks(hit, players, actualround, actualplayer, playerlaunch) {
    const pts = this.ScoreMap[hit] || 0;
    players[actualplayer].ModifyScore(pts);
    players[actualplayer].TotalPoints += pts;
    players[actualplayer].LSTColVal[playerlaunch - 1] = [pts, 'txt', null];
    players[actualplayer].IncrementHits(hit);
    players[actualplayer].dartsthrown += 1;
    this.myDisplay.Sound4Touch(hit);
    this.RefreshStats(players, actualround);
    return 0;
  }

  GameStats(Players, actualround, Scores = false) {
    this.RefreshStats(Players, actualround);
    if (Scores && this.GameRecords) {
      for (const GS of Object.keys(this.GameRecords)) {
        for (const P of Players) {
          const hasScored = P.TotalPoints > 0 || P.hits > 0 || (P.score > 0 && !this.GameOpts?.startingat);
          if (!hasScored) continue;

          const numVal = parseFloat(P.Stats[GS] ?? 0);
          if (numVal <= 0 && this.GameRecords[GS] === 'ASC') {
            continue;
          }

          const data = {
            gamename: this.GameChoice,
            gameoptions: this.GameOpts,
            scorename: GS,
            score: String(P.Stats[GS] ?? 0),
            playername: P.PlayerName
          };
          try {
            Scores.AddScore(data);
          } catch (err) {
            this.Logs.Log('ERROR', `Error inserting data into local database: ${err.message}`);
            return false;
          }
        }
      }
    }
    return true;
  }

  SaveTurn(Players) {
    if (this.BackUpPlayer) {
      this.PreviousBackUpPlayer = this.BackUpPlayer.map(p => p.clone());
    } else {
      this.PreviousBackUpPlayer = Players.map(p => p.clone());
    }
    this.BackUpPlayer = Players.map(p => p.clone());
  }

  NotFisnished(Players, actualplayer, actualround, playerlaunch) {
    return null;
  }

  EarlyPlayerButton(Players, actualplayer, actualround) {
    if (actualround === parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1) {
      return 2;
    }
    return 1;
  }

  GetMissPenalty(Players, actualplayer, playerlaunch) {
    return 0;
  }

  MissButtonPressed(Players, actualplayer, actualround, playerlaunch) {
    Players[actualplayer].dartsthrown += 1;
    this.RefreshStats(Players, actualround);
    if (actualround >= parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1 && playerlaunch === parseInt(this.nbdarts, 10)) {
      return 2;
    }
    return 0;
  }

  RefreshStats(Players, actualround) {
    // Overridden by each game
  }

  DefineNextGameOrder(Players) {
    return [...Players]
      .sort((a, b) => a.score - b.score)
      .map(p => p.PlayerName);
  }

  CheckHandicap(Players) {
    return null;
  }
}

