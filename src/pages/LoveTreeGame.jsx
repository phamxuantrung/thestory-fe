import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { treeService } from '../services/treeService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import './LoveTreeGame.css';

const EMOJIS = ['🌸', '🍓', '🐶', '🐱', '🐰', '🐼', '🦊', '🐸', '🍎', '🍄'];
const GAME_TIME = 45; // 45 seconds

const LoveTreeGame = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      handleGameOver(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (matchedPairs === EMOJIS.length) {
      handleGameOver(true);
    }
  }, [matchedPairs]);

  const initGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, isFlipped: false, isMatched: false }));
    setCards(shuffled);
    setFlippedIndices([]);
    setMatchedPairs(0);
    setTimeLeft(GAME_TIME);
    setIsPlaying(true);
    setGameOver(false);
    setIsWon(false);
  };

  const handleCardClick = (index) => {
    if (!isPlaying || cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) {
      return;
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped;
      if (cards[firstIdx].emoji === cards[secondIdx].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setMatchedPairs(prev => prev + 1);
          setFlippedIndices([]);
        }, 500);
      } else {
        setTimeout(() => {
          const flippedBack = [...cards];
          flippedBack[firstIdx].isFlipped = false;
          flippedBack[secondIdx].isFlipped = false;
          setCards(flippedBack);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  const handleGameOver = async (won) => {
    setIsPlaying(false);
    setGameOver(true);
    setIsWon(won);

    if (won) {
      try {
        const res = await treeService.addFertilizer();
        if (res.success) {
          showToast('Chúc mừng! Bạn nhận được 1 Phân bón 👝', 'success');
        }
      } catch (e) {
        showToast('Lỗi nhận thưởng', 'error');
      }
    }
  };

  return (
    <div className="game-page">
      <Header title="Lật Thẻ Tìm Phân Bón" showBack={true} />

      <div className="game-container">
        <div className="game-header">
          <div className="timer-bar-container">
            <div className="timer-text">Thời gian: 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</div>
            <div className="timer-bg">
              <motion.div 
                className={`timer-fill ${timeLeft <= 10 ? 'danger' : ''}`}
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / GAME_TIME) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>
          <div className="score-text">Cặp đã tìm: {matchedPairs}/{EMOJIS.length}</div>
        </div>

        <div className="cards-grid">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              className={`card ${card.isFlipped || card.isMatched ? 'flipped' : ''}`}
              onClick={() => handleCardClick(idx)}
              whileTap={{ scale: 0.95 }}
            >
              <div className="card-inner">
                <div className="card-front">?</div>
                <div className="card-back">{card.emoji}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {gameOver && (
          <div className="game-over-overlay">
            <motion.div 
              className="game-over-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring' }}
            >
              {isWon ? (
                <>
                  <h2>Tuyệt vời! 🎉</h2>
                  <p>Trí nhớ của bạn quá đỉnh! Bạn đã thu thập được 1 Phân bón để cứu cây.</p>
                  <button className="game-btn primary" onClick={() => navigate('/tree')}>
                    Quay lại chăm cây
                  </button>
                </>
              ) : (
                <>
                  <h2>Hết giờ! ⏰</h2>
                  <p>Hơi tiếc một chút, tay bạn chưa đủ nhanh rồi. Hãy thử lại nhé!</p>
                  <button className="game-btn primary" onClick={initGame}>
                    Chơi Lại
                  </button>
                  <button className="game-btn secondary" onClick={() => navigate('/tree')}>
                    Thoát
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoveTreeGame;
