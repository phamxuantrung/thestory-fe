import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Coins } from 'lucide-react';
import { treeService } from '../services/treeService';
import './Love2048Game.css';

const SIZE = 4;

const TILE_DATA = {
  1: { emoji: '🍓', name: 'Dâu Tây', reward: 0 },
  2: { emoji: '🍫', name: 'Sô Cô La', reward: 0 },
  3: { emoji: '🌹', name: 'Hoa Hồng', reward: 0 },
  4: { emoji: '🧸', name: 'Gấu Bông', reward: 0 },
  5: { emoji: '💌', name: 'Thư Tình', reward: 0 },
  6: { emoji: '💍', name: 'Nhẫn', reward: 5 },
  7: { emoji: '🥂', name: 'Rượu Vang', reward: 10 },
  8: { emoji: '🏰', name: 'Lâu Đài', reward: 20 },
  9: { emoji: '👼', name: 'Thiên Thần', reward: 50 },
  10: { emoji: '💖', name: 'Trái Tim', reward: 100 },
  11: { emoji: '🌌', name: 'Vũ Trụ', reward: 500 },
};

let tileIdCounter = 0;

const Love2048Game = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('love2048_best') || '0'));
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [claimed, setClaimed] = useState(false);
  
  const boardRef = useRef(board);
  boardRef.current = board;

  const getEmptyCells = (currentBoard) => {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!currentBoard.find(t => t.r === r && t.c === c)) {
          cells.push({ r, c });
        }
      }
    }
    return cells;
  };

  const addRandomTile = (currentBoard) => {
    const emptyCells = getEmptyCells(currentBoard);
    if (emptyCells.length === 0) return currentBoard;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const randomValue = Math.random();
    let spawnLevel = 1;
    if (randomValue > 0.6) spawnLevel = 2;
    if (randomValue > 0.9) spawnLevel = 3;
    
    const newTile = {
      id: tileIdCounter++,
      r: randomCell.r,
      c: randomCell.c,
      level: spawnLevel,
      isNew: true,
    };
    return [...currentBoard, newTile];
  };

  const initializeGame = () => {
    let newBoard = [];
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setIsGameOver(false);
    setIsWin(false);
    setClaimed(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleMove = useCallback((direction) => {
    if (isGameOver || isWin) return;

    const currentBoard = [...boardRef.current];
    // Remove "isNew" and "isMerged" flags
    currentBoard.forEach(t => { t.isNew = false; t.isMerged = false; });

    let hasMoved = false;
    let newScore = score;
    let won = false;

    // Helper to get tile at r,c
    const getTile = (r, c) => currentBoard.find(t => t.r === r && t.c === c);

    // Process a single line (row or column)
    const slideLine = (line) => {
      // line is an array of tiles in order of processing
      // Remove empty spots
      let tiles = line.filter(t => t);
      for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i].level === tiles[i+1].level) {
          // Merge
          tiles[i].level += 1;
          tiles[i].isMerged = true;
          newScore += Math.pow(2, tiles[i].level); // Classic scoring calculation
          if (tiles[i].level >= 9) won = true; // Win at level 9 (Thiên Thần) instead of 11
          
          // Remove the merged tile
          const idToRemove = tiles[i+1].id;
          const indexToRemove = currentBoard.findIndex(t => t.id === idToRemove);
          if (indexToRemove !== -1) currentBoard.splice(indexToRemove, 1);
          
          tiles.splice(i + 1, 1);
          hasMoved = true;
        }
      }
      return tiles;
    };

    if (direction === 'LEFT' || direction === 'RIGHT') {
      for (let r = 0; r < SIZE; r++) {
        let rowTiles = [];
        for (let c = 0; c < SIZE; c++) {
          const tile = getTile(r, direction === 'LEFT' ? c : SIZE - 1 - c);
          if (tile) rowTiles.push(tile);
        }
        
        rowTiles = slideLine(rowTiles);
        
        rowTiles.forEach((tile, index) => {
          const newC = direction === 'LEFT' ? index : SIZE - 1 - index;
          if (tile.c !== newC) {
            tile.c = newC;
            hasMoved = true;
          }
        });
      }
    } else if (direction === 'UP' || direction === 'DOWN') {
      for (let c = 0; c < SIZE; c++) {
        let colTiles = [];
        for (let r = 0; r < SIZE; r++) {
          const tile = getTile(direction === 'UP' ? r : SIZE - 1 - r, c);
          if (tile) colTiles.push(tile);
        }
        
        colTiles = slideLine(colTiles);
        
        colTiles.forEach((tile, index) => {
          const newR = direction === 'UP' ? index : SIZE - 1 - index;
          if (tile.r !== newR) {
            tile.r = newR;
            hasMoved = true;
          }
        });
      }
    }

    if (hasMoved) {
      let finalBoard = addRandomTile(currentBoard);
      setBoard(finalBoard);
      setScore(newScore);
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('love2048_best', newScore.toString());
      }
      
      if (won) setIsWin(true);
      else checkGameOver(finalBoard);
    }
  }, [score, bestScore, isGameOver, isWin]);

  const checkGameOver = (currentBoard) => {
    if (currentBoard.length < SIZE * SIZE) return; // Still empty spaces

    // Check if any adjacent tiles can be merged
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const current = currentBoard.find(t => t.r === r && t.c === c);
        const right = currentBoard.find(t => t.r === r && t.c === c + 1);
        const down = currentBoard.find(t => t.r === r + 1 && t.c === c);
        
        if (right && right.level === current.level) return;
        if (down && down.level === current.level) return;
      }
    }
    setIsGameOver(true);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': handleMove('UP'); break;
        case 'ArrowDown': handleMove('DOWN'); break;
        case 'ArrowLeft': handleMove('LEFT'); break;
        case 'ArrowRight': handleMove('RIGHT'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Touch handlers for swipe
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 30;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling while playing
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontal && Math.abs(distanceX) > minSwipeDistance) {
      handleMove(distanceX > 0 ? 'LEFT' : 'RIGHT');
    } else if (!isHorizontal && Math.abs(distanceY) > minSwipeDistance) {
      handleMove(distanceY > 0 ? 'UP' : 'DOWN');
    }
  };

  // Compute maximum reward
  const getMaxReward = () => {
    let maxLevel = 0;
    board.forEach(t => { if (t.level > maxLevel) maxLevel = t.level; });
    return TILE_DATA[maxLevel]?.reward || 0;
  };

  const maxReward = getMaxReward();

  const handleClaim = async () => {
    if (claimed) return;
    if (maxReward > 0) {
      try {
        await treeService.addReward(maxReward);
      } catch (err) {
        console.error('Failed to claim reward:', err);
      }
    }
    setClaimed(true);
    navigate('/games');
  };

  return (
    <div className="love2048-page">
      <div className="love2048-blob blob-1"></div>
      <div className="love2048-blob blob-2"></div>

      <div className="love2048-container">
        <div className="love2048-header">
          <button className="love2048-btn love2048-btn-outline" onClick={() => navigate('/games')}>
            <ArrowLeft size={20} />
          </button>
          <h1>2048 Tình Yêu</h1>
          <button className="love2048-btn love2048-btn-outline" onClick={initializeGame}>
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="love2048-controls">
          <div className="score-box">
            <div className="score-title">ĐIỂM</div>
            <div className="score-value">{score}</div>
          </div>
          <div className="score-box">
            <div className="score-title">KỶ LỤC</div>
            <div className="score-value">{bestScore}</div>
          </div>
        </div>

        <div 
          className="love2048-board"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
        >
          {/* Background grid */}
          <div className="love2048-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="grid-cell"></div>
            ))}
          </div>

          {/* Foreground tiles */}
          <div className="tile-container">
            <AnimatePresence>
              {board.map(tile => (
                <motion.div
                  key={tile.id}
                  className={`love2048-tile tile-${tile.level}`}
                  layout
                  initial={tile.isNew ? { scale: 0, opacity: 0 } : false}
                  animate={{ 
                    scale: tile.isMerged ? [1, 1.2, 1] : 1, 
                    opacity: 1,
                    top: `calc(${tile.r * 25}% + 4px)`,
                    left: `calc(${tile.c * 25}% + 4px)`,
                    width: 'calc(25% - 8px)',
                    height: 'calc(25% - 8px)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    scale: { duration: 0.2 }
                  }}
                  exit={{ opacity: 0, scale: 0, transition: { duration: 0.1 } }}
                >
                  <span className="tile-emoji">{TILE_DATA[tile.level]?.emoji}</span>
                  <span className="tile-name">{TILE_DATA[tile.level]?.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {(isGameOver || isWin) && (
        <div className="love2048-overlay">
          <h2>{isWin ? 'Chiến Thắng! 💖' : 'Hết nước đi!'}</h2>
          <p style={{ marginBottom: '10px', color: '#666' }}>Bạn đã ghép được biểu tượng cao nhất: {TILE_DATA[Math.max(...board.map(t=>t.level))]?.emoji}</p>
          
          <div className="reward-text">
            Thưởng: <Coins size={20} color="#fbbf24" /> {maxReward} Xu
          </div>

          <div className="love2048-actions">
            <button className="love2048-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={handleClaim} disabled={claimed}>
              {claimed ? 'ĐÃ NHẬN' : 'NHẬN THƯỞNG & THOÁT'}
            </button>
            <button className="love2048-btn love2048-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={initializeGame}>
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Love2048Game;
