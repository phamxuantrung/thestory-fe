import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, Droplets, Bug, Timer, ArrowLeft } from 'lucide-react';
import { treeService } from '../services/treeService';
import './CatchDropsGame.css';

const GAME_DURATION = 30; // 30 seconds
const MAX_COINS = 50;

const CatchDropsGame = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [drops, setDrops] = useState([]);
  const [basketX, setBasketX] = useState(50); // percentage 0-100
  const gameRef = useRef(null);
  const requestRef = useRef(null);
  const dropsRef = useRef([]);
  const scoreRef = useRef(0);
  const [claimed, setClaimed] = useState(false);

  // Constants
  const BASKET_WIDTH = 80;
  const BASKET_Y = window.innerHeight - 80; // approximate basket top Y
  
  const spawnDrop = useCallback(() => {
    const isAcid = Math.random() < 0.2; // 20% chance of acid
    const newDrop = {
      id: Date.now() + Math.random(),
      x: Math.random() * 90 + 5, // 5% to 95%
      y: -50,
      speed: Math.random() * 3 + 4, // random speed
      isAcid
    };
    dropsRef.current.push(newDrop);
  }, []);

  const updateGame = useCallback(() => {
    if (!isPlaying || isGameOver) return;

    // Move drops
    dropsRef.current = dropsRef.current.filter(drop => {
      drop.y += drop.speed;
      
      // Collision detection
      // Basket is at basketX (%), y is BASKET_Y
      const dropPixelX = (drop.x / 100) * window.innerWidth;
      const basketPixelX = (basketX / 100) * window.innerWidth;
      
      // If drop reaches basket level
      if (drop.y > BASKET_Y - 20 && drop.y < BASKET_Y + 20) {
        if (Math.abs(dropPixelX - basketPixelX) < BASKET_WIDTH / 2 + 10) {
          // Caught!
          if (drop.isAcid) {
            scoreRef.current = Math.max(0, scoreRef.current - 2);
          } else {
            scoreRef.current += 1;
          }
          setScore(scoreRef.current);
          return false; // remove drop
        }
      }
      
      // Remove if falls off screen
      return drop.y < window.innerHeight;
    });

    setDrops([...dropsRef.current]);

    // Randomly spawn
    if (Math.random() < 0.05) {
      spawnDrop();
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [isPlaying, isGameOver, basketX, spawnDrop]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, updateGame]);

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsGameOver(true);
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const handleMouseMove = (e) => {
    if (!isPlaying) return;
    const x = (e.clientX / window.innerWidth) * 100;
    setBasketX(Math.max(5, Math.min(95, x)));
  };

  const handleTouchMove = (e) => {
    if (!isPlaying) return;
    const touch = e.touches[0];
    const x = (touch.clientX / window.innerWidth) * 100;
    setBasketX(Math.max(5, Math.min(95, x)));
  };

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    dropsRef.current = [];
    setDrops([]);
    setIsPlaying(true);
    setIsGameOver(false);
    setClaimed(false);
  };

  const claimReward = async () => {
    if (claimed) return;
    try {
      const coinsToClaim = Math.min(score, MAX_COINS);
      if (coinsToClaim > 0) {
        await treeService.addReward(coinsToClaim);
      }
      setClaimed(true);
      navigate('/games');
    } catch (e) {
      console.error(e);
      alert('Lỗi nhận thưởng');
    }
  };

  return (
    <div 
      className="catch-drops-page" 
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      ref={gameRef}
    >
      <div className="catch-game-header">
        <button className="side-action-btn" onClick={() => navigate('/games')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <div className="score-board">
          <Droplets size={20} color="#00f2fe" /> {score}
        </div>
        <div className="time-board">
          <Timer size={20} /> 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </div>
      </div>

      {/* Game Canvas */}
      {drops.map(drop => (
        <div 
          key={drop.id} 
          className={`drop ${drop.isAcid ? 'acid' : 'water'}`}
          style={{ left: `${drop.x}%`, top: `${drop.y}px` }}
        />
      ))}

      {/* Basket */}
      <div 
        className="basket"
        style={{ left: `${basketX}%` }}
      >
        <div className="basket-front"></div>
      </div>

      {/* Start Overlay */}
      {!isPlaying && !isGameOver && (
        <div className="start-overlay">
          <div className="start-box">
            <h2>Hứng Giọt Nước</h2>
            <div className="instruction">
              <p><Droplets color="#00f2fe" /> Hứng giọt nước: <strong>+1 điểm</strong></p>
              <p><Bug color="#34d399" /> Hứng phải giọt axit: <strong>-2 điểm</strong></p>
              <p><Timer color="#64748b" /> Thời gian: <strong>{GAME_DURATION} giây</strong></p>
            </div>
            <p style={{ marginBottom: 20 }}>Di chuyển chuột hoặc vuốt ngón tay để hứng.</p>
            <button className="catch-btn-primary" style={{ width: '100%' }} onClick={startGame}>BẮT ĐẦU CHƠI</button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="game-over-overlay">
          <motion.div 
            className="game-over-box"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>Hết Giờ!</h2>
            <p>Số giọt nước hứng được</p>
            <div className="final-score">{score}</div>
            <div className="reward-text">
              Thưởng: <Coins size={20} /> {Math.min(score, MAX_COINS)} Xu
            </div>
            <div className="action-buttons">
              <button className="catch-btn-primary" onClick={claimReward} disabled={claimed}>
                {claimed ? 'ĐÃ NHẬN' : 'NHẬN THƯỞNG & THOÁT'}
              </button>
              <button className="btn-secondary" onClick={startGame}>Chơi lại</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CatchDropsGame;
