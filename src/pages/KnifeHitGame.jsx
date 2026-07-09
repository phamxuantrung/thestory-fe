import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treeService } from '../services/treeService';
import './KnifeHitGame.css';

// ─── Constants ───────────────────────────────────────────────
const W = 400;
const H = 700;
const IMPACT_ANGLE = 180;
const FLY_DUR = 0.14;
const KNIFE_HALF_WIDTH = 5;
const COLLISION_PADDING = 5;
const STRAWBERRY_THRESHOLD = 18;

// ─── Audio (Web Audio API) ────────────────────────────────────
function createAudio() {
  let actx = null;
  const getCtx = () => {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => { });
    return actx;
  };
  const beep = (freq, dur, type = 'sine', gainVal = 0.15) => {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(gainVal, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch (_) { }
  };
  return {
    thud: () => beep(140, 0.12, 'triangle', 0.25),
    collide: () => { beep(90, 0.35, 'sawtooth', 0.3); beep(60, 0.4, 'square', 0.2); },
    strawberry: () => { beep(660, 0.08, 'sine', 0.2); setTimeout(() => beep(880, 0.12, 'sine', 0.18), 60); },
    level: () => { beep(520, 0.1, 'sine', 0.2); setTimeout(() => beep(780, 0.15, 'sine', 0.2), 90); },
    throw: () => beep(300, 0.05, 'square', 0.08),
    xu: () => { [880, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 'sine', 0.12), i * 60)); }
  };
}

