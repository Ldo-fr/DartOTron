export class AudioManager {
  constructor() {
    this.volume = 1.0;
    this.muted = false;
    this.clickPool = [];
    this.clickPoolIndex = 0;
    this._lastClickTime = 0;
    this.sounds = new Map();
    this.initAudio();
  }

  initAudio() {
    try {
      if (typeof Audio !== 'undefined') {
        for (let i = 0; i < 4; i++) {
          const a = new Audio('/sounds/click.mp3');
          a.preload = 'auto';
          this.clickPool.push(a);
        }
        for (const name of ['bull', 'double', 'double-bull', 'triple', 'victory', 'fail', 'notification']) {
          const a = new Audio(`/sounds/${name}.mp3`);
          a.preload = 'auto';
          this.sounds.set(name, a);
        }
      }
    } catch {
      // Audio not supported in headless environment
    }
  }

  setVolume(vol) {
    const numeric = Number(vol ?? 100);
    this.volume = Math.max(0, Math.min(1, numeric / 100));
    for (const a of this.clickPool) {
      a.volume = this.volume;
    }
    for (const a of this.sounds.values()) {
      a.volume = this.volume;
    }
  }

  applyConfig(config) {
    this.setVolume(config?.SectionGlobals?.soundvolume ?? 100);
  }

  setMuted(m) {
    this.muted = Boolean(m);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playClick() {
    if (this.muted || this.volume <= 0) return;
    const now = Date.now();
    if (now - this._lastClickTime < 120) return;
    this._lastClickTime = now;

    if (this.clickPool.length > 0) {
      const audio = this.clickPool[this.clickPoolIndex];
      this.clickPoolIndex = (this.clickPoolIndex + 1) % this.clickPool.length;
      audio.volume = this.volume;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } else if (typeof Audio !== 'undefined') {
      const audio = new Audio('/sounds/click.mp3');
      audio.volume = this.volume;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  playNotification() {
    this.playSound('notification');
  }

  playSound(soundName) {
    if (this.muted || this.volume <= 0 || !soundName) return;
    const cleanName = String(soundName).replace(/\.(ogg|wav|mp3)$/i, '').toLowerCase();

    if (cleanName === 'click' || cleanName === 'clic' || cleanName === 'button' || cleanName === 'menu') {
      this.playClick();
      return;
    }

    const audio = this.sounds.get(cleanName);
    if (audio) {
      audio.volume = this.volume;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } else if (typeof Audio !== 'undefined') {
      const a = new Audio(`/sounds/${cleanName}.mp3`);
      a.volume = this.volume;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    }
  }
}
