import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Coins, Shuffle } from 'lucide-react';
import { treeService } from '../services/treeService';
import './OnetConnectGame.css';

const ROWS = 12; // 10 visible + 2 padding
const COLS = 8;  // 6 visible + 2 padding
const TIME_LIMIT = 180; // 3 minutes

const ICONS = ['🍓', '🍫', '🌹', '🧸', '💌', '💍', '🥂', '🏰', '👼', '💖'];

const OnetConnectGame = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [path, setPath] = useState(null); // array of points
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [shufflesLeft, setShufflesLeft] = useState(3);
  
  const timerRef = useRef(null);

  // Initialize board
  const initializeGame = useCallback(() => {
    // We need 60 tiles (6x10). 10 icons * 6 each = 60.
    let tiles = [];
    let idCounter = 0;
    for (let i = 0; i < ICONS.length; i++) {
      for (let j = 0; j < 6; j++) {
        tiles.push({ id: idCounter++, iconId: i, icon: ICONS[i] });
      }
    }
    
    // Fisher-Yates shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const newBoard = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    let tileIndex = 0;
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        newBoard[r][c] = tiles[tileIndex++];
      }
    }
    
    setBoard(newBoard);
    setSelected(null);
    setPath(null);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setIsGameOver(false);
    setIsWin(false);
    setClaimed(false);
    setShufflesLeft(3);

    // Auto shuffle if no moves immediately
    setTimeout(() => {
      ensurePlayable(newBoard);
    }, 100);
  }, []);

  useEffect(() => {
    initializeGame();
    return () => clearInterval(timerRef.current);
  }, [initializeGame]);

  useEffect(() => {
    if (board && !isGameOver && !isWin) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [board, isGameOver, isWin]);

  const checkLine = (x1, y1, x2, y2, currentBoard) => {
    if (x1 === x2) {
      const min = Math.min(y1, y2);
      const max = Math.max(y1, y2);
      for (let y = min + 1; y < max; y++) {
        if (currentBoard[y][x1] !== null) return false;
      }
      return true;
    }
    if (y1 === y2) {
      const min = Math.min(x1, x2);
      const max = Math.max(x1, x2);
      for (let x = min + 1; x < max; x++) {
        if (currentBoard[y1][x] !== null) return false;
      }
      return true;
    }
    return false;
  };

  const findPath = (p1, p2, currentBoard) => {
    if (p1.x === p2.x && p1.y === p2.y) return null;

    // 0 turns
    if (p1.x === p2.x || p1.y === p2.y) {
      if (checkLine(p1.x, p1.y, p2.x, p2.y, currentBoard)) {
        return [p1, p2];
      }
    }

    // 1 turn
    const c1 = { x: p1.x, y: p2.y };
    if (currentBoard[c1.y][c1.x] === null) {
      if (checkLine(p1.x, p1.y, c1.x, c1.y, currentBoard) && checkLine(c1.x, c1.y, p2.x, p2.y, currentBoard)) {
        return [p1, c1, p2];
      }
    }
    const c2 = { x: p2.x, y: p1.y };
    if (currentBoard[c2.y][c2.x] === null) {
      if (checkLine(p1.x, p1.y, c2.x, c2.y, currentBoard) && checkLine(c2.x, c2.y, p2.x, p2.y, currentBoard)) {
        return [p1, c2, p2];
      }
    }

    // 2 turns - vertical from p1
    for (let dir of [-1, 1]) {
      let y = p1.y + dir;
      while (y >= 0 && y < ROWS && currentBoard[y][p1.x] === null) {
        const c_1 = { x: p1.x, y };
        const c_2 = { x: p2.x, y };
        if (currentBoard[c_2.y][c_2.x] === null) {
          if (checkLine(c_1.x, c_1.y, c_2.x, c_2.y, currentBoard) && checkLine(c_2.x, c_2.y, p2.x, p2.y, currentBoard)) {
            return [p1, c_1, c_2, p2];
          }
        }
        y += dir;
      }
    }

    // 2 turns - horizontal from p1
    for (let dir of [-1, 1]) {
      let x = p1.x + dir;
      while (x >= 0 && x < COLS && currentBoard[p1.y][x] === null) {
        const c_1 = { x, y: p1.y };
        const c_2 = { x, y: p2.y };
        if (currentBoard[c_2.y][c_2.x] === null) {
          if (checkLine(c_1.x, c_1.y, c_2.x, c_2.y, currentBoard) && checkLine(c_2.x, c_2.y, p2.x, p2.y, currentBoard)) {
            return [p1, c_1, c_2, p2];
          }
        }
        x += dir;
      }
    }

    return null;
  };

  const getPossibleMoves = (currentBoard) => {
    // Group all non-null tiles by iconId
    const groups = {};
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = currentBoard[y][x];
        if (tile) {
          if (!groups[tile.iconId]) groups[tile.iconId] = [];
          groups[tile.iconId].push({ x, y });
        }
      }
    }

    for (const iconId in groups) {
      const pts = groups[iconId];
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          if (findPath(pts[i], pts[j], currentBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const doShuffle = (currentBoard) => {
    let tiles = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (currentBoard[y][x]) {
          tiles.push(currentBoard[y][x]);
          currentBoard[y][x] = null;
        }
      }
    }
    
    // Shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    let tileIndex = 0;
    // Fill back only in inner grid
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (tileIndex < tiles.length) {
          currentBoard[r][c] = tiles[tileIndex++];
        }
      }
    }
    
    return [...currentBoard];
  };

  const ensurePlayable = (currentBoard) => {
    let boardCopy = [...currentBoard];
    let remaining = 0;
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS; c++) {
        if(boardCopy[r][c]) remaining++;
      }
    }
    
    if (remaining === 0) {
      setIsWin(true);
      return;
    }

    let attempts = 0;
    while (!getPossibleMoves(boardCopy) && attempts < 10) {
      boardCopy = doShuffle(boardCopy);
      attempts++;
    }
    setBoard(boardCopy);
  };

  const handleTileClick = (x, y) => {
    if (isGameOver || isWin || path) return;
    
    const clickedTile = board[y][x];
    if (!clickedTile) return;

    if (!selected) {
      setSelected({ x, y, tile: clickedTile });
    } else {
      if (selected.x === x && selected.y === y) {
        // Deselect
        setSelected(null);
        return;
      }
      
      if (selected.tile.iconId !== clickedTile.iconId) {
        // Switch selection
        setSelected({ x, y, tile: clickedTile });
        return;
      }

      // Same icon, check path
      const foundPath = findPath(selected, { x, y }, board);
      if (foundPath) {
        setPath(foundPath);
        // Play success sound / delay to show line
        setTimeout(() => {
          const newBoard = board.map(row => [...row]);
          newBoard[selected.y][selected.x] = null;
          newBoard[y][x] = null;
          setBoard(newBoard);
          setScore(s => s + 10);
          setSelected(null);
          setPath(null);
          
          ensurePlayable(newBoard);
        }, 300);
      } else {
        setSelected({ x, y, tile: clickedTile });
      }
    }
  };

  const handleManualShuffle = () => {
    if (shufflesLeft > 0 && !isGameOver && !isWin) {
      const newBoard = doShuffle([...board]);
      ensurePlayable(newBoard);
      setShufflesLeft(s => s - 1);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClaim = async () => {
    if (claimed) return;
    const reward = isWin ? 200 : Math.floor(score / 10);
    try {
      if (reward > 0) {
        await treeService.addReward(reward);
      }
      setClaimed(true);
      navigate('/games');
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi nhận thưởng');
    }
  };

  if (!board) return null;

  return (
    <div className="onet-page">
      <div className="onet-header">
        <button className="onet-btn" onClick={() => navigate('/games')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Nối Thú Cặp Đôi</h1>
        <button className="onet-btn" onClick={initializeGame}>
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="onet-stats">
        <div className="onet-stat-box">
          <span className="onet-stat-title">Điểm</span>
          <span className="onet-stat-value">{score}</span>
        </div>
        <div className="onet-stat-box" style={{ color: timeLeft < 30 ? '#ef4444' : 'inherit' }}>
          <span className="onet-stat-title">Thời gian</span>
          <span className="onet-stat-value">{formatTime(timeLeft)}</span>
        </div>
        <button 
          className="onet-btn" 
          onClick={handleManualShuffle} 
          disabled={shufflesLeft === 0}
          style={{ width: 'auto', padding: '0 15px', borderRadius: '12px' }}
        >
          <Shuffle size={16} style={{ marginRight: '5px' }} />
          {shufflesLeft}
        </button>
      </div>

      <div className="onet-board-container">
        <div className="onet-grid">
          {board.map((row, y) => 
            row.map((tile, x) => (
              <div key={`${x}-${y}`} className="onet-cell-wrapper">
                {/* Only render if it's the inner grid or if there's a tile */}
                <div 
                  className={`onet-cell ${!tile ? 'empty' : ''} ${selected?.x === x && selected?.y === y ? 'selected' : ''}`}
                  onClick={() => handleTileClick(x, y)}
                  style={{ visibility: (x===0 || x===COLS-1 || y===0 || y===ROWS-1) && !tile ? 'hidden' : 'visible' }}
                >
                  {tile ? tile.icon : ''}
                </div>
              </div>
            ))
          )}
        </div>

        {path && (
          <svg className="onet-svg-overlay">
            <polyline 
              className="onet-line"
              points={path.map(p => `${(p.x + 0.5) * (100 / COLS)}%,${(p.y + 0.5) * (100 / ROWS)}%`).join(' ')}
            />
          </svg>
        )}
      </div>

      {(isGameOver || isWin) && (
        <div className="onet-overlay">
          <h2>{isWin ? 'Tuyệt Vời! 💖' : 'Hết Giờ! 😢'}</h2>
          
          <div className="onet-reward">
            Thưởng: <Coins size={24} /> {isWin ? 200 : Math.floor(score / 10)} Xu
          </div>

          <button className="onet-btn-primary" onClick={handleClaim} disabled={claimed}>
            {claimed ? 'ĐÃ NHẬN' : 'NHẬN THƯỞNG & THOÁT'}
          </button>
          <button className="onet-btn-outline" onClick={initializeGame}>
            Chơi Lại
          </button>
        </div>
      )}
    </div>
  );
};

export default OnetConnectGame;
