import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './WhackABugGame.css';

const GAME_DURATION = 30; // seconds
const HOLES_COUNT = 9;

const WhackABugGame = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeHoles, setActiveHoles] = useState(Array(HOLES_COUNT).fill(null));
  const [hitEffects, setHitEffects] = useState([]);

  const timerRef = useRef(null);
  const spawnerRef = useRef(null);

  // Spawner loop
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      spawnerRef.current = setInterval(() => {
        spawnEntity();
      }, 800 - (30 - timeLeft) * 15); // Gets faster over time
    }

    return () => {
      if (spawnerRef.current) clearInterval(spawnerRef.current);
    };
  }, [isPlaying, timeLeft]);

  // Timer loop
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft]);

  const spawnEntity = () => {
    setActiveHoles(prev => {
      const newHoles = [...prev];
      // Find empty holes
      const emptyIndices = newHoles.map((val, idx) => val === null ? idx : -1).filter(idx => idx !== -1);
      if (emptyIndices.length === 0) return prev;

      const randomHole = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      // 80% chance bug, 20% chance flower
      const type = Math.random() > 0.2 ? 'bug' : 'flower';
      
      newHoles[randomHole] = type;

      // Auto hide after some time
      setTimeout(() => {
        setActiveHoles(currentHoles => {
          const updated = [...currentHoles];
          if (updated[randomHole] === type) {
            updated[randomHole] = null;
          }
          return updated;
        });
      }, 1000 + Math.random() * 1000);

      return newHoles;
    });
  };

  const handleWhack = (index, type) => {
    if (!isPlaying) return;

    if (type === 'bug') {
      setScore(prev => prev + 1);
      addHitEffect(index, '+1');
    } else if (type === 'flower') {
      setScore(prev => Math.max(0, prev - 2));
      addHitEffect(index, '-2');
    }

    // Hide immediately after whacked
    setActiveHoles(prev => {
      const newHoles = [...prev];
      newHoles[index] = null;
      return newHoles;
    });
  };

  const addHitEffect = (index, text) => {
    const id = Date.now() + Math.random();
    setHitEffects(prev => [...prev, { id, index, text }]);
    setTimeout(() => {
      setHitEffects(prev => prev.filter(eff => eff.id !== id));
    }, 500);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setActiveHoles(Array(HOLES_COUNT).fill(null));
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const endGame = async () => {
    setIsPlaying(false);
    setIsGameOver(true);
    if (spawnerRef.current) clearInterval(spawnerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    // Give reward if score > 0
    if (score > 0) {
      const rewardCoins = Math.min(50, score);
      try {
        await treeService.addReward(rewardCoins);
      } catch (err) {
        console.error('Failed to claim reward:', err);
      }
    }
  };

  return (
    <div className="whack-game-page">
      <Header title="Đập Sâu Bảo Vệ Cây" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      
      <div className="whack-container">
        <div className="whack-header">
          <div className="whack-stat">
            <span className="label">Thời gian</span>
            <span className="value time-text">00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
          <div className="whack-stat">
            <span className="label">Điểm</span>
            <span className="value score-text">{score}</span>
          </div>
        </div>

        <div className="whack-board">
          {!isPlaying && !isGameOver && (
            <div className="whack-start-screen">
              <h2>Đập Sâu!</h2>
              <p>Chạm vào sâu để ghi điểm (+1).<br/>Tuyệt đối không đập vào Hoa (-2).</p>
              <button className="btn-start-whack" onClick={startGame}>Chơi Ngay</button>
            </div>
          )}

          {isGameOver && (
            <div className="whack-start-screen">
              <h2>Hết Giờ!</h2>
              <p>Bạn đã đập được <strong>{score}</strong> điểm.<br/>Nhận được {Math.min(50, score)} Xu!</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-start-whack" onClick={startGame}>Chơi Lại</button>
                <button className="btn-start-whack" style={{ background: '#64748b' }} onClick={() => navigate('/games')}>Thoát</button>
              </div>
            </div>
          )}

          {Array(HOLES_COUNT).fill(null).map((_, idx) => (
            <div className="whack-hole" key={idx}>
              <div 
                className={`whack-entity ${activeHoles[idx] ? 'active ' + activeHoles[idx] : ''}`}
                onMouseDown={() => activeHoles[idx] && handleWhack(idx, activeHoles[idx])}
                onTouchStart={(e) => {
                  e.preventDefault();
                  activeHoles[idx] && handleWhack(idx, activeHoles[idx]);
                }}
              ></div>
              {hitEffects.filter(eff => eff.index === idx).map(eff => (
                <div key={eff.id} className="whack-hit-effect" style={{ color: eff.text === '-2' ? '#ef4444' : '#10b981' }}>
                  {eff.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhackABugGame;
