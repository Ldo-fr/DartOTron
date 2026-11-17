# ⚡ Étape 2 : Configuration & Téléversement du Firmware Arduino

[🇬🇧 English Version](02_ARDUINO_FIRMWARE.md) | **Français**

| Navigation |
| :--- |
| [← Étape 1 : Matériel](01_HARDWARE.fr.md) • **Étape 2 : Firmware Arduino** • [Étape 3 : Installation Kiosk RPi →](03_INSTALLATION_KIOSK.fr.md) |

---

Le firmware Arduino officiel de DartOTron est situé dans le dossier [`arduino/`](../arduino/) :
👉 **[`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino)**

Cette seconde étape vous explique comment fonctionne le firmware, comment choisir ou adapter le preset correspondant à votre cible, et comment téléverser le code dans votre Arduino.

---

## 🎯 Rôle du Firmware

Le microcontrôleur Arduino agit comme une **passerelle matérielle USB** :
1. Il scanne les colonnes de la matrice en boucle ultra-rapide.
2. Dès qu'un contact est détecté (fermeture de circuit sous l'impact d'une flèche), il applique un filtre anti-rebond matériel pour éviter les fausses touches.
3. Il lit la coordonnée `[ligne][colonne]` et extrait la lettre correspondante dans sa table `keymap`.
4. Il émet instantanément ce caractère ASCII unique sur la liaison série USB à **9600 bauds**.

---

## 🧩 Comprendre les 4 Éléments Clés du Code

Dans le fichier [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino), 4 éléments sont indissociables :

1. **`NUM_ROWS` et `NUM_COLS`** : Le nombre de fils de votre nappe lignes et nappe colonnes.
2. **`rowPins[]` et `colPins[]`** : La liste des broches physiques Arduino reliées à ces fils.
3. **`keymap[NUM_ROWS][NUM_COLS]`** : La grille de caractères ASCII. **Ses dimensions doivent obligatoirement correspondre à `NUM_ROWS × NUM_COLS`**.
4. **Le choix de la carte** :
   - **Arduino Uno / Nano** : Parfait jusqu'à 16 à 19 broches au total (ex: matrices $8 \times 8$ ou $7 \times 12$).
   - **Arduino Mega 2560** : Indispensable dès qu'une nappe comporte 16 colonnes ($4 \times 16$ ou $8 \times 16$), car il dispose de 54 broches numériques.

---

## 📋 Presets Prêts à l'Emploi selon votre Cible

Le code [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino) intègre directement ces configurations. Il vous suffit de décommenter celle qui correspond à votre matériel :

### Preset 1 : Cible Standard $8 \times 8$ (Arduino Uno / Nano) — *Par Défaut*
- **Cibles compatibles** : Decathlon Canaveral (ED310, ED520), Carromco, Harrows, Winmau, et 80% des cibles grand public du commerce.
- **Broches utilisées** : 16 (8 Lignes + 8 Colonnes).

```cpp
const byte NUM_ROWS = 8;
const byte NUM_COLS = 8;
const unsigned long DEBOUNCE_DELAY_MS = 80;

// 8 Lignes en entrées pull-up (A0..A5 sont les broches numériques 14..19 sur Uno)
const byte rowPins[NUM_ROWS] = {A0, A1, A2, A3, A4, A5, 2, 3};

// 8 Colonnes en sorties de scan
const byte colPins[NUM_COLS] = {4, 5, 6, 7, 8, 9, 10, 11};

// Grille de 8 lignes x 8 colonnes = 64 caractères uniques
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
```

---

### Preset 2 : Grande Matrice Arcade $4 \times 16$ (Arduino Mega 2560)
- **Cibles compatibles** : Cibles américaines et arcade : **Arachnid Cricket Pro (650, 750, 800)**, **Viper (777, 787, 800, 850)**, **Halex**, **DMI Sports**.
- **Broches utilisées** : 20 ($4 + 16$ $\rightarrow$ nécessite un Arduino Mega).

```cpp
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
```

---

### Preset 3 : Matrice Compacte $7 \times 12$ (Arduino Uno / Nano)
- **Cibles compatibles** : Certaines cibles Turnart, Viper d'entrée de gamme ou modèles vintage compacts (19 broches utilisées).

```cpp
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
```

---

### Preset 4 : Très Grande Matrice Professionnelle $8 \times 16$ (Arduino Mega 2560)
- **Cibles compatibles** : Bornes de pub et meubles vintage (Bullshooter, Merit Dart, Lowen Darts, Dartsman).
- **Broches utilisées** : 24 ($8 + 16$ $\rightarrow$ nécessite un Arduino Mega).

```cpp
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
```

---

## 🚀 Téléversement du Firmware

### Méthode 1 : Via l'Arduino IDE (Recommandé pour débuter)
1. Téléchargez et lancez l'[Arduino IDE](https://www.arduino.cc/en/software).
2. Ouvrez [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino).
3. Branchez votre Arduino en USB.
4. Dans le menu **Outils** :
   - **Type de carte** : sélectionnez *Arduino Uno* (ou *Arduino Mega 2560*).
   - **Port** : sélectionnez le port USB détecté (`/dev/ttyACM0` sous Linux, `COM3`/`COM4` sous Windows).
5. Cliquez sur **Téléverser** (icône flèche $\rightarrow$).

### Méthode 2 : En ligne de commande avec `arduino-cli` (Headless / Raspberry Pi)
```bash
# Compilation pour Arduino Uno
arduino-cli compile --fqbn arduino:avr:uno arduino/dartotron_firmware.ino

# Téléversement sur le port série détecté
arduino-cli upload -p /dev/ttyACM0 --fqbn arduino:avr:uno arduino/dartotron_firmware.ino
```

---

## 🔍 Test & Validation (Moniteur Série)

Avant de lancer DartOTron, validez le bon fonctionnement de votre montage :

1. Dans l'Arduino IDE, ouvrez le **Moniteur Série** (`Ctrl+Maj+M`).
2. Choisissez la vitesse **9600 bauds** en bas à droite.
3. Appuyez avec le doigt sur différents segments de votre cible physique :
   - À chaque pression, un caractère ASCII unique doit s'afficher immédiatement (ex: `k`, `0`, `F`, `p`...).
   - En appuyant sur le bouton d'arcade *Joueur Suivant*, la lettre `P` doit s'afficher.
   - En appuyant sur le bouton *Annuler*, la lettre `U` doit s'afficher.

> [!TIP]
> **Réglage du temps d'anti-rebond (Debounce)**  
> Si une fléchette enregistre parfois deux impacts : augmentez la constante `DEBOUNCE_DELAY_MS` à `100` ou `120` ms dans le code.

---

| Étape Précédente | Sommaire | Étape Suivante |
| :--- | :---: | ---: |
| [← Étape 1 : Matériel](01_HARDWARE.fr.md) | **Guide Firmware 2/4** | [🍓 Étape 3 : Installation Kiosk RPi →](03_INSTALLATION_KIOSK.fr.md) |
