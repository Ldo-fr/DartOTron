/**
 * DartOTron Unified Arduino Firmware
 * -------------------------------------------------------------
 * Firmware officiel pour cible de fléchettes électronique DartOTron.
 *
 * Fonctionnement :
 *  1. Scanne la matrice de contact de la cible (Lignes x Colonnes).
 *  2. Détecte la fermeture d'un contact lors de l'impact d'une flèche.
 *  3. Envoie un caractère ASCII unique sur le port série USB (9600 bauds).
 *  4. Supporte également des boutons physiques directs (Changement de joueur, Annulation, Abandon).
 *
 * Compatible avec :
 *  - Arduino Uno R3 / Nano / Pro Mini (ATmega328P)
 *  - Arduino Mega 2560 (pour les matrices plus larges ex: 4x16, 8x16)
 *  - Clones USB CH340 / CP2102 / FTDI
 */

// =============================================================
// 1. CONFIGURATION MATRICIELLE (CHOISISSEZ VOTRE PRESET)
// =============================================================

// --- PRESET A : Cible Standard 8x8 (Arduino Uno / Nano) [PAR DÉFAUT] ---
// La plupart des cibles grand public (Decathlon Canaveral, Carromco, Harrows).
#define PRESET_STANDARD_8X8

#if defined(PRESET_STANDARD_8X8)
const byte NUM_ROWS = 8;
const byte NUM_COLS = 8;
const unsigned long DEBOUNCE_DELAY_MS = 80;

const byte rowPins[NUM_ROWS] = {A0, A1, A2, A3, A4, A5, 2, 3};
const byte colPins[NUM_COLS] = {4, 5, 6, 7, 8, 9, 10, 11};

const char keymap[NUM_ROWS][NUM_COLS] = {
  {'0','1','2','3','4','5','6','7'},
  {'8','9','a','b','c','d','e','f'},
  {'g','h','i','j','k','l','m','n'},
  {'o','p','q','r','s','t','u','v'},
  {'w','x','y','z','A','B','C','D'},
  {'E','F','G','H','I','J','K','L'},
  {'M','N','O','P','Q','R','S','T'},
  {'U','V','W','X','Y','Z','+','-'}
};
#endif

// --- PRESET B : Grande Matrice 4x16 (Arduino Mega 2560) ---
// Cibles américaines / arcade (Arachnid Cricket Pro, Viper 777/800, Halex).
// Décommentez pour activer sur un Arduino Mega :
/*
const byte NUM_ROWS = 4;
const byte NUM_COLS = 16;
const unsigned long DEBOUNCE_DELAY_MS = 80;

const byte rowPins[NUM_ROWS] = {22, 24, 26, 28};
const byte colPins[NUM_COLS] = {30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45};

const char keymap[NUM_ROWS][NUM_COLS] = {
  {'0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'},
  {'g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v'},
  {'w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L'},
  {'M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','+','-'}
};
*/

// --- PRESET C : Matrice 7x12 (Arduino Uno / Nano) ---
// Cibles intermédiaires à 19 broches au total.
// Décommentez pour activer :
/*
const byte NUM_ROWS = 7;
const byte NUM_COLS = 12;
const unsigned long DEBOUNCE_DELAY_MS = 80;

const byte rowPins[NUM_ROWS] = {A0, A1, A2, A3, A4, A5, 2};
const byte colPins[NUM_COLS] = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, A6};

const char keymap[NUM_ROWS][NUM_COLS] = {
  {'0','1','2','3','4','5','6','7','8','9','a','b'},
  {'c','d','e','f','g','h','i','j','k','l','m','n'},
  {'o','p','q','r','s','t','u','v','w','x','y','z'},
  {'A','B','C','D','E','F','G','H','I','J','K','L'},
  {'M','N','O','P','Q','R','S','T','U','V','W','X'},
  {'Y','Z','+','-','*','/','?','!','&','$','@','#'},
  {'(',')','=','%','<','>','[',']','{','}','~','_'}
};
*/