// ─── Math Helpers ────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }
function norm(deg) { let d = deg % 360; return d < 0 ? d + 360 : d; }
function angDiff(a, b) { let d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); }
function polarPoint(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

// ─── Drawing Helpers ─────────────────────────────────────────
function drawCake(ctx, cx, cy, r, rotation, wobble, timeMs) {
  const wob = Math.sin(timeMs / 60) * wobble * 0.3;
  ctx.save();
  ctx.translate(cx, cy + wob);

  // Shadow
  ctx.beginPath();
  ctx.arc(0, 4, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();

  ctx.rotate(rotation * Math.PI / 180);

  // Cake base (Sponge)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const spongeGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  spongeGrad.addColorStop(0, '#f9dcba');
  spongeGrad.addColorStop(1, '#e3a869');
  ctx.fillStyle = spongeGrad;
  ctx.fill();

  // Strawberry frosting (wavy rim)
  ctx.fillStyle = '#ff85a2';
  ctx.beginPath();
  for (let i = 0; i < 360; i += 5) {
    const rad = i * Math.PI / 180;
    const wave = Math.sin(i * 6 * Math.PI / 180) * 4;
    const px = Math.sin(rad) * (r - 2 + wave);
    const py = -Math.cos(rad) * (r - 2 + wave);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Frosting highlight
  ctx.fillStyle = '#ffb3c6';
  ctx.beginPath();
  for (let i = 0; i < 360; i += 5) {
    const rad = i * Math.PI / 180;
    const wave = Math.sin(i * 6 * Math.PI / 180) * 4;
    const px = Math.sin(rad) * (r - 10 + wave);
    const py = -Math.cos(rad) * (r - 10 + wave);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Sprinkles
  const sprinkleColors = ['#fffffb', '#ffeb3b', '#00e5ff', '#b388ff'];
  Math.seedrandom = Math.seedrandom || function (s) {
    let a = s; return function () { a = a * 16807 % 2147483647; return (a - 1) / 2147483646; };
  };
  const sr = Math.seedrandom(12345); // Fixed seed for stable sprinkles
  for (let i = 0; i < 20; i++) {
    const srRadius = sr() * (r * 0.7);
    const srAng = sr() * 360;
    const sp = polarPoint(0, 0, srRadius, srAng);
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sr() * Math.PI);
    ctx.fillStyle = sprinkleColors[Math.floor(sr() * sprinkleColors.length)];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-2, -6, 4, 12, 2) : ctx.rect(-2, -6, 4, 12);
    ctx.fill();
    ctx.restore();
  }

  // Inner cream center
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fff0f5';
  ctx.fill();

  ctx.restore();
}

function drawFork(ctx, cx, cy, angleDeg, scale, embedded) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleDeg * Math.PI / 180);
  ctx.scale(scale, scale);

  const bladeLen = embedded ? 14 : 26;

  // Fork Tines (Prongs)
  ctx.fillStyle = '#eef3f5';
  ctx.beginPath();
  // Left tine
  ctx.moveTo(-6, embedded ? 8 : 0);
  ctx.lineTo(-4, -bladeLen);
  ctx.lineTo(-2, -bladeLen);
  ctx.lineTo(-2, -bladeLen * 0.4);
  // Center tine
  ctx.lineTo(-1, -bladeLen * 0.4);
  ctx.lineTo(0, -bladeLen - 2);
  ctx.lineTo(1, -bladeLen * 0.4);
  // Right tine
  ctx.lineTo(2, -bladeLen * 0.4);
  ctx.lineTo(2, -bladeLen);
  ctx.lineTo(4, -bladeLen);
  ctx.lineTo(6, embedded ? 8 : 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8fa3ac';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Handle (Pink/White striped candy cane style)
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-4.5, -bladeLen - 28, 9, 28, 4) : ctx.rect(-4.5, -bladeLen - 28, 9, 28);
  ctx.fillStyle = '#fffffb';
  ctx.fill();

  // Pink stripes
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff477e';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-10, -bladeLen - 30 + i * 8);
    ctx.lineTo(10, -bladeLen - 24 + i * 8);
    ctx.lineTo(10, -bladeLen - 20 + i * 8);
    ctx.lineTo(-10, -bladeLen - 26 + i * 8);
    ctx.fill();
  }
  ctx.restore();

  // Pommel (Cute Heart)
  ctx.fillStyle = '#ff477e';
  ctx.beginPath();
  const hy = -bladeLen - 30;
  ctx.moveTo(0, hy + 3);
  ctx.bezierCurveTo(0, hy, -4, hy - 4, -4, hy + 1);
  ctx.bezierCurveTo(-4, hy + 4, 0, hy + 6, 0, hy + 8);
  ctx.bezierCurveTo(0, hy + 6, 4, hy + 4, 4, hy + 1);
  ctx.bezierCurveTo(4, hy - 4, 0, hy, 0, hy + 3);
  ctx.fill();

  ctx.restore();
}

