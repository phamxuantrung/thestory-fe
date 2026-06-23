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
import LoveTreeGame from './pages/LoveTreeGame';
import GamesHubPage from './pages/GamesHubPage';
import CatchDropsGame from './pages/CatchDropsGame';
import WhackABugGame from './pages/WhackABugGame';
import CaroGame from './pages/CaroGame';
import FlappyCupidGame from './pages/FlappyCupidGame';
import SimonSaysGame from './pages/SimonSaysGame';
import SnakeGame from './pages/SnakeGame';
import LoveSurvivorGame from './pages/LoveSurvivorGame';
import Love2048Game from './pages/Love2048Game';
import LovePotionGame from './pages/LovePotionGame';
import OnetConnectGame from './pages/OnetConnectGame';
import GoldenCaveGame from './pages/GoldenCaveGame';
import InfinityKoiGame from './pages/InfinityKoiGame';
import ProfilePage from './pages/ProfilePage';
import QuestPage from './pages/QuestPage';

import StoreLayout from './pages/store/StoreLayout';
import PartnerStorePage from './pages/store/PartnerStorePage';
import MyStorePage from './pages/store/MyStorePage';
import ManageOrdersPage from './pages/store/ManageOrdersPage';
import MyOrdersPage from './pages/store/MyOrdersPage';
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
            Đang kết nối trái tim...
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
        
        <Route path="/store" element={<ProtectedRoute><StoreLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="partner" replace />} />
          <Route path="partner" element={<PartnerStorePage />} />
          <Route path="mine" element={<MyStorePage />} />
          <Route path="orders" element={<ManageOrdersPage />} />
          <Route path="cart" element={<MyOrdersPage />} />
        </Route>

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
          path="/game/memory"
          element={
            <ProtectedRoute>
              <LoveTreeGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/catch-drops"
          element={
            <ProtectedRoute>
              <CatchDropsGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/whack-a-bug"
          element={
            <ProtectedRoute>
              <WhackABugGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/caro"
          element={
            <ProtectedRoute>
              <CaroGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/flappy"
          element={
            <ProtectedRoute>
              <FlappyCupidGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/simon"
          element={
            <ProtectedRoute>
              <SimonSaysGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/snake"
          element={
            <ProtectedRoute>
              <SnakeGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/survivor"
          element={
            <ProtectedRoute>
              <LoveSurvivorGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/love-2048"
          element={
            <ProtectedRoute>
              <Love2048Game />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/love-potion"
          element={
            <ProtectedRoute>
              <LovePotionGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/onet-connect"
          element={
            <ProtectedRoute>
              <OnetConnectGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/golden-cave"
          element={
            <ProtectedRoute>
              <GoldenCaveGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/infinity-koi"
          element={
            <ProtectedRoute>
              <InfinityKoiGame />
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

import { EMOJI_REACTIONS, ANIMATED_REACTIONS, STICKERS, MOODS } from './utils/constants';

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
      img.onload = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / total) * 100));
        if (loadedCount === total) setLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / total) * 100));
        if (loadedCount === total) setLoaded(true);
      };
    });

    // Fallback: don't block forever if something takes too long
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
            Đang tải dữ liệu... {progress}%
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
          // Không kích hoạt trên trang chat để dễ vuốt xem tin nhắn cũ
          if (window.location.pathname.startsWith('/chat')) {
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
        </Preloader>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
