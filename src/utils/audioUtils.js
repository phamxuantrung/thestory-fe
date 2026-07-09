let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Helper to create a quick bouncy synth pluck
function playBouncyTone(freqStart, freqEnd, type, duration, vol = 0.5) {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  
  osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
  }
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// 1. Lựa chọn thẻ bài (Tiny cute blip)
export function playSelectSound() {
  playBouncyTone(1200, 1500, 'sine', 0.08, 0.4);
}

// 2. Rút bài (Cute little ascending squeak)
export function playDrawSound() {
  playBouncyTone(500, 900, 'sine', 0.15, 0.5);
}

// 3. Đánh bài (Cute 'pop')
export function playCardSound() {
  playBouncyTone(700, 400, 'sine', 0.12, 0.5);
}

// 4. Cướp bài (Yoink! Fast ascending sweep)
export function playStealSound() {
  playBouncyTone(800, 1800, 'sine', 0.2, 0.5);
}

// 5. NOPE (Cute "Nuh-uh" sound)
export function playNopeSound() {
  playBouncyTone(350, 300, 'triangle', 0.15, 0.6);
  setTimeout(() => playBouncyTone(300, 250, 'triangle', 0.2, 0.6), 150);
}

// 6. Defuse (Happy fairy chime arpeggio)
export function playDefuseSound() {
  playBouncyTone(1046.50, null, 'sine', 0.1, 0.4); // C6
  setTimeout(() => playBouncyTone(1318.51, null, 'sine', 0.1, 0.4), 80); // E6
  setTimeout(() => playBouncyTone(1567.98, null, 'sine', 0.1, 0.4), 160); // G6
  setTimeout(() => playBouncyTone(2093.00, null, 'sine', 0.3, 0.4), 240); // C7
}

// 7. Explosion (Cute 'Pouf' instead of scary boom)
export function playExplosionSound() {
  // Descending cute sigh
  playBouncyTone(400, 100, 'sine', 0.8, 0.7);
  
  // Very soft noise rustle
  initAudio();
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start();
}

// 8. Xào bài (Fast cute paper rustle)
export function playShuffleSound() {
  initAudio();
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  // Play 3 short rustles
  noise.start(audioCtx.currentTime);
  
  setTimeout(() => {
    if (audioCtx.state === 'suspended') return;
    const n2 = audioCtx.createBufferSource();
    n2.buffer = buffer;
    n2.connect(filter);
    n2.start();
  }, 100);
}
