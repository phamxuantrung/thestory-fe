import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Heart, RefreshCw } from 'lucide-react';
import { treeService } from '../services/treeService';
import './BlockBlastGame.css';

const GRID_SIZE = 8;

const PIECES = [
  { id: 'single', cells: [[0, 0]], color: '#f26989' },
  { id: 'duo_h', cells: [[0, 0], [0, 1]], color: '#f2b155' },
  { id: 'duo_v', cells: [[0, 0], [1, 0]], color: '#7fd8a6' },
  { id: 'triple_h', cells: [[0, 0], [0, 1], [0, 2]], color: '#4db8ff' },
  { id: 'triple_v', cells: [[0, 0], [1, 0], [2, 0]], color: '#8f6fff' },
  { id: 'el', cells: [[0, 0], [1, 0], [1, 1]], color: '#ff7675' },
  { id: 'el_flip', cells: [[0, 1], [1, 0], [1, 1]], color: '#fd79a8' },
  { id: 'el_r', cells: [[0, 0], [0, 1], [1, 1]], color: '#55efc4' },
  { id: 'el_r_flip', cells: [[0, 0], [0, 1], [1, 0]], color: '#74b9ff' },
  { id: 'square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: '#fdcb6e' },
  { id: 'tee', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: '#e17055' },
  { id: 'tee_v', cells: [[0, 0], [1, 0], [1, 1], [2, 0]], color: '#a29bfe' },
  { id: 'line4_h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: '#ff6b81' },
  { id: 'line4_v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#2ed573' },
  { id: 'zag', cells: [[0, 0], [0, 1], [1, 1], [1, 2]], color: '#ffa502' },
  { id: 'big_l', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], color: '#ff4757' },
  { id: 'big_sq', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], color: '#7bed9f' },
];

// Xu per line cleared (each row or column = XU_PER_LINE)
// Combo: clearing N lines at once → N * XU_PER_LINE * N (quadratic)
// Pure line (all same color) → XU_PER_LINE * 2 per line
const XU_PER_LINE = 5;

const PALETTE = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe'];
const randomPiece = () => {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return { ...base, color };
};
const generatePieceSet = () => [randomPiece(), randomPiece(), randomPiece()];
const emptyGrid = () => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

