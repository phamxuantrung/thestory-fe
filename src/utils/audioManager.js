class AudioManager {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSelect(pitchOffset = 0) {
    this.playTone(600 + pitchOffset * 50, 'sine', 0.1, 0.05);
  }

  playMatch(comboLength = 3) {
    // Play a satisfying bright chord
    const baseFreq = 440 + Math.min(comboLength * 20, 300);
    this.playTone(baseFreq, 'sine', 0.2, 0.1);
    setTimeout(() => this.playTone(baseFreq * 1.25, 'sine', 0.3, 0.1), 50);
    setTimeout(() => this.playTone(baseFreq * 1.5, 'sine', 0.4, 0.1), 100);
    if (comboLength >= 5) {
      setTimeout(() => this.playTone(baseFreq * 2, 'sine', 0.5, 0.1), 150);
    }
  }

  playExplosion() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }

  playLevelUp() {
    this.playTone(440, 'triangle', 0.2, 0.08);
    setTimeout(() => this.playTone(554.37, 'triangle', 0.2, 0.08), 150);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.4, 0.08), 300);
    setTimeout(() => this.playTone(880, 'triangle', 0.6, 0.08), 450);
  }

  playGameOver() {
    this.playTone(300, 'sawtooth', 0.3, 0.05);
    setTimeout(() => this.playTone(250, 'sawtooth', 0.3, 0.05), 300);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.05), 600);
  }

  playError() {
    this.playTone(200, 'sawtooth', 0.2, 0.05);
  }
}

export const audioManager = new AudioManager();
