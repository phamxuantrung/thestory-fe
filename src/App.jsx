import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MemoriesPage from './pages/MemoriesPage';
import AddMemoryPage from './pages/AddMemoryPage';
import ChatPage from './pages/ChatPage';
import { subscribeToPushNotifications } from './services/pushService';
import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { showToast } from './components/Toast';

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

const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();
  const socket = useSocket();

  useEffect(() => {
    if (user) {
      subscribeToPushNotifications();
    }
  }, [user]);

  // Global message listener for local notifications
  useEffect(() => {
    if (!socket || !user) return;

    const onGlobalMessage = (msg) => {
      if (msg.sender._id === user._id) return; // Do not notify for own messages

      // Only notify if we are NOT actively viewing the chat page
      if (location.pathname !== '/chat' || document.visibilityState !== 'visible') {
        showToast(`Tin nhắn mới từ ${msg.sender.displayName || 'người ấy'}`);
        
        // Play sound
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(() => {});
        } catch (e) {}

        // Show local browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(msg.sender.displayName || 'Tin nhắn mới', {
            body: msg.type === 'text' ? msg.content : (msg.type === 'sticker' ? 'Đã gửi một nhãn dán' : 'Đã gửi một hình ảnh'),
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png'
          });
        }
      }
    };

    socket.on('chat:message', onGlobalMessage);

    return () => {
      socket.off('chat:message', onGlobalMessage);
    };
  }, [socket, user, location.pathname]);

  return (
    <div className="app-container">
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
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
