import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './SimonSaysGame.css';

const COLORS = ['green', 'red', 'yellow', 'blue'];

const SimonSaysGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('start'); // start, playing, gameover
  const [sequence, setSequence] = useState([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [level, setLevel] = useState(0);

  const audioCtxRef = useRef(null);

  // Play piano-like synth sound
  const playBeep = (color) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // C4, E4, G4, C5
    const freqs = { green: 261.63, red: 329.63, yellow: 392.00, blue: 523.25 }; 
    const baseFreq = freqs[color];

    const t = ctx.currentTime;
    
    // Main oscillator (Triangle wave sounds closer to plucked/struck string)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = baseFreq;

    // Gain node for ADSR envelope
    const gain = ctx.createGain();
    
    // Attack (very fast)
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.02);
    
    // Decay (exponential decay gives piano feel)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 1.5);
  };

  const startGame = () => {
    setGameState('playing');
    setSequence([]);
    setLevel(0);
    setIsPlayerTurn(false);
    nextLevel([]);
  };

  const nextLevel = (currentSequence) => {
    const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newSeq = [...currentSequence, nextColor];
    setSequence(newSeq);
    setLevel(newSeq.length);
    setPlayerStep(0);
    setIsPlayerTurn(false);
    
    // Play sequence faster for higher difficulty
    setTimeout(() => playSequence(newSeq), 500);
  };

  const playSequence = async (seq) => {
    setIsPlayerTurn(false);
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 150)); // gap between (faster)
      setActiveColor(seq[i]);
      playBeep(seq[i]);
      await new Promise(resolve => setTimeout(resolve, 300)); // duration (faster)
      setActiveColor(null);
    }
    setIsPlayerTurn(true);
  };

  const handleColorClick = (color) => {
    if (!isPlayerTurn || gameState !== 'playing') return;

    playBeep(color);
    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 200);

    if (color === sequence[playerStep]) {
      // Correct
      if (playerStep === sequence.length - 1) {
        // Completed sequence
        setIsPlayerTurn(false);
        setTimeout(() => nextLevel(sequence), 500); // Trigger next level faster
      } else {
        setPlayerStep(prev => prev + 1);
      }
    } else {
      // Wrong
      endGame(level - 1);
    }
  };

  const endGame = async (score) => {
    setGameState('gameover');
    setIsPlayerTurn(false);
    
    // Reward: 3 coins per level, max 50
    if (score > 0) {
      try {
        await treeService.addReward(Math.min(50, score * 3));
      } catch (err) {
        console.error('Failed to claim reward', err);
      }
    }
  };

  const getStatusText = () => {
    if (gameState === 'start') return 'Nhịp Điệu Trái Tim';
    if (gameState === 'gameover') return `Sai rồi! Kỷ lục: ${level - 1}`;
    if (!isPlayerTurn) return `Hãy xem và nhớ! (Cấp ${level})`;
    return `Đến lượt bạn! (Cấp ${level})`;
  };

  return (
    <div className="simon-game-page">
      <Header title="Nhịp Điệu Trái Tim" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      
      <div className="simon-container">
        <div className="simon-status">
          {getStatusText()}
        </div>

        <div className="simon-board-wrapper">
          <div className="simon-board">
            {COLORS.map(color => (
              <button 
                key={color}
                className={`simon-btn ${color} ${activeColor === color ? 'active' : ''} ${!isPlayerTurn || gameState !== 'playing' ? 'disabled' : ''}`}
                onClick={() => handleColorClick(color)}
                disabled={!isPlayerTurn || gameState !== 'playing'}
              />
            ))}
          </div>
        </div>

        <div className="simon-controls">
          {gameState === 'start' && (
            <button className="btn-simon-play" onClick={startGame}>Bắt đầu chơi</button>
          )}
          {gameState === 'gameover' && (
            <>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Nhận được: {Math.min(50, (level - 1) * 3)} Xu</p>
              <button className="btn-simon-play" onClick={startGame}>Chơi lại</button>
              <button className="btn-simon-exit" onClick={() => navigate('/games')}>Thoát</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimonSaysGame;
