import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Heart, Flower2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Animation variants cho chữ TRUNG & DUNG
  const subtitleText = "Trung & Dung";
  const subtitleLetters = Array.from(subtitleText);

  const containerVariants = {
    hidden: { opacity: 1 }, // Keep container opacity 1 so children can handle their own opacity
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Khoảng cách thời gian xuất hiện giữa mỗi chữ
        delayChildren: 0.8,    // Đợi 0.8s cho các yếu tố khác hiện ra trước
      }
    }
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(8px)', scale: 2 },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)', 
      scale: 1,
      transition: { type: 'spring', damping: 12, stiffness: 100 }
    }
  };

  // Background hearts
  useEffect(() => {
    const container = document.getElementById('particles-container');
    if (!container) return;
    container.innerHTML = '';
    const particleCount = 20;
    
    const colors = ['#f26989', '#ffb2bf', '#f8c8dc', '#d94c73'];

    for (let i = 0; i < particleCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'heart-wrapper';
      
      const heart = document.createElement('span');
      heart.className = 'heart-particle';
      // Use SVG heart for better rendering
      heart.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      heart.style.color = color;
      
      const startLeft = Math.random() * 100 + '%';
      const size = (Math.random() * 1.5 + 0.8) + 'rem';
      const duration = (Math.random() * 10 + 15) + 's'; // Slower float
      const delay = (Math.random() * -20) + 's'; // Negative delay so they are already on screen
      const swayDuration = (Math.random() * 3 + 3) + 's';

      wrapper.style.left = startLeft;
      wrapper.style.animation = `floatUp ${duration} linear ${delay} infinite`;
      
      heart.style.width = size;
      heart.style.height = size;
      heart.style.animation = `sway ${swayDuration} ease-in-out infinite`;

      wrapper.appendChild(heart);
      container.appendChild(wrapper);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await login(username.trim(), password, rememberMe);
      if (res.success) {
        showToast(`Chào mừng ${res.data.user.displayName} 💕`);
        navigate('/home');
      } else {
        showToast(res.message || 'Đăng nhập thất bại', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-v2">
      <div id="particles-container"></div>
      
      <main className="login-v2-container">
        {/* Logo & Title Section */}
        <header className="login-v2-header">
          <div className="login-v2-heart-wrapper">
            {/* We use Lucide icon here to simulate material symbols favorite */}
            <Heart className="login-v2-heart-icon" size={60} fill="currentColor" strokeWidth={0} />
            <div className="login-v2-heart-glow"></div>
          </div>
          <h1 className="hero-title">The Story</h1>
          <motion.p 
            className="login-v2-subtitle"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {subtitleLetters.map((char, index) => (
              <motion.span 
                key={index} 
                variants={letterVariants}
                style={{ 
                  display: 'inline-block', 
                  whiteSpace: char === ' ' ? 'pre' : 'normal',
                  willChange: 'transform, filter, opacity'
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.p>
        </header>

        {/* Form Section */}
        <form className="login-v2-form" onSubmit={handleLogin}>
          <div className="login-v2-input-wrapper">
            <div className="login-v2-input-icon">
              <User size={20} />
            </div>
            <input
              type="text"
              className="login-v2-input"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-v2-input-wrapper">
            <div className="login-v2-input-icon">
              <Lock size={20} />
            </div>
            <input
              type="password"
              className="login-v2-input"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-v2-remember">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="remember">Ghi nhớ đăng nhập</label>
          </div>

          <button type="submit" className="login-v2-btn" disabled={loading}>
            <div className="shimmer"></div>
            {loading ? (
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            ) : (
              <>
                <Heart size={24} fill="currentColor" strokeWidth={0} />
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <footer className="login-v2-footer">
          <div className="login-v2-footer-content">
            <Flower2 size={18} />
            <span>Chỉ dành riêng cho hai chúng ta</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LoginPage;