function canPlace(grid, piece, row, col) {
  for (const [dr, dc] of piece.cells) {
    const r = row + dr; const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

function placePiece(grid, piece, row, col) {
  const ng = grid.map(r => [...r]);
  for (const [dr, dc] of piece.cells) ng[row + dr][col + dc] = piece.color;
  return ng;
}

function detectFullLines(grid) {
  const fullRows = [], fullCols = [];
  for (let r = 0; r < GRID_SIZE; r++) if (grid[r].every(c => c !== null)) fullRows.push(r);
  for (let c = 0; c < GRID_SIZE; c++) if (grid.every(r => r[c] !== null)) fullCols.push(c);
  return { fullRows, fullCols };
}

// Returns true if all filled cells in this row/col share the same color
function isPureRow(grid, row) {
  const colors = grid[row].filter(c => c !== null);
  return colors.length === GRID_SIZE && new Set(colors).size === 1;
}
function isPureCol(grid, col) {
  const colors = grid.map(r => r[col]).filter(c => c !== null);
  return colors.length === GRID_SIZE && new Set(colors).size === 1;
}

function clearLines(grid, fullRows, fullCols) {
  const ng = grid.map(r => [...r]);
  for (const r of fullRows) for (let c = 0; c < GRID_SIZE; c++) ng[r][c] = null;
  for (const c of fullCols) for (let r = 0; r < GRID_SIZE; r++) ng[r][c] = null;
  return ng;
}

function hasAnyValidMove(grid, pieces) {
  for (const piece of pieces) {
    if (!piece) continue;
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (canPlace(grid, piece, r, c)) return true;
  }
  return false;
}

/* ─── Sparkle Particle component ─── */
function Sparkles({ x, y, color }) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const dist = 30 + Math.random() * 20;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    return { tx, ty };
  });
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 50 }}>
      {particles.map((p, i) => (
        <motion.div key={i}
          style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}`, left: 0, top: 0 }}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 0, x: p.tx, y: p.ty }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Gold Burst – for Pure Line ─── */
function GoldBurst({ x, y }) {
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360 + Math.random() * 15;
    const dist = 40 + Math.random() * 35;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    const size = 5 + Math.random() * 7;
    return { tx, ty, size };
  });
  const COLORS = ['#fdcb6e', '#ffeaa7', '#fff', '#f9ca24', '#f0932b'];
  return (
    <div style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 100 }}>
      {particles.map((p, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            width: p.size, height: p.size,
            borderRadius: i % 3 === 0 ? '50%' : '2px',
            backgroundColor: COLORS[i % COLORS.length],
            boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}, 0 0 16px #fdcb6e`,
            left: 0, top: 0,
          }}
          initial={{ opacity: 1, scale: 1.5, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, scale: 0, x: p.tx, y: p.ty, rotate: 360 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: i * 0.02 }}
        />
      ))}
      {/* Central star flash */}
      <motion.div
        style={{
          position: 'absolute', left: -20, top: -20,
          width: 40, height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff 0%, #fdcb6e 50%, transparent 100%)',
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
    </div>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
const BlockBlastGame = () => {
  const navigate = useNavigate();

  const [grid, setGrid] = useState(emptyGrid());
  const [pieces, setPieces] = useState(() => generatePieceSet());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('blockblast_best') || '0'));
  const [isGameOver, setIsGameOver] = useState(false);
  const [xuEarned, setXuEarned] = useState(0);   // xu earned this game
  const [showReward, setShowReward] = useState(null);
  const [comboText, setComboText] = useState(null);
  const [gameEndClaimed, setGameEndClaimed] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pureCells, setPureCells] = useState(new Set()); // cells in a pure line
  const [goldBursts, setGoldBursts] = useState([]);        // gold burst positions
  const [refreshes, setRefreshes] = useState(3);         // number of refreshes left

  // Drag state
  const [dragging, setDragging] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);

  // Clear animation state
  // clearingCells: Set of "r,c" strings currently being cleared
  // sparkles: list of { id, x, y, color } absolute positions for particle bursts
  const [clearingCells, setClearingCells] = useState(new Set());
  const [sparkles, setSparkles] = useState([]);

  const gridRef = useRef(null);
  const isClearing = useRef(false); // prevent double-drop during animation

  // ── best score ──
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('blockblast_best', String(score));
    }
  }, [score, bestScore]);

  // ── Grid cell from pointer ──
  const getCellFromPoint = useCallback((clientX, clientY) => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const gap = 3;
    const cellW = (rect.width - gap * (GRID_SIZE - 1)) / GRID_SIZE;
    const cellH = (rect.height - gap * (GRID_SIZE - 1)) / GRID_SIZE;
    const col = Math.floor((clientX - rect.left) / (cellW + gap));
    const row = Math.floor((clientY - rect.top) / (cellH + gap));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { r: row, c: col };
  }, []);

  // get absolute center of a grid cell (for sparkle spawn)
  const getCellCenter = useCallback((r, c) => {
    const el = gridRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const gap = 3;
    const cellW = (rect.width - gap * (GRID_SIZE - 1)) / GRID_SIZE;
    const cellH = (rect.height - gap * (GRID_SIZE - 1)) / GRID_SIZE;
    return {
      x: rect.left + c * (cellW + gap) + cellW / 2,
      y: rect.top + r * (cellH + gap) + cellH / 2,
    };
  }, []);

  // ── DRAG START ──
  const handleMouseDown = useCallback((e, idx) => {
    if (isClearing.current) return;
    e.preventDefault();
    const piece = pieces[idx];
    if (!piece) return;
    setDragging({ pieceIdx: idx, piece, x: e.clientX, y: e.clientY });
  }, [pieces]);

  const handleTouchStart = useCallback((e, idx) => {
    if (isClearing.current) return;
    const touch = e.touches[0];
    const piece = pieces[idx];
    if (!piece) return;
    setDragging({ pieceIdx: idx, piece, x: touch.clientX, y: touch.clientY });
  }, [pieces]);

  // ── DRAG MOVE ──
  useEffect(() => {
    if (!dragging) return;

    // Calculate bounding box size of the dragging piece (cellSize = 20, gap = 3)
    const maxR = Math.max(...dragging.piece.cells.map(([r]) => r));
    const maxC = Math.max(...dragging.piece.cells.map(([, c]) => c));
    const pieceW = (maxC + 1) * 23;
    const pieceH = (maxR + 1) * 23;

    const onMove = (cx, cy) => {
      setDragging(d => d ? { ...d, x: cx, y: cy } : null);

      // Since ghost is centered on cursor (cx, cy), its top-left is:
      const topLeftX = cx - pieceW / 2;
      const topLeftY = cy - pieceH / 2;

      // Check the cell under the center of the [0,0] block
      setHoverCell(getCellFromPoint(topLeftX + 11.5, topLeftY + 11.5));
    };

    const onMM = e => onMove(e.clientX, e.clientY);
    const onTM = e => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    window.addEventListener('mousemove', onMM);
    window.addEventListener('touchmove', onTM, { passive: false });
    return () => { window.removeEventListener('mousemove', onMM); window.removeEventListener('touchmove', onTM); };
  }, [dragging, getCellFromPoint]);

  // ── COMMIT DROP (with clear animation) ──
  const commitDrop = useCallback(() => {
    if (!dragging || isClearing.current) return;
    const { pieceIdx, piece } = dragging;
    setDragging(null);

    if (!hoverCell) { setHoverCell(null); return; }
    const { r, c } = hoverCell;
    setHoverCell(null);

    if (!canPlace(grid, piece, r, c)) return;

    const placed = placePiece(grid, piece, r, c);
    const { fullRows, fullCols } = detectFullLines(placed);
    const cleared = fullRows.length + fullCols.length;

    // Base score for placing
    const baseGain = piece.cells.length * 10;
    setScore(s => s + baseGain);

    const np = [...pieces];
    np[pieceIdx] = null;
    const finalPieces = np.every(p => p === null) ? generatePieceSet() : np;

    if (cleared === 0) {
      // No lines to clear – just update immediately
      setGrid(placed);
      setPieces(finalPieces);
      setTimeout(() => { if (!hasAnyValidMove(placed, finalPieces)) setIsGameOver(true); }, 120);
      return;
    }

    // ─── There ARE lines to clear: animate first ───
    isClearing.current = true;

    // Build set of cells to animate
    const toFlash = new Set();
    for (const row of fullRows) for (let cc = 0; cc < GRID_SIZE; cc++) toFlash.add(`${row},${cc}`);
    for (const col of fullCols) for (let rr = 0; rr < GRID_SIZE; rr++) toFlash.add(`${rr},${col}`);

    // Show the placed-piece grid immediately, mark clearing cells
    setGrid(placed);
    setClearingCells(toFlash);

    // Spawn sparkles at random cells in each completed line
    const spawnSparkles = [];
    let spawnId = Date.now();
    for (const row of fullRows) {
      for (let cc = 0; cc < GRID_SIZE; cc += 2) {
        const pos = getCellCenter(row, cc);
        spawnSparkles.push({ id: spawnId++, x: pos.x, y: pos.y, color: placed[row][cc] || '#fff' });
      }
    }
    for (const col of fullCols) {
      for (let rr = 0; rr < GRID_SIZE; rr += 2) {
        const pos = getCellCenter(rr, col);
        spawnSparkles.push({ id: spawnId++, x: pos.x, y: pos.y, color: placed[rr][col] || '#fff' });
      }
    }
    setSparkles(spawnSparkles);

    // ── Detect Pure Lines (all same color) ──
    let pureCount = 0;
    const pureCellSet = new Set();
    const goldBurstList = [];
    let burstId = Date.now() + 9000;
    for (const row of fullRows) {
      if (isPureRow(placed, row)) {
        pureCount++;
        for (let cc = 0; cc < GRID_SIZE; cc++) pureCellSet.add(`${row},${cc}`);
        // Spawn gold bursts along the middle of the row
        for (let cc = 0; cc < GRID_SIZE; cc += 3) {
          const pos = getCellCenter(row, cc);
          goldBurstList.push({ id: burstId++, x: pos.x, y: pos.y });
        }
      }
    }
    for (const col of fullCols) {
      if (isPureCol(placed, col)) {
        pureCount++;
        for (let rr = 0; rr < GRID_SIZE; rr++) pureCellSet.add(`${rr},${col}`);
        for (let rr = 0; rr < GRID_SIZE; rr += 3) {
          const pos = getCellCenter(rr, col);
          goldBurstList.push({ id: burstId++, x: pos.x, y: pos.y });
        }
      }
    }
    if (pureCount > 0) {
      setPureCells(pureCellSet);
      setGoldBursts(goldBurstList);
    }

    // Score bonus from lines
    const bonus = cleared > 1 ? cleared * cleared : cleared;
    const lineGain = bonus * 50 + pureCount * 200; // pure line adds 200 score bonus
    setScore(s => s + lineGain);

    // XU reward per line (combo multiplied) + pure line bonus (double xu)
    const baseXu = cleared > 1 ? cleared * XU_PER_LINE * cleared : cleared * XU_PER_LINE;
    const pureXu = pureCount * XU_PER_LINE * 2; // pure lines give double xu
    const xuGain = baseXu + pureXu;
    setXuEarned(x => x + xuGain);

    if (pureCount > 0 && cleared > 1) {
      setComboText(`🌟 PURE COMBO! +${xuGain} xu ✨`);
      setTimeout(() => setComboText(null), 2000);
    } else if (pureCount > 0) {
      setComboText(`🌟 PURE LINE! +${pureXu} xu thưởng!`);
      setTimeout(() => setComboText(null), 2000);
    } else if (cleared > 1) {
      setComboText(`COMBO x${cleared}! +${xuGain} xu`);
      setTimeout(() => setComboText(null), 1600);
    }

    // After animation, actually clear the grid
    setTimeout(() => {
      const newGrid = clearLines(placed, fullRows, fullCols);
      setGrid(newGrid);
      setClearingCells(new Set());
      setPureCells(new Set());
      setGoldBursts([]);
      setSparkles([]);
      setPieces(finalPieces);
      isClearing.current = false;
      setTimeout(() => {
        if (!hasAnyValidMove(newGrid, finalPieces)) setIsGameOver(true);
      }, 120);
    }, 480);

  }, [dragging, hoverCell, grid, pieces, getCellCenter]);

  useEffect(() => {
    const onUp = () => commitDrop();
    const onEnd = () => commitDrop();
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('mouseup', onUp); window.removeEventListener('touchend', onEnd); };
  }, [commitDrop]);

  // ── Hover highlight ──
  const hoverCells = (() => {
    if (!dragging || !hoverCell) return { cells: new Set(), valid: false };
    const { piece } = dragging;
    const { r, c } = hoverCell;
    const valid = canPlace(grid, piece, r, c);
    const cells = new Set(piece.cells.map(([dr, dc]) => `${r + dr},${c + dc}`));
    return { cells, valid };
  })();

  // Auto-claim when game ends
  useEffect(() => {
    if (!isGameOver || gameEndClaimed) return;
    setGameEndClaimed(true);
    const total = xuEarned;
    treeService.addReward(total).catch(console.error);
    setShowReward(total);
    setTimeout(() => setShowReward(null), 3000);
  }, [isGameOver]); // eslint-disable-line

  const handleRestart = () => {
    setGrid(emptyGrid()); setPieces(generatePieceSet()); setScore(0);
    setIsGameOver(false); setXuEarned(0); setShowReward(null);
    setComboText(null); setDragging(null); setHoverCell(null);
    setClearingCells(new Set()); setPureCells(new Set());
    setGoldBursts([]); setSparkles([]);
    setGameEndClaimed(false);
    isClearing.current = false;
    setRefreshes(3);
  };

  const confirmExit = () => {
    if (xuEarned > 0 && !gameEndClaimed) {
      setGameEndClaimed(true);
      treeService.addReward(xuEarned).catch(console.error);
    }
    navigate('/games');
  };

  const handleRefresh = () => {
    if (refreshes > 0 && !isClearing.current) {
      setPieces(generatePieceSet());
      setRefreshes(r => r - 1);
      setDragging(null);
      setHoverCell(null);
    }
  };

  const totalEarnable = xuEarned;

  /* ─── RENDER ─── */
  return (
    <div className="blockblast-container" style={{ touchAction: dragging ? 'none' : 'auto' }}>
      {/* Background */}
      <div className="blockblast-bg">
        <div className="bb-blob bb-blob-1" /><div className="bb-blob bb-blob-2" /><div className="bb-blob bb-blob-3" />
      </div>

      {/* Sparkle particles */}
      {sparkles.map(s => <Sparkles key={s.id} x={s.x} y={s.y} color={s.color} />)}
      {/* Gold burst particles for pure lines */}
      {goldBursts.map(g => <GoldBurst key={g.id} x={g.x} y={g.y} />)}

      {/* Dragging ghost */}
      {dragging && (
        <div className="bb-drag-ghost" style={{ left: dragging.x, top: dragging.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          <PiecePreview piece={dragging.piece} cellSize={20} />
        </div>
      )}

      {/* Header */}
      <div className="bb-header">
        <button className="bb-back-btn" onClick={() => setShowExitModal(true)}><ArrowLeft size={20} /></button>
        <div className="bb-title">Block Blast</div>
        <button className="bb-restart-btn" onClick={handleRestart}><RotateCcw size={20} /></button>
      </div>

      {/* Score Row */}
      <div className="bb-score-row">
        <div className="bb-score-card">
          <div className="bb-score-label">Điểm</div>
          <div className="bb-score-value">{score.toLocaleString()}</div>
        </div>
        <div className="bb-score-card">
          <div className="bb-score-label">Tốt nhất</div>
          <div className="bb-score-value">{bestScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Xu earned tracker */}
      <div className="bb-xu-bar">
        <span className="bb-xu-label">Xu ván này:</span>
        <span className="bb-xu-value">{xuEarned}</span>
        <span className="bb-xu-hint">(xóa hàng để kiếm xu)</span>
      </div>

      {/* Combo text */}
      <AnimatePresence>
        {comboText && (
          <motion.div className="bb-combo-text"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }} transition={{ duration: 0.35 }}
          >{comboText}</motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="bb-grid-wrap">
        <div className="bb-grid" ref={gridRef}>
          {Array(GRID_SIZE).fill(null).map((_, r) =>
            Array(GRID_SIZE).fill(null).map((__, c) => {
              const key = `${r},${c}`;
              const filled = grid[r][c];
              const isHov = hoverCells.cells.has(key);
              const isInv = isHov && !hoverCells.valid;
              const isVal = isHov && hoverCells.valid;
              const isClr = clearingCells.has(key);
              return (
                <div
                  key={key}
                  className={`bb-cell
                    ${filled ? 'filled' : ''}
                    ${isVal ? 'hovered' : ''}
                    ${isInv ? 'invalid' : ''}
                    ${isClr && pureCells.has(key) ? 'clearing pure' : isClr ? 'clearing' : ''}
                  `}
                  style={{ backgroundColor: isVal ? dragging?.piece.color + 'bb' : (filled || undefined) }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Piece Tray */}
      <div className="bb-tray">
        {pieces.map((piece, idx) => (
          <div
            key={idx}
            className={`bb-piece-slot ${!piece ? 'empty' : ''} ${dragging?.pieceIdx === idx ? 'dragging-out' : ''}`}
            onMouseDown={e => handleMouseDown(e, idx)}
            onTouchStart={e => handleTouchStart(e, idx)}
          >
            {piece && <PiecePreview piece={piece} cellSize={16} />}
          </div>
        ))}
      </div>

      <div className="bb-controls-row">
        <p className="bb-hint">Kéo khối vào lưới để đặt</p>
        <button
          className="bb-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshes <= 0 || isClearing.current}
        >
          <RefreshCw size={14} />
          Đổi ({refreshes})
        </button>
      </div>

      {/* Reward toast */}
      <AnimatePresence>
        {showReward && (
          <motion.div className="bb-reward-toast"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
          >+{showReward} xu đã được cộng!</motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div className="bb-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bb-game-over-card"
              initial={{ scale: 0.7, y: 80 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            >
              <div className="bb-go-emoji">💥</div>
              <h2 className="bb-go-title">Hết Lượt!</h2>
              <div className="bb-go-score">
                <span className="bb-go-score-label">Điểm của bạn</span>
                <span className="bb-go-score-value">{score.toLocaleString()}</span>
              </div>
              <div className="bb-go-reward">Bạn kiếm được <span>{totalEarnable}</span> xu</div>
              <button className="bb-go-btn" onClick={handleRestart}>Chơi lại</button>
              <button className="bb-go-exit" onClick={() => navigate('/games')}>Thoát</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div className="bb-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bb-game-over-card"
              initial={{ scale: 0.7, y: 80 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            >
              <h2 className="bb-go-title">Xác nhận thoát</h2>
              <div className="bb-go-reward" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                Bạn đang có <span>{xuEarned}</span> xu chưa nhận.<br />
                Thoát bây giờ bạn vẫn sẽ nhận được số xu này!
              </div>
              <button className="bb-go-btn" onClick={confirmExit}>Nhận {xuEarned} Xu & Thoát</button>
              <button className="bb-go-exit" onClick={() => setShowExitModal(false)}>Chơi tiếp</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Piece Preview ─── */
function PiecePreview({ piece, cellSize = 16 }) {
  const maxR = Math.max(...piece.cells.map(([r]) => r));
  const maxC = Math.max(...piece.cells.map(([, c]) => c));
  const cellSet = new Set(piece.cells.map(([r, c]) => `${r},${c}`));
  return (
    <div className="bb-piece-preview">
      {Array(maxR + 1).fill(null).map((_, r) => (
        <div key={r} className="bb-preview-row">
          {Array(maxC + 1).fill(null).map((__, c) => (
            <div key={c} className="bb-preview-cell" style={{
              width: cellSize, height: cellSize,
              backgroundColor: cellSet.has(`${r},${c}`) ? piece.color : 'transparent',
              borderRadius: cellSet.has(`${r},${c}`) ? '30%' : 0,
              boxShadow: cellSet.has(`${r},${c}`) ? `inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.2)` : 'none',
              position: 'relative'
            }}>
              {cellSet.has(`${r},${c}`) && (
                <div style={{
                  position: 'absolute', top: '12%', left: '15%', width: '35%', height: '25%',
                  background: 'white', borderRadius: '50%', transform: 'rotate(-20deg)', opacity: 0.5
                }} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default BlockBlastGame;
