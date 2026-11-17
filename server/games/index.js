import * as Ho_One from './Ho_One.js';
import * as Cricket from './Cricket.js';
import * as Practice from './Practice.js';
import * as Kinito from './Kinito.js';
import * as By_Fives from './By_Fives.js';
import * as Game321_Zlip from './321_Zlip.js';
import { lang } from '../locale.js';

export const GAMES_REGISTRY = {
  Ho_One: {
    id: 'Ho_One',
    title: 'X01 Séries',
    category: 'Compétition Pro',
    badge: 'Populaire',
    badgeMain: '4 VARIANTES',
    badgeSub: 'Sub-Deck >>',
    glyphIcon: 'sports_score',
    glyphCode: 'X01',
    glow: 'neon',
    module: Ho_One,
    hasVariants: true,
    hasSettings: true,
    actionType: 'choose',
    actionLabel: 'CHOISIR',
    configurableKeys: ['double_in', 'double_out', 'split_bull', 'equal', 'max_round'],
    variants: [
      { id: '301', title: '301', subtitle: 'RAPIDE & CLASSIQUE', options: { startingat: '301' }, glow: 'neon', badge: 'POPULAIRE' },
      { id: '501', title: '501', subtitle: 'STANDARD COMPÉTITION', options: { startingat: '501' }, glow: 'neon', badge: 'PRO WDF' },
      { id: '701', title: '701', subtitle: 'ENDURANCE MOYENNE', options: { startingat: '701' }, glow: 'cyan', badge: 'CLUB' },
      { id: '1001', title: '1001', subtitle: 'MARATHON PRÉCISION', options: { startingat: '1001' }, glow: 'amber', badge: 'MARATHON' }
    ]
  },
  Cricket: {
    id: 'Cricket',
    title: 'Cricket',
    category: 'Classique & Tactique',
    badge: 'Incontournable',
    badgeMain: '4 VARIANTES',
    badgeSub: 'Pack Arcadia',
    glyphIcon: 'radar',
    glyphCode: 'CRK',
    glow: 'cyan',
    module: Cricket,
    hasVariants: true,
    hasSettings: true,
    actionType: 'choose',
    actionLabel: 'CHOISIR',
    configurableKeys: ['max_round'],
    variants: [
      { id: 'standard', title: 'CRICKET STANDARD', subtitle: 'FERMETURE 15 À 20 + BULL', options: { optioncutthroat: 'False', optioncrazy: 'False', optioncrazycutthroatmaster: 'False' }, glow: 'cyan', badge: 'OFFICIEL' },
      { id: 'cutthroat', title: 'CUT-THROAT', subtitle: 'POINTS ATTRIBUÉS AUX ADVERSAIRES', options: { optioncutthroat: 'True', optioncrazy: 'False', optioncrazycutthroatmaster: 'False' }, glow: 'crimson', badge: 'COMPÉTITION' },
      { id: 'crazy', title: 'CRAZY CRICKET', subtitle: 'SECTEURS ALÉATOIRES À CHAQUE TOUR', options: { optioncutthroat: 'False', optioncrazy: 'True', optioncrazycutthroatmaster: 'False' }, glow: 'amber', badge: 'ALÉATOIRE' },
      { id: 'crazymaster', title: 'CRAZY MASTER', subtitle: 'SECTEURS ALÉATOIRES + CUT-THROAT TOTAL', options: { optioncutthroat: 'True', optioncrazy: 'True', optioncrazycutthroatmaster: 'True' }, glow: 'crimson', badge: 'EXPERT' }
    ]
  },
  Kinito: {
    id: 'Kinito',
    title: 'Kinito',
    category: 'Soirée / Stratégie',
    badge: 'Défi',
    badgeMain: 'ACTION DIRECTE',
    badgeSub: 'Défi 21',
    glyphIcon: 'casino',
    glyphCode: 'KIN',
    glow: 'amber',
    module: Kinito,
    hasVariants: false,
    hasSettings: true,
    actionType: 'play',
    actionLabel: 'JOUER',
    configurableKeys: ['max_round'],
    variants: []
  },
  '321_Zlip': {
    id: '321_Zlip',
    title: '321 Zlip',
    category: 'Soirée / Fun',
    badge: 'Fun',
    badgeMain: 'ACTION DIRECTE',
    badgeSub: 'Zlip Attack',
    glyphIcon: 'local_fire_department',
    glyphCode: '321',
    glow: 'crimson',
    module: Game321_Zlip,
    hasVariants: false,
    hasSettings: true,
    actionType: 'play',
    actionLabel: 'JOUER',
    configurableKeys: ['max_round'],
    variants: []
  },
  By_Fives: {
    id: 'By_Fives',
    title: 'Par Cinq',
    category: 'Calcul & Multiples',
    badge: 'Direct',
    badgeMain: 'ZÉRO CONFIG',
    badgeSub: 'Auto-Start',
    glyphIcon: 'calculate',
    glyphCode: '5X',
    glow: 'cyan',
    module: By_Fives,
    hasVariants: false,
    hasSettings: false,
    actionType: 'play',
    actionLabel: 'JOUER',
    configurableKeys: [],
    variants: []
  },
  Practice: {
    id: 'Practice',
    title: 'Entraînement',
    category: 'Précision Solo',
    badge: 'Training',
    badgeMain: 'ACTION DIRECTE',
    badgeSub: 'Warmup',
    glyphIcon: 'track_changes',
    glyphCode: 'PRC',
    glow: 'neon',
    module: Practice,
    hasVariants: false,
    hasSettings: true,
    actionType: 'play',
    actionLabel: 'JOUER',
    configurableKeys: ['max_round'],
    variants: []
  }
};

export function getGamesList(config) {
  return Object.values(GAMES_REGISTRY).map(entry => {
    const mod = entry.module;
    const defaultOpts = { ...mod.GameOpts };
    const savedOpts = config?.data?.[entry.id] || {};
    const mergedOpts = { ...defaultOpts, ...savedOpts };

    const allowedKeys = entry.configurableKeys || Object.keys(mergedOpts);
    const optionsMeta = Object.entries(mergedOpts)
      .filter(([optKey]) => allowedKeys.includes(optKey))
      .map(([optKey, optVal]) => {
        const strVal = String(optVal);
        const isBool = strVal === 'True' || strVal === 'False' || typeof optVal === 'boolean';
        return {
          key: optKey,
          label: lang(`${entry.id}-${optKey}`, optKey),
          type: isBool ? 'boolean' : 'number',
          defaultValue: isBool ? strVal === 'True' || optVal === true : Number(optVal),
          rawDefault: strVal
        };
      });

    return {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      badge: entry.badge,
      badgeMain: entry.badgeMain,
      badgeSub: entry.badgeSub,
      glyphIcon: entry.glyphIcon,
      glyphCode: entry.glyphCode,
      glow: entry.glow,
      hasVariants: entry.hasVariants,
      hasSettings: entry.hasSettings,
      actionType: entry.actionType,
      actionLabel: entry.actionLabel,
      variants: entry.variants,
      description: lang(`Description-${entry.id}`),
      nbdarts: mod.nbdarts,
      headers: mod.Headers,
      records: mod.GameRecords,
      options: optionsMeta,
      defaultOpts: mergedOpts
    };
  });
}

