#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_SLUG="${DARTOTRON_REPO:-Ldo-fr/DartOTron}"
ASSET_NAME="dartotron-release.tar.gz"
FORCE_UPDATE=false
TARGET_TAG=""

for arg in "$@"; do
  case "$arg" in
    --force|-f)
      FORCE_UPDATE=true
      ;;
    v*|[0-9]*)
      TARGET_TAG="$arg"
      [[ "$TARGET_TAG" != v* ]] && TARGET_TAG="v${TARGET_TAG}"
      ;;
  esac
done

echo "============================================================"
echo "🎯 Mise à jour de DartOTron depuis GitHub Releases (${REPO_SLUG})"
echo "   Dossier d'installation : ${WORKDIR}"
echo "============================================================"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Erreur : Node.js est requis pour exécuter la mise à jour."
  exit 1
fi

CURRENT_VERSION="$(node -e "
  import fs from 'node:fs';
  try {
    const pkg = JSON.parse(fs.readFileSync('${WORKDIR}/package.json', 'utf8'));
    process.stdout.write(pkg.version || '0.0.0');
  } catch {
    process.stdout.write('0.0.0');
  }
")"

API_URL="https://api.github.com/repos/${REPO_SLUG}/releases/latest"
if [[ -n "${TARGET_TAG}" ]]; then
  API_URL="https://api.github.com/repos/${REPO_SLUG}/releases/tags/${TARGET_TAG}"
fi

echo "-> Recherche de la release sur ${API_URL}..."

RELEASE_INFO="$(node -e "
  const url = '${API_URL}';
  const assetName = '${ASSET_NAME}';
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'DartOTron-Updater'
      }
    });
    if (!res.ok) {
      console.error('HTTP ' + res.status);
      process.exit(1);
    }
    const data = await res.json();
    const tag = String(data.tag_name || '').trim();
    const version = tag.replace(/^v/, '');
    const asset = Array.isArray(data.assets)
      ? data.assets.find(a => a.name === assetName)
      : null;
    const downloadUrl = asset ? asset.browser_download_url : (data.tarball_url || '');
    const isBuiltAsset = Boolean(asset);
    console.log(JSON.stringify({ tag, version, downloadUrl, isBuiltAsset }));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
")" || {
  echo "❌ Impossible de récupérer les informations de release GitHub."
  echo "   Vérifiez votre connexion réseau ou qu'au moins une Release a été publiée sur https://github.com/${REPO_SLUG}/releases"
  exit 1
}

LATEST_TAG="$(node -e "console.log(JSON.parse(process.argv[1]).tag)" "${RELEASE_INFO}")"
LATEST_VERSION="$(node -e "console.log(JSON.parse(process.argv[1]).version)" "${RELEASE_INFO}")"
DOWNLOAD_URL="$(node -e "console.log(JSON.parse(process.argv[1]).downloadUrl)" "${RELEASE_INFO}")"
IS_BUILT_ASSET="$(node -e "console.log(JSON.parse(process.argv[1]).isBuiltAsset)" "${RELEASE_INFO}")"

echo "   Version installée : v${CURRENT_VERSION}"
echo "   Release cible     : ${LATEST_TAG}"

if [[ "${CURRENT_VERSION}" == "${LATEST_VERSION}" && "${FORCE_UPDATE}" == "false" ]]; then
  echo "✅ DartOTron est déjà à jour (v${CURRENT_VERSION}). Utilisez '--force' pour réinstaller cette release."
  exit 0
fi

if [[ -z "${DOWNLOAD_URL}" ]]; then
  echo "❌ Aucune archive téléchargeable trouvée pour la release ${LATEST_TAG}."
  exit 1
fi

TMP_DIR="$(mktemp -d -t dartotron_update_XXXXXX)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

ARCHIVE_PATH="${TMP_DIR}/${ASSET_NAME}"

echo "-> Téléchargement de la release packagée (${DOWNLOAD_URL})..."
curl -fL --retry 3 --connect-timeout 15 -o "${ARCHIVE_PATH}" "${DOWNLOAD_URL}"

EXTRACT_DIR="${TMP_DIR}/extracted"
mkdir -p "${EXTRACT_DIR}"

if [[ "${IS_BUILT_ASSET}" == "true" ]]; then
  tar -xzf "${ARCHIVE_PATH}" -C "${EXTRACT_DIR}"
else
  tar -xzf "${ARCHIVE_PATH}" --strip-components=1 -C "${EXTRACT_DIR}"
fi

if [[ ! -f "${EXTRACT_DIR}/package.json" || ! -d "${EXTRACT_DIR}/server" || ! -d "${EXTRACT_DIR}/public" ]]; then
  echo "❌ L'archive téléchargée est invalide ou incomplète. Annulation de la mise à jour."
  exit 1
fi

# Sauvegarde préventive des données locales (scores.db & dartotron.json)
if [[ -d "${WORKDIR}/data" ]]; then
  echo "-> Sauvegarde préventive de data/..."
  cp -a "${WORKDIR}/data" "${TMP_DIR}/data_backup"
fi

echo "-> Application de la release ${LATEST_TAG}..."
for dir in server public sounds scripts arduino; do
  if [[ -d "${EXTRACT_DIR}/${dir}" ]]; then
    rm -rf "${WORKDIR}/${dir}"
    cp -a "${EXTRACT_DIR}/${dir}" "${WORKDIR}/${dir}"
  fi
done

for file in package.json LICENSE README.md README.fr.md; do
  if [[ -f "${EXTRACT_DIR}/${file}" ]]; then
    cp -a "${EXTRACT_DIR}/${file}" "${WORKDIR}/${file}"
  fi
done

# Restaurer data/ si jamais affecté
if [[ ! -d "${WORKDIR}/data" && -d "${TMP_DIR}/data_backup" ]]; then
  cp -a "${TMP_DIR}/data_backup" "${WORKDIR}/data"
fi

chmod +x "${WORKDIR}/scripts/"*.sh 2>/dev/null || true

# Redémarrer le service systemd s'il est installé et actif
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "^dartotron\.service"; then
  echo "-> Redémarrage du service systemd dartotron.service..."
  sudo systemctl restart dartotron.service
  echo "   ✅ Service dartotron.service redémarré."
fi

echo ""
echo "🎉 Mise à jour vers DartOTron ${LATEST_TAG} terminée avec succès !"
echo "   Vos données locales (data/scores.db & data/dartotron.json) ont été intégralement préservées."
