# 🍓 Étape 3 : Installation & Configuration Kiosque Raspberry Pi

[🇬🇧 English Version](03_INSTALLATION_KIOSK.md) | **Français**

| Navigation |
| :--- |
| [← Étape 2 : Firmware Arduino](02_ARDUINO_FIRMWARE.fr.md) • **Étape 3 : Installation Kiosk RPi** • [Étape 4 : Écrans & Companion →](04_FEATURES_COMPANION.fr.md) |

---

Cette troisième étape détaille l'installation du serveur DartOTron, son démarrage autonome sur **Raspberry Pi OS** (ou tout Linux / macOS / Windows), et la mise en place du mode kiosque plein écran pour borne d'arcade dédiée.

---

## 📋 Prérequis Système

- **Node.js $\ge$ 22.5.0** (ou Node.js 24+) :  
  DartOTron exploite les fonctionnalités natives modernes de Node.js, notamment le moteur de base de données intégré `node:sqlite`.
- **Zéro dépendance npm requise** :  
  L'application démarre immédiatement sans `node_modules` lourds ni compilation native.
- **Droits sur le port série USB (Linux / Raspberry Pi OS)** :  
  Votre utilisateur doit appartenir au groupe `dialout` pour dialoguer avec l'Arduino :
  ```bash
  sudo usermod -a -G dialout $USER
  ```
  *(Déconnectez-vous et reconnectez-vous pour appliquer ce droit).*

---

## ⚡ Démarrage Rapide

Sur n'importe quel ordinateur ou Raspberry Pi :

```bash
# 1. Cloner le dépôt officiel
git clone https://github.com/Ldo-fr/DartOTron.git
cd DartOTron

# 2. Démarrer le serveur DartOTron
npm start
```

Le serveur s'initialise et ouvre l'interface sur **`http://localhost:8080`**.

---

## 🍓 Déploiement Borne Dédiée Raspberry Pi (Script Clé en Main)

Pour transformer votre Raspberry Pi en véritable borne d'arcade autonome (démarrage à l'allumage, plein écran sans barre d'adresse, curseur masqué) :

```bash
# Lancement de l'installateur officiel Raspberry Pi
npm run install-rpi
# Ou directement :
bash scripts/install-raspberry.sh
```

### Ce que configure automatiquement ce script :
1. **Groupe `dialout`** : Ajoute l'utilisateur courant aux permissions série USB.
2. **Service d'arrière-plan `systemd`** : Installe et active `dartotron.service` pour démarrer DartOTron automatiquement dès la mise sous tension de la borne et le relancer en cas de coupure.
3. **Autostart Kiosque Plein Écran** : Crée le fichier de démarrage XDG (`~/.config/autostart/dartotron-kiosk.desktop`) qui lance Chromium en mode plein écran immersif :
   ```bash
   chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 http://localhost:8080
   ```
4. **Masquage du curseur de souris** : Configure l'utilitaire `unclutter` pour faire disparaître le curseur de souris dès qu'il est inactif.
5. **Gestion de l'alimentation** : Désactive l'économiseur et la mise en veille automatique de l'écran.

---

## 🛠️ Commandes Utiles du Service Systemd

```bash
# Vérifier l'état d'exécution du serveur DartOTron
sudo systemctl status dartotron.service

# Redémarrer l'application (ex: après une mise à jour)
sudo systemctl restart dartotron.service

# Arrêter temporairement le service
sudo systemctl stop dartotron.service

# Consulter les journaux d'exécution en temps réel
sudo journalctl -u dartotron.service -f
```

---

## 🔄 Mise à Jour de DartOTron

Pour mettre à jour DartOTron vers la dernière version stable publiée :

```bash
cd /web/dartotron # ou votre dossier d'installation
git pull origin main
sudo systemctl restart dartotron.service
```

Vos données (profils de joueurs, records historiques, calibration de la cible) sont conservées en toute sécurité dans la base SQLite locale située dans `data/`.

---

| Étape Précédente | Sommaire | Étape Suivante |
| :--- | :---: | ---: |
| [← Étape 2 : Firmware Arduino](02_ARDUINO_FIRMWARE.fr.md) | **Guide Kiosk 3/4** | [📱 Étape 4 : Écrans & Companion →](04_FEATURES_COMPANION.fr.md) |
