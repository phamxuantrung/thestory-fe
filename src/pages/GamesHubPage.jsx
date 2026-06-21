import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import './GamesHubPage.css';

import logoMemory from '../assets/games/logo_memory.png';
import logoDrops from '../assets/games/logo_drops.png';
import logoWhack from '../assets/games/logo_whack.png';
import logoCaro from '../assets/games/logo_caro.png';
import logoFlappy from '../assets/games/logo_flappy.png';
import logoSimon from '../assets/games/logo_simon.png';
import logoSnake from '../assets/games/logo_snake.png';
import logoSurvivor from '../assets/games/logo_survivor.png';
import logoLove2048 from '../assets/games/logo_love2048.png';
import logoLovePotion from '../assets/games/logo_lovepotion.png';
import logoOnet from '../assets/games/logo_onet.png';
import logoGoldenCave from '../assets/games/logo_goldencave.png';
import logoInfinityKoi from '../assets/games/logo_infinitykoi.png';

const GamesHubPage = () => {
  const navigate = useNavigate();

  // Configure available games
  const games = [
    { id: 'memory', title: 'Lật Thẻ', image: logoMemory, path: '/game/memory' },
    { id: 'infinityKoi', title: 'Cá Koi Vô Cực', image: logoInfinityKoi, path: '/game/infinity-koi' },
    { id: 'goldenCave', title: 'Hang Động Vàng', image: logoGoldenCave, path: '/game/golden-cave' },
    { id: 'onet', title: 'Nối Thú Cặp Đôi', image: logoOnet, path: '/game/onet-connect' },
    { id: 'love2048', title: '2048 Tình Yêu', image: logoLove2048, path: '/game/love-2048' },
    { id: 'lovePotion', title: 'Pha Chế Dược', image: logoLovePotion, path: '/game/love-potion' },
    { id: 'drops', title: 'Hứng Nước', image: logoDrops, path: '/game/catch-drops' },
    { id: 'whack', title: 'Đập Sâu', image: logoWhack, path: '/game/whack-a-bug' },
    { id: 'caro', title: 'Cờ Caro', image: logoCaro, path: '/game/caro' },
    { id: 'flappy', title: 'Chim Bay', image: logoFlappy, path: '/game/flappy' },
    { id: 'simon', title: 'Nhịp Điệu', image: logoSimon, path: '/game/simon' },
    { id: 'snake', title: 'Rắn Săn Mồi', image: logoSnake, path: '/game/snake' },
    { id: 'survivor', title: 'Sinh Tồn', image: logoSurvivor, path: '/game/survivor' },
  ];

  // Chunk into pages of 16 (4x4) or 12 (4x3) for iOS layout
  const ITEMS_PER_PAGE = 16;
  const pages = [];
  for (let i = 0; i < games.length; i += ITEMS_PER_PAGE) {
    pages.push(games.slice(i, i + ITEMS_PER_PAGE));
  }

  return (
    <div className="games-hub-page">
      <Header title="Trung Tâm Trò Chơi" showBack={true} onBack={() => navigate('/tree')} transparent={true} />
      
      {/* Animated Background Blobs */}
      <div className="hub-blob blob-1"></div>
      <div className="hub-blob blob-2"></div>
      <div className="hub-blob blob-3"></div>

      <div className="swipe-container">
        {pages.map((pageGames, pageIndex) => (
          <div className="games-page-screen" key={`page-${pageIndex}`}>
            <div className="games-grid">
              {pageGames.map((game, idx) => (
                <motion.div 
                  key={game.id}
                  className="app-icon-container"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => game.path !== '#' && navigate(game.path)}
                >
                  <div className="app-icon">
                    <img src={game.image} alt={game.title} className="app-icon-img" />
                  </div>
                  <span className="app-title">{game.title}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamesHubPage;
