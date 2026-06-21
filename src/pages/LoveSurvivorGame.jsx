import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './LoveSurvivorGame.css';

const PLAYER_RADIUS = 12; // Small hitbox for hardcore feel
const PROJ_RADIUS = 15;
const EMOJIS = ['☄️', '🔪', '💣', '⚡', '🔥'];

const LoveSurvivorGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('start'); // start, playing, over
  const [survivalTime, setSurvivalTime] = useState(0);

  const containerRef = useRef(null);
  const reqRef = useRef(null);

  const stateRef = useRef({
    player: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    projectiles: [],
    startTime: 0,
    lastSpawnTime: 0,
    status: 'start',
    width: window.innerWidth,
    height: window.innerHeight
  });

  // State for rendering
  const [playerUI, setPlayerUI] = useState({ x: -100, y: -100 });
  const [projectilesUI, setProjectilesUI] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      stateRef.current.width = window.innerWidth;
      stateRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startGame = () => {
    stateRef.current = {
      player: { x: stateRef.current.width / 2, y: stateRef.current.height / 2 },
      projectiles: [],
      startTime: performance.now(),
      lastSpawnTime: performance.now(),
      status: 'playing',
      width: stateRef.current.width,
      height: stateRef.current.height
    };
    setGameState('playing');
    setSurvivalTime(0);
    setPlayerUI(stateRef.current.player);
    setProjectilesUI([]);

    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = async (timeSurvived) => {
    stateRef.current.status = 'over';
    setGameState('over');
    if (reqRef.current) cancelAnimationFrame(reqRef.current);

    // Reward: 1 second = 2 coins, max 60 coins (for 30 seconds survival)
    if (timeSurvived > 0) {
      try {
        await treeService.addReward(Math.min(60, Math.floor(timeSurvived * 2)));
      } catch (err) {
        console.error('Failed to claim reward', err);
      }
    }
  };

  const spawnProjectile = (currentTime, difficultyMultiplier) => {
    const state = stateRef.current;
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX, startY;

    if (edge === 0) { startX = Math.random() * state.width; startY = -50; }
    else if (edge === 1) { startX = state.width + 50; startY = Math.random() * state.height; }
    else if (edge === 2) { startX = Math.random() * state.width; startY = state.height + 50; }
    else { startX = -50; startY = Math.random() * state.height; }

    // Aim slightly towards player, with some randomness
    const targetX = state.player.x + (Math.random() - 0.5) * 200;
    const targetY = state.player.y + (Math.random() - 0.5) * 200;

    const angle = Math.atan2(targetY - startY, targetX - startX);
    
    // Base speed + difficulty scaling
    const baseSpeed = 3 + Math.random() * 3;
    const speed = baseSpeed * difficultyMultiplier;

    state.projectiles.push({
      id: Math.random().toString(),
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    });
  };

  const gameLoop = (timestamp) => {
    const state = stateRef.current;
    if (state.status !== 'playing') return;

    const elapsedTime = (timestamp - state.startTime) / 1000;
    setSurvivalTime(elapsedTime);

    // Difficulty increases over time
    const difficultyMultiplier = 1 + (elapsedTime / 10); // Speed increases 10% per second
    const spawnInterval = Math.max(100, 800 - elapsedTime * 30); // Spawns faster, min 100ms

    if (timestamp - state.lastSpawnTime > spawnInterval) {
      // Spawn 1 to 3 projectiles depending on time
      const spawnCount = Math.floor(1 + elapsedTime / 15); 
      for(let i = 0; i < spawnCount; i++) {
        spawnProjectile(timestamp, difficultyMultiplier);
      }
      state.lastSpawnTime = timestamp;
    }

    // Update projectiles
    let hit = false;
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Check collision with player
      const dx = p.x - state.player.x;
      const dy = p.y - state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PLAYER_RADIUS + PROJ_RADIUS) {
        hit = true;
      }

      // Remove off-screen (with margin)
      if (
        p.x < -100 || p.x > state.width + 100 ||
        p.y < -100 || p.y > state.height + 100
      ) {
        state.projectiles.splice(i, 1);
      }
    }

    if (hit) {
      endGame(elapsedTime);
      return;
    }

    // Update UI
    setPlayerUI({ ...state.player });
    setProjectilesUI([...state.projectiles]);

    reqRef.current = requestAnimationFrame(gameLoop);
  };

  const handlePointerMove = (e) => {
    if (stateRef.current.status === 'playing') {
      // Use clientX/Y to get accurate position relative to viewport
      let clientX, clientY;
      
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      stateRef.current.player.x = clientX;
      stateRef.current.player.y = clientY;
    }
  };

  useEffect(() => {
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  return (
    <div className="survivor-game-page">
      <div className="survivor-header">
        <Header title="Sinh Tồn" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      </div>
      
      <div 
        className="survivor-game-area"
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
      >
        {gameState === 'playing' && (
          <div className="survivor-hud">
            <div className="survivor-time">{survivalTime.toFixed(1)}s</div>
            {survivalTime > 15 && <div className="survivor-danger">NGUY HIỂM!</div>}
          </div>
        )}

        {/* Player rendering */}
        {gameState === 'playing' && (
          <div 
            className="survivor-player"
            style={{ left: playerUI.x, top: playerUI.y }}
          />
        )}

        {/* Projectiles rendering */}
        {projectilesUI.map(p => (
          <div 
            key={p.id}
            className="survivor-projectile"
            style={{ left: p.x, top: p.y }}
          >
            {p.emoji}
          </div>
        ))}

        {gameState === 'start' && (
          <div className="survivor-overlay">
            <h2>Trái Tim Sinh Tồn</h2>
            <p><strong>Cảnh báo cực khó (Hardcore)</strong><br/><br/>
            Di chuột hoặc vuốt ngón tay để kéo trái tim di chuyển.<br/>
            Né MỌI chướng ngại vật bay tới. Chỉ cần chạm 1 lần là GAME OVER.</p>
            <button className="btn-survivor" onClick={startGame}>Bắt Đầu Thử Thách</button>
          </div>
        )}

        {gameState === 'over' && (
          <div className="survivor-overlay">
            <h2>BẠN ĐÃ CHẾT!</h2>
            <p style={{ fontSize: '1.5rem', color: '#ffb199', fontWeight: 'bold' }}>
              Trụ được: {survivalTime.toFixed(1)} giây
            </p>
            <p style={{ color: '#4ade80' }}>
              Phần thưởng: {Math.min(60, Math.floor(survivalTime * 2))} Xu
            </p>
            <button className="btn-survivor" onClick={startGame}>Thử Lại (Phục Thù)</button>
            <button className="btn-survivor secondary" onClick={() => navigate('/games')}>Bỏ Cuộc</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoveSurvivorGame;
