import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import { showToast } from '../components/Toast';
import './BubbleShooterGame.css';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const ROWS = 9;
const COLS = 11;
const RADIUS = 15;
const DIAMETER = RADIUS * 2;
const ROW_HEIGHT = DIAMETER * 0.85; // Hexagonal grid overlap

const BubbleShooterGame = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [won, setWon] = useState(false);
  
  // Game state refs to use in canvas animation loop
  const stateRef = useRef({
    grid: [],
    bullets: [],
    currentBubble: null,
    nextBubble: null,
    angle: 0,
    mouseX: 0,
    mouseY: 0,
    animating: false,
    particles: [],
    texts: []
  });

  const initGrid = () => {
    const grid = [];
    // Start with 4 rows of bubbles
    const startingRows = 4 + Math.floor(level / 2);
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      const colsInRow = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < colsInRow; c++) {
        if (r < startingRows) {
          grid[r][c] = {
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: c * DIAMETER + (r % 2 === 0 ? RADIUS : DIAMETER),
            y: r * ROW_HEIGHT + RADIUS,
            active: true
          };
        } else {
          grid[r][c] = null;
        }
      }
    }
    return grid;
  };

  const getRandomBubble = () => {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setWon(false);
    setIsGameOver(false);
    setIsPlaying(true);
    
    stateRef.current.grid = initGrid();
    stateRef.current.currentBubble = getRandomBubble();
    stateRef.current.nextBubble = getRandomBubble();
    stateRef.current.animating = true;
    stateRef.current.bullets = [];
    stateRef.current.particles = [];
    stateRef.current.texts = [];
    
    requestAnimationFrame(gameLoop);
  };

  const nextLevel = () => {
    setLevel(l => l + 1);
    setWon(false);
    stateRef.current.grid = initGrid();
    stateRef.current.currentBubble = getRandomBubble();
    stateRef.current.nextBubble = getRandomBubble();
    stateRef.current.animating = true;
    requestAnimationFrame(gameLoop);
  };

  const endGame = async (isWin) => {
    setIsPlaying(false);
    setIsGameOver(true);
    setWon(isWin);
    stateRef.current.animating = false;

    if (score > 0) {
      const rewardCoins = Math.floor(score / 10); // no max limit
      try {
        await treeService.addReward(rewardCoins);
        showToast(`Bạn nhận được ${rewardCoins} Xu!`, 'success');
      } catch (err) {
        console.error('Lỗi nhận thưởng:', err);
      }
    }
  };

  // --- PHYSICS AND LOGIC ---
  const shoot = () => {
    const state = stateRef.current;
    if (!isPlaying || state.bullets.length > 0) return; // Allow 1 bullet at a time for simplicity

    const canvas = canvasRef.current;
    const startX = canvas.width / 2;
    const startY = canvas.height - RADIUS;
    
    // Calculate vector
    const dx = state.mouseX - startX;
    const dy = state.mouseY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return;

    const speed = 15;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    state.bullets.push({
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      color: state.currentBubble,
      radius: RADIUS
    });

    state.currentBubble = state.nextBubble;
    state.nextBubble = getRandomBubble();
  };

  const getGridPosition = (x, y) => {
    let row = Math.floor(y / ROW_HEIGHT);
    if (row < 0) row = 0;
    if (row >= ROWS) row = ROWS - 1;

    const offset = (row % 2 === 0) ? 0 : RADIUS;
    let col = Math.floor((x - offset) / DIAMETER);
    
    const maxCols = (row % 2 === 0) ? COLS : COLS - 1;
    if (col < 0) col = 0;
    if (col >= maxCols) col = maxCols - 1;

    return { row, col };
  };

  const snapToGrid = (bullet) => {
    const state = stateRef.current;
    const grid = state.grid;
    
    const { row, col } = getGridPosition(bullet.x, bullet.y);
    
    if (!grid[row]) grid[row] = [];
    if (!grid[row][col]) {
      grid[row][col] = {
        color: bullet.color,
        x: col * DIAMETER + (row % 2 === 0 ? RADIUS : DIAMETER),
        y: row * ROW_HEIGHT + RADIUS,
        active: true
      };
      
      // Check matches
      const matches = findMatches(row, col, bullet.color);
      if (matches.length >= 3) {
        removeMatches(matches);
        setScore(s => s + matches.length * 5); // 5 points per match instead of 10
        checkFloatingBubbles();
        checkWin();
      } else {
        checkLose();
      }
    }
  };

  const checkWin = () => {
    const state = stateRef.current;
    let isEmpty = true;
    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        if(state.grid[r] && state.grid[r][c]) {
          isEmpty = false;
          break;
        }
      }
    }
    if(isEmpty) {
      setWon(true);
      stateRef.current.animating = false;
    }
  };

  const checkLose = () => {
    const state = stateRef.current;
    // Check bottom row
    const bottomRow = ROWS - 1;
    if(state.grid[bottomRow]){
      for(let c=0; c<COLS; c++){
        if(state.grid[bottomRow][c]) {
          endGame(false);
          return;
        }
      }
    }
  };

  const getNeighbors = (r, c) => {
    const neighbors = [];
    const dirsEven = [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
    const dirsOdd = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    const dirs = r % 2 === 0 ? dirsEven : dirsOdd;

    dirs.forEach(d => {
      const nr = r + d[0];
      const nc = c + d[1];
      if (nr >= 0 && nr < ROWS) {
        const maxCols = nr % 2 === 0 ? COLS : COLS - 1;
        if (nc >= 0 && nc < maxCols) {
          neighbors.push({r: nr, c: nc});
        }
      }
    });
    return neighbors;
  };

  const findMatches = (startR, startC, targetColor) => {
    const state = stateRef.current;
    const grid = state.grid;
    const visited = new Set();
    const matches = [];
    const stack = [{r: startR, c: startC}];

    while(stack.length > 0) {
      const {r, c} = stack.pop();
      const key = `${r},${c}`;
      
      if (!visited.has(key) && grid[r] && grid[r][c] && grid[r][c].color === targetColor) {
        visited.add(key);
        matches.push({r, c});
        
        const neighbors = getNeighbors(r, c);
        neighbors.forEach(n => stack.push(n));
      }
    }
    return matches;
  };

  const removeMatches = (matches) => {
    const state = stateRef.current;
    matches.forEach(({r, c}) => {
      const b = state.grid[r][c];
      createParticles(b.x, b.y, b.color);
      state.grid[r][c] = null;
    });
    // Add floating text
    if (matches.length > 0) {
      const first = matches[0];
      const bx = first.c * DIAMETER + (first.r % 2 === 0 ? RADIUS : DIAMETER);
      const by = first.r * ROW_HEIGHT + RADIUS;
      state.texts.push({ x: bx, y: by, text: `+${matches.length * 5}`, life: 1 });
    }
  };

  const checkFloatingBubbles = () => {
    const state = stateRef.current;
    const grid = state.grid;
    const visited = new Set();
    const connectedToTop = [];

    // Start from top row
    for(let c=0; c<COLS; c++){
      if(grid[0] && grid[0][c]) {
        connectedToTop.push({r: 0, c});
      }
    }

    const stack = [...connectedToTop];
    while(stack.length > 0) {
      const {r, c} = stack.pop();
      const key = `${r},${c}`;
      if(!visited.has(key)) {
        visited.add(key);
        const neighbors = getNeighbors(r, c);
        neighbors.forEach(n => {
          if(grid[n.r] && grid[n.r][n.c] && !visited.has(`${n.r},${n.c}`)) {
            stack.push(n);
          }
        });
      }
    }

    // Remove any bubble not visited
    let dropped = 0;
    for(let r=0; r<ROWS; r++){
      if(!grid[r]) continue;
      const maxCols = r % 2 === 0 ? COLS : COLS - 1;
      for(let c=0; c<maxCols; c++){
        if(grid[r][c] && !visited.has(`${r},${c}`)) {
          const b = grid[r][c];
          createParticles(b.x, b.y, b.color);
          grid[r][c] = null;
          dropped++;
        }
      }
    }
    
    if (dropped > 0) {
       setScore(s => s + dropped * 10); // 10 points per drop instead of 20
    }
  };

  const createParticles = (x, y, color) => {
    const state = stateRef.current;
    for(let i=0; i<8; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        decay: Math.random() * 0.05 + 0.02
      });
    }
  };

  // --- RENDER LOOP ---
  const gameLoop = () => {
    const state = stateRef.current;
    if (!state.animating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Update & Draw Bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Wall bounce
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx *= -1;
      } else if (b.x + b.radius > width) {
        b.x = width - b.radius;
        b.vx *= -1;
      }

      // Check collision with grid or top
      let hit = false;
      if (b.y - b.radius <= 0) {
        hit = true;
      } else {
        // Collision with bubbles
        for(let r=0; r<ROWS; r++){
          if(hit) break;
          if(!state.grid[r]) continue;
          const maxCols = r % 2 === 0 ? COLS : COLS - 1;
          for(let c=0; c<maxCols; c++){
            const target = state.grid[r][c];
            if(target) {
              const dist = Math.hypot(b.x - target.x, b.y - target.y);
              if (dist <= RADIUS * 2 - 2) { // Little buffer
                hit = true;
                break;
              }
            }
          }
        }
      }

      if (hit) {
        snapToGrid(b);
        state.bullets.splice(i, 1);
      } else {
        // Draw bullet
        drawBubble(ctx, b.x, b.y, b.color);
      }
    }

    // Draw Death Line
    const deathY = (ROWS - 1) * ROW_HEIGHT + RADIUS;
    ctx.beginPath();
    ctx.moveTo(0, deathY);
    ctx.lineTo(width, deathY);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // red-500
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.font = '12px Arial';
    ctx.fillText('VẠCH NGUY HIỂM', width / 2 - 45, deathY - 10);

    // Draw Grid Bubbles
    for(let r=0; r<ROWS; r++){
      if(!state.grid[r]) continue;
      const maxCols = r % 2 === 0 ? COLS : COLS - 1;
      for(let c=0; c<maxCols; c++){
        const b = state.grid[r][c];
        if(b) {
          drawBubble(ctx, b.x, b.y, b.color);
        }
      }
    }

    // Draw Particles
    for(let i = state.particles.length - 1; i >= 0; i--){
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if(p.life <= 0) {
        state.particles.splice(i, 1);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Draw Texts
    for(let i = state.texts.length - 1; i >= 0; i--){
      const t = state.texts[i];
      t.y -= 1;
      t.life -= 0.02;
      if(t.life <= 0) {
        state.texts.splice(i, 1);
      } else {
        ctx.globalAlpha = t.life;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
      }
    }

    // Draw Current Bubble at gun
    const gunX = width / 2;
    const gunY = height - RADIUS;
    
    // Draw trajectory line
    ctx.beginPath();
    ctx.moveTo(gunX, gunY);
    ctx.lineTo(state.mouseX, state.mouseY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.currentBubble) {
      drawBubble(ctx, gunX, gunY, state.currentBubble);
    }
    
    // Draw Next Bubble and Swap Icon
    if (state.nextBubble) {
      drawBubble(ctx, gunX + 60, gunY, state.nextBubble);
      
      // Draw Swap Button
      const swapX = gunX + 30;
      const swapY = gunY;
      ctx.beginPath();
      ctx.arc(swapX, swapY, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⇆', swapX, swapY);
    }

    if (state.animating) {
      requestAnimationFrame(gameLoop);
    }
  };

  const drawBubble = (ctx, x, y, color) => {
    // Gradient
    const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, RADIUS);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, '#000'); // Shadow edge

    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  };

  const updateMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (clientX === undefined && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    if (clientX !== undefined) {
      stateRef.current.mouseX = (clientX - rect.left) * scaleX;
      stateRef.current.mouseY = (clientY - rect.top) * scaleY;
    }
  };

  const handlePointerDown = (e) => {
    if (e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
    stateRef.current.isAiming = true;
    updateMousePos(e);
  };

  const handlePointerMove = (e) => {
    if (stateRef.current.isAiming || e.pointerType === 'mouse') {
      updateMousePos(e);
    }
  };

  const handlePointerUp = (e) => {
    if (stateRef.current.isAiming) {
      stateRef.current.isAiming = false;
      if (e.target.releasePointerCapture) {
        e.target.releasePointerCapture(e.pointerId);
      }
      updateMousePos(e);
      
      const state = stateRef.current;
      const canvas = canvasRef.current;
      
      // Gun coordinates
      const gunX = canvas.width / 2;
      const gunY = canvas.height - RADIUS;
      
      // Check if the click is in the bottom area (near gun, swap icon, or next bubble)
      const swapZoneStartX = gunX - RADIUS;
      const swapZoneEndX = gunX + 60 + RADIUS;
      const swapZoneStartY = gunY - RADIUS * 2;
      const swapZoneEndY = gunY + RADIUS * 2;

      if (
        state.mouseX >= swapZoneStartX && 
        state.mouseX <= swapZoneEndX &&
        state.mouseY >= swapZoneStartY && 
        state.mouseY <= swapZoneEndY
      ) {
        // Swap bubbles
        const temp = state.currentBubble;
        state.currentBubble = state.nextBubble;
        state.nextBubble = temp;
        return; // Do not shoot
      }

      shoot();
    }
  };

  const handleBack = async () => {
    if (isPlaying && Math.floor(score / 10) > 0) {
      if (window.confirm(`Bạn đang tích luỹ được ${Math.floor(score / 10)} Xu. Bạn có muốn thoát và nhận thưởng ngay không?`)) {
        await endGame(false);
        navigate('/games');
      }
    } else {
      navigate('/games');
    }
  };

  return (
    <div className="bubble-shooter-page">
      <Header title="Bắn Bóng Tình Yêu" showBack={true} onBack={handleBack} transparent={true} />
      
      <div className="bubble-container">
        <div className="bubble-header">
          <div className="bubble-stat">
            <span className="label">Level</span>
            <span className="value level-text">{level}</span>
          </div>
          <div className="bubble-stat">
            <span className="label">Điểm</span>
            <span className="value score-text">{score}</span>
          </div>
        </div>

        <div className="canvas-wrapper">
          <canvas 
            ref={canvasRef}
            width={COLS * DIAMETER}
            height={450} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="bubble-canvas"
          />

          {!isPlaying && !isGameOver && (
            <div className="bubble-overlay">
              <h2>Bắn Bóng Tình Yêu</h2>
              <p>Chạm để bắn bóng.<br/>Ghép 3 quả cùng màu để triệt tiêu.<br/>Đừng để bóng chạm vạch dưới cùng nhé!</p>
              <button className="btn-start-bubble" onClick={startGame}>Chơi Ngay</button>
            </div>
          )}

          {won && (
            <div className="bubble-overlay">
              <h2>Tuyệt Vời!</h2>
              <p>Bạn đã dọn sạch bóng!<br/>Số điểm: <strong>{score}</strong><br/>Tích luỹ: <strong>{Math.floor(score/10)}</strong> Xu</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-start-bubble" onClick={nextLevel} disabled={isGameOver}>Level Tiếp ({level + 1})</button>
                <button className="btn-start-bubble btn-secondary" disabled={isGameOver} onClick={async () => {
                  await endGame(true);
                  navigate('/games');
                }}>
                  {isGameOver ? 'Đang nhận...' : 'Dừng lại & Nhận Thưởng'}
                </button>
              </div>
            </div>
          )}

          {isGameOver && !won && (
            <div className="bubble-overlay">
              <h2>Kết Thúc!</h2>
              <p>Bóng đã đầy màn hình!<br/>Bạn đạt được <strong>{score}</strong> điểm.<br/>Nhận được {Math.floor(score/10)} Xu!</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-start-bubble" onClick={startGame}>Chơi Lại</button>
                <button className="btn-start-bubble btn-secondary" onClick={() => navigate('/games')}>Thoát</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BubbleShooterGame;
