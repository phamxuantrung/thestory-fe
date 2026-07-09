import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import './GamesHubPage.css';

import logoBlockBlast from '../assets/games/logo_blockblast.webp';
import logoHappyConnect from '../assets/games/logo_happyconnect.webp';
import logoSuika from '../assets/games/logo_suika.webp';
import logoBubble from '../assets/games/logo_drops.webp';
import logoFlappy from '../assets/games/logo_flappy.webp';
import logoCakeHit from '../assets/games/logo_cakehit.webp';
import logoBrick from '../assets/games/logo_brickbreaker.webp';
import logoStickMan from '../assets/games/logo_stickman.webp';
import logoMeoNo from '../assets/games/logo_meono.webp';

const GamesHubPage = () => {
  const navigate = useNavigate();

  const games = [
    { id: 'meoNo', title: 'Mèo Nổ (Online)', image: logoMeoNo, path: '/game/meo-no' },
    { id: 'suika', title: 'Ghép Dưa Hấu', image: logoSuika, path: '/games/suika' },
    { id: 'bubbleShooter', title: 'Bắn Bóng Tình Yêu', image: logoBubble, path: '/game/bubble-shooter' },
    { id: 'happyConnect', title: 'Happy Connect', image: logoHappyConnect, path: '/game/happy-connect' },
    { id: 'blockBlast', title: 'Block Blast', image: logoBlockBlast, path: '/game/block-blast' },
    { id: 'flappyBird', title: 'Flappy Bird', image: logoFlappy, path: '/game/flappy-bird' },
    { id: 'cakeHit', title: 'Cắm Nĩa', image: logoCakeHit, path: '/game/knife-hit' },
    { id: 'brickBreaker', title: 'Đỡ Sao', image: logoBrick, path: '/game/brick-breaker' },
    { id: 'stickMan', title: 'Bắc Cầu', image: logoStickMan, path: '/game/stick-man' },
  ];

  return (
    <div className="games-hub-page">
      <Header title="Trung Tâm Trò Chơi" showBack={true} onBack={() => navigate('/tree')} transparent={true} />

      {/* Animated Background Blobs */}
      <div className="hub-blob blob-1"></div>
      <div className="hub-blob blob-2"></div>
      <div className="hub-blob blob-3"></div>

      <div className="swipe-container">
        <div className="games-page-screen">
          <div className="games-grid">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                className="app-icon-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => navigate(game.path)}
              >
                <div className="app-icon">
                  <img src={game.image} alt={game.title} className="app-icon-img" />
                </div>
                <span className="app-title">{game.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesHubPage;
