# ⚡ Step 2: Arduino Firmware Configuration & Flashing

**English** | [🇫🇷 Version Française](02_ARDUINO_FIRMWARE.fr.md)

| Navigation |
| :--- |
| [← Step 1: Hardware](01_HARDWARE.md) • **Step 2: Arduino Firmware** • [Step 3: Raspberry Pi Kiosk Setup →](03_INSTALLATION_KIOSK.md) |

---

The official DartOTron Arduino firmware is located in the [`arduino/`](../arduino/) directory:
👉 **[`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino)**

This second step explains how the firmware works, how to choose or adapt the preset for your dartboard, and how to flash it to your Arduino board.

---

## 🎯 Role of the Firmware

The Arduino microcontroller acts as a **hardware USB bridge**:
1. It continuously scans the columns of the contact matrix in an ultra-fast loop.
2. When a contact is detected (circuit closure caused by dart impact), it applies a hardware debouncing filter to eliminate phantom hits.
3. It resolves the active `[row][col]` intersection and retrieves the corresponding character from the `keymap`.
4. It immediately streams this unique raw ASCII character over the USB serial connection at **9600 baud**.

---

## 🧩 Understanding the 4 Core Code Elements

In [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino), 4 settings must always match:

1. **`NUM_ROWS` and `NUM_COLS`**: The number of conductor traces in your row and column ribbons.
2. **`rowPins[]` and `colPins[]`**: The Arduino physical pin numbers connected to those traces.
3. **`keymap[NUM_ROWS][NUM_COLS]`**: The 2D ASCII character grid. **Its dimensions must strictly match `NUM_ROWS × NUM_COLS`**.
4. **Microcontroller Selection**:
   - **Arduino Uno / Nano**: Perfect for up to 16 to 19 pins total (e.g., $8 \times 8$ or $7 \times 12$ matrices).
   - **Arduino Mega 2560**: Mandatory for dartboards with 16-pin ribbons ($4 \times 16$ or $8 \times 16$), offering 54 digital I/O pins.

---

## 📋 Turnkey Presets by Dartboard Model

The code in [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino) contains pre-configured blocks. Simply uncomment the preset matching your board:

### Preset 1: Standard $8 \times 8$ (Arduino Uno / Nano) — *Default*
- **Compatible Dartboards**: Decathlon Canaveral (ED310, ED520), Carromco, Harrows, Winmau, and ~80% of consumer soft-tip boards.
- **Pins Used**: 16 (8 Rows + 8 Columns).

```cpp
const byte NUM_ROWS = 8;
const byte NUM_COLS = 8;
const unsigned long DEBOUNCE_DELAY_MS = 80;

// 8 Rows as pull-up inputs (A0..A5 map to digital pins 14..19 on Uno)
const byte rowPins[NUM_ROWS] = {A0, A1, A2, A3, A4, A5, 2, 3};

// 8 Columns as scanning outputs
const byte colPins[NUM_COLS] = {4, 5, 6, 7, 8, 9, 10, 11};

// 8x8 Grid = 64 unique characters
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

### Preset 2: Large Arcade Matrix $4 \times 16$ (Arduino Mega 2560)
- **Compatible Dartboards**: American arcade models: **Arachnid Cricket Pro (650, 750, 800)**, **Viper (777, 787, 800, 850)**, **Halex**, **DMI Sports**.
- **Pins Used**: 20 ($4 + 16$ $\rightarrow$ requires an Arduino Mega).

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

### Preset 3: Compact Matrix $7 \times 12$ (Arduino Uno / Nano)
- **Compatible Dartboards**: Select Turnart, entry-level Viper, or compact vintage models (19 pins used).

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

### Preset 4: Professional Heavy Arcade $8 \times 16$ (Arduino Mega 2560)
- **Compatible Dartboards**: Pub cabinets and vintage commercial machines (Bullshooter, Merit Dart, Lowen Darts, Dartsman).
- **Pins Used**: 24 ($8 + 16$ $\rightarrow$ requires an Arduino Mega).

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

## 🚀 Uploading the Firmware

### Option 1: Using the Arduino IDE (Recommended for Beginners)
1. Download and install the [Arduino IDE](https://www.arduino.cc/en/software).
2. Open [`arduino/dartotron_firmware.ino`](../arduino/dartotron_firmware.ino).
3. Connect your Arduino via USB.
4. Under the **Tools** menu:
   - **Board**: Select *Arduino Uno* (or *Arduino Mega 2560*).
   - **Port**: Select the detected serial port (`/dev/ttyACM0` on Linux, `COM3`/`COM4` on Windows).
5. Click **Upload** (right arrow icon $\rightarrow$).

### Option 2: Command Line with `arduino-cli` (Headless / Raspberry Pi)
```bash
# Compile for Arduino Uno
arduino-cli compile --fqbn arduino:avr:uno arduino/dartotron_firmware.ino

# Upload to the detected USB port
arduino-cli upload -p /dev/ttyACM0 --fqbn arduino:avr:uno arduino/dartotron_firmware.ino
```

---

## 🔍 Validation (Serial Monitor Test)

Before launching DartOTron, verify your setup:

1. In the Arduino IDE, open the **Serial Monitor** (`Ctrl+Shift+M`).
2. Set the baud rate to **9600 baud** in the bottom right corner.
3. Press various segments on your physical dartboard:
   - With each press, a unique ASCII character should appear (e.g., `k`, `0`, `F`, `p`...).
   - Pressing the *Next Player* arcade button should output `P`.
   - Pressing the *Undo Dart* arcade button should output `U`.

> [!TIP]
> **Debounce Timing Adjustment**  
> If darts occasionally register duplicate hits, increase the `DEBOUNCE_DELAY_MS` constant to `100` or `120` ms in the sketch.

---

| Previous Step | Overview | Next Step |
| :--- | :---: | ---: |
| [← Step 1: Hardware](01_HARDWARE.md) | **Firmware Guide 2/4** | [🍓 Step 3: Raspberry Pi Kiosk Setup →](03_INSTALLATION_KIOSK.md) |
