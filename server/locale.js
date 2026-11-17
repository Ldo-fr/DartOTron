// -*- coding: utf-8 -*-
// Traductions françaises complètes et enrichissements UI DartOTron

export const FR_LOCALE = {
  // Général & Menus
  'Welcome': 'Bienvenue',
  'game-list': 'Merci de choisir un jeu',
  'game-options': 'Options du jeu',
  'game-options-binary': 'Personnalisez les paramètres de la partie',
  'players-names': 'Joueurs de la partie',
  'players-names-subtitle': 'Ajoutez, supprimez ou mélangez les joueurs avant de lancer',
  'press-player': 'Appuyez sur le bouton Player',
  'release-darts': 'Retirez les flèches',
  'release-darts-and-press-player': 'Retirez les flèches et appuyez sur le bouton "Player"',
  'game-stats': 'Statistiques de la partie',
  'get-ready': 'Prêt ?',
  'game-no-desc': 'Pas de description',
  'game-type': 'Bienvenue ! Merci de sélectionner votre type de partie',
  'game-type-local': 'Partie locale',
  'serial-issue-1': "Impossible d'ouvrir le port série",
  'serial-issue-2': 'Ce jeu nécessite une cible USB compatible DartOTron',
  'serial-issue-3': 'Vérifiez le branchement de votre Arduino ou les paramètres',
  'last-round-reached': 'Dernier tour atteint...',
  'hi-score': 'Meilleur score',
  'remaining-darts': 'Fléchettes',
  'round': 'Tour',
  'over': 'sur',
  'exit': 'Quitter',
  'start-again': 'Recommencer',
  'Player': 'Joueur',
  'select-port': 'Plusieurs ports utilisables ont été détectés',
  'select-port-subtxt': 'Merci de sélectionner le port série de votre cible Arduino',
  'board-calibration': 'Calibrage de la cible !',
  'press-on-parts': 'Appuyez un à un sur chaque segment de la cible (Échap : précédent, Espace : passer, Entrée : enregistrer)',
  'left': 'Reste',
  'press-on': 'Appuyez sur',
  'Ok': 'Ok',
  'Next': 'Suivant',
  'Previous': 'Précédent',
  'Refresh': 'Rafraîchir',
  'Game type': 'Type de partie',
  'Game name': 'Nom de partie',
  'this-game-stats': 'Records de cette partie',
  'local-db-stats': 'Tableau général des records (Hall of Fame)',
  'ranking': 'Rang',
  'Date': 'Date',
  'Points Per Dart': 'Points Par Flèche (PPD)',
  'Points Per Round': 'Points Par Tour (PPR)',
  'Score': 'Score',
  'Score Per Round': 'Score Par Tour',
  'Hits per round': 'Touches par tour',
  'MPR': 'Touches Par Tour (MPR)',
  'GiveOut': 'Points distribués',
  'Reached Score': 'Cible atteinte',
  'Hits': 'Touches',
  'Zlips': 'Zlips réalisés',
  'Zlipped': 'Fois Zlippé',
  'Game interrupted': 'Partie interrompue',
  'Missed !': 'Raté !',
  'Missed': 'Flèche ratée',
  'Exit': 'Abandonner',
  'Backup': 'Tour précédent',
  'Next Player': 'Joueur Suivant',
  'Backup Turn !': 'Retour au tour précédent !',
  'Please wait': 'Merci de patienter',

  // Descriptions des 12 jeux (+ Sample_game)
  'Description-Ho_One':
    "Le fameux 301, 501, 701 ou 1001 !\n" +
    "Choisissez le score de départ à atteindre.\n" +
    "Le premier joueur à arriver exactement à zéro remporte la partie.\n" +
    "Si vous dépassez zéro, votre score revient à celui du début du tour.",

  'Description-Cricket':
    "Le grand classique du Cricket !\n" +
    "Touchez 3 fois chaque chiffre (15 à 20 + Bull) pour l'ouvrir et marquer des points.\n" +
    "Option Cut-Throat : donnez les points aux adversaires qui n'ont pas fermé !\n" +
    "Option Crazy : les chiffres ouverts changent aléatoirement à chaque tour !",

  'Description-Practice':
    "Entraînez-vous à viser les cibles demandées par l'ordinateur à chaque tour !\n" +
    "En mode normal, touchez simplement le chiffre demandé.\n" +
    "En mode Master, vous devrez viser précisément Simple, Double ou Triple !",

  'Description-Kinito':
    "Partez de 0 et atteignez 210 points.\n" +
    "Règle d'or : ne faites jamais un score inférieur au contrat minimum laissé par le joueur précédent !\n" +
    "Si vous tapez le score Kinito (21 ou T7), une cible bonus s'affiche sur vos adversaires :\n" +
    "touchez-la pour diviser leur score par deux !",

  'Description-By_Fives':
    "Faites en sorte que le total de vos 3 fléchettes du tour soit un multiple de 5 !\n" +
    "Si le total du tour est divisible par 5 (5, 10, 15, 20... 180), vous marquez 1 point.\n" +
    "Sinon, aucun point n'est compté ce tour-ci.\n" +
    "Le premier joueur à atteindre le score de fin gagne !",

  'Description-321_Zlip':
    "Un 301 inversé ultra fun et impitoyable !\n" +
    "Partez de 0 pour atteindre exactement 321 points.\n" +
    "Si vous tombez pile sur le score d'un adversaire, il est ZLIPPÉ et retombe à zéro !\n" +
    "Avec l'option Master ou Advanced, vous devez avoir zlippé au moins une fois pour pouvoir gagner.",

  // Options des jeux
  'Ho_One-startingat': 'Score de départ (301, 501, 701...)',
  'Ho_One-max_round': 'Nombre de tours max',
  'Ho_One-double_in': 'Double In (ouverture par un Double)',
  'Ho_One-double_out': 'Double Out (fermeture par un Double)',
  'Ho_One-master_in': 'Master In (ouverture Double/Triple/Bull)',
  'Ho_One-master_out': 'Master Out (fermeture Double/Triple/Bull)',
  'Ho_One-split_bull': 'Bull séparé (Simple Bull = 25 / Double = 50)',
  'Ho_One-equal': 'Égalité / Rattrapage (même nombre de fléchettes)',
  'Ho_One-startpercent': 'Ratio Handicap (%)',
  'Ho_One-noout': 'Pénalité flèche non jouée (+25 pts)',
  'Ho_One-league': 'Mode League (Freeze + Handicap, 4 joueurs)',

  'Cricket-max_round': 'Nombre de tours max',
  'Cricket-optioncrazy': 'Mode Crazy (chiffres aléatoires)',
  'Cricket-optioncutthroat': 'Mode Cut-Throat (points aux adversaires)',
  'Cricket-drinkscore': 'Score "Paye ton coup !" (Cut-Throat)',
  'Cricket-Teaming': 'Mode Équipe (4 joueurs minimum, pair)',
  'Cricket-optionteamscore': 'Marques partagées en équipe',
  'Cricket-optionhandicap': 'Handicap automatique (4 joueurs)',
  'Cricket-optionmaster': 'Mode Master (remise à zéro des non-fermés)',
  'Cricket-optioncrazycutthroatmaster': 'Mode Crazy Master Cut-Throat Total !',

  'Practice-max_round': 'Nombre de tours',
  'Practice-master': 'Mode Master (impose Simple/Double/Triple)',

  'Kinito-max_round': 'Nombre de tours max',
  'Kinito-winscore': 'Score de victoire',
  'Kinito-kinito': 'Score Kinito spécial',
  'Kinito-master': 'Mode Master (score exact requis)',

  'By_Fives-winscore': 'Score de victoire (points)',
  'By_Fives-startingat': 'Score de victoire (points)',

  '321_Zlip-max_round': 'Nombre de tours max',
  '321_Zlip-advanced': 'Mode Advanced (321 sans Zlip = Zlip gratuit)',
  '321_Zlip-master': 'Mode Master (Zlip obligatoire avant 321)'
};

export function lang(key, fallback = null) {
  if (key in FR_LOCALE) return FR_LOCALE[key];
  return fallback !== null ? fallback : key;
}

