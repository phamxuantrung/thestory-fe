import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treeService } from '../services/treeService';
import './BrickBreakerGame.css';

// ─── Constants & Config ───────────────────────────────────────────────
const W = 400;
const H = 700;
const ROWS = 10;
const COLS = 8;
const BRICK_W = W / COLS;
const BRICK_H = 26;
const PADDLE_W = 80;
const PADDLE_H = 20;
const PADDLE_Y = H - 80;
const BALL_R = 6;
const BIG_BALL_R = 12;
const BASE_BALL_SPEED = 550; // px per sec
const POWERUP_R = 12;
const LASER_SPEED = -400;
const LASER_W = 4;
const LASER_H = 16;
const BRICK_CREEP_SPEED = 10; // px per sec when moving down
const MAX_LEVEL = 60;
const TOP_MARGIN = 110; // top space for HUD and escape zone

// Powerup Types
const PU_TYPES = ['STRETCH', 'MULTIBALL', 'BIGBALL', 'LASER', 'SLOW', 'UP', 'EXTRALIFE'];
const PU_COLORS = {
  'STRETCH': '#4299e1',   // Blue
  'MULTIBALL': '#48bb78', // Green
  'BIGBALL': '#ed8936',   // Orange
  'LASER': '#f56565',     // Red
  'SLOW': '#9f7aea',      // Purple
  'UP': '#38b2ac',        // Teal
  'EXTRALIFE': '#ed64a6'  // Pink
};

function rand(min, max) { return Math.random() * (max - min) + min; }

// ─── Audio ────────────────────────────────────────────────────────
function createAudio() {
  let actx = null;
  const getCtx = () => {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => { });
    return actx;
  };
  const beep = (freq, dur, type = 'sine', vol = 0.1) => {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch (_) { }
  };
  return {
    bounce: () => beep(500, 0.05, 'sine', 0.1),
    brick: () => beep(800, 0.08, 'square', 0.1),
    iron: () => beep(200, 0.05, 'sawtooth', 0.1),
    powerup: () => { beep(600, 0.1, 'sine', 0.15); setTimeout(() => beep(900, 0.15, 'sine', 0.15), 100); },
    laser: () => beep(1200, 0.05, 'square', 0.05),
    die: () => { beep(200, 0.3, 'sawtooth', 0.2); beep(150, 0.4, 'square', 0.2); },
    win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.15), i * 100)); }
  };
}

// ─── Procedural Level Gen ───────────────────────────────────────
function generateLevel(lvl) {
  // Start with 2 rows at level 1, add 1 row every 2 levels, max 8 rows
  const rows = Math.min(8, 2 + Math.floor((lvl - 1) / 2));
  const bricks = [];
  const marginX = 3;
  const marginY = 3;
  const diffFactor = Math.min(lvl / MAX_LEVEL, 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      // Leave gaps more frequently (25% empty to reduce overall blocks)
      if (Math.random() < 0.25) continue;

      let type = 1; // 1 hit
      let isUnbreakable = false;

      // Unbreakable chance (reduced)
      if (r > 0 && lvl >= 5 && Math.random() < Math.min(0.1, 0.015 * lvl)) {
        isUnbreakable = true;
      } else {
        if (Math.random() < diffFactor * 0.4) type = 2; // 2 hits
        if (Math.random() < diffFactor * 0.2) type = 3; // 3 hits
      }

      bricks.push({
        r, c,
        x: c * BRICK_W + 3,
        y: TOP_MARGIN + r * BRICK_H + 3,
        type,
        isUnbreakable,
        w: BRICK_W - 6,
        h: BRICK_H - 6,
        color: isUnbreakable ? '#718096' : (type === 3 ? '#e53e3e' : type === 2 ? '#dd6b20' : '#ecc94b')
      });
    }
  }
  return bricks;
}

