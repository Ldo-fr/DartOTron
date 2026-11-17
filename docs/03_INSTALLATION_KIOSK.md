# 🍓 Step 3: Raspberry Pi Kiosk Installation & Setup

**English** | [🇫🇷 Version Française](03_INSTALLATION_KIOSK.fr.md)

| Navigation |
| :--- |
| [← Step 2: Arduino Firmware](02_ARDUINO_FIRMWARE.md) • **Step 3: Raspberry Pi Kiosk Setup** • [Step 4: Features & Companion →](04_FEATURES_COMPANION.md) |

---

This third step details installing the DartOTron server, configuring automated startup on **Raspberry Pi OS** (or any Linux / macOS / Windows system), and enabling fullscreen kiosk mode for a dedicated arcade cabinet.

---

## 📋 System Prerequisites

- **Node.js $\ge$ 22.5.0** (or Node.js 24+):  
  DartOTron leverages modern native Node.js capabilities, including the built-in `node:sqlite` database engine.
- **Zero npm dependencies required**:  
  The application boots instantly with no bloated `node_modules` or native compilation.
- **USB Serial Port Permissions (Linux / Raspberry Pi OS)**:  
  Your user must belong to the `dialout` system group to communicate with the Arduino:
  ```bash
  sudo usermod -a -G dialout $USER
  ```
  *(Log out and log back in to apply this permission).*

---

## ⚡ Quick Start

On any computer or Raspberry Pi:

```bash
# 1. Clone the official repository
git clone https://github.com/Ldo-fr/DartOTron.git
cd DartOTron

# 2. Start the DartOTron server
npm start
```

The server initializes and serves the interface at **`http://localhost:8080`**.

---

## 🍓 Dedicated Raspberry Pi Kiosk Setup (Turnkey Script)

To turn your Raspberry Pi into a dedicated standalone arcade cabinet (boot to game, fullscreen without address bar, cursor hidden):

```bash
# Run the official Raspberry Pi installer
npm run install-rpi
# Or directly:
bash scripts/install-raspberry.sh
```

### What this script automates:
1. **`dialout` Group**: Adds the current user to USB serial permissions.
2. **`systemd` Background Service**: Installs and activates `dartotron.service` to start DartOTron automatically on boot and restart it if interrupted.
3. **Fullscreen Kiosk Autostart**: Generates an XDG desktop autostart entry (`~/.config/autostart/dartotron-kiosk.desktop`) launching Chromium in immersive kiosk mode:
   ```bash
   chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 http://localhost:8080
   ```
4. **Mouse Cursor Hiding**: Configures `unclutter` to hide the mouse cursor whenever it is idle.
5. **Power Management**: Disables screen blanking and sleep timeouts.

---

## 🛠️ Useful Systemd Service Commands

```bash
# Check service status
sudo systemctl status dartotron.service

# Restart application (e.g. after updating)
sudo systemctl restart dartotron.service

# Stop service temporarily
sudo systemctl stop dartotron.service

# Inspect live real-time application logs
sudo journalctl -u dartotron.service -f
```

---

## 🔄 Updating DartOTron

To update DartOTron to the latest stable release:

```bash
cd /web/dartotron # or your installation folder
git pull origin main
sudo systemctl restart dartotron.service
```

Your game data (player profiles, historic records, dartboard calibration) is preserved safely in the local SQLite database inside `data/`.

---

| Previous Step | Overview | Next Step |
| :--- | :---: | ---: |
| [← Step 2: Arduino Firmware](02_ARDUINO_FIRMWARE.md) | **Kiosk Guide 3/4** | [📱 Step 4: Features & Companion →](04_FEATURES_COMPANION.md) |
