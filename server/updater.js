/**
 * Gestionnaire de mises à jour par staging DartOTron (server/updater.js)
 * Zéro dépendance npm : utilise fetch natif, node:fs et tar.
 *
 * Pattern de staging sûr :
 * - En cours d'exécution, les mises à jour sont UNIQUEMENT téléchargées et validées
 *   dans data/pending-update/dartotron-release.tar.gz sans toucher aux fichiers actifs.
 * - L'extraction et le remplacement des fichiers applicatifs (en préservant data/)
 *   ont lieu exclusivement au démarrage suivant via applyPendingUpdate().
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

const UPDATE_DIRS = ['server', 'public', 'sounds', 'scripts', 'arduino'];
const UPDATE_FILES = ['package.json', 'LICENSE', 'README.md', 'README.fr.md'];

export function parseSemver(versionStr) {
  const clean = String(versionStr || '').trim().replace(/^v/i, '');
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: `${match[1]}.${match[2]}.${match[3]}`
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
  return 0;
}

export function getInstalledVersion(rootDir = DEFAULT_ROOT_DIR) {
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return String(pkg.version || '1.0.0').replace(/^v/i, '');
  } catch {
    return '1.0.0';
  }
}

export function getPendingUpdateDir(dataDir) {
  return path.join(dataDir, 'pending-update');
}

export function readPendingUpdateMetadata(dataDir) {
  try {
    const pendingDir = getPendingUpdateDir(dataDir);
    const metaPath = path.join(pendingDir, 'metadata.json');
    const archivePath = path.join(pendingDir, 'dartotron-release.tar.gz');
    if (!fs.existsSync(metaPath) || !fs.existsSync(archivePath)) {
      return null;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (!meta || !meta.version) return null;
    return {
      ...meta,
      archivePath
    };
  } catch {
    return null;
  }
}

/**
 * Vérifie si une archive .tar.gz contient bien package.json, server/ et public/.
 */
