import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { treeService } from '../services/treeService';
import HappyConnectCanvas from './HappyConnectCanvas';
import './HappyConnectGame.css';

const ROWS = 9;
const COLS = 7;
const INITIAL_MOVES = 10;

// Love theme items
const ITEM_TYPES = [
  { type: 1, icon: '❤️', color: '#ff4757', name: 'Heart' },
  { type: 2, icon: '🌹', color: '#ff6b81', name: 'Rose' },
  { type: 3, icon: '💍', color: '#74b9ff', name: 'Ring' },
  { type: 4, icon: '⭐', color: '#eccc68', name: 'Star' },
  { type: 5, icon: '💎', color: '#a29bfe', name: 'Diamond' },
];

const BUG_TYPE = { type: 'bug', icon: '🐛', color: '#2d3436', name: 'Bug', isObstacle: true };

let itemIdCounter = 0;
const generateRandomItem = () => {
  return {
    id: `item_${itemIdCounter++}`,
    typeDef: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
    isPopping: false,
  };
};

const createInitialGrid = (level = 1) => {
  const newGrid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => generateRandomItem())
  );

  const numBugs = Math.min(level * 2 + 2, Math.floor(ROWS * COLS * 0.4));
  let placed = 0;

  // Clump bugs near bottom left
  const queue = [{ r: ROWS - 1, c: 0 }];
  const visited = new Set();
  visited.add(`${ROWS - 1},0`);

  while (placed < numBugs && queue.length > 0) {
    const qIdx = Math.floor(Math.random() * queue.length);
    const { r, c } = queue.splice(qIdx, 1)[0];

    newGrid[r][c] = {
      id: `item_${itemIdCounter++}`,
      typeDef: BUG_TYPE,
      isPopping: false,
    };
    placed++;

    const neighbors = [
      { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
    ];
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(n);
        }
      }
    }
  }
  return newGrid;
};

