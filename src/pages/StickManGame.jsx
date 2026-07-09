import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treeService } from '../services/treeService';
import './StickManGame.css';

// --- Constants ---
const W = 400;
const H = 700;
const PLATFORM_HEIGHT = 200; // From bottom
const CHAR_SIZE = 24;
const STICK_WIDTH = 6;
const GROW_SPEED = 300; // pixels per sec
const FALL_SPEED = Math.PI * 1.5; // radians per sec
const WALK_SPEED = 200; // pixels per sec
const GRAVITY = 1500;

// --- Audio ---
function createAudio() {
  let actx = null;
  const getCtx = () => {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  };
  const beep = (freq, dur, type = 'sine', gainVal = 0.1) => {
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
    } catch (_) {}
  };
  return {
    stretch: () => beep(300, 0.1, 'triangle', 0.05),
    fall: () => beep(200, 0.2, 'sawtooth', 0.1),
    thud: () => { beep(100, 0.1, 'square', 0.2); beep(80, 0.15, 'sawtooth', 0.2); },
    score: () => { beep(523, 0.1, 'sine', 0.1); setTimeout(() => beep(659, 0.15, 'sine', 0.1), 100); },
    die: () => { beep(300, 0.2, 'sawtooth', 0.1); setTimeout(() => beep(200, 0.4, 'sawtooth', 0.2), 200); }
  };
}

// --- Utils ---
const rand = (min, max) => min + Math.random() * (max - min);

// --- Drawing ---
function drawCloud(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, 20, Math.PI, Math.PI * 2);
  ctx.arc(25, -10, 25, Math.PI, Math.PI * 2);
  ctx.arc(55, -5, 20, Math.PI, Math.PI * 2);
  ctx.arc(75, 5, 15, Math.PI, Math.PI * 2);
  ctx.rect(0, 0, 75, 20);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, timeMs, scrollX) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ffb3c6');
  grad.addColorStop(0.5, '#ffcbf2');
  grad.addColorStop(1, '#e2ece9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Clouds parallax
  const t = timeMs / 1000;
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 180 + t * 20 - scrollX * 0.2) % (W + 200) + (W + 200)) % (W + 200) - 100;
    const cy = 100 + (i % 3) * 50;
    drawCloud(ctx, cx, cy, 0.6 + (i % 2) * 0.4);
  }
}

function drawPlatform(ctx, x, w, hue) {
  const y = H - PLATFORM_HEIGHT;
  ctx.save();
  ctx.translate(x, y);
  
  // Base
  ctx.fillStyle = `hsl(${hue}, 60%, 70%)`;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, PLATFORM_HEIGHT, [12, 12, 0, 0]);
  ctx.fill();

  // Shadow/Depth
  ctx.fillStyle = `hsl(${hue}, 60%, 60%)`;
  ctx.beginPath();
  ctx.roundRect(w - 10, 0, 10, PLATFORM_HEIGHT, [0, 12, 0, 0]);
  ctx.fill();

  // Grass/Frosting top
  ctx.fillStyle = `hsl(${hue}, 80%, 85%)`;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 20, [12, 12, 0, 0]);
  ctx.fill();
  
  // Drips
  ctx.beginPath();
  for(let i = 10; i < w - 10; i += 20) {
    ctx.arc(i, 20, 8, 0, Math.PI);
  }
  ctx.fill();

  // Center target (perfect zone)
  ctx.fillStyle = '#ff477e';
  ctx.fillRect(w/2 - 4, 0, 8, 8);

  ctx.restore();
}