async function validateArchiveEntries(archivePath, isBuiltAsset = true) {
  const { stdout } = await execFileAsync('tar', ['-tzf', archivePath], {
    maxBuffer: 10 * 1024 * 1024
  });
  const lines = stdout
    .split(/\r?\n/)
    .map(l => l.trim().replace(/^\.\//, ''))
    .filter(Boolean);

  const normalize = (entry) => {
    if (isBuiltAsset) return entry;
    const slashIdx = entry.indexOf('/');
    return slashIdx >= 0 ? entry.slice(slashIdx + 1) : entry;
  };

  const normalized = lines.map(normalize);
  const hasPkg = normalized.some(e => e === 'package.json');
  const hasServer = normalized.some(e => e.startsWith('server/'));
  const hasPublic = normalized.some(e => e.startsWith('public/'));

  if (!hasPkg || !hasServer || !hasPublic) {
    throw new Error('Archive de mise à jour invalide ou incomplète');
  }
  return true;
}

/**
 * Applique une mise à jour préalablement téléchargée dans data/pending-update/
 * avant le démarrage complet du serveur. Préserve intégralement data/.
 */
export function applyPendingUpdate(rootDir = DEFAULT_ROOT_DIR, dataDir = path.join(rootDir, 'data')) {
  const pending = readPendingUpdateMetadata(dataDir);
  if (!pending) {
    return { applied: false };
  }

  const pendingDir = getPendingUpdateDir(dataDir);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dartotron-apply-'));

  try {
    const extractDir = path.join(tmpDir, 'extracted');
    fs.mkdirSync(extractDir, { recursive: true });

    const tarArgs = pending.isBuiltAsset === false
      ? ['-xzf', pending.archivePath, '--strip-components=1', '-C', extractDir]
      : ['-xzf', pending.archivePath, '-C', extractDir];

    execFileSync('tar', tarArgs, { stdio: 'pipe' });

    if (
      !fs.existsSync(path.join(extractDir, 'package.json')) ||
      !fs.existsSync(path.join(extractDir, 'server')) ||
      !fs.existsSync(path.join(extractDir, 'public'))
    ) {
      throw new Error('Archive extraite invalide ou incomplète');
    }

    for (const dir of UPDATE_DIRS) {
      const srcDir = path.join(extractDir, dir);
      const dstDir = path.join(rootDir, dir);
      if (fs.existsSync(srcDir)) {
        fs.rmSync(dstDir, { recursive: true, force: true });
        fs.cpSync(srcDir, dstDir, { recursive: true });
      }
    }

    for (const file of UPDATE_FILES) {
      const srcFile = path.join(extractDir, file);
      const dstFile = path.join(rootDir, file);
      if (fs.existsSync(srcFile)) {
        fs.cpSync(srcFile, dstFile);
      }
    }

    // Rendre les scripts shell exécutables
    const scriptsDir = path.join(rootDir, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      for (const entry of fs.readdirSync(scriptsDir)) {
        if (entry.endsWith('.sh')) {
          try {
            fs.chmodSync(path.join(scriptsDir, entry), 0o755);
          } catch {
            // ignore on non-POSIX filesystems
          }
        }
      }
    }

    // Nettoyage du staging pour éviter une boucle au redémarrage
    fs.rmSync(pendingDir, { recursive: true, force: true });

    return {
      applied: true,
      version: pending.version,
      tag: pending.tag || `v${pending.version}`
    };
  } catch (err) {
    console.error('[Updater] Échec application mise à jour en attente:', err.message);
    // Nettoyer l'archive corrompue pour éviter une boucle infinie au démarrage
    try {
      fs.rmSync(pendingDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    return { applied: false, error: err.message };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export class UpdateManager extends EventEmitter {
  constructor(config, options = {}) {
    super();
    this.config = config;
    this.rootDir = options.rootDir || DEFAULT_ROOT_DIR;
    this.dataDir = options.dataDir || config?.pathDir || path.join(this.rootDir, 'data');
    this.repoSlug = options.repoSlug || process.env.DARTOTRON_REPO || 'Ldo-fr/DartOTron';
    this.assetName = options.assetName || 'dartotron-release.tar.gz';
    this.isDev = Boolean(options.isDev);
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.checkTimeoutMs = Number(options.checkTimeoutMs || 8000);

    this.currentVersion = options.currentVersion || getInstalledVersion(this.rootDir);
    this._checking = false;
    this._downloading = false;
    this._downloadUrl = null;
    this._isBuiltAsset = true;

    const pending = readPendingUpdateMetadata(this.dataDir);
    const hasValidPending = pending && compareSemver(pending.version, this.currentVersion) > 0;

    if (pending && !hasValidPending) {
      // Déjà à jour ou version obsolète en staging : nettoyage silencieux
      try {
        fs.rmSync(getPendingUpdateDir(this.dataDir), { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    const curParsed = parseSemver(this.currentVersion);
    const pendParsed = hasValidPending ? parseSemver(pending.version) : null;

    this.state = {
      currentVersion: this.currentVersion,
      latestVersion: hasValidPending ? pending.version : this.currentVersion,
      latestTag: hasValidPending ? (pending.tag || `v${pending.version}`) : `v${this.currentVersion}`,
      status: hasValidPending ? 'downloaded' : 'idle',
      available: Boolean(hasValidPending),
      downloaded: Boolean(hasValidPending),
      downloadedVersion: hasValidPending ? pending.version : null,
      isBreaking: Boolean(curParsed && pendParsed && pendParsed.major > curParsed.major),
      lastCheckedAt: null,
      error: null
    };
  }

  isAutoDownloadEnabled() {
    const val = this.config?.GetValue?.('SectionGlobals', 'autoupdate');
    return val === true || val === 'true';
  }

  getStatus() {
    return {
      ...this.state,
      autoDownload: this.isAutoDownloadEnabled(),
      isDev: this.isDev
    };
  }

  _emitStatus() {
    this.emit('status', this.getStatus());
  }

  async checkForUpdate({ triggerAutoDownload = false } = {}) {
    if (this._checking || this._downloading) {
      return this.getStatus();
    }
    this._checking = true;
    const prevStatus = this.state.status;
    if (prevStatus !== 'downloaded') {
      this.state.status = 'checking';
      this.state.error = null;
      this._emitStatus();
    }

    try {
      const apiUrl = `https://api.github.com/repos/${this.repoSlug}/releases/latest`;
      const fetchOpts = {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'DartOTron-Updater'
        }
      };
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        fetchOpts.signal = AbortSignal.timeout(this.checkTimeoutMs);
      }

      const res = await this.fetchImpl(apiUrl, fetchOpts);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const tag = String(data.tag_name || '').trim();
      const latestVersion = tag.replace(/^v/i, '');
      const asset = Array.isArray(data.assets)
        ? data.assets.find(a => a.name === this.assetName)
        : null;

      this._downloadUrl = asset ? asset.browser_download_url : (data.tarball_url || '');
      this._isBuiltAsset = Boolean(asset);

      const cmp = compareSemver(latestVersion, this.currentVersion);
      const curParsed = parseSemver(this.currentVersion);
      const latParsed = parseSemver(latestVersion);
      const isBreaking = Boolean(curParsed && latParsed && latParsed.major > curParsed.major);

      this.state.lastCheckedAt = new Date().toISOString();
      this.state.error = null;

      if (cmp > 0) {
        this.state.latestVersion = latestVersion;
        this.state.latestTag = tag || `v${latestVersion}`;
        this.state.available = true;
        this.state.isBreaking = isBreaking;

        if (this.state.downloaded && this.state.downloadedVersion === latestVersion) {
          this.state.status = 'downloaded';
        } else {
          this.state.status = 'available';
        }
        this._emitStatus();

        this._checking = false;
        if (
          triggerAutoDownload &&
          this.isAutoDownloadEnabled() &&
          !this.isDev &&
          this.state.status === 'available'
        ) {
          return this.downloadUpdate();
        }
        return this.getStatus();
      } else {
        this.state.latestVersion = this.currentVersion;
        this.state.latestTag = `v${this.currentVersion}`;
        this.state.available = false;
        this.state.isBreaking = false;
        this.state.status = 'up_to_date';
        this._emitStatus();
        return this.getStatus();
      }
    } catch (err) {
      this.state.lastCheckedAt = new Date().toISOString();
      this.state.error = err.message || 'Impossible de contacter GitHub';
      // Préserver l'état 'downloaded' si une mise à jour est déjà prête en local
      if (this.state.downloaded) {
        this.state.status = 'downloaded';
      } else {
        this.state.status = 'error';
      }
      this._emitStatus();
      return this.getStatus();
    } finally {
      this._checking = false;
    }
  }

  async downloadUpdate() {
    if (this._downloading) {
      return this.getStatus();
    }

    if (!this._downloadUrl || !this.state.available) {
      await this.checkForUpdate({ triggerAutoDownload: false });
      if (!this.state.available || !this._downloadUrl) {
        return this.getStatus();
      }
    }

    if (this.state.downloaded && this.state.downloadedVersion === this.state.latestVersion) {
      return this.getStatus();
    }

    this._downloading = true;
    this.state.status = 'downloading';
    this.state.error = null;
    this._emitStatus();

    const pendingDir = getPendingUpdateDir(this.dataDir);
    const tmpArchivePath = path.join(pendingDir, `${this.assetName}.tmp`);
    const finalArchivePath = path.join(pendingDir, this.assetName);
    const metaPath = path.join(pendingDir, 'metadata.json');

    try {
      fs.mkdirSync(pendingDir, { recursive: true });

      const res = await this.fetchImpl(this._downloadUrl, {
        headers: { 'User-Agent': 'DartOTron-Updater' }
      });
      if (!res.ok) {
        throw new Error(`Échec téléchargement (HTTP ${res.status})`);
      }

      const arrayBuf = await res.arrayBuffer();
      fs.writeFileSync(tmpArchivePath, Buffer.from(arrayBuf));

      await validateArchiveEntries(tmpArchivePath, this._isBuiltAsset);

      fs.renameSync(tmpArchivePath, finalArchivePath);
      fs.writeFileSync(
        metaPath,
        JSON.stringify(
          {
            version: this.state.latestVersion,
            tag: this.state.latestTag,
            isBuiltAsset: this._isBuiltAsset,
            isBreaking: this.state.isBreaking,
            downloadedAt: new Date().toISOString()
          },
          null,
          2
        ),
        'utf-8'
      );

      this.state.status = 'downloaded';
      this.state.downloaded = true;
      this.state.downloadedVersion = this.state.latestVersion;
      this.state.error = null;
      this._emitStatus();
      return this.getStatus();
    } catch (err) {
      try {
        fs.rmSync(tmpArchivePath, { force: true });
      } catch {
        // ignore
      }
      this.state.status = 'error';
      this.state.error = err.message || 'Erreur lors du téléchargement';
      this._emitStatus();
      return this.getStatus();
    } finally {
      this._downloading = false;
    }
  }
}
