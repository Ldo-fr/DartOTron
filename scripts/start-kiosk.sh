#!/usr/bin/env bash
# Script de lancement automatique du mode Kiosque plein écran sur Raspberry Pi

URL="http://localhost:8180"

# 1. Désactiver la mise en veille de l'écran (X11 si disponible)
if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

# Masquer le curseur de souris après inactivité si unclutter est installé
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 3 -root &
fi

# 2. Attendre que le serveur Node.js DartOTron soit prêt (max 30s)
for i in $(seq 1 30); do
  if curl -s "${URL}/api/state" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Nettoyer le drapeau de crash Chromium pour éviter la bulle "Restaurer les pages"
CHROMIUM_DIR="${HOME}/.config/chromium/Default"
if [ -f "${CHROMIUM_DIR}/Preferences" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "${CHROMIUM_DIR}/Preferences" || true
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "${CHROMIUM_DIR}/Preferences" || true
fi

# 4. Détecter le binaire Chromium (chromium-browser ou chromium sur Raspberry Pi OS)
BROWSER_BIN=""
for candidate in chromium-browser chromium google-chrome; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER_BIN="$candidate"
    break
  fi
done

if [ -z "$BROWSER_BIN" ]; then
  echo "Erreur : Chromium n'est pas installé sur ce système." >&2
  exit 1
fi

exec "$BROWSER_BIN" \
  --kiosk \
  --password-store=basic \
  --touch-events=enabled \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  "$URL"