function drawCuteNinja(ctx, x, y, walkFrame, isUpsideDown = false) {
  ctx.save();
  ctx.translate(x, y);
  
  if (isUpsideDown) {
    ctx.scale(1, -1);
    ctx.translate(0, -CHAR_SIZE);
  }

  const bounce = Math.abs(Math.sin(walkFrame * Math.PI)) * 4;
  ctx.translate(0, -CHAR_SIZE - bounce);

  // Body (Blob)
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.roundRect(-12, 0, 24, CHAR_SIZE, 12);
  ctx.fill();

  // Headband (Pink)
  ctx.fillStyle = '#ff477e';
  ctx.fillRect(-12, 6, 24, 6);
  // Headband tails
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.quadraticCurveTo(-18, 12 + Math.sin(walkFrame*5)*4, -20, 16);
  ctx.lineTo(-18, 8);
  ctx.fill();

  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-2, 10, 3, 0, Math.PI*2);
  ctx.arc(6, 10, 3, 0, Math.PI*2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(-1, 10, 1.5, 0, Math.PI*2);
  ctx.arc(7, 10, 1.5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawStick(ctx, x, y, length, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.roundRect(-STICK_WIDTH/2, -length, STICK_WIDTH, length, 3);
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = '#a06e3d';
  ctx.fillRect(-STICK_WIDTH/2 + 1, -length + 2, 2, length - 4);
  
  ctx.restore();
}

export default function StickManGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const audioRef = useRef(null);
  const lastTimeRef = useRef(0);

  const [phase, setPhase] = useState('waiting');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('stickman_best') || '0'));
  const [xuEarned, setXuEarned] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [lives, setLives] = useState(3);

  const phaseRef = useRef('waiting');
  const scoreRef = useRef(0);
  const xuRef = useRef(0);
  const livesRef = useRef(3);

  const syncPhase = (p) => { phaseRef.current = p; setPhase(p); };

  const generatePlatform = (startX) => {
    const w = rand(40, 100);
    const gap = rand(40, 180);
    return {
      x: startX + gap,
      w: w,
      hue: rand(0, 360)
    };
  };

  const initState = () => {
    const p1 = { x: 50, w: 60, hue: 340 };
    const p2 = generatePlatform(p1.x + p1.w);
    return {
      scrollX: 0,
      targetScrollX: 0,
      platforms: [p1, p2],
      stickLen: 0,
      stickAngle: 0,
      charX: p1.x + p1.w - 10,
      charY: H - PLATFORM_HEIGHT,
      charVy: 0,
      walkFrame: 0,
      isUpsideDown: false,
      timeMs: 0,
      floaters: []
    };
  };

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    xuRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setXuEarned(0);
    setLives(3);
    stateRef.current = initState();
    syncPhase('waiting');
  }, []);

  const triggerGameOver = () => {
    if (!audioRef.current) audioRef.current = createAudio();
    audioRef.current.die();

    livesRef.current -= 1;
    setLives(livesRef.current);

    if (livesRef.current <= 0) {
      syncPhase('dead');
      const finalScore = scoreRef.current;
      if (finalScore > best) {
        localStorage.setItem('stickman_best', String(finalScore));
        setBest(finalScore);
      }
      if (xuRef.current > 0) {
        treeService.addReward(xuRef.current).catch(console.error);
      }
    } else {
      // Just reset the immediate state to try again on the same platforms
      setTimeout(() => {
        const gs = stateRef.current;
        if (!gs) return;
        const p1 = gs.platforms[0];
        gs.stickLen = 0;
        gs.stickAngle = 0;
        gs.charX = p1.x + p1.w - 10;
        gs.charY = H - PLATFORM_HEIGHT;
        gs.charVy = 0;
        gs.isUpsideDown = false;
        syncPhase('waiting');
      }, 1000);
    }
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button, .stickman-modal-card')) return;
    
    if (phaseRef.current === 'waiting') {
      syncPhase('stretching');
      if (!audioRef.current) audioRef.current = createAudio();
      audioRef.current.stretch();
    } else if (phaseRef.current === 'walking') {
      const gs = stateRef.current;
      gs.isUpsideDown = !gs.isUpsideDown;
    }
  };

  const handlePointerUp = () => {
    if (phaseRef.current === 'stretching') {
      syncPhase('falling');
      if (!audioRef.current) audioRef.current = createAudio();
      audioRef.current.fall();
    }
  };

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
      gs.timeMs = timestamp;
      const ph = phaseRef.current;

      // UPDATE
      // Floaters
      gs.floaters.forEach(f => f.t += dt);
      gs.floaters = gs.floaters.filter(f => f.t < 1);

      // Camera smooth scroll
      gs.scrollX += (gs.targetScrollX - gs.scrollX) * 5 * dt;

      if (ph === 'stretching') {
        gs.stickLen += GROW_SPEED * dt;
        // loop stretch sound effect roughly
        if (Math.random() < 0.1 && audioRef.current) audioRef.current.stretch();
      } 
      else if (ph === 'falling') {
        gs.stickAngle += FALL_SPEED * dt;
        if (gs.stickAngle >= Math.PI / 2) {
          gs.stickAngle = Math.PI / 2;
          if (audioRef.current) audioRef.current.thud();
          syncPhase('walking');
        }
      }
      else if (ph === 'walking') {
        gs.charX += WALK_SPEED * dt;
        gs.walkFrame += dt * 3;

        const stickStartX = gs.platforms[0].x + gs.platforms[0].w;
        const stickEndX = stickStartX + gs.stickLen;
        
        // If walked past stick end
        if (gs.charX > stickEndX) {
          const p2 = gs.platforms[1];
          // Check if safe on p2
          if (gs.charX >= p2.x && gs.charX <= p2.x + p2.w && !gs.isUpsideDown) {
            // SAFE
            if (gs.charX >= p2.x + p2.w - 10) {
              gs.charX = p2.x + p2.w - 10;
              syncPhase('transitioning');
              
              // Score calc
              let pts = 1;
              let isPerfect = false;
              let earnedThisRound = 1; // 1 Xu for a normal hit

              if (Math.abs(stickEndX - (p2.x + p2.w/2)) < 8) {
                pts = 3; // Perfect
                isPerfect = true;
                earnedThisRound = 5; // 5 Xu for a perfect hit
                gs.floaters.push({ x: p2.x + p2.w/2, y: H - PLATFORM_HEIGHT - 40, txt: 'PERFECT! +5 Xu', t: 0, color: '#ffeb3b', s: 1.5 });
              } else {
                gs.floaters.push({ x: p2.x + p2.w/2, y: H - PLATFORM_HEIGHT - 40, txt: '+1 Xu', t: 0, color: '#4CAF50', s: 1.2 });
              }
              
              scoreRef.current += pts;
              setScore(scoreRef.current);
              
              xuRef.current += earnedThisRound;
              setXuEarned(xuRef.current);
              
              if (audioRef.current) audioRef.current.score();

              // Gen next
              gs.platforms.push(generatePlatform(p2.x + p2.w));
              gs.targetScrollX = p2.x - 50;
            }
          } else {
            // FALL!
            syncPhase('deadAnim');
            triggerGameOver();
          }
        } else if (gs.charX > stickStartX && gs.isUpsideDown) {
           // Can walk upside down only under the stick, if reaches end upside down, falls.
           // Checked above (gs.charX > stickEndX). What about hitting the pillar upside down?
           const p2 = gs.platforms[1];
           if (gs.charX >= p2.x) {
             // Smacked into pillar
             syncPhase('deadAnim');
             triggerGameOver();
           }
        }
      }
      else if (ph === 'transitioning') {
        // Wait for camera
        if (Math.abs(gs.scrollX - gs.targetScrollX) < 1) {
          gs.platforms.shift(); // remove old p1
          gs.stickLen = 0;
          gs.stickAngle = 0;
          syncPhase('waiting');
        }
      }
      else if (ph === 'deadAnim') {
        gs.charY += gs.charVy * dt;
        gs.charVy += GRAVITY * dt;
        if (gs.stickAngle < Math.PI) {
          gs.stickAngle += FALL_SPEED * dt; // stick falls too
          if (gs.stickAngle > Math.PI) gs.stickAngle = Math.PI;
        }
      }

      // DRAW
      drawBackground(ctx, gs.timeMs, gs.scrollX);

      ctx.save();
      ctx.translate(-gs.scrollX, 0);

      // Platforms
      gs.platforms.forEach(p => drawPlatform(ctx, p.x, p.w, p.hue));

      // Stick
      if (gs.stickLen > 0) {
        const p1 = gs.platforms[0];
        drawStick(ctx, p1.x + p1.w, H - PLATFORM_HEIGHT, gs.stickLen, gs.stickAngle);
      }

      // Character
      drawCuteNinja(ctx, gs.charX, gs.charY, gs.walkFrame, gs.isUpsideDown);

      // Floaters
      for (const f of gs.floaters) {
        ctx.save();
        ctx.globalAlpha = 1 - f.t;
        const scale = f.s || 1;
        ctx.translate(f.x, f.y - f.t * 40);
        ctx.font = `bold ${16*scale}px Bungee, cursive`;
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2d0a16';
        ctx.lineWidth = 4 * scale;
        ctx.strokeText(f.txt, 0, 0);
        ctx.fillStyle = f.color;
        ctx.fillText(f.txt, 0, 0);
        ctx.restore();
      }

      ctx.restore();

    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [triggerGameOver]);

  const confirmExit = () => {
    if (xuEarned > 0) treeService.addReward(xuEarned).catch(console.error);
    navigate('/games');
  };

  return (
    <div 
      className="stickman-container"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="stickman-header">
        <button className="stickman-back-btn" onClick={(e) => {
          e.stopPropagation();
          if (phaseRef.current !== 'dead' && xuEarned > 0) setShowExitModal(true);
          else confirmExit();
        }}>
          <ArrowLeft size={20} />
        </button>
        <div className="stickman-xu-badge">{xuEarned} xu</div>
      </div>

      {(phase !== 'dead' || lives > 0) && (
        <div className="stickman-hud-center">
          <div className="stickman-score-display">{score}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[...Array(3)].map((_, i) => (
              <span key={i} style={{ fontSize: 24, filter: i < lives ? 'none' : 'grayscale(1) opacity(0.3)' }}>❤️</span>
            ))}
          </div>
        </div>
      )}

      {phase === 'waiting' && score === 0 && (
        <div className="stickman-instructions">Nhấn giữ để mọc gậy<br/>Thả để đi!</div>
      )}

      <canvas ref={canvasRef} className="stickman-canvas" />

      {/* Game Over Modal */}
      <AnimatePresence>
        {phase === 'dead' && (
          <motion.div className="stickman-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="stickman-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring' }}>
              <h2 className="stickman-modal-title">Ngã Mất Rồi!</h2>
              <div className="stickman-modal-score-row">
                <div className="stickman-modal-score-box">
                  <label>Điểm</label>
                  <span>{score}</span>
                </div>
                <div className="stickman-modal-score-box">
                  <label>Kỷ Lục</label>
                  <span>{best}</span>
                </div>
              </div>
              <div className="stickman-modal-reward">
                Nhận được tổng cộng <span>+{xuEarned} xu</span>
              </div>
              <button className="stickman-btn-primary" onClick={(e) => { e.stopPropagation(); resetGame(); }}>
                Chơi Lại
              </button>
              <button className="stickman-btn-secondary" onClick={(e) => { e.stopPropagation(); navigate('/games'); }}>
                Về sảnh
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div className="stickman-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="stickman-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring' }}>
              <h2 className="stickman-modal-title">Nghỉ ngơi?</h2>
              <div className="stickman-modal-reward">
                Bạn đã kiếm được <span>+{xuEarned} xu</span>.
              </div>
              <button className="stickman-btn-primary" onClick={(e) => { e.stopPropagation(); confirmExit(); }}>
                Nhận Xu & Thoát
              </button>
              <button className="stickman-btn-secondary" onClick={(e) => { e.stopPropagation(); setShowExitModal(false); }}>
                Chơi Tiếp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