export default function HappyConnectGame() {
  const navigate = useNavigate();

  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState(() => createInitialGrid(1));
  const [path, setPath] = useState([]); // Array of {r, c}
  const [dragging, setDragging] = useState(false);

  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [isGameOver, setIsGameOver] = useState(false);
  const [xuEarned, setXuEarned] = useState(0);

  const [showReward, setShowReward] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameEndClaimed, setGameEndClaimed] = useState(false);

  const gridRef = useRef(null);

  // Auto-claim when game ends
  useEffect(() => {
    if (moves <= 0 && !isAnimating) {
      // Check if bugs remaining
      const bugsRemaining = grid.some(row => row.some(item => item && item.typeDef.isObstacle));
      if (bugsRemaining && !isGameOver) {
        setIsGameOver(true);
      }
    }
  }, [moves, isAnimating, isGameOver, grid]);

  useEffect(() => {
    if (isGameOver && !gameEndClaimed) {
      setGameEndClaimed(true);
      const total = xuEarned;
      if (total > 0) {
        treeService.addReward(total).catch(console.error);
        setShowReward(total);
        setTimeout(() => setShowReward(null), 3000);
      }
    }
  }, [isGameOver, gameEndClaimed, xuEarned]);

  const handleRestart = () => {
    setLevel(1);
    setGrid(createInitialGrid(1));
    setScore(0);
    setMoves(INITIAL_MOVES);
    setIsGameOver(false);
    setXuEarned(0);
    setGameEndClaimed(false);
    setPath([]);
    setDragging(false);
    setIsAnimating(false);
    itemIdCounter = 0;
  };

  const handleNextLevel = () => {
    setLevel(l => {
      const nextLevel = l + 1;
      setMoves(INITIAL_MOVES + (nextLevel - 1) * 2); // Calculate moves based on level
      setGrid(createInitialGrid(nextLevel));
      return nextLevel;
    });
    setShowLevelUp(false);
  };

  const handleExitWithReward = () => {
    if (xuEarned > 0 && !gameEndClaimed) {
      setGameEndClaimed(true);
      treeService.addReward(xuEarned).catch(console.error);
    }
    navigate('/games');
  };

  // ── Drag Logic ──
  const getCellFromEvent = (clientX, clientY) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const c = Math.floor((clientX - rect.left) / cellW);
    const r = Math.floor((clientY - rect.top) / cellH);

    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
    return null;
  };

  const isAdjacent = (cell1, cell2) => {
    const dr = Math.abs(cell1.r - cell2.r);
    const dc = Math.abs(cell1.c - cell2.c);
    // Adjacent includes diagonals
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  };

  const handlePointerDown = (e) => {
    if (isGameOver || isAnimating) return;
    const cell = getCellFromEvent(e.clientX, e.clientY);
    if (!cell) return;

    const currentItem = grid[cell.r][cell.c];
    if (!currentItem || currentItem.typeDef.isObstacle) return;

    // Removed releasePointerCapture to prevent DOMException

    audioManager.init();
    audioManager.playSelect(0);

    setDragging(true);
    setPath([cell]);
  };

  const handlePointerMove = (e) => {
    if (!dragging || isGameOver || isAnimating) return;

    const cell = getCellFromEvent(e.clientX, e.clientY);
    if (!cell) return;

    const currentItem = grid[cell.r][cell.c];
    if (!currentItem || currentItem.typeDef.isObstacle) return;

    setPath((prevPath) => {
      if (prevPath.length === 0) return [cell];
      const lastCell = prevPath[prevPath.length - 1];
      if (lastCell.r === cell.r && lastCell.c === cell.c) return prevPath;

      // Check if backtracking
      if (prevPath.length >= 2) {
        const prevLast = prevPath[prevPath.length - 2];
        if (prevLast.r === cell.r && prevLast.c === cell.c) {
          // User went back, remove the last node
          return prevPath.slice(0, -1);
        }
      }

      // Check adjacency
      if (!isAdjacent(lastCell, cell)) return prevPath;

      // Check same type
      const firstCell = prevPath[0];
      const targetType = grid[firstCell.r][firstCell.c].typeDef.type;
      if (currentItem.typeDef.type !== targetType) return prevPath;

      // Check if already in path
      const alreadyInPath = prevPath.some(p => p.r === cell.r && p.c === cell.c);
      if (alreadyInPath) return prevPath;

      audioManager.playSelect(prevPath.length);
      return [...prevPath, cell];
    });
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);

    if (path.length >= 3) {
      processMatch(path);
    } else {
      setPath([]); // Cancel
    }
  };

  // Handle global pointer up in case cursor leaves the grid
  useEffect(() => {
    const onUp = () => {
      if (dragging) handlePointerUp();
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging, path]);

  const processMatch = (matchedPath) => {
    setIsAnimating(true);
    setMoves(m => m - 1);
    setPath([]);

    // 1. Process Bomb Triggering & Creation
    const newGrid = grid.map(row => [...row]);
    let hasBomb = false;

    const poppingSet = new Set();
    const addPopping = (r, c) => poppingSet.add(`${r},${c}`);

    // Initial matched path
    matchedPath.forEach(p => {
      addPopping(p.r, p.c);
      const item = newGrid[p.r][p.c];
      if (item && item.special) hasBomb = true;
    });

    // Check for bomb creation
    const len = matchedPath.length;
    let createdBombType = null;
    let createdBombPos = null;
    if (len >= 7) {
      createdBombType = 'cross';
    } else if (len >= 5) {
      createdBombType = Math.random() > 0.5 ? 'horizontal' : 'vertical';
    }

    if (createdBombType) {
      createdBombPos = matchedPath[len - 1]; // Spawn at the last matched item
      const existingItem = newGrid[createdBombPos.r][createdBombPos.c];
      // If the last item is already a special bomb, let it stay in poppingSet to trigger,
      // and we'll still place the new bomb at that position after clearing
      if (!existingItem || !existingItem.special) {
        poppingSet.delete(`${createdBombPos.r},${createdBombPos.c}`);
      }
      // If it IS a special item, it remains in poppingSet and will explode normally
    }

    const processQueue = [...poppingSet];
    const bugsToDestroy = [];

    // Trigger Bombs Recursively
    let i = 0;
    while (i < processQueue.length) {
      const [rs, cs] = processQueue[i].split(',');
      const r = parseInt(rs);
      const c = parseInt(cs);
      i++;

      const item = newGrid[r][c];
      if (!item) continue;

      if (item.special) {
        hasBomb = true;
        if (item.special === 'horizontal' || item.special === 'cross') {
          for (let cc = 0; cc < COLS; cc++) {
            if (cc !== c && !poppingSet.has(`${r},${cc}`)) {
              addPopping(r, cc);
              processQueue.push(`${r},${cc}`);
            }
          }
        }
        if (item.special === 'vertical' || item.special === 'cross') {
          for (let rr = 0; rr < ROWS; rr++) {
            if (rr !== r && !poppingSet.has(`${rr},${c}`)) {
              addPopping(rr, c);
              processQueue.push(`${rr},${c}`);
            }
          }
        }
      }
    }

    if (hasBomb) {
      audioManager.playExplosion();
    } else {
      audioManager.playMatch(matchedPath.length);
    }

    // Mark Popping and Check Adjacent Bugs
    poppingSet.forEach(key => {
      const [rs, cs] = key.split(',');
      const r = parseInt(rs);
      const c = parseInt(cs);

      const cell = newGrid[r][c];
      if (!cell) return;

      if (cell.typeDef.isObstacle) {
        if (!cell.isPopping) {
          newGrid[r][c] = { ...cell, isPopping: true };
          bugsToDestroy.push({ r, c });
        }
      } else {
        newGrid[r][c] = { ...cell, isPopping: true };
      }

      // Find adjacent bugs
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      directions.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const neighbor = newGrid[nr][nc];
          if (neighbor && neighbor.typeDef.isObstacle && !neighbor.isPopping) {
            newGrid[nr][nc] = { ...neighbor, isPopping: true };
            bugsToDestroy.push({ r: nr, c: nc });
          }
        }
      });
    });

    if (createdBombPos) {
      const bombCell = newGrid[createdBombPos.r][createdBombPos.c];
      // Only place the new bomb if this cell is NOT already popping (i.e., it wasn't a special item)
      if (bombCell && !bombCell.isPopping) {
        newGrid[createdBombPos.r][createdBombPos.c] = {
          ...bombCell,
          isPopping: false,
          special: createdBombType
        };

        // Also check adjacent bugs around the bomb spawn cell
        // (this cell was removed from poppingSet so its neighbors were never scanned)
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        directions.forEach(([dr, dc]) => {
          const nr = createdBombPos.r + dr;
          const nc = createdBombPos.c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            const neighbor = newGrid[nr][nc];
            if (neighbor && neighbor.typeDef.isObstacle && !neighbor.isPopping) {
              newGrid[nr][nc] = { ...neighbor, isPopping: true };
              bugsToDestroy.push({ r: nr, c: nc });
            }
          }
        });
      }
      // If the cell was already popping (existing special bomb), it will explode naturally.
      // The new bomb simply won't be placed in this case.
    }

    setGrid(newGrid);

    // Calculate scores
    const popLen = poppingSet.size;
    const scoreGain = popLen * 10 + (popLen > 3 ? (popLen - 3) * 20 : 0) + (bugsToDestroy.length * 50);
    setScore(s => s + scoreGain);

    // Xu rewards
    let xuGained = 0;
    if (popLen >= 7) xuGained = 5;
    else if (popLen >= 5) xuGained = 3;
    else xuGained = 1;

    // Additional xu for killing bugs (1 xu per bug)
    xuGained += bugsToDestroy.length;

    setXuEarned(x => x + xuGained);

    // 2. Wait for pop animation, then apply gravity
    setTimeout(() => {
      let finalGrid = newGrid.map(row => [...row]);

      // Remove popped items
      poppingSet.forEach(key => {
        const [rs, cs] = key.split(',');
        finalGrid[parseInt(rs)][parseInt(cs)] = null;
      });
      bugsToDestroy.forEach(({ r, c }) => {
        finalGrid[r][c] = null;
      });

      // Gravity: column by column
      for (let c = 0; c < COLS; c++) {
        let writeR = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (finalGrid[r][c] !== null) {
            finalGrid[writeR][c] = finalGrid[r][c];
            if (writeR !== r) finalGrid[r][c] = null;
            writeR--;
          }
        }
        // Fill top
        while (writeR >= 0) {
          finalGrid[writeR][c] = generateRandomItem();
          writeR--;
        }
      }

      // Check remaining bugs
      let remainingBugs = 0;
      const bugPositions = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (finalGrid[r][c] && finalGrid[r][c].typeDef.isObstacle) {
            remainingBugs++;
            bugPositions.push({ r, c });
          }
        }
      }

      if (remainingBugs === 0) {
        // LEVEL UP MODAL
        audioManager.playLevelUp();
        setShowLevelUp(true);
        setGrid(finalGrid);
      } else {
        // Bug Reproduction
        if (bugsToDestroy.length === 0 && moves > 1) {
          bugPositions.sort(() => Math.random() - 0.5);
          let reproduced = false;
          for (const bp of bugPositions) {
            const neighbors = [];
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            directions.forEach(([dr, dc]) => {
              const nr = bp.r + dr; const nc = bp.c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (!finalGrid[nr][nc].typeDef.isObstacle) {
                  neighbors.push({ r: nr, c: nc });
                }
              }
            });
            if (neighbors.length > 0) {
              const target = neighbors[Math.floor(Math.random() * neighbors.length)];
              finalGrid[target.r][target.c] = {
                id: `item_${itemIdCounter++}`,
                typeDef: BUG_TYPE,
                isPopping: false,
                isCloned: true
              };
              reproduced = true;
              break;
            }
          }
        }

        setGrid(finalGrid);
      }

      setIsAnimating(false);
    }, 300); // 300ms pop animation
  };

  // ── SVG Path Drawing ──
  const getCellCenter = (r, c) => {
    return {
      x: `${(c + 0.5) * (100 / COLS)}%`,
      y: `${(r + 0.5) * (100 / ROWS)}%`
    };
  };

  return (
    <div className="hc-container">
      {/* Header */}
      <div className="hc-header">
        <button className="hc-back-btn" onClick={() => navigate('/games')}><ArrowLeft size={20} /></button>
        <div className="hc-title">Happy Connect</div>
        <button className="hc-restart-btn" onClick={handleRestart}><RotateCcw size={20} /></button>
      </div>

      {/* Stats Bar */}
      <div className="hc-stats">
        <div className="hc-stat-box">
          <span>LEVEL</span>
          <strong>{level}</strong>
        </div>
        <div className="hc-stat-box">
          <span>ĐIỂM</span>
          <strong>{score}</strong>
        </div>
        <div className="hc-stat-box moves">
          <span>LƯỢT ĐI</span>
          <strong>{moves}</strong>
        </div>
        <div className="hc-stat-box xu">
          <span>XU</span>
          <strong>{xuEarned}</strong>
        </div>
      </div>

      <div className="hc-board-wrap">
        <div
          className="hc-grid"
          ref={gridRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          style={{ touchAction: 'none' }} // Prevent scrolling while drawing
        >
          <HappyConnectCanvas grid={grid} path={path} ROWS={ROWS} COLS={COLS} />
        </div>
      </div>

      <p className="hc-hint">Vuốt nối 3 hình giống nhau trở lên! 👆</p>

      {/* Level Up Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div className="hc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="hc-levelup-card"
              initial={{ scale: 0.3, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100 }}
            >
              <h2>LEVEL UP!</h2>
              <p style={{ color: 'white' }}>Hoàn thành Màn {level}</p>
              <div className="hc-go-actions" style={{ marginTop: 20 }}>
                <button onClick={handleNextLevel} className="hc-btn-primary">Chơi Tiếp (Màn {level + 1})</button>
                <button onClick={handleExitWithReward} className="hc-btn-secondary">Nhận {xuEarned} xu & Thoát</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div className="hc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="hc-game-over-card"
              initial={{ scale: 0.7, y: 80 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            >
              <h2>Hết Lượt!</h2>
              <div className="hc-go-score">Điểm: {score}</div>
              <div className="hc-go-xu">Bạn nhận được <strong>{xuEarned} xu 💰</strong></div>
              <div className="hc-go-actions">
                <button onClick={handleRestart} className="hc-btn-primary">Chơi Lại</button>
                <button onClick={() => navigate('/games')} className="hc-btn-secondary">Thoát</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward toast */}
      <AnimatePresence>
        {showReward && (
          <motion.div className="hc-reward-toast"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
          >💰 +{showReward} xu đã được cộng!</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
