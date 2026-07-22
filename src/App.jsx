import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MemoriesPage from './pages/MemoriesPage';
import AddMemoryPage from './pages/AddMemoryPage';
import ChatPage from './pages/ChatPage';
import FutureLetterPage from './pages/FutureLetterPage';
import SharedDiaryPage from './pages/SharedDiaryPage';
import LoveMapPage from './pages/LoveMapPage';
import LoveTreePage from './pages/LoveTreePage';
import GamesHubPage from './pages/GamesHubPage';
import BubbleShooterGame from './pages/BubbleShooterGame';
import BlockBlastGame from './pages/BlockBlastGame';
import HappyConnectGame from './pages/HappyConnectGame';
import SuikaGame from './pages/SuikaGame';
import FlappyBirdGame from './pages/FlappyBirdGame';
import KnifeHitGame from './pages/KnifeHitGame';
import BrickBreakerGame from './pages/BrickBreakerGame';
import ExplodingKittensGame from './pages/ExplodingKittensGame';
import StickManGame from './pages/StickManGame';
import ProfilePage from './pages/ProfilePage';
import QuestPage from './pages/QuestPage';
import HeartEarnPage from './pages/HeartEarnPage';
import PetSanctuaryPage from './pages/PetSanctuaryPage';
import { ErrorBoundary } from './ErrorBoundary';
import { EMOJI_REACTIONS, ANIMATED_REACTIONS, STICKERS, MOODS } from './utils/constants';


import StoreLayout from './pages/store/StoreLayout';
import PartnerStorePage from './pages/store/PartnerStorePage';
import MyStorePage from './pages/store/MyStorePage';
import ManageOrdersPage from './pages/store/ManageOrdersPage';
import MyOrdersPage from './pages/store/MyOrdersPage';
import AssistiveTouch from './components/AssistiveTouch';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(to bottom right, #fdf2f8, #ffffff, #fce7f3)' }}>
        <motion.div 
          style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              width: '80px', height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(242, 105, 137, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(242, 105, 137, 0.2)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#f26989', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              marginTop: '24px', 
              color: '#d94c73', 
              fontWeight: '600', 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.25rem', 
              fontStyle: 'italic',
              letterSpacing: '0.05em'
            }}
          >
            Đang kết nối trái tim... 100%
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public route wrapper (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;
  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppRoutes = () => {
  return (
    <div className="app-container">
      <ScrollToTop />
      <Toast />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memories"
          element={
            <ProtectedRoute>
              <MemoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memories/add"
          element={
            <ProtectedRoute>
              <AddMemoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/future-letters"
          element={
            <ProtectedRoute>
              <FutureLetterPage />
            </ProtectedRoute>
          }
        />
        <Route path="/shared-diary" element={<ProtectedRoute><SharedDiaryPage /></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><QuestPage /></ProtectedRoute>} />
        <Route path="/heart" element={<ProtectedRoute><HeartEarnPage /></ProtectedRoute>} />
        <Route path="/pet-sanctuary" element={<ProtectedRoute><ErrorBoundary><PetSanctuaryPage /></ErrorBoundary></ProtectedRoute>} />

        
        <Route path="/store" element={<ProtectedRoute><StoreLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="partner" replace />} />
          <Route path="partner" element={<PartnerStorePage />} />
          <Route path="mine" element={<MyStorePage />} />
          <Route path="orders" element={<ManageOrdersPage />} />
          <Route path="cart" element={<MyOrdersPage />} />
        </Route>

        {/* --- Các Route Trò Chơi --- */}
        <Route path="/game/brick-breaker" element={<ProtectedRoute><BrickBreakerGame /></ProtectedRoute>} />
        <Route path="/game/meo-no" element={<ProtectedRoute><ExplodingKittensGame /></ProtectedRoute>} />
        <Route path="/game/bubble-shooter" element={<ProtectedRoute><BubbleShooterGame /></ProtectedRoute>} />
        <Route path="/game/block-blast" element={<ProtectedRoute><BlockBlastGame /></ProtectedRoute>} />
        <Route path="/games/suika" element={<ProtectedRoute><SuikaGame /></ProtectedRoute>} />
        <Route path="/game/flappy-bird" element={<ProtectedRoute><FlappyBirdGame /></ProtectedRoute>} />
        <Route path="/game/knife-hit" element={<ProtectedRoute><KnifeHitGame /></ProtectedRoute>} />
        <Route path="/game/stick-man" element={<ProtectedRoute><StickManGame /></ProtectedRoute>} />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <LoveMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tree"
          element={
            <ProtectedRoute>
              <LoveTreePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <GamesHubPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/game/happy-connect"
          element={
            <ProtectedRoute>
              <HappyConnectGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
};


const Preloader = ({ children }) => {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const urlsToPreload = [
      ...Object.values(ANIMATED_REACTIONS),
      ...STICKERS.map(s => s.url),
      ...MOODS.map(m => m.emojiUrl)
    ];

    if (urlsToPreload.length === 0) {
      setLoaded(true);
      return;
    }

    let loadedCount = 0;
    const total = urlsToPreload.length;

    urlsToPreload.forEach(url => {
      const img = new Image();
      img.src = url;
      const onLoadOrError = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / total) * 100));
        if (loadedCount === total) setLoaded(true);
      };
      img.onload = onLoadOrError;
      img.onerror = onLoadOrError;
    });

    const timeout = setTimeout(() => {
      setLoaded(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  if (!loaded) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(to bottom right, #fdf2f8, #ffffff, #fce7f3)' }}>
        <motion.div 
          style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              width: '80px', height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(242, 105, 137, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(242, 105, 137, 0.2)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#f26989', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              marginTop: '24px', 
              color: '#d94c73', 
              fontWeight: '600', 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.25rem', 
              fontStyle: 'italic',
              letterSpacing: '0.05em'
            }}
          >
            Đang kết nối trái tim... {progress}%
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return children;
};

import PullToRefresh from 'pulltorefreshjs';

function App() {
  useEffect(() => {
    // Chỉ kích hoạt trên các thiết bị cảm ứng / màn hình nhỏ để tránh ảnh hưởng desktop
    if (window.innerWidth <= 768) {
      PullToRefresh.init({
        mainElement: 'body',
        distThreshold: 90, // Yêu cầu kéo sâu hơn (mặc định 60)
        distMax: 120,      // Kéo tối đa
        distReload: 70,
        iconArrow: '<span class="material-symbols-outlined" style="font-size: 28px; color: #f26989; transition: transform 0.3s;" id="ptr-arrow">arrow_downward</span>',
        iconRefreshing: '<div class="ptr-spinner"></div>',
        instructionsPullToRefresh: '',
        instructionsReleaseToRefresh: '',
        instructionsRefreshing: '',
        shouldPullToRefresh() {
          // Chỉ kích hoạt pull-to-refresh trên trang chủ
          if (!window.location.pathname.startsWith('/home')) {
            return false;
          }
          return !window.scrollY;
        },
        onRefresh() {
          window.location.reload();
        }
      });
    }

    return () => {
      PullToRefresh.destroyAll();
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Preloader>
          <AppRoutes />
          <AssistiveTouch />
        </Preloader>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
