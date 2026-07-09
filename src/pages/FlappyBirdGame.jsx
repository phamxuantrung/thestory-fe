import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treeService } from '../services/treeService';
import './FlappyBirdGame.css';

// ─── Constants ───────────────────────────────────────────────
const W = 390;
const H = 680;
const GRAVITY = 0.45;
const FLAP_STRENGTH = -8.5;
const PIPE_SPEED = 2.8;
const PIPE_GAP = 160;
const PIPE_INTERVAL = 1600; // ms between pipe spawns
const GROUND_H = 80;
const BIRD_R = 18;

// ─── Audio (Web Audio API) ────────────────────────────────────
function createAudio() {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };
  const beep = (freq, type, dur, vol = 0.18) => {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur);
    } catch (_) { }
  };
  return {
    flap: () => { beep(520, 'sine', 0.08, 0.12); beep(650, 'sine', 0.05, 0.08); },
    score: () => { beep(880, 'sine', 0.08); beep(1100, 'sine', 0.07); },
    die: () => { beep(220, 'sawtooth', 0.2, 0.25); beep(160, 'square', 0.3, 0.2); },
    xu: () => { [880, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 'sine', 0.12), i * 60)); },
  };
}

// ─── Drawing helpers ─────────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground(ctx, clouds, groundOffset) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(0.5, '#b0e0ff');
  grad.addColorStop(1, '#d0f0ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_H);

  // Clouds (cute kawaii)
  clouds.forEach(cl => {
    ctx.save();
    ctx.globalAlpha = cl.alpha;
    // Cloud body
    ctx.fillStyle = 'white';
    const puffs = [
      { dx: 0, dy: 0, r: cl.r },
      { dx: cl.r * 0.7, dy: cl.r * 0.1, r: cl.r * 0.8 },
      { dx: -cl.r * 0.7, dy: cl.r * 0.1, r: cl.r * 0.75 },
      { dx: cl.r * 1.3, dy: cl.r * 0.3, r: cl.r * 0.55 },
      { dx: -cl.r * 1.3, dy: cl.r * 0.3, r: cl.r * 0.5 },
    ];
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(cl.x + p.dx, cl.y + p.dy, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Cute face on largest cloud
    if (cl.r > 20) {
      // Eyes
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(cl.x - cl.r * 0.25, cl.y - cl.r * 0.05, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cl.x + cl.r * 0.25, cl.y - cl.r * 0.05, 2.5, 0, Math.PI * 2); ctx.fill();
      // Smile
      ctx.strokeStyle = '#ff9ab2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y + cl.r * 0.1, cl.r * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // Cheeks
      ctx.fillStyle = 'rgba(255,182,193,0.5)';
      ctx.beginPath(); ctx.ellipse(cl.x - cl.r * 0.35, cl.y + cl.r * 0.08, cl.r * 0.18, cl.r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cl.x + cl.r * 0.35, cl.y + cl.r * 0.08, cl.r * 0.18, cl.r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // Ground
  // Grass
  const grassGrad = ctx.createLinearGradient(0, H - GROUND_H, 0, H);
  grassGrad.addColorStop(0, '#7ec850');
  grassGrad.addColorStop(0.3, '#5db33a');
  grassGrad.addColorStop(1, '#4a9a2a');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

  // Ground top stripe
  ctx.fillStyle = '#a0e060';
  ctx.fillRect(0, H - GROUND_H, W, 10);

  // Ground pattern (scrolling dots)
  const dotSpacing = 30;
  const offsetX = groundOffset % dotSpacing;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = -dotSpacing + offsetX; x < W + dotSpacing; x += dotSpacing) {
    ctx.beginPath();
    ctx.arc(x, H - GROUND_H + 18, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPipe(ctx, x, topH) {
  const pipeW = 58;
  const capH = 22;
  const capW = 64;
  const gap = PIPE_GAP;
  const botY = topH + gap;
  const botH = H - GROUND_H - botY;
  const cornerR = 8;

  // TOP PIPE
  const topGrad = ctx.createLinearGradient(x, 0, x + pipeW, 0);
  topGrad.addColorStop(0, '#4ecf5a');
  topGrad.addColorStop(0.35, '#7fe880');
  topGrad.addColorStop(1, '#2da03a');
  ctx.fillStyle = topGrad;
  drawRoundRect(ctx, x, 0, pipeW, topH - capH, 0);
  ctx.fill();

  // TOP CAP
  const capGrad = ctx.createLinearGradient(x - 3, 0, x + capW, 0);
  capGrad.addColorStop(0, '#3ebd4a');
  capGrad.addColorStop(0.35, '#6fe070');
  capGrad.addColorStop(1, '#1f8a2e');
  ctx.fillStyle = capGrad;
  drawRoundRect(ctx, x - 3, topH - capH, capW, capH, cornerR);
  ctx.fill();
  // Cap sheen
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  drawRoundRect(ctx, x + 4, topH - capH + 3, 14, capH - 6, 4);
  ctx.fill();

  // BOTTOM PIPE
  ctx.fillStyle = topGrad;
  drawRoundRect(ctx, x, botY + capH, pipeW, botH, 0);
  ctx.fill();

  // BOTTOM CAP
  ctx.fillStyle = capGrad;
  drawRoundRect(ctx, x - 3, botY, capW, capH, cornerR);
  ctx.fill();
  // Cap sheen
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  drawRoundRect(ctx, x + 4, botY + 3, 14, capH - 6, 4);
  ctx.fill();
}

function drawBird(ctx, x, y, vel, wingPhase, isDead) {
  ctx.save();
  ctx.translate(x, y);

  // Tilt based on velocity
  const tilt = isDead ? Math.PI / 2 : Math.max(-0.45, Math.min(Math.PI / 4, vel * 0.045));
  ctx.rotate(tilt);

  const r = BIRD_R;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(2, r * 0.9, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing (back)
  const wingY = Math.sin(wingPhase * 0.3) * 5;
  ctx.fillStyle = '#ffb820';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, wingY + 3, r * 0.65, r * 0.38, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.1, 0, 0, r);
  bodyGrad.addColorStop(0, '#ffe560');
  bodyGrad.addColorStop(0.5, '#ffd020');
  bodyGrad.addColorStop(1, '#e6a800');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.ellipse(r * 0.15, r * 0.25, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing highlight
  ctx.fillStyle = '#ffc830';
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, wingY + 2, r * 0.4, r * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.18, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Eye iris
  ctx.fillStyle = '#4a2c00';
  ctx.beginPath();
  ctx.arc(r * 0.36, -r * 0.14, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.22, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.28, -r * 0.08, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Cheek blush
  ctx.fillStyle = 'rgba(255,120,120,0.45)';
  ctx.beginPath();
  ctx.ellipse(r * 0.55, r * 0.1, r * 0.22, r * 0.15, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff9520';
  ctx.beginPath();
  ctx.moveTo(r * 0.62, -r * 0.05);
  ctx.lineTo(r * 1.02, r * 0.12);
  ctx.lineTo(r * 0.62, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e07000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.63, r * 0.12);
  ctx.lineTo(r * 0.99, r * 0.12);
  ctx.stroke();

  // Tiny sparkles when alive
  if (!isDead && Math.sin(wingPhase * 0.5) > 0.6) {
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    [[-r * 1.1, -r * 0.7], [r * 0.1, -r * 1.1], [-r * 0.5, -r * 1.0]].forEach(([sx, sy]) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(wingPhase * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(1, -1); ctx.lineTo(4, 0);
      ctx.lineTo(1, 1); ctx.lineTo(0, 4); ctx.lineTo(-1, 1);
      ctx.lineTo(-4, 0); ctx.lineTo(-1, -1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  ctx.restore();
}


// Splash screen drawing
function drawSplash(ctx, wingPhase) {
  // Title
  ctx.save();
  ctx.textAlign = 'center';

  // Title card
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  drawRoundRect(ctx, W / 2 - 130, H * 0.28, 260, 80, 22);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ff7eb3';
  ctx.font = 'bold 38px Nunito, sans-serif';
  ctx.fillText('Flappy Bird', W / 2, H * 0.28 + 42);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 16px Nunito, sans-serif';
  ctx.fillText('Chạm để bắt đầu! 💛', W / 2, H * 0.28 + 66);

  // Instruction
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  drawRoundRect(ctx, W / 2 - 100, H * 0.62, 200, 44, 14);
  ctx.fill();
  ctx.fillStyle = '#555';
  ctx.font = 'bold 14px Nunito, sans-serif';
  ctx.fillText('Mỗi ống qua = +2 xu', W / 2, H * 0.62 + 27);

  ctx.restore();
}

// ─── Main Component ────────────────────────────────────────────
export default function FlappyBirdGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const audioRef = useRef(null);
  const lastPipeRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [gamePhase, setGamePhase] = useState('splash'); // splash | playing | dead
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('flappy_best') || '0'));
  const [xuEarned, setXuEarned] = useState(0);
  const [showReward, setShowReward] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [gameEndClaimed, setGameEndClaimed] = useState(false);

  const xuEarnedRef = useRef(0);
  const scoreRef = useRef(0);
  const gamePhaseRef = useRef('splash');
  const gameEndClaimedRef = useRef(false);

  // Sync refs
  const setPhase = (p) => { gamePhaseRef.current = p; setGamePhase(p); };

  // Init game state
  const initState = () => ({
    bird: { x: W * 0.28, y: H * 0.45, vy: 0 },
    pipes: [],
    clouds: Array.from({ length: 5 }, (_, i) => ({
      x: (W / 4) * i + 40,
      y: 60 + Math.random() * 140,
      r: 18 + Math.random() * 22,
      speed: 0.3 + Math.random() * 0.2,
      alpha: 0.75 + Math.random() * 0.25,
    })),
    groundOffset: 0,
    wingPhase: 0,
    frameCount: 0,
    dead: false,
    scoreSet: new Set(),
  });

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    xuEarnedRef.current = 0;
    gameEndClaimedRef.current = false;
    lastPipeRef.current = 0;
    setScore(0);
    setXuEarned(0);
    setGameEndClaimed(false);
    stateRef.current = initState();
  }, []);

  const flap = useCallback(() => {
    if (!stateRef.current) return;
    if (stateRef.current.dead) return;
    stateRef.current.bird.vy = FLAP_STRENGTH;
    if (!audioRef.current) audioRef.current = createAudio();
    audioRef.current.flap();
  }, []);

  const handleInteract = useCallback(() => {
    if (gamePhaseRef.current === 'splash') {
      resetGame();
      setPhase('playing');
    } else if (gamePhaseRef.current === 'playing') {
      flap();
    }
    // 'dead' phase handled by modal buttons
  }, [flap, resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    stateRef.current = initState();

    const loop = (timestamp) => {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);

      const gs = stateRef.current;
      if (!gs) return;

      const phase = gamePhaseRef.current;

      // Update clouds
      gs.clouds.forEach(cl => {
        cl.x -= cl.speed * (phase === 'playing' ? 1 : 0.5);
        if (cl.x + cl.r * 2 < 0) {
          cl.x = W + cl.r;
          cl.y = 50 + Math.random() * 160;
          cl.r = 18 + Math.random() * 22;
        }
      });

      if (phase === 'playing' && !gs.dead) {
        // Bird physics
        gs.bird.vy += GRAVITY;
        gs.bird.y += gs.bird.vy;
        gs.wingPhase += 3;
        gs.groundOffset += PIPE_SPEED;

        // Spawn pipes
        if (timestamp - lastPipeRef.current > PIPE_INTERVAL) {
          const minTop = 80;
          const maxTop = H - GROUND_H - PIPE_GAP - 80;
          const topH = minTop + Math.random() * (maxTop - minTop);
          gs.pipes.push({ x: W + 10, topH, scored: false });
          lastPipeRef.current = timestamp;
        }

        // Move pipes
        gs.pipes.forEach(p => { p.x -= PIPE_SPEED; });
        gs.pipes = gs.pipes.filter(p => p.x > -70);

        // Check pipe score
        const pipeCapW = 64;
        const birdLeft = gs.bird.x + 5; // slight forgiveness
        gs.pipes.forEach(p => {
          if (!p.scored && p.x + pipeCapW < birdLeft) {
            p.scored = true;
            scoreRef.current += 1;
            xuEarnedRef.current += 2; // Increase xu reward
            setScore(scoreRef.current);
            setXuEarned(xuEarnedRef.current);
            if (!audioRef.current) audioRef.current = createAudio();
            audioRef.current.score();
          }
        });

        // Collision
        const bx = gs.bird.x, by = gs.bird.y;
        const hitGround = by + BIRD_R >= H - GROUND_H;
        const hitCeil = by - BIRD_R <= 0;

        let hitPipe = false;
        const pipeW = 58;
        gs.pipes.forEach(p => {
          const px = p.x - 3; // cap offset
          if (bx + BIRD_R - 4 > px && bx - BIRD_R + 4 < px + pipeCapW) {
            if (by - BIRD_R + 4 < p.topH || by + BIRD_R - 4 > p.topH + PIPE_GAP) {
              hitPipe = true;
            }
          }
        });

        if (hitGround || hitCeil || hitPipe) {
          gs.dead = true;
          gs.bird.vy = hitPipe ? -4 : 0;
          if (!audioRef.current) audioRef.current = createAudio();
          audioRef.current.die();

          // Save best
          const finalScore = scoreRef.current;
          const prevBest = parseInt(localStorage.getItem('flappy_best') || '0');
          if (finalScore > prevBest) {
            localStorage.setItem('flappy_best', String(finalScore));
            setBest(finalScore);
          }

          // Claim xu
          const xu = xuEarnedRef.current;
          if (xu > 0 && !gameEndClaimedRef.current) {
            gameEndClaimedRef.current = true;
            treeService.addReward(xu).catch(console.error);
          }

          setPhase('dead');
        }
      } else if (phase === 'splash') {
        gs.wingPhase += 2;
        gs.bird.y = H * 0.4 + Math.sin(gs.wingPhase * 0.05) * 12;
        gs.groundOffset += 0.8;
      } else if (gs.dead) {
        // Let bird fall
        gs.bird.vy += GRAVITY * 0.5;
        gs.bird.y = Math.min(gs.bird.y + gs.bird.vy, H - GROUND_H - BIRD_R);
      }

      // ── Draw ──
      ctx.clearRect(0, 0, W, H);
      drawBackground(ctx, gs.clouds, gs.groundOffset);
      gs.pipes.forEach(p => drawPipe(ctx, p.x, p.topH));
      drawBird(ctx, gs.bird.x, gs.bird.y, gs.bird.vy, gs.wingPhase, gs.dead || phase === 'splash' && false);

      if (phase === 'splash') {
        drawSplash(ctx, gs.wingPhase);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [best]);

  // Touch/click on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e) => { e.preventDefault(); handleInteract(); };
    canvas.addEventListener('pointerdown', onDown, { passive: false });
    return () => canvas.removeEventListener('pointerdown', onDown);
  }, [handleInteract]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') handleInteract(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInteract]);

  const handleRestart = () => {
    resetGame();
    setPhase('playing');
  };

  const confirmExit = () => {
    navigate('/games');
  };

  const handleBack = () => {
    if (gamePhaseRef.current === 'playing' && !stateRef.current?.dead) {
      setShowExitModal(true);
    } else {
      navigate('/games');
    }
  };

  return (
    <div className="flappy-container">
      {/* Header */}
      <div className="flappy-header">
        <button className="flappy-back-btn" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="flappy-score-display">
          <div className="flappy-score-num">{score}</div>
          <div className="flappy-best-label">BEST: {best}</div>
        </div>
        <div className="flappy-xu-badge">
          {xuEarned} xu
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="flappy-canvas" />

      {/* Game Over Modal */}
      <AnimatePresence>
        {gamePhase === 'dead' && (
          <motion.div className="flappy-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flappy-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <h2 className="flappy-modal-title">Ôi không!</h2>
              <div className="flappy-modal-score-row">
                <div className="flappy-modal-score-box">
                  <label>Điểm</label>
                  <span>{score}</span>
                </div>
                <div className="flappy-modal-score-box highlight">
                  <label>Kỷ lục</label>
                  <span>{best}</span>
                </div>
              </div>
              <div className="flappy-modal-reward">
                Bạn nhận được <span>+{xuEarned} xu</span>
              </div>
              <button className="flappy-btn-primary" onClick={handleRestart}>
                Chơi Lại
              </button>
              <button className="flappy-btn-secondary" onClick={() => navigate('/games')}>
                Về sảnh
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div className="flappy-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flappy-modal-card"
              initial={{ scale: 0.6, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <div className="flappy-modal-emoji">🚪</div>
              <h2 className="flappy-modal-title">Thoát game?</h2>
              <div className="flappy-modal-reward">
                Bạn đang có <span>+{xuEarned} xu</span> trong ván này.<br />
                Thoát sẽ nhận đủ số xu!
              </div>
              <button className="flappy-btn-primary" onClick={confirmExit}>
                Nhận {xuEarned} xu & Thoát
              </button>
              <button className="flappy-btn-secondary" onClick={() => setShowExitModal(false)}>
                Chơi tiếp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
