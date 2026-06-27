import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { treeService } from '../services/treeService';
import './CaroGame.css';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diags
];

const checkWinner = (squares) => {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const [a, b, c] = WIN_LINES[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: WIN_LINES[i] };
    }
  }
  return null;
};

// Simple Minimax for unbeatable AI
const minimax = (squares, depth, isMaximizing) => {
  const result = checkWinner(squares);
  if (result?.winner === 'O') return 10 - depth;
  if (result?.winner === 'X') return depth - 10;
  if (!squares.includes(null)) return 0; // Tie

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = 'O';
        let score = minimax(squares, depth + 1, false);
        squares[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = 'X';
        let score = minimax(squares, depth + 1, true);
        squares[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

const getBestMove = (squares) => {
  // 30% cơ hội AI đi một bước ngẫu nhiên để người chơi có thể thắng
  if (Math.random() < 0.3) {
    const emptyIndices = [];
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) emptyIndices.push(i);
    }
    if (emptyIndices.length > 0) {
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
  }

  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!squares[i]) {
      squares[i] = 'O';
      let score = minimax(squares, 0, false);
      squares[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
};

const CaroGame = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('playing'); // playing, won, lost, tie
  const [winLine, setWinLine] = useState([]);

  useEffect(() => {
    const checkGameState = async () => {
      const result = checkWinner(board);
      if (result) {
        setWinLine(result.line);
        if (result.winner === 'X') {
          setGameStatus('won');
          await giveReward(30); // Win = 30 Xu
        } else {
          setGameStatus('lost');
        }
        return;
      }

      if (!board.includes(null)) {
        setGameStatus('tie');
        await giveReward(10); // Tie = 10 Xu
        return;
      }

      // Bot's turn
      if (!isPlayerTurn && gameStatus === 'playing') {
        const timer = setTimeout(() => {
          const move = getBestMove([...board]);
          if (move !== -1) {
            const newBoard = [...board];
            newBoard[move] = 'O';
            setBoard(newBoard);
            setIsPlayerTurn(true);
          }
        }, 600); // Fake thinking delay
        return () => clearTimeout(timer);
      }
    };

    checkGameState();
  }, [board, isPlayerTurn, gameStatus]);

  const giveReward = async (coins) => {
    try {
      await treeService.addReward(coins);
    } catch (err) {
      console.error('Failed to give reward', err);
    }
  };

  const handleCellClick = (index) => {
    if (!isPlayerTurn || gameStatus !== 'playing' || board[index]) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setWinLine([]);
  };

  const getStatusMessage = () => {
    if (gameStatus === 'playing') return isPlayerTurn ? 'Lượt của bạn (X)' : 'Bot đang nghĩ...';
    if (gameStatus === 'won') return '🎉 Bạn đã thắng! (+30 Xu)';
    if (gameStatus === 'lost') return '💀 Bot thắng rồi!';
    if (gameStatus === 'tie') return '🤝 Hòa nhau! (+10 Xu)';
  };

  return (
    <div className="caro-game-page">
      <Header title="Cờ Caro Mini" showBack={true} onBack={() => navigate('/games')} transparent={true} />
      
      <div className="caro-container">
        <div className="caro-status">
          {getStatusMessage()}
        </div>

        <div className="caro-board">
          {board.map((cell, idx) => (
            <div 
              key={idx} 
              className={`caro-cell ${cell ? cell.toLowerCase() : ''} ${!isPlayerTurn || cell || gameStatus !== 'playing' ? 'disabled' : ''} ${winLine.includes(idx) ? 'winning-cell' : ''}`}
              onClick={() => handleCellClick(idx)}
            >
              {cell}
            </div>
          ))}
        </div>

        {gameStatus !== 'playing' && (
          <div className="caro-controls">
            <button className="btn-caro primary" onClick={resetGame}>Chơi lại</button>
            <button className="btn-caro" onClick={() => navigate('/games')}>Thoát</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaroGame;
