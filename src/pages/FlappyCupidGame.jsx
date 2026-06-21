import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './FlappyCupidGame.css';

const GRAVITY = 0.5;
const JUMP = -8;
const PIPE_SPEED = 3.5;
const PIPE_SPAWN_RATE = 110; // frames
const PIPE_WIDTH = 60;
const GAP_SIZE = 160;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 40;
const BIRD_X = 80;

const FlappyCupidGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('start'); // start, playing, over
  const [displayScore, setDisplayScore] = useState(0);

  // Use refs for game loop to avoid dependency issues and stale closures
  const stateRef = useRef({
    birdY: GAME_HEIGHT / 2,
    birdVel: 0,
    pipes: [],
    score: 0,
    frameCount: 0,
    status: 'start'
  });

  const birdUiRef = useRef(null);
  const reqRef = useRef(null);
  // We need to force render pipes. We can use state for pipes just for rendering.
  const [pipesUI, setPipesUI] = useState([]);
  const [birdYUI, setBirdYUI] = useState(GAME_HEIGHT / 2);
  const [birdRotUI, setBirdRotUI] = useState(0);

  const startGame = () => {
    stateRef.current = {
      birdY: GAME_HEIGHT / 2,
      birdVel: 0,
      pipes: [],
      score: 0,
      frameCount: 0,
      status: 'playing'
    };
    setGameState('playing');
    setDisplayScore(0);
    setPipesUI([]);
    
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = requestAnimationFrame(gameLoop);
  };

  const jump = () => {
    if (stateRef.current.status === 'playing') {
      stateRef.current.birdVel = JUMP;
    } else if (stateRef.current.status === 'start' || stateRef.current.status === 'over') {
      startGame();
    }
  };

  const endGame = async (finalScore) => {
    stateRef.current.status = 'over';
    setGameState('over');
    if (reqRef.current) cancelAnimationFrame(reqRef.current);

    if (finalScore > 0) {
      try {
        await treeService.addReward(Math.min(50, finalScore * 2)); // 2 xu per pipe, max 50
      } catch (e) {
        console.error("Failed to give reward", e);
      }
    }
  };

  const gameLoop = () => {
    if (stateRef.current.status !== 'playing') return;
    const state = stateRef.current;
    state.frameCount++;

    // Bird Physics
    state.birdVel += GRAVITY;
    state.birdY += state.birdVel;

    // Ground & Ceiling Collision
    if (state.birdY > GAME_HEIGHT - 40 - BIRD_SIZE) {
      state.birdY = GAME_HEIGHT - 40 - BIRD_SIZE;
      endGame(state.score);
      return;
    }
    if (state.birdY < 0) {
      state.birdY = 0;
      state.birdVel = 0;
    }

    // Pipe Spawning
    if (state.frameCount % PIPE_SPAWN_RATE === 0) {
      const gapTop = Math.random() * (GAME_HEIGHT - 40 - GAP_SIZE - 100) + 50;
      state.pipes.push({ x: 500, gapTop, passed: false });
    }

    // Pipe Movement & Collision
    let hit = false;
    for (let i = state.pipes.length - 1; i >= 0; i--) {
      const p = state.pipes[i];
      p.x -= PIPE_SPEED;

      // Check pass
      if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
        p.passed = true;
        state.score++;
        setDisplayScore(state.score);
      }

      // Check collision
      const birdHitbox = { 
        top: state.birdY + 5, 
        bottom: state.birdY + BIRD_SIZE - 5, 
        left: BIRD_X + 5, 
        right: BIRD_X + BIRD_SIZE - 5 
      };
      
      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;

      if (birdHitbox.right > pipeLeft && birdHitbox.left < pipeRight) {
        if (birdHitbox.top < p.gapTop || birdHitbox.bottom > p.gapTop + GAP_SIZE) {
          hit = true;
        }
      }

      // Remove off-screen pipes
      if (p.x + PIPE_WIDTH < 0) {
        state.pipes.splice(i, 1);
      }
    }

    if (hit) {
      endGame(state.score);
      return;
    }

    // Update UI state for rendering
    setBirdYUI(state.birdY);
    // Calculate rotation based on velocity (-20 to 90 degrees)
    setBirdRotUI(Math.min(Math.max(-20, state.birdVel * 4), 90));
    setPipesUI([...state.pipes]);

    reqRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  return (
    <div className="flappy-game-page">
      <Header title="Cánh Chim Tình Yêu" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      
      <div className="flappy-container">
        <div className="flappy-game-area" onMouseDown={jump} onTouchStart={(e) => { e.preventDefault(); jump(); }}>
          <div className="flappy-bg"></div>
          
          <div className="flappy-score-hud">{displayScore}</div>

          <div 
            className="flappy-bird" 
            ref={birdUiRef}
            style={{ top: birdYUI, transform: `rotate(${birdRotUI}deg)` }}
          >
            🕊️
          </div>

          {pipesUI.map((pipe, i) => (
            <React.Fragment key={i}>
              {/* Top Pipe */}
              <div 
                className="flappy-pipe top" 
                style={{ left: pipe.x, top: 0, height: pipe.gapTop }}
              >
                <div className="flappy-pipe-cap"></div>
              </div>
              {/* Bottom Pipe */}
              <div 
                className="flappy-pipe bottom" 
                style={{ left: pipe.x, top: pipe.gapTop + GAP_SIZE, bottom: 40 }}
              >
                <div className="flappy-pipe-cap"></div>
              </div>
            </React.Fragment>
          ))}

          <div className="flappy-ground"></div>

          {gameState === 'start' && (
            <div className="flappy-overlay">
              <div className="flappy-overlay-box">
                <h2>Chim Bay</h2>
                <p>Chạm để bay. Vượt qua các chướng ngại vật để nhận thưởng!</p>
                <button className="btn-flappy" onClick={startGame}>Chơi Ngay</button>
              </div>
            </div>
          )}

          {gameState === 'over' && (
            <div className="flappy-overlay">
              <div className="flappy-overlay-box">
                <h2>Game Over!</h2>
                <p>Điểm: {displayScore}</p>
                <p style={{ fontSize: '1rem', color: '#10b981' }}>Nhận: {Math.min(50, displayScore * 2)} Xu</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-flappy" onClick={startGame}>Chơi Lại</button>
                  <button className="btn-flappy" style={{ background: '#64748b', borderColor: '#475569', boxShadow: '0 4px 0 #334155' }} onClick={() => navigate('/games')}>Thoát</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlappyCupidGame;