function drawStrawberry(ctx, cx, cy, angleDeg, popT) {
  const pop = popT > 0 ? Math.max(0, 1 - popT * 3) : 1;
  if (pop <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleDeg * Math.PI / 180);
  ctx.scale(pop, pop);

  // Strawberry body
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(12, 8, 12, -6, 0, -10);
  ctx.bezierCurveTo(-12, -6, -12, 8, 0, 12);
  ctx.fillStyle = '#ff2a55';
  ctx.fill();

  // Seeds
  ctx.fillStyle = '#ffda9e';
  [[-4, 0], [4, 0], [0, -4], [-6, 6], [6, 6], [0, 6]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Leaves
  ctx.fillStyle = '#38b000';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(-6, -12, -8, -8);
  ctx.quadraticCurveTo(-4, -6, 0, -8);
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(6, -12, 8, -8);
  ctx.quadraticCurveTo(4, -6, 0, -8);
  ctx.fill();

  ctx.restore();
}

function drawSplash(ctx, timeMs) {
  const floatY = Math.sin(timeMs / 300) * 8;

  ctx.save();
  ctx.textAlign = 'center';

  // Title card
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(W / 2 - 130, H * 0.28 + floatY, 260, 90, 26) : ctx.rect(W / 2 - 130, H * 0.28 + floatY, 260, 90);
  ctx.fill();
  ctx.strokeStyle = '#ffb3c6';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#ff477e';
  ctx.font = 'bold 42px Bungee, cursive';
  ctx.fillText('CAKE HIT', W / 2, H * 0.28 + 48 + floatY);
  ctx.fillStyle = '#ff8fa3';
  ctx.font = 'bold 16px Nunito, sans-serif';
  ctx.fillText('Chạm để bắt đầu! 🍰', W / 2, H * 0.28 + 74 + floatY);

  // Instruction
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(W / 2 - 120, H * 0.65, 240, 60, 18) : ctx.rect(W / 2 - 120, H * 0.65, 240, 60);
  ctx.fill();
  ctx.fillStyle = '#ff477e';
  ctx.font = 'bold 14px Nunito, sans-serif';
  ctx.fillText('Phóng nĩa vào bánh kem', W / 2, H * 0.65 + 24);
  ctx.fillStyle = '#ff8fa3';
  ctx.font = 'bold 13px Nunito, sans-serif';
  ctx.fillText('Dâu tây = +2 xu', W / 2, H * 0.65 + 46);

  ctx.restore();
}

function drawBackground(ctx, timeMs) {
  // Pastel gradient handled via CSS background, we can just clear rect to let it show through
  // or draw some floating sparkles
  ctx.clearRect(0, 0, W, H);

  // Floating sparkles
  ctx.save();
  const t = timeMs / 1000;
  for (let i = 0; i < 8; i++) {
    const x = (Math.sin(t * 0.5 + i) * 0.5 + 0.5) * W;
    const y = ((t * -20 + i * 100) % H + H) % H;
    const alpha = Math.sin(t * 2 + i) * 0.3 + 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Main Component ────────────────────────────────────────────
export default function KnifeHitGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const audioRef = useRef(null);
  const lastTimeRef = useRef(0);

  const [gamePhase, setGamePhase] = useState('splash'); // splash | playing | levelClear | dead
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('cakehit_best') || '0'));
  const [xuEarned, setXuEarned] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [lives, setLives] = useState(3);

  const xuEarnedRef = useRef(0);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const phaseRef = useRef('splash');
  const livesRef = useRef(3);

  const setPhase = (p) => { phaseRef.current = p; setGamePhase(p); };

  // Calculate layout sizes proportionally
  const logCenter = { x: W / 2, y: H * 0.38 };
  const logRadius = Math.min(W * 0.22, H * 0.12);
  const pouchPos = { x: W / 2, y: H * 0.85 };

  const getCollisionThresholdDeg = () => {
    const hw = KNIFE_HALF_WIDTH + COLLISION_PADDING;
    const r = Math.max(logRadius, 1);
    return (2 * Math.asin(Math.min(1, hw / r))) * 180 / Math.PI;
  };

  const createLevelState = (lvl) => {
    const rotDir = Math.random() < 0.5 ? 1 : -1;
    let rotSpeed = 60 + lvl * 12;
    if (rotSpeed > 230) rotSpeed = 230;

    const apples = [];
    const appleCount = lvl < 2 ? 0 : Math.min(1 + Math.floor(lvl / 3), 4);
    let tries = 0;
    while (apples.length < appleCount && tries < 100) {
      tries++;
      const a = rand(0, 360);
      let ok = true;
      for (const ap of apples) {
        if (angDiff(a, ap.localAngle) < 60) { ok = false; break; }
      }
      if (ok) apples.push({ localAngle: a, collected: false, popT: 0 });
    }

    const stuckKnives = [];
    const preStuckCount = lvl < 3 ? 0 : Math.min(1 + Math.floor(lvl / 4), 4); // Up to 4 pre-stuck knives
    const collisionThresh = getCollisionThresholdDeg() * 1.5; // Safe margin
    tries = 0;
    while (stuckKnives.length < preStuckCount && tries < 100) {
      tries++;
      const a = rand(0, 360);
      let ok = true;
      for (const ap of apples) {
        if (angDiff(a, ap.localAngle) < 30) { ok = false; break; }
      }
      if (!ok) continue;
      for (const k of stuckKnives) {
        if (angDiff(a, k.localAngle) < collisionThresh) { ok = false; break; }
      }
      if (ok) stuckKnives.push({ localAngle: a });
    }

    return {
      logRotation: rand(0, 360),
      rotDir,
      rotSpeed,
      baseRotSpeed: rotSpeed,
      speedTimer: rand(2.0, 4.0),
      isJittering: false,
      dirTimer: rand(4.0, 7.0),
      stuckKnives,
      apples,
      knivesNeeded: Math.min(5 + Math.floor((lvl - 1) * 1.1), 14),
      knivesStuck: 0,
      comboCount: 0,
      lastHitTime: -9999,
      knifeFlying: false,
      flyT: 0,
      shakeMag: 0,
      logWobble: 0,
      floaters: [],
      bounceKnife: null,
      flashAlpha: 0,
      timeMs: 0
    };
  };

  const initState = () => {
    return createLevelState(levelRef.current);
  };

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    levelRef.current = 1;
    xuEarnedRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLevel(1);
    setXuEarned(0);
    setLives(3);
    stateRef.current = initState();
  }, []);

  const nextLevel = () => {
    levelRef.current += 1;
    setLevel(levelRef.current);
    stateRef.current = createLevelState(levelRef.current);

    // Reward for passing level
    xuEarnedRef.current += 5;
    setXuEarned(xuEarnedRef.current);

    setPhase('playing');
  };

  const throwKnife = useCallback(() => {
    const gs = stateRef.current;
    if (!gs || phaseRef.current !== 'playing' || gs.knifeFlying) return;

    if (!audioRef.current) audioRef.current = createAudio();
    audioRef.current.throw();

    gs.knifeFlying = true;
    gs.flyT = 0;
  }, []);

  const triggerGameOver = (hitLocal) => {
    const gs = stateRef.current;
    setPhase('dead');
    if (!audioRef.current) audioRef.current = createAudio();
    audioRef.current.collide();

    gs.shakeMag = 16;
    gs.flashAlpha = 0.6;
    gs.bounceKnife = {
      x: logCenter.x, y: logCenter.y + logRadius,
      vx: rand(-80, 80), vy: -180, rot: 0, vr: rand(-10, 10)
    };

    const finalScore = scoreRef.current;
    const prevBest = parseInt(localStorage.getItem('cakehit_best') || '0');
    if (finalScore > prevBest) {
      localStorage.setItem('cakehit_best', String(finalScore));
      setBest(finalScore);
    }

    if (xuEarnedRef.current > 0) {
      treeService.addReward(xuEarnedRef.current).catch(console.error);
    }
  };

  const resolveHit = () => {
    const gs = stateRef.current;
    const newLocal = norm(IMPACT_ANGLE - gs.logRotation);

    // Check collision
    let collided = false;
    for (const k of gs.stuckKnives) {
      if (angDiff(newLocal, k.localAngle) < getCollisionThresholdDeg()) {
        collided = true; break;
      }
    }

    if (collided) {
      gs.knifeFlying = false;
      gs.comboCount = 0;
      livesRef.current -= 1;
      setLives(livesRef.current);

      if (livesRef.current <= 0) {
        triggerGameOver(newLocal);
      } else {
        if (!audioRef.current) audioRef.current = createAudio();
        audioRef.current.collide();
        gs.shakeMag = 12;
        gs.flashAlpha = 0.5;
        gs.bounceKnife = {
          x: logCenter.x, y: logCenter.y + logRadius,
          vx: rand(-80, 80), vy: -180, rot: 0, vr: rand(-10, 10)
        };
      }
      return;
    }

    // Success hit
    if (gs.timeMs - gs.lastHitTime < 400) {
      gs.comboCount++;
    } else {
      gs.comboCount = 1;
    }
    gs.lastHitTime = gs.timeMs;

    gs.stuckKnives.push({ localAngle: newLocal });
    gs.knivesStuck++;

    if (gs.comboCount >= 5) {
      scoreRef.current += 100;
      xuEarnedRef.current += 5;
      setScore(scoreRef.current);
      setXuEarned(xuEarnedRef.current);
      gs.comboCount = 0;
      if (!audioRef.current) audioRef.current = createAudio();
      audioRef.current.xu();
      gs.shakeMag = 8;
      gs.logWobble = 10;
      gs.floaters.push({ x: logCenter.x, y: logCenter.y - logRadius - 30, txt: 'PERFECT!', t: 0, color: '#ffeb3b', scale: 1.4 });
    } else {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      gs.shakeMag = 6;
      gs.logWobble = 6;
      if (!audioRef.current) audioRef.current = createAudio();
      audioRef.current.thud();
      gs.floaters.push({ x: logCenter.x, y: logCenter.y - logRadius - 10, txt: '+10', t: 0, color: '#ff477e', scale: 1 });
    }

    // Apple (Strawberry) check
    for (const ap of gs.apples) {
      if (!ap.collected && angDiff(newLocal, ap.localAngle) < STRAWBERRY_THRESHOLD) {
        ap.collected = true;
        ap.popT = 0.001;
        scoreRef.current += 30;
        xuEarnedRef.current += 2;
        setScore(scoreRef.current);
        setXuEarned(xuEarnedRef.current);
        audioRef.current.strawberry();
        gs.floaters.push({ x: logCenter.x, y: logCenter.y - logRadius - 28, txt: '+30', t: 0, color: '#ff2a55', scale: 1.2 });
      }
    }

    gs.knifeFlying = false;

    if (gs.knivesStuck >= gs.knivesNeeded) {
      setPhase('levelClear');
      audioRef.current.level();
      setTimeout(() => {
        if (phaseRef.current === 'levelClear') nextLevel();
      }, 1000);
    }
  };

  const handleInteract = useCallback(() => {
    if (phaseRef.current === 'splash') {
      resetGame();
      setPhase('playing');
    } else if (phaseRef.current === 'playing') {
      throwKnife();
    }
  }, [throwKnife, resetGame]);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = initState();

    const loop = (timestamp) => {
      let dt = (timestamp - lastTimeRef.current) / 1000;
      if (dt > 0.05) dt = 0.05;
      lastTimeRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);

      const gs = stateRef.current;
      if (!gs) return;

      const phase = phaseRef.current;
      gs.timeMs = timestamp;

      // UPDATE
      if (phase === 'playing' || phase === 'levelClear' || phase === 'dead') {
        // Log rotation
        if (phase !== 'dead') {
          if (levelRef.current >= 2 && phase === 'playing') {
            gs.speedTimer -= dt;
            if (gs.speedTimer <= 0) {
              if (gs.isJittering) {
                gs.isJittering = false;
                gs.rotSpeed = gs.baseRotSpeed;
                gs.speedTimer = rand(2.0, 5.0);
              } else {
                gs.isJittering = true;
                const r = Math.random();
                if (r < 0.4) gs.rotSpeed = gs.baseRotSpeed * 0.5; // slow down softer
                else if (r < 0.6) gs.rotSpeed = 0; // stop
                else gs.rotSpeed = gs.baseRotSpeed * 1.4; // speed up softer
                gs.speedTimer = rand(0.1, 0.3); // jitter duration shorter
              }
            }
          }

          gs.logRotation = norm(gs.logRotation + gs.rotDir * gs.rotSpeed * dt);

          if (levelRef.current >= 4 && phase === 'playing') {
            gs.dirTimer -= dt;
            if (gs.dirTimer <= 0) {
              gs.rotDir *= -1;
              gs.dirTimer = rand(3.5, 6.0 - Math.min(levelRef.current * 0.05, 1.5));
              gs.shakeMag = Math.max(gs.shakeMag, 2);
            }
          }
        }

        // Flying knife
        if (gs.knifeFlying) {
          gs.flyT += dt / FLY_DUR;
          if (gs.flyT >= 1) {
            gs.flyT = 1;
            resolveHit();
          }
        }

        // Bounce knife (game over)
        if (gs.bounceKnife) {
          gs.bounceKnife.x += gs.bounceKnife.vx * dt;
          gs.bounceKnife.y += gs.bounceKnife.vy * dt;
          gs.bounceKnife.vy += 600 * dt; // gravity
          gs.bounceKnife.rot += gs.bounceKnife.vr * dt * 60;
        }

        // Floaters
        gs.floaters.forEach(f => f.t += dt);
        gs.floaters = gs.floaters.filter(f => f.t < 0.9);

        // Flash alpha fade
        if (gs.flashAlpha > 0) gs.flashAlpha = Math.max(0, gs.flashAlpha - dt * 2);

        // Shake dampening
        if (gs.shakeMag > 0.1) gs.shakeMag *= 0.88; else gs.shakeMag = 0;
        if (gs.logWobble > 0.1) gs.logWobble *= 0.9; else gs.logWobble = 0;
      } else if (phase === 'splash') {
        gs.logRotation = norm(gs.logRotation + 40 * dt);
      }

      // DRAW
      drawBackground(ctx, gs.timeMs);

      let sx = 0, sy = 0;
      if (gs.shakeMag > 0) {
        sx = rand(-gs.shakeMag, gs.shakeMag);
        sy = rand(-gs.shakeMag, gs.shakeMag);
      }

      ctx.save();
      ctx.translate(sx, sy);

      // Target (Cake)
      drawCake(ctx, logCenter.x, logCenter.y, logRadius, gs.logRotation, gs.logWobble, gs.timeMs);

      // Stuck Knives
      for (const k of gs.stuckKnives) {
        const screenAngle = norm(k.localAngle + gs.logRotation);
        const p = polarPoint(logCenter.x, logCenter.y, logRadius, screenAngle);
        drawFork(ctx, p.x, p.y, screenAngle, 1, true);
      }

      // Strawberries
      for (const ap of gs.apples) {
        if (ap.collected) {
          if (ap.popT > 0 && ap.popT < 0.4) ap.popT += dt;
          else continue;
        }
        const screenAngle = norm(ap.localAngle + gs.logRotation);
        const p = polarPoint(logCenter.x, logCenter.y, logRadius * 0.78, screenAngle);
        drawStrawberry(ctx, p.x, p.y, screenAngle, ap.collected ? ap.popT : 0);
      }

      // Flying Knife
      if (gs.knifeFlying) {
        const startY = pouchPos.y;
        const endY = logCenter.y + logRadius - 6;
        const y = startY + (endY - startY) * gs.flyT;
        drawFork(ctx, logCenter.x, y, IMPACT_ANGLE, 1, false);
      }

      // Pouch (Waiting knives)
      if (phase === 'playing' || phase === 'levelClear') {
        const remaining = Math.max(0, gs.knivesNeeded - gs.knivesStuck - (gs.knifeFlying ? 1 : 0));
        for (let i = 0; i < Math.min(remaining, 6); i++) {
          drawFork(ctx, pouchPos.x, pouchPos.y + 8 + i * 10, IMPACT_ANGLE, 0.65, false);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${remaining} nĩa còn lại`, pouchPos.x, pouchPos.y + 66);
      }

      // Bouncing Knife
      if (gs.bounceKnife) {
        drawFork(ctx, gs.bounceKnife.x, gs.bounceKnife.y, gs.bounceKnife.rot, 1, false);
      }

      // Floaters
      for (const f of gs.floaters) {
        ctx.save();
        ctx.globalAlpha = 1 - f.t / 0.9;
        const s = f.scale || 1;
        ctx.font = `bold ${18 * s}px Bungee, cursive`;
        ctx.textAlign = 'center';

        // Add strong outline for visibility
        ctx.lineJoin = 'round';
        if (s > 1.2) {
          ctx.strokeStyle = '#ff477e'; // Pink border for PERFECT
          ctx.lineWidth = 5 * s;
        } else {
          ctx.strokeStyle = '#fff'; // White border for normal texts
          ctx.lineWidth = 3 * s;
        }
        ctx.strokeText(f.txt, f.x, f.y - f.t * 30 * s);

        ctx.fillStyle = f.color;
        ctx.fillText(f.txt, f.x, f.y - f.t * 30 * s);
        ctx.restore();
      }

      ctx.restore(); // end shake

      // Overlays
      if (phase === 'splash') {
        drawSplash(ctx, gs.timeMs);
      } else if (phase === 'levelClear') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 22px Bungee, cursive';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 8;
        ctx.fillText('MÀN ' + levelRef.current + ' HOÀN THÀNH!', W / 2, H * 0.22);
        ctx.fillStyle = '#ff477e';
        ctx.font = 'bold 16px Nunito, sans-serif';
        ctx.fillText('+5 xu', W / 2, H * 0.22 + 28);
        ctx.shadowBlur = 0;
      }

      // Flash overlay
      if (gs.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${gs.flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e) => { e.preventDefault(); handleInteract(); };
    canvas.addEventListener('pointerdown', onDown, { passive: false });
    return () => canvas.removeEventListener('pointerdown', onDown);
  }, [handleInteract]);

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') handleInteract(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInteract]);

  const confirmExit = () => {
    if (xuEarned > 0) treeService.addReward(xuEarned).catch(console.error);
    navigate('/games');
  };

  return (
    <div className="cakehit-container">
      {/* Header */}
      <div className="cakehit-header">
        <button className="cakehit-back-btn" onClick={() => {
          if (phaseRef.current === 'playing' && xuEarned > 0) setShowExitModal(true);
          else navigate('/games');
        }}>
          <ArrowLeft size={20} />
        </button>
        <div className="cakehit-xu-badge">{xuEarned} xu</div>
      </div>

      {gamePhase === 'playing' && (
        <div className="cakehit-hud-center">
          <div className="cakehit-level-badge">MÀN {level}</div>
          <div className="cakehit-score-display">{score}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
            {[...Array(3)].map((_, i) => (
              <Heart key={i} size={20} fill={i < lives ? '#ff2a55' : 'transparent'} color={i < lives ? '#ff2a55' : '#fff'} style={{ opacity: i < lives ? 1 : 0.5 }} />
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="cakehit-canvas" />

      {/* Game Over Modal */}
      <AnimatePresence>
        {gamePhase === 'dead' && (
          <motion.div className="cakehit-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="cakehit-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <h2 className="cakehit-modal-title">Trúng nĩa rồi!</h2>
              <div className="cakehit-modal-score-row">
                <div className="cakehit-modal-score-box">
                  <label>Điểm</label>
                  <span>{score}</span>
                </div>
                <div className="cakehit-modal-score-box">
                  <label>Kỷ lục</label>
                  <span>{best}</span>
                </div>
              </div>
              <div className="cakehit-modal-reward">
                Nhận được tổng cộng <span>+{xuEarned} xu</span>
              </div>
              <button className="cakehit-btn-primary" onClick={() => { resetGame(); setPhase('playing'); }}>
                Chơi Lại
              </button>
              <button className="cakehit-btn-secondary" onClick={() => navigate('/games')}>
                Về sảnh
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div className="cakehit-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="cakehit-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <h2 className="cakehit-modal-title">Nghỉ ngơi chút?</h2>
              <div className="cakehit-modal-reward">
                Bạn đã kiếm được <span>+{xuEarned} xu</span>.<br />Thoát bây giờ vẫn nhận đủ xu!
              </div>
              <button className="cakehit-btn-primary" onClick={confirmExit}>
                Nhận {xuEarned} xu & Thoát
              </button>
              <button className="cakehit-btn-secondary" onClick={() => setShowExitModal(false)}>
                Chơi tiếp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