// --- PRESET D : Très Grande Matrice 8x16 (Arduino Mega 2560) ---
// Cibles professionnelles de bistrot / bornes vintage (Bullshooter, Merit, Lowen).
// Décommentez pour activer sur un Arduino Mega :
/*
const byte NUM_ROWS = 8;
const byte NUM_COLS = 16;
const unsigned long DEBOUNCE_DELAY_MS = 80;

const byte rowPins[NUM_ROWS] = {22, 23, 24, 25, 26, 27, 28, 29};
const byte colPins[NUM_COLS] = {30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45};

const char keymap[NUM_ROWS][NUM_COLS] = {
  {'0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'},
  {'g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v'},
  {'w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L'},
  {'M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','+','-'},
  {'*','/','?','!','&','$','@','#','(',')','=','%','<','>','[',']'},
  {'{','}','~','_','^','|',':',';',',','.','`','\'','"','\\',' ','§'},
  {'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p'},
  {'q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F'}
};
*/

// =============================================================
// 2. BOUTONS PHYSIQUES DIRECTS OPTIONNELS (PUSH BUTTONS)
// =============================================================
// Si vous câblez des boutons d'arcade directement sur des broches libres
// (reliés entre la broche et GND, utilisant la résistance PULLUP interne) :
const bool ENABLE_DIRECT_BUTTONS = true;

const byte PIN_BTN_PLAYER = 12; // Bouton "Joueur Suivant" -> envoie 'P'
const byte PIN_BTN_UNDO   = 13; // Bouton "Annuler Touche"   -> envoie 'U'

// =============================================================
// 3. CODE DU FIRMWARE
// =============================================================

void setup() {
  // Initialisation de la liaison série USB à 9600 bauds
  Serial.begin(9600);

  // Configuration des LIGNES en entrées avec pull-up interne actif
  for (byte r = 0; r < NUM_ROWS; r++) {
    pinMode(rowPins[r], INPUT_PULLUP);
  }

  // Configuration des COLONNES en sorties (inactives au niveau HAUT)
  for (byte c = 0; c < NUM_COLS; c++) {
    pinMode(colPins[c], OUTPUT);
    digitalWrite(colPins[c], HIGH);
  }

  // Configuration des boutons directs optionnels
  if (ENABLE_DIRECT_BUTTONS) {
    pinMode(PIN_BTN_PLAYER, INPUT_PULLUP);
    pinMode(PIN_BTN_UNDO, INPUT_PULLUP);
  }
}

void loop() {
  // 1. Scan de la matrice
  char key = scanMatrix();
  if (key != 0) {
    Serial.print(key);
  }

  // 2. Vérification des boutons directs
  if (ENABLE_DIRECT_BUTTONS) {
    checkDirectButtons();
  }
}

/**
 * Scanne la matrice par activation successive de chaque colonne (niveau BAS).
 * Si une ligne est lue à l'état BAS, un contact est fermé.
 */
char scanMatrix() {
  char hitKey = 0;

  for (byte c = 0; c < NUM_COLS; c++) {
    // Activation de la colonne courante (mise à GND)
    digitalWrite(colPins[c], LOW);

    // Lecture de chaque ligne
    for (byte r = 0; r < NUM_ROWS; r++) {
      if (digitalRead(rowPins[r]) == LOW) {
        // Impact détecté : anti-rebond matériel
        delay(DEBOUNCE_DELAY_MS);

        if (digitalRead(rowPins[r]) == LOW) {
          hitKey = keymap[r][c];

          // Attente du relâchement du contact pour éviter les multi-touches
          unsigned long timeout = millis() + 500;
          while (digitalRead(rowPins[r]) == LOW && millis() < timeout) {
            delay(10);
          }
        }
      }
      if (hitKey != 0) break;
    }

    // Désactivation de la colonne courante (remise à l'état HAUT)
    digitalWrite(colPins[c], HIGH);

    if (hitKey != 0) break;
  }

  return hitKey;
}

/**
 * Gestion des boutons poussoirs directs (anti-rebond et envoi série).
 */
void checkDirectButtons() {
  static unsigned long lastBtnPress = 0;
  if (millis() - lastBtnPress < 300) return; // Anti-rebond global

  if (digitalRead(PIN_BTN_PLAYER) == LOW) {
    delay(DEBOUNCE_DELAY_MS);
    if (digitalRead(PIN_BTN_PLAYER) == LOW) {
      Serial.print('P');
      lastBtnPress = millis();
      while (digitalRead(PIN_BTN_PLAYER) == LOW);
    }
  } else if (digitalRead(PIN_BTN_UNDO) == LOW) {
    delay(DEBOUNCE_DELAY_MS);
    if (digitalRead(PIN_BTN_UNDO) == LOW) {
      Serial.print('U');
      lastBtnPress = millis();
      while (digitalRead(PIN_BTN_UNDO) == LOW);
    }
  }
}