// ─── Drawing Helpers ───────────────────────────────────────────
function drawCloud(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // Base pill
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, h * 0.3, w, h * 0.7, h * 0.35) : ctx.rect(0, h * 0.3, w, h * 0.7);
  ctx.fill();

  // Puffs
  ctx.beginPath();
  ctx.arc(w * 0.2, h * 0.3, h * 0.4, 0, Math.PI * 2);
  ctx.arc(w * 0.5, h * 0.1, h * 0.5, 0, Math.PI * 2);
  ctx.arc(w * 0.8, h * 0.3, h * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Cloud Face!
  ctx.fillStyle = '#4a5568';
  ctx.shadowBlur = 0;
  const cx = w / 2;
  const cy = h * 0.55;
  ctx.beginPath(); ctx.arc(cx - 8, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 8, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy + 2, 3, 0, Math.PI, false); ctx.fill(); // smile
  ctx.fillStyle = 'rgba(255,105,180,0.5)';
  ctx.beginPath(); ctx.arc(cx - 14, cy + 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 14, cy + 3, 3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawStar(ctx, b, timeMs) {
  const { x, y, r, isBig, history } = b;
  const sr = r * (isBig ? 1.6 : 1.5); // Visual radius is slightly larger than hitbox for fluffiness

  // Draw Rainbow Trail
  // Segmented Tapering Trail with Glow
  if (history && history.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'screen';

    const pts = [{ x, y }, ...history];
    for (let i = 0; i < pts.length - 1; i++) {
      const pt1 = pts[i];
      const pt2 = pts[i + 1];
      const progress = i / (pts.length - 1);

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);

      // Tapering width (thick at head, thin at tail)
      const thickness = Math.pow(1 - progress, 0.7);
      ctx.lineWidth = sr * 1.2 * thickness;

      // Color mapping
      let r, g, b, a;
      if (progress < 0.3) {
        const t = progress / 0.3;
        r = 254 * (1 - t) + 251 * t; g = 240 * (1 - t) + 191 * t; b = 138 * (1 - t) + 36 * t; a = 1 * (1 - t) + 0.8 * t;
      } else if (progress < 0.7) {
        const t = (progress - 0.3) / 0.4;
        r = 251 * (1 - t) + 244 * t; g = 191 * (1 - t) + 114 * t; b = 36 * (1 - t) + 182 * t; a = 0.8 * (1 - t) + 0.5 * t;
      } else {
        const t = (progress - 0.7) / 0.3;
        r = 244 * (1 - t) + 167 * t; g = 114 * (1 - t) + 139 * t; b = 182 * (1 - t) + 250 * t; a = 0.5 * (1 - t) + 0 * t;
      }

      ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
      ctx.shadowColor = `rgba(${r},${g},${b},${a * 0.8})`;
      ctx.shadowBlur = sr * 1.5;

      ctx.stroke();
    }

    // Sparkles around the trail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 1; i < history.length; i += 3) {
      const pt = history[i];
      const ox = Math.sin(timeMs / 150 + i) * sr * 1.5;
      const oy = Math.cos(timeMs / 150 + i) * sr * 1.5;
      ctx.beginPath();
      ctx.arc(pt.x + ox, pt.y + oy, sr * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw Star Body
  ctx.save();
  ctx.translate(x, y);

  // Tilt slightly based on velocity
  const tilt = Math.max(-0.3, Math.min(0.3, (b.vx || 0) / 1000));
  ctx.rotate(tilt);

  // Core shape path
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = i * (Math.PI * 2 / 5) - Math.PI / 2;
    const a2 = a1 + (Math.PI / 5);
    ctx.lineTo(Math.cos(a1) * sr, Math.sin(a1) * sr);
    ctx.lineTo(Math.cos(a2) * (sr * 0.45), Math.sin(a2) * (sr * 0.45));
  }
  ctx.closePath();

  // Shadow
  ctx.shadowColor = isBig ? '#ed8936' : '#ecc94b';
  ctx.shadowBlur = isBig ? 16 : 10;

  // Thick rounded outer stroke (Orange)
  ctx.lineJoin = 'round';
  ctx.lineWidth = sr * 0.35;
  ctx.strokeStyle = '#e67e22';
  ctx.stroke();

  ctx.shadowBlur = 0; // Turn off shadow for inner drawing

  // Inner gradient fill
  const bodyGrad = ctx.createLinearGradient(-sr, -sr, sr, sr);
  bodyGrad.addColorStop(0, '#fff382');
  bodyGrad.addColorStop(1, '#ffb822');

  // Stroke and fill with gradient to smooth out the inner corners
  ctx.strokeStyle = bodyGrad;
  ctx.lineWidth = sr * 0.15;
  ctx.stroke();
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Glossy Highlights (White blobs)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-sr * 0.1, -sr * 0.65, sr * 0.15, sr * 0.3, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-sr * 0.7, -sr * 0.15, sr * 0.15, sr * 0.08, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Cute face (Upright)
  const eyeColor = '#321b4d';

  // Cheeks
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath(); ctx.ellipse(-sr * 0.45, sr * 0.15, sr * 0.18, sr * 0.12, -Math.PI / 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sr * 0.45, sr * 0.15, sr * 0.18, sr * 0.12, Math.PI / 12, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = eyeColor;
  ctx.beginPath(); ctx.arc(-sr * 0.25, 0, sr * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sr * 0.25, 0, sr * 0.12, 0, Math.PI * 2); ctx.fill();

  // Eye glints
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(-sr * 0.28, -sr * 0.03, sr * 0.05, 0, Math.PI * 2); ctx.fill(); // Left big
  ctx.beginPath(); ctx.arc(-sr * 0.20, 0.03, sr * 0.02, 0, Math.PI * 2); ctx.fill(); // Left small
  ctx.beginPath(); ctx.arc(sr * 0.22, -sr * 0.03, sr * 0.05, 0, Math.PI * 2); ctx.fill(); // Right big
  ctx.beginPath(); ctx.arc(sr * 0.30, 0.03, sr * 0.02, 0, Math.PI * 2); ctx.fill(); // Right small

  // Smiling open mouth
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(0, sr * 0.12, sr * 0.15, 0, Math.PI, false); // semi circle
  ctx.fill();

  // Tongue
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, sr * 0.12, sr * 0.15, 0, Math.PI, false);
  ctx.clip();
  ctx.fillStyle = '#ff4d88';
  ctx.beginPath(); ctx.arc(0, sr * 0.22, sr * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBrick(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  // Define Colors
  let gradTop, gradBot, rimColor, bevelColor;
  if (b.isUnbreakable) {
    gradTop = '#cbd5e1'; gradBot = '#94a3b8'; rimColor = '#64748b'; bevelColor = '#475569';
  } else if (b.type === 1) {
    gradTop = '#ffe66d'; gradBot = '#ffaa00'; rimColor = '#f59e0b'; bevelColor = '#d97706';
  } else if (b.type === 2) {
    gradTop = '#ffb04f'; gradBot = '#f97316'; rimColor = '#ea580c'; bevelColor = '#c2410c';
  } else if (b.type === 3) {
    gradTop = '#fb7185'; gradBot = '#e11d48'; rimColor = '#be123c'; bevelColor = '#881337';
  } else {
    // Fallback
    gradTop = '#cbd5e1'; gradBot = '#94a3b8'; rimColor = '#64748b'; bevelColor = '#475569';
  }

  const rad = 6; // Corner radius
  const bw = b.w;
  const bh = b.h;

  // 1. Bottom 3D Bevel
  ctx.fillStyle = bevelColor;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, 3, bw, bh, rad) : ctx.rect(0, 3, bw, bh);
  ctx.fill();

  // 2. Main Block Rim (Outline)
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, 0, bw, bh, rad) : ctx.rect(0, 0, bw, bh);
  ctx.fill();

  // 3. Inner Gradient
  const grad = ctx.createLinearGradient(0, 0, bw, bh);
  grad.addColorStop(0, gradTop);
  grad.addColorStop(1, gradBot);

  const inset = 2;
  const innerR = rad - 1;

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(inset, inset, bw - inset * 2, bh - inset * 2, innerR) : ctx.rect(inset, inset, bw - inset * 2, bh - inset * 2);
  ctx.fill();

  // Draw details inside inner area
  ctx.save();
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(inset, inset, bw - inset * 2, bh - inset * 2, innerR) : ctx.rect(inset, inset, bw - inset * 2, bh - inset * 2);
  ctx.clip();

  // Diagonal shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(bw * 0.4, 0);
  ctx.lineTo(bw * 0.9, 0);
  ctx.lineTo(bw * 0.5, bh);
  ctx.lineTo(0, bh);
  ctx.closePath();
  ctx.fill();

  if (!b.isUnbreakable) {
    // Faint Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    const drawMiniStar = (sx, sy, sr, rot) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = i * (Math.PI * 2 / 5) - Math.PI / 2;
        const a2 = a1 + (Math.PI / 5);
        ctx.lineTo(Math.cos(a1) * sr, Math.sin(a1) * sr);
        ctx.lineTo(Math.cos(a2) * (sr * 0.4), Math.sin(a2) * (sr * 0.4));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawMiniStar(bw * 0.35, bh * 0.5, 4, 0.2);
    drawMiniStar(bw * 0.8, bh * 0.4, 3, -0.3);
    drawMiniStar(bw * 0.2, bh * 0.7, 2, 0.5);

    // Sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath(); ctx.arc(bw * 0.55, bh * 0.3, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bw * 0.65, bh * 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bw * 0.85, bh * 0.7, 1, 0, Math.PI * 2); ctx.fill();
  } else {
    // Unbreakable Rivets
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(6, 6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bw - 6, 6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, bh - 6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bw - 6, bh - 6, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  // Glossy Highlights (Top Edge Pill)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(inset + 2, inset + 1.5, bw * 0.6, 2.5, 1.25) : ctx.rect(inset + 2, inset + 1.5, bw * 0.6, 2.5);
  ctx.fill();

  ctx.restore();
}

function drawPowerup(ctx, p, timeMs) {
  ctx.save();
  const bob = Math.sin((timeMs || 0) / 200 + p.x) * 3;
  ctx.translate(p.x, p.y + bob);

  const baseColor = PU_COLORS[p.type] || '#fff';
  const r = POWERUP_R * 1.3;

  // Outer glow
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();

  // Thick white border
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  // Inner subtle shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Draw the icons large and bold
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Drop shadow for icon to pop
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1.5;

  ctx.beginPath();
  if (p.type === 'STRETCH') {
    ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.fill();
  } else if (p.type === 'MULTIBALL') {
    ctx.arc(-5, 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath();
    ctx.arc(5, 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath();
    ctx.arc(0, -5, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'BIGBALL') {
    ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'LASER') {
    ctx.moveTo(2, -8); ctx.lineTo(-4, 1); ctx.lineTo(1, 1); ctx.lineTo(-2, 8); ctx.lineTo(4, -1); ctx.lineTo(-1, -1); ctx.fill();
  } else if (p.type === 'SLOW') {
    ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 0); ctx.lineTo(3, 3); ctx.stroke();
  } else if (p.type === 'UP') {
    ctx.moveTo(-5, 0); ctx.lineTo(0, -5); ctx.lineTo(5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(0, 0); ctx.lineTo(5, 5); ctx.stroke();
  } else if (p.type === 'EXTRALIFE') {
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-7, 0, -9, -4, -5, -7);
    ctx.bezierCurveTo(-2, -9, 0, -5, 0, -5);
    ctx.bezierCurveTo(0, -5, 2, -9, 5, -7);
    ctx.bezierCurveTo(9, -4, 7, 0, 0, 5);
    ctx.fill();
  }

  // High-contrast glossy reflection on top of the whole badge
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.6, r * 0.6, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Math intersection AABB vs Circle
function circleRectCollide(circle, rect) {
  let testX = circle.x;
  let testY = circle.y;

  if (circle.x < rect.x) testX = rect.x;
  else if (circle.x > rect.x + rect.w) testX = rect.x + rect.w;

  if (circle.y < rect.y) testY = rect.y;
  else if (circle.y > rect.y + rect.h) testY = rect.y + rect.h;

  let distX = circle.x - testX;
  let distY = circle.y - testY;
  let distance = Math.sqrt((distX * distX) + (distY * distY));

  return distance <= circle.r;
}

// ─── Main Component ──────────────────────────────────────────────
export default function BrickBreakerGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const audioRef = useRef(null);
  const lastTimeRef = useRef(0);

  const [gamePhase, setGamePhase] = useState('splash'); // splash, playing, gameover
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [xuEarned, setXuEarned] = useState(0);

  const xuEarnedRef = useRef(0);
  const levelRef = useRef(1);
  const livesRef = useRef(3);
  const phaseRef = useRef('splash');

  const setPhase = (p) => { phaseRef.current = p; setGamePhase(p); };

  const createLevelState = (lvl) => {
    const initAngle = Math.PI / 2 + rand(-Math.PI / 6, Math.PI / 6);
    return {
      paddle: { x: W / 2 - PADDLE_W / 2, w: PADDLE_W },
      balls: [{ x: W / 2, y: PADDLE_Y - BALL_R - 1, vx: Math.cos(initAngle) * BASE_BALL_SPEED, vy: -Math.sin(initAngle) * BASE_BALL_SPEED, r: BALL_R, isBig: false, history: [] }],
      bricks: generateLevel(lvl),
      powerups: [],
      lasers: [],
      activeEffects: { stretch: 0, big: 0, laser: 0, slow: 0 },
      timeSinceStart: 0,
      brickOffsetY: 0,
      creepingDown: false,
      flashAlpha: 0,
      laserTimer: 0
    };
  };

  const initState = () => createLevelState(levelRef.current);

  const resetGame = useCallback(() => {
    levelRef.current = 1;
    livesRef.current = 3;
    xuEarnedRef.current = 0;
    setLevel(1);
    setLives(3);
    setXuEarned(0);
    stateRef.current = initState();
  }, []);

  const handlePointerMove = (e) => {
    if (phaseRef.current !== 'playing' || !stateRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    let clientX = e.clientX;
    if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;

    let x = (clientX - rect.left) * scaleX;
    const p = stateRef.current.paddle;
    p.x = Math.max(0, Math.min(W - p.w, x - p.w / 2));
  };

  const handleInteract = useCallback(() => {
    if (phaseRef.current === 'splash') {
      resetGame();
      setPhase('playing');
    } else if (phaseRef.current === 'gameover') {
      resetGame();
      setPhase('playing');
    }
  }, [resetGame]);

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
      if (dt > 0.05) dt = 0.05; // clamp delta
      lastTimeRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);

      const gs = stateRef.current;
      if (!gs) return;

      const phase = phaseRef.current;

      // UPDATE
      if (phase === 'playing') {
        gs.timeSinceStart += dt;

        // Effects duration
        for (let key in gs.activeEffects) {
          if (gs.activeEffects[key] > 0) {
            gs.activeEffects[key] -= dt;
            if (gs.activeEffects[key] <= 0) gs.activeEffects[key] = 0;
          }
        }

        // Apply stretch
        gs.paddle.w = gs.activeEffects.stretch > 0 ? PADDLE_W * 1.6 : PADDLE_W;

        // Keep paddle in bounds
        if (gs.paddle.x > W - gs.paddle.w) gs.paddle.x = W - gs.paddle.w;

        // Brick creeping logic
        const creepDelay = Math.max(30 - levelRef.current * 0.2, 10);
        if (gs.timeSinceStart > creepDelay && gs.activeEffects.slow === 0) {
          gs.creepingDown = true;
        } else {
          gs.creepingDown = false;
        }

        if (gs.creepingDown) {
          gs.brickOffsetY += BRICK_CREEP_SPEED * dt;
        }
        if (gs.activeEffects.up > 0) {
          gs.brickOffsetY = 0; // instareset
          gs.timeSinceStart = 0; // reset the creep timer so player gets a breather
          gs.activeEffects.up = 0;
        }

        // Fire lasers
        if (gs.activeEffects.laser > 0) {
          gs.laserTimer += dt;
          if (gs.laserTimer > 0.4) {
            gs.laserTimer = 0;
            gs.lasers.push({ x: gs.paddle.x + 10, y: PADDLE_Y });
            gs.lasers.push({ x: gs.paddle.x + gs.paddle.w - 10, y: PADDLE_Y });
            if (!audioRef.current) audioRef.current = createAudio();
            audioRef.current.laser();
          }
        }

        // Move lasers
        gs.lasers.forEach(l => l.y += LASER_SPEED * dt);
        gs.lasers = gs.lasers.filter(l => l.y > 0);

        // Move powerups
        gs.powerups.forEach(p => p.y += 150 * dt);

        // Powerup collision
        gs.powerups = gs.powerups.filter(p => {
          if (p.y - POWERUP_R > H) return false;
          // Collide with paddle
          if (p.y + POWERUP_R > PADDLE_Y && p.y - POWERUP_R < PADDLE_Y + PADDLE_H &&
            p.x + POWERUP_R > gs.paddle.x && p.x - POWERUP_R < gs.paddle.x + gs.paddle.w) {

            if (!audioRef.current) audioRef.current = createAudio();
            audioRef.current.powerup();

            switch (p.type) {
              case 'STRETCH': gs.activeEffects.stretch = 10; break;
              case 'MULTIBALL':
                if (gs.balls.length > 0) {
                  const base = gs.balls[0];
                  gs.balls.push({ ...base, vx: base.vx - 100, vy: -Math.abs(base.vy), history: [] });
                  gs.balls.push({ ...base, vx: base.vx + 100, vy: -Math.abs(base.vy), history: [] });
                }
                break;
              case 'BIGBALL': gs.activeEffects.big = 10; break;
              case 'LASER': gs.activeEffects.laser = 10; break;
              case 'SLOW': gs.activeEffects.slow = 10; break;
              case 'UP': gs.activeEffects.up = 1; break;
              case 'EXTRALIFE':
                livesRef.current++;
                setLives(livesRef.current);
                break;
            }
            return false;
          }
          return true;
        });

        const timeScale = gs.activeEffects.slow > 0 ? 0.6 : 1.0;

        // Move balls
        for (let i = gs.balls.length - 1; i >= 0; i--) {
          const b = gs.balls[i];
          if (!b.history) b.history = [];
          b.history.unshift({ x: b.x, y: b.y });
          if (b.history.length > 15) b.history.pop();

          b.isBig = gs.activeEffects.big > 0;
          b.r = b.isBig ? BIG_BALL_R : BALL_R;

          b.x += b.vx * dt * timeScale;
          b.y += b.vy * dt * timeScale;

          // Wall bounce with anti-horizontal lock
          const nudgeWallBounce = (ball) => {
            ball.vy += (Math.random() - 0.5) * 60; // random nudge
            if (Math.abs(ball.vy) < BASE_BALL_SPEED * 0.25) {
              ball.vy = Math.sign(ball.vy || 1) * BASE_BALL_SPEED * 0.25;
            }
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const scale = BASE_BALL_SPEED / Math.max(speed, 1);
            ball.vx *= scale;
            ball.vy *= scale;

            if (!audioRef.current) audioRef.current = createAudio();
            audioRef.current.bounce();
          };

          if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; nudgeWallBounce(b); }
          if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -1; nudgeWallBounce(b); }
          // Top ceiling - wait, win condition is reaching top screen!
          // If it reaches top, we don't bounce. We win!
          if (b.y < TOP_MARGIN * 0.5) {
            if (!audioRef.current) audioRef.current = createAudio();
            audioRef.current.win();
            xuEarnedRef.current += 10;
            setXuEarned(xuEarnedRef.current);

            // Instantly load next level
            levelRef.current += 1;
            setLevel(levelRef.current);
            stateRef.current = createLevelState(levelRef.current);

            // Trigger swipe animation
            setIsSwiping(true);
            setTimeout(() => setIsSwiping(false), 600);

            break; // Stop processing loop
          }

          // Paddle bounce
          if (b.vy > 0 && b.y + b.r >= PADDLE_Y && b.y - b.r <= PADDLE_Y + PADDLE_H) {
            if (b.x >= gs.paddle.x && b.x <= gs.paddle.x + gs.paddle.w) {
              b.y = PADDLE_Y - b.r;
              b.vy *= -1;
              // Add english (spin) based on where it hit the paddle
              const hitPos = (b.x - (gs.paddle.x + gs.paddle.w / 2)) / (gs.paddle.w / 2);
              // Angle from 0.46 * PI (82.8 deg) off vertical max (almost horizontal!)
              let angle = Math.PI / 2 - (hitPos * Math.PI * 0.46);
              b.vx = Math.cos(angle) * BASE_BALL_SPEED;
              b.vy = -Math.sin(angle) * BASE_BALL_SPEED;

              if (!audioRef.current) audioRef.current = createAudio();
              audioRef.current.bounce();
            }
          }

          // Fall off bottom
          if (b.y - b.r > H) {
            gs.balls.splice(i, 1);
          }
        }

        if (phaseRef.current === 'levelClear') return; // Early exit if won

        if (gs.balls.length === 0) {
          // Lose life
          livesRef.current--;
          setLives(livesRef.current);
          if (!audioRef.current) audioRef.current = createAudio();
          audioRef.current.die();

          if (livesRef.current <= 0) {
            setPhase('gameover');
            if (xuEarnedRef.current > 0) treeService.addReward(xuEarnedRef.current).catch(console.error);
          } else {
            const initAngle = Math.PI / 2 + rand(-Math.PI / 6, Math.PI / 6);
            gs.balls = [{ x: gs.paddle.x + gs.paddle.w / 2, y: PADDLE_Y - BALL_R - 1, vx: Math.cos(initAngle) * BASE_BALL_SPEED, vy: -Math.sin(initAngle) * BASE_BALL_SPEED, r: BALL_R, isBig: false, history: [] }];
            gs.brickOffsetY = 0;
            gs.creepingDown = false;
            gs.timeSinceStart = 0;
          }
        }

        // Brick collision (Ball)
        for (const b of gs.balls) {
          for (let i = gs.bricks.length - 1; i >= 0; i--) {
            const br = gs.bricks[i];
            const brRect = { x: br.x, y: br.y + gs.brickOffsetY, w: br.w, h: br.h };

            // Overlap AABB check
            if (b.x + b.r > brRect.x && b.x - b.r < brRect.x + brRect.w &&
              b.y + b.r > brRect.y && b.y - b.r < brRect.y + brRect.h) {

              if (!audioRef.current) audioRef.current = createAudio();

              const overlapLeft = (b.x + b.r) - brRect.x;
              const overlapRight = (brRect.x + brRect.w) - (b.x - b.r);
              const overlapTop = (b.y + b.r) - brRect.y;
              const overlapBottom = (brRect.y + brRect.h) - (b.y - b.r);
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

              if (br.isUnbreakable) {
                audioRef.current.iron();
                if (!b.isBig) {
                  if (minOverlap === overlapLeft) { b.vx = -Math.abs(b.vx); b.x = brRect.x - b.r; }
                  else if (minOverlap === overlapRight) { b.vx = Math.abs(b.vx); b.x = brRect.x + brRect.w + b.r; }
                  else if (minOverlap === overlapTop) { b.vy = -Math.abs(b.vy); b.y = brRect.y - b.r; }
                  else if (minOverlap === overlapBottom) { b.vy = Math.abs(b.vy); b.y = brRect.y + brRect.h + b.r; }
                }
              } else {
                audioRef.current.brick();
                br.type--;

                if (br.type <= 0) {
                  gs.bricks.splice(i, 1);
                  if (Math.random() < 0.25) {
                    const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
                    gs.powerups.push({ x: brRect.x + br.w / 2, y: brRect.y + br.h / 2, type });
                  }
                }

                if (!b.isBig) {
                  if (minOverlap === overlapLeft) { b.vx = -Math.abs(b.vx); b.x = brRect.x - b.r; }
                  else if (minOverlap === overlapRight) { b.vx = Math.abs(b.vx); b.x = brRect.x + brRect.w + b.r; }
                  else if (minOverlap === overlapTop) { b.vy = -Math.abs(b.vy); b.y = brRect.y - b.r; }
                  else if (minOverlap === overlapBottom) { b.vy = Math.abs(b.vy); b.y = brRect.y + brRect.h + b.r; }
                }
              }
              break; // Fix tunneling: stop processing other bricks in this frame for this ball
            }
          }
        }

        // Brick collision (Lasers)
        for (let j = gs.lasers.length - 1; j >= 0; j--) {
          const l = gs.lasers[j];
          let hit = false;
          for (let i = gs.bricks.length - 1; i >= 0; i--) {
            const br = gs.bricks[i];
            const brRect = { x: br.x, y: br.y + gs.brickOffsetY, w: br.w, h: br.h };
            if (l.x > brRect.x && l.x < brRect.x + brRect.w && l.y > brRect.y && l.y < brRect.y + brRect.h) {
              hit = true;
              if (!br.isUnbreakable) {
                br.type--;
                if (br.type === 2) br.color = '#dd6b20';
                if (br.type === 1) br.color = '#ecc94b';
                if (br.type <= 0) {
                  gs.bricks.splice(i, 1);
                  if (Math.random() < 0.25) {
                    const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
                    gs.powerups.push({ x: brRect.x + br.w / 2, y: brRect.y + br.h / 2, type });
                  }
                }
              }
              break;
            }
          }
          if (hit) gs.lasers.splice(j, 1);
        }

        // Check if bricks crushed player
        for (const br of gs.bricks) {
          if (br.y + gs.brickOffsetY + br.h > PADDLE_Y) {
            // Force lose life
            gs.balls = [];
            break;
          }
        }
      }

      // DRAW
      ctx.clearRect(0, 0, W, H);

      // --- Draw Beautiful Starry Background ---
      ctx.save();

      // 1. Static and twinkling stars
      const drawSparkle = (sx, sy, size, alpha) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy - size);
        ctx.quadraticCurveTo(sx, sy, sx + size, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + size);
        ctx.quadraticCurveTo(sx, sy, sx - size, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - size);
        ctx.fill();
      };

      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * W;
        const sy = (Math.cos(i * 321.65) * 0.5 + 0.5) * H;
        const type = i % 4;
        const twinkle = Math.sin(timestamp / 500 + i) * 0.3 + 0.5;

        if (type === 0) {
          drawSparkle(sx, sy, 4 + (i % 3), twinkle);
        } else if (type === 1) {
          ctx.fillStyle = `rgba(255, 235, 133, ${twinkle})`;
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
          ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
        }
      }

      // 2. Constellations
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      const drawConst = (cx, cy, scale) => {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -20); ctx.lineTo(35, -15); ctx.lineTo(45, 5); ctx.stroke();
        [[0, 0], [15, -20], [35, -15], [45, 5]].forEach(([px, py]) => {
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      };
      drawConst(W * 0.1, H * 0.65, 1.2);
      drawConst(W * 0.8, H * 0.25, 0.8);

      // 3. Floating Bubbles
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const bx = (Math.sin(i * 44.4) * 0.5 + 0.5) * W;
        const speed = 20 + i * 10;
        const by = H - ((timestamp / 1000 * speed + i * 200) % (H + 50));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath(); ctx.arc(bx, by, 6 + i * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath(); ctx.arc(bx - 3, by - 3, 2, 0, Math.PI * 2); ctx.fill();
      }

      // 4. Bottom Fluffy Clouds
      const groundY = H - 15; // Base line for clouds, safely below paddle (H-60)

      // White clouds (background hills)
      ctx.save();
      ctx.shadowColor = 'rgba(255, 158, 207, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = -2;

      const whiteGrad = ctx.createLinearGradient(0, groundY - 45, 0, groundY);
      whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      whiteGrad.addColorStop(1, 'rgba(255, 235, 245, 0.9)');

      ctx.fillStyle = whiteGrad;
      ctx.beginPath();
      ctx.arc(W * 0.08, groundY, 38, 0, Math.PI * 2);
      ctx.arc(W * 0.28, groundY + 5, 22, 0, Math.PI * 2);
      ctx.arc(W * 0.48, groundY, 42, 0, Math.PI * 2);
      ctx.arc(W * 0.72, groundY + 2, 28, 0, Math.PI * 2);
      ctx.arc(W * 0.92, groundY, 36, 0, Math.PI * 2);
      ctx.fill();

      // Pink clouds (foreground hills)
      ctx.shadowColor = 'rgba(255, 182, 193, 0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = -2;

      const pinkGrad = ctx.createLinearGradient(0, groundY - 35, 0, groundY);
      pinkGrad.addColorStop(0, '#fff0f5');
      pinkGrad.addColorStop(1, '#ffdeeb');

      ctx.fillStyle = pinkGrad;
      ctx.beginPath();
      ctx.arc(-5, groundY, 28, 0, Math.PI * 2);
      ctx.arc(W * 0.18, groundY + 4, 18, 0, Math.PI * 2);
      ctx.arc(W * 0.38, groundY, 32, 0, Math.PI * 2);
      ctx.arc(W * 0.62, groundY + 5, 22, 0, Math.PI * 2);
      ctx.arc(W * 0.82, groundY, 30, 0, Math.PI * 2);
      ctx.arc(W + 5, groundY, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Cover the bottoms of all clouds to create a flat seamless ground
      ctx.fillStyle = '#ffdeeb';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.restore();

      ctx.restore();

      // Draw Top Escape Zone Indicator
      const grad = ctx.createLinearGradient(0, 0, 0, TOP_MARGIN);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, TOP_MARGIN);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.shadowColor = 'rgba(255, 105, 180, 0.6)';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 12px Nunito';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;

      // Draw Bricks
      gs.bricks.forEach(b => drawBrick(ctx, { ...b, y: b.y + gs.brickOffsetY }));

      // Draw Powerups
      gs.powerups.forEach(p => drawPowerup(ctx, p, timestamp));

      // Draw Lasers
      ctx.fillStyle = '#f56565';
      gs.lasers.forEach(l => {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(l.x - LASER_W / 2, l.y, LASER_W, LASER_H, 2) : ctx.rect(l.x - LASER_W / 2, l.y, LASER_W, LASER_H);
        ctx.fill();
      });

      // Draw Paddle
      if (phase !== 'gameover') {
        drawCloud(ctx, gs.paddle.x, PADDLE_Y, gs.paddle.w, PADDLE_H);
      }

      // Draw Balls
      gs.balls.forEach(b => drawStar(ctx, b, timestamp));

      // Draw Splash
      if (phase === 'splash') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W / 2 - 120, H * 0.4, 240, 100, 20) : ctx.rect(W / 2 - 120, H * 0.4, 240, 100); ctx.fill();
        ctx.fillStyle = '#4a90e2';
        ctx.font = 'bold 32px Bungee'; ctx.textAlign = 'center'; ctx.fillText('STAR BOUNCE', W / 2, H * 0.4 + 40);
        ctx.fillStyle = '#718096';
        ctx.font = 'bold 14px Nunito'; ctx.fillText('Mở đường cho Sao thoát lên trên', W / 2, H * 0.4 + 64);
        ctx.fillText('Chạm để chơi!', W / 2, H * 0.4 + 86);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Events
  useEffect(() => {
    const onDown = (e) => {
      if (e.target.closest('.starbounce-header')) return; // Allow clicking buttons
      handleInteract();
    };
    window.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [handleInteract, handlePointerMove]);

  const confirmExit = () => {
    if (xuEarned > 0) treeService.addReward(xuEarned).catch(console.error);
    navigate('/games');
  };

  return (
    <div className="starbounce-container">
      {/* Header */}
      <div className="starbounce-header">
        <button className="starbounce-back-btn" onClick={() => {
          if (phaseRef.current === 'playing' && xuEarned > 0) setShowExitModal(true);
          else navigate('/games');
        }}>
          <ArrowLeft size={20} />
        </button>
        <div className="starbounce-xu-badge">{xuEarned} xu</div>
      </div>

      {gamePhase !== 'splash' && (
        <div className="starbounce-hud-center">
          <div className="starbounce-level-badge">MÀN {level}</div>
          <div className="starbounce-lives-display">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <span key={i} className="starbounce-life-icon">❤️</span>
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className={`starbounce-canvas ${isSwiping ? 'swiping' : ''}`} />

      {/* Game Over Modal */}
      <AnimatePresence>
        {gamePhase === 'gameover' && (
          <motion.div className="starbounce-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="starbounce-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}>
              <h2 className="starbounce-modal-title" style={{ color: '#e53e3e' }}>HẾT LƯỢT</h2>
              <div className="starbounce-modal-reward">
                Nhận được tổng cộng <span>+{xuEarned} xu</span>
              </div>
              <button className="starbounce-btn-primary" onClick={handleInteract}>
                Chơi Lại Từ Đầu
              </button>
              <button className="starbounce-btn-secondary" onClick={() => navigate('/games')}>
                Về sảnh
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div className="starbounce-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="starbounce-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}>
              <h2 className="starbounce-modal-title">Nghỉ ngơi chút?</h2>
              <div className="starbounce-modal-reward">
                Bạn đã kiếm được <span>+{xuEarned} xu</span>.<br />Thoát bây giờ vẫn nhận đủ xu!
              </div>
              <button className="starbounce-btn-primary" onClick={confirmExit}>
                Nhận {xuEarned} xu & Thoát
              </button>
              <button className="starbounce-btn-secondary" onClick={() => setShowExitModal(false)}>
                Chơi tiếp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
