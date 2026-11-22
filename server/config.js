import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_DATA_DIR = path.join(ROOT_DIR, 'data');

export const DARTOTRON_VERSION = '1.0.0';

export const DEFAULT_SCORE_MAP = {
  SB: 25, DB: 50,
  S20: 20, D20: 40, T20: 60,
  S19: 19, D19: 38, T19: 57,
  S18: 18, D18: 36, T18: 54,
  S17: 17, D17: 34, T17: 51,
  S16: 16, D16: 32, T16: 48,
  S15: 15, D15: 30, T15: 45,
  S14: 14, D14: 28, T14: 42,
  S13: 13, D13: 26, T13: 39,
  S12: 12, D12: 24, T12: 36,
  S11: 11, D11: 22, T11: 33,
  S10: 10, D10: 20, T10: 30,
  S9: 9, D9: 18, T9: 27,
  S8: 8, D8: 16, T8: 24,
  S7: 7, D7: 14, T7: 21,
  S6: 6, D6: 12, T6: 18,
  S5: 5, D5: 10, T5: 15,
  S4: 4, D4: 8, T4: 12,
  S3: 3, D3: 6, T3: 9,
  S2: 2, D2: 4, T2: 6,
  S1: 1, D1: 2, T1: 3
};

export const ORDERED_DART_KEYS = [
  'S20', 'S1', 'S18', 'S4', 'S13', 'S6', 'S10', 'S15', 'S2', 'S17',
  'S3', 'S19', 'S7', 'S16', 'S8', 'S11', 'S14', 'S9', 'S12', 'S5',
  'D20', 'D1', 'D18', 'D4', 'D13', 'D6', 'D10', 'D15', 'D2', 'D17',
  'D3', 'D19', 'D7', 'D16', 'D8', 'D11', 'D14', 'D9', 'D12', 'D5',
  'T20', 'T1', 'T18', 'T4', 'T13', 'T6', 'T10', 'T15', 'T2', 'T17',
  'T3', 'T19', 'T7', 'T16', 'T8', 'T11', 'T14', 'T9', 'T12', 'T5',
  'SB', 'DB',
  'PLAYERBUTTON', 'GAMEBUTTON', 'BACKUPBUTTON', 'EXTRABUTTON', 'MISSDART'
];

export const DEFAULT_CONFIG = {
  SectionGlobals: {
    serialport: '/dev/ttyACM0',
    serialspeed: 9600,
    releasedartstime: 10000,
    soundvolume: 100,
    debuglevel: 2,
    locale: 'fr',
    onscreenbuttons: true,
    autoupdate: false
  },
  SectionAdvanced: {
    noserial: false,
    'bypass-stats': false,
    localplayers: 'Joueur 1,Joueur 2',
    knownplayers: 'Joueur 1,Joueur 2,Joueur 3,Joueur 4',
    selectedgame: 'Ho_One'
  },
  SectionKeys: Object.fromEntries(ORDERED_DART_KEYS.map(k => [k, '']))
};

export class CConfig {
  constructor(customDataDir = null) {
    this.pathDir = customDataDir || process.env.DARTOTRON_DATA_DIR || DEFAULT_DATA_DIR;
    this.ensureDir();
    this.jsonFile = path.join(this.pathDir, 'dartotron.json');

    this.DefaultScoreMap = { ...DEFAULT_SCORE_MAP };
    this.OrderedDartKeys = [...ORDERED_DART_KEYS];
    this.dartotronVersion = DARTOTRON_VERSION;

    this.data = structuredClone(DEFAULT_CONFIG);
    this.configFileExists = false;

    this.load();
  }

  ensureDir() {
    if (!fs.existsSync(this.pathDir)) {
      fs.mkdirSync(this.pathDir, { recursive: true });
    }
  }

  load() {
    this.ensureDir();
    if (fs.existsSync(this.jsonFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.jsonFile, 'utf-8'));
        for (const [sec, vals] of Object.entries(parsed)) {
          if (!this.data[sec]) this.data[sec] = {};
          Object.assign(this.data[sec], vals);
        }
        this.configFileExists = true;
      } catch (err) {
        console.error('[Config] Erreur lecture dartotron.json:', err.message);
      }
    }

    // Migration: si releasedartstime est absent ou inférieur à 3000ms (ex: ancienne valeur de 1800ms)
    if (this.data.SectionGlobals) {
      const currentRelease = Number(this.data.SectionGlobals.releasedartstime);
      if (isNaN(currentRelease) || currentRelease < 3000) {
        this.data.SectionGlobals.releasedartstime = 10000;
      }
      if (this.data.SectionGlobals.locale === 'fr_FR') {
        this.data.SectionGlobals.locale = 'fr';
      }
    }

    // Normaliser SectionKeys en majuscules
    if (this.data.SectionKeys) {
      const normalized = {};
      for (const k of ORDERED_DART_KEYS) {
        normalized[k] = '';
      }
      for (const [k, v] of Object.entries(this.data.SectionKeys)) {
        if (v !== undefined && v !== null) {
          normalized[k.toUpperCase()] = String(v);
        }
      }
      this.data.SectionKeys = normalized;
    }
  }

  save() {
    this.ensureDir();
    fs.writeFileSync(this.jsonFile, JSON.stringify(this.data, null, 2), 'utf-8');
    this.configFileExists = true;
  }

  GetValue(section, key, req = false) {
    if (this.data[section] && key in this.data[section]) {
      return this.data[section][key];
    }
    if (DEFAULT_CONFIG[section] && key in DEFAULT_CONFIG[section]) {
      return DEFAULT_CONFIG[section][key];
    }
    return false;
  }

  SetValue(section, key, value) {
    if (!this.data[section]) this.data[section] = {};
    this.data[section][key] = value;
  }

  updateKeys(newKeys) {
    if (!this.data.SectionKeys) this.data.SectionKeys = {};
    for (const [k, v] of Object.entries(newKeys)) {
      this.data.SectionKeys[k.toUpperCase()] = String(v ?? '');
    }
    this.save();
  }

  isCalibrated() {
    const keys = this.data.SectionKeys || {};
    return Object.values(keys).some(v => v && String(v).length > 0);
  }
}
