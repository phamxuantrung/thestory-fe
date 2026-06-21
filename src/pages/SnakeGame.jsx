import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './SnakeGame.css';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [
  { x: 7, y: 7 },
  { x: 7, y: 8 },
  { x: 7, y: 9 }
];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // UP

const SnakeGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('start'); // start, playing, over
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);

  const directionRef = useRef(INITIAL_DIRECTION);
  const touchStartRef = useRef(null);

  const generateFood = useCallback((currentSnake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setFood(generateFood(INITIAL_SNAKE));
    setGameState('playing');
  };

  const endGame = async (finalScore) => {
    setGameState('over');
    if (finalScore > 0) {
      try {
        await treeService.addReward(Math.min(50, finalScore)); // 1 point = 1 xu, max 50
      } catch (err) {
        console.error('Failed to claim reward', err);
      }
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y
        };

        // Check wall collision
        if (
          newHead.x < 0 || newHead.x >= GRID_SIZE ||
          newHead.y < 0 || newHead.y >= GRID_SIZE
        ) {
          endGame(score);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          endGame(score);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 1);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    };

    const speed = Math.max(80, 200 - score * 5); // Speeds up as score increases
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [gameState, food, score, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      const { key } = e;
      const currentDir = directionRef.current;

      if (key === 'ArrowUp' && currentDir.y !== 1) directionRef.current = { x: 0, y: -1 };
      else if (key === 'ArrowDown' && currentDir.y !== -1) directionRef.current = { x: 0, y: 1 };
      else if (key === 'ArrowLeft' && currentDir.x !== 1) directionRef.current = { x: -1, y: 0 };
      else if (key === 'ArrowRight' && currentDir.x !== -1) directionRef.current = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || gameState !== 'playing') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > 30) {
        if (dx > 0 && directionRef.current.x !== -1) directionRef.current = { x: 1, y: 0 };
        else if (dx < 0 && directionRef.current.x !== 1) directionRef.current = { x: -1, y: 0 };
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > 30) {
        if (dy > 0 && directionRef.current.y !== -1) directionRef.current = { x: 0, y: 1 };
        else if (dy < 0 && directionRef.current.y !== 1) directionRef.current = { x: 0, y: -1 };
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div className="snake-game-page">
      <Header title="Rắn Săn Mồi" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      
      <div className="snake-container">
        <div className="snake-header">
          <div className="snake-stat">Điểm: {score}</div>
          <div className="snake-stat">Độ dài: {snake.length}</div>
        </div>

        <div 
          className="snake-board-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="snake-board" 
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = snake.some((segment, idx) => idx !== 0 && segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;

              let cellClass = 'snake-cell';
              if (isHead) cellClass += ' snake-head';
              else if (isBody) cellClass += ' snake-body';
              else if (isFood) cellClass += ' food';

              return <div key={i} className={cellClass} />;
            })}
          </div>

          {gameState === 'start' && (
            <div className="snake-overlay">
              <h2>Rắn Săn Mồi</h2>
              <p>Vuốt màn hình hoặc dùng phím mũi tên để điều khiển rắn ăn tim.</p>
              <button className="btn-snake" onClick={startGame}>Chơi Ngay</button>
            </div>
          )}

          {gameState === 'over' && (
            <div className="snake-overlay">
              <h2>Game Over!</h2>
              <p>Điểm của bạn: {score}</p>
              <p style={{ color: '#4ade80', fontWeight: 'bold' }}>Nhận được: {Math.min(50, score)} Xu</p>
              <button className="btn-snake" onClick={startGame}>Chơi Lại</button>
              <button className="btn-snake secondary" onClick={() => navigate('/games')}>Thoát</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
