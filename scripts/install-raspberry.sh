#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_USER="${SUDO_USER:-$(whoami)}"
TARGET_HOME="$(eval echo "~${TARGET_USER}")"

echo "============================================================"
echo "🎯 Installation du démarrage automatique DartOTron (Raspberry Pi)"
echo "   Dossier application : ${WORKDIR}"
echo "   Utilisateur cible   : ${TARGET_USER}"
echo "============================================================"

# 1. Rendre le script kiosque exécutable
chmod +x "${WORKDIR}/scripts/start-kiosk.sh"

# 2. Ajouter l'utilisateur au groupe dialout pour l'accès au port série Arduino (/dev/ttyACM0)
if getent group dialout >/dev/null 2>&1; then
  echo "-> Ajout de ${TARGET_USER} au groupe 'dialout' (accès USB Arduino)..."
  sudo usermod -a -G dialout "${TARGET_USER}" || true
fi

# 3. Installer et activer le service systemd dartotron.service
SERVICE_TMP="/tmp/dartotron.service"
sed -e "s|__USER__|${TARGET_USER}|g" \
    -e "s|__WORKDIR__|${WORKDIR}|g" \
    "${WORKDIR}/scripts/dartotron.service" > "${SERVICE_TMP}"

echo "-> Installation du service systemd /etc/systemd/system/dartotron.service..."
sudo cp "${SERVICE_TMP}" /etc/systemd/system/dartotron.service
rm -f "${SERVICE_TMP}"

sudo systemctl daemon-reload
sudo systemctl enable dartotron.service
sudo systemctl restart dartotron.service
echo "   ✅ Service dartotron.service activé et démarré sur le port 8180."

# 4. Configurer l'autostart graphique (XDG Autostart) pour Chromium Kiosk
AUTOSTART_DIR="${TARGET_HOME}/.config/autostart"
mkdir -p "${AUTOSTART_DIR}"

sed -e "s|__WORKDIR__|${WORKDIR}|g" \
    "${WORKDIR}/scripts/dartotron-kiosk.desktop" > "${AUTOSTART_DIR}/dartotron-kiosk.desktop"

chown -R "${TARGET_USER}:${TARGET_USER}" "${AUTOSTART_DIR}" || true
echo "   ✅ Lancement automatique de Chromium Kiosk configuré dans ${AUTOSTART_DIR}/dartotron-kiosk.desktop"

echo ""
echo "🎉 Installation terminée ! Au prochain redémarrage du Raspberry Pi :"
echo "   1. Le serveur Node.js DartOTron démarrera automatiquement via systemd."
echo "   2. Chromium s'ouvrira automatiquement en plein écran (--kiosk) sur http://localhost:8180"

