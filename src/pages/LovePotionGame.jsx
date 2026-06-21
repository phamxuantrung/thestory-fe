import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Coins } from 'lucide-react';
import { treeService } from '../services/treeService';
import './LovePotionGame.css';

const LEVEL_CONFIGS = [
  { level: 1, colors: 3, reward: 5 },
  { level: 2, colors: 4, reward: 10 },
  { level: 3, colors: 5, reward: 20 },
  { level: 4, colors: 6, reward: 30 },
  { level: 5, colors: 7, reward: 50 },
  { level: 6, colors: 8, reward: 100 },
];

const MAX_CAPACITY = 4;

const LovePotionGame = () => {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [tubes, setTubes] = useState([]);
  const [initialTubes, setInitialTubes] = useState([]); // For restarting level
  const [selectedTube, setSelectedTube] = useState(null);
  const [isWin, setIsWin] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [moves, setMoves] = useState(0);

  // Generate a solvable puzzle by starting from solved state and shuffling backwards
  const generateLevel = (numColors) => {
    const newTubes = [];
    let idCounter = 0;
    
    // Create solved state
    for (let c = 0; c < numColors; c++) {
      newTubes.push([
        { id: idCounter++, colorId: c },
        { id: idCounter++, colorId: c },
        { id: idCounter++, colorId: c },
        { id: idCounter++, colorId: c },
      ]);
    }
    // Add 2 empty tubes
    newTubes.push([]);
    newTubes.push([]);

    // Shuffle backwards
    const shuffles = numColors * 30; // The more shuffles, the more mixed it is
    for (let i = 0; i < shuffles; i++) {
      let srcIdx = Math.floor(Math.random() * newTubes.length);
      let dstIdx = Math.floor(Math.random() * newTubes.length);
      
      if (srcIdx !== dstIdx && newTubes[srcIdx].length > 0 && newTubes[dstIdx].length < MAX_CAPACITY) {
        // In reverse pouring, any color can be poured on top of any color
        const segment = newTubes[srcIdx].pop();
        newTubes[dstIdx].push(segment);
      }
    }

    // Clone for initial state
    const clone = newTubes.map(tube => [...tube]);
    return { current: newTubes, initial: clone };
  };

  const loadLevel = (levelIndex) => {
    const config = LEVEL_CONFIGS[levelIndex - 1] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    const { current, initial } = generateLevel(config.colors);
    setTubes(current);
    setInitialTubes(initial);
    setSelectedTube(null);
    setIsWin(false);
    setClaimed(false);
    setMoves(0);
  };

  useEffect(() => {
    loadLevel(currentLevel);
  }, [currentLevel]);

  const restartLevel = () => {
    // Deep clone initial
    const clone = initialTubes.map(tube => [...tube]);
    setTubes(clone);
    setSelectedTube(null);
    setMoves(0);
  };

  const checkWin = (currentTubes) => {
    for (let i = 0; i < currentTubes.length; i++) {
      const tube = currentTubes[i];
      if (tube.length > 0) {
        // Must be full
        if (tube.length !== MAX_CAPACITY) return false;
        // All segments must have the same color
        const color = tube[0].colorId;
        if (!tube.every(segment => segment.colorId === color)) return false;
      }
    }
    return true;
  };

  const handleTubeClick = (index) => {
    if (isWin) return;

    if (selectedTube === null) {
      // Select source
      if (tubes[index].length > 0) {
        setSelectedTube(index);
      }
    } else {
      // Pour from selectedTube to index
      if (selectedTube === index) {
        // Deselect
        setSelectedTube(null);
        return;
      }

      const srcTube = tubes[selectedTube];
      const dstTube = tubes[index];

      // Can we pour?
      // Dst must not be full
      if (dstTube.length >= MAX_CAPACITY) {
        setSelectedTube(index); // Just select the new one if invalid pour
        return;
      }

      const srcTop = srcTube[srcTube.length - 1];
      const dstTop = dstTube.length > 0 ? dstTube[dstTube.length - 1] : null;

      // Color must match or dst must be empty
      if (dstTop === null || dstTop.colorId === srcTop.colorId) {
        // Calculate how many segments we can pour
        let count = 0;
        for (let i = srcTube.length - 1; i >= 0; i--) {
          if (srcTube[i].colorId === srcTop.colorId) count++;
          else break;
        }

        const spaceLeft = MAX_CAPACITY - dstTube.length;
        const toPour = Math.min(count, spaceLeft);

        if (toPour > 0) {
          const newTubes = [...tubes];
          newTubes[selectedTube] = [...srcTube];
          newTubes[index] = [...dstTube];

          // Pour
          const segments = newTubes[selectedTube].splice(-toPour, toPour);
          newTubes[index].push(...segments);

          setTubes(newTubes);
          setMoves(m => m + 1);
          setSelectedTube(null);

          if (checkWin(newTubes)) {
            setTimeout(() => setIsWin(true), 500); // Wait for animation
          }
        } else {
          setSelectedTube(null);
        }
      } else {
        // Invalid pour, just switch selection
        if (tubes[index].length > 0) {
          setSelectedTube(index);
        } else {
          setSelectedTube(null);
        }
      }
    }
  };

  const handleClaim = async () => {
    if (claimed) return;
    const reward = LEVEL_CONFIGS[Math.min(currentLevel - 1, LEVEL_CONFIGS.length - 1)].reward;
    try {
      await treeService.addReward(reward);
      setClaimed(true);
      // Next level
      setCurrentLevel(c => c + 1);
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi nhận thưởng');
    }
  };

  return (
    <div className="love-potion-page">
      <div className="potion-blob blob-1"></div>
      <div className="potion-blob blob-2"></div>

      <div className="potion-container">
        <div className="potion-header">
          <button className="potion-btn" onClick={() => navigate('/games')}>
            <ArrowLeft size={24} />
          </button>
          <h1>Pha Chế Tình Dược</h1>
          <button className="potion-btn" onClick={restartLevel}>
            <RotateCcw size={24} />
          </button>
        </div>

        <div className="potion-stats">
          <div className="potion-stat-box">
            <span style={{ fontSize: 12, opacity: 0.8, display: 'block' }}>MÀN CHƠI</span>
            <strong style={{ fontSize: 20 }}>{currentLevel}</strong>
          </div>
          <div className="potion-stat-box">
            <span style={{ fontSize: 12, opacity: 0.8, display: 'block' }}>SỐ BƯỚC</span>
            <strong style={{ fontSize: 20 }}>{moves}</strong>
          </div>
        </div>

        <div className="potion-board">
          {tubes.map((tube, idx) => (
            <div 
              key={`tube-${idx}`} 
              className={`tube-wrapper ${selectedTube === idx ? 'selected' : ''}`}
              onClick={() => handleTubeClick(idx)}
            >
              <div className="tube-glass">
                {/* We map segments. Flex column-reverse handles visual bottom-up stacking */}
                {tube.map((segment) => (
                  <motion.div
                    key={segment.id}
                    layoutId={`segment-${segment.id}`}
                    className={`liquid-segment color-${segment.colorId}`}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isWin && (
        <div className="potion-overlay">
          <motion.div 
            className="potion-overlay-box"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>Hoàn Hảo! 🧪✨</h2>
            <p>Bạn đã pha chế thành công các lọ Tình Dược.</p>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '20px', marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <Coins color="#fbbf24" size={24} />
              <strong style={{ fontSize: 24, color: '#fbbf24' }}>+{LEVEL_CONFIGS[Math.min(currentLevel - 1, LEVEL_CONFIGS.length - 1)].reward} Xu</strong>
            </div>

            <button className="potion-btn-primary" onClick={handleClaim} disabled={claimed}>
              {claimed ? 'ĐANG CHUYỂN MÀN...' : 'NHẬN THƯỞNG & ĐI TIẾP'}
            </button>
            <button className="potion-btn-outline" onClick={() => { setIsWin(false); restartLevel(); }}>
              Chơi Lại Màn Này
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LovePotionGame;
