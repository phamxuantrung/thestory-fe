import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { treeService } from '../services/treeService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import LevelUpEffect from '../components/LevelUpEffect';
import { Droplets, Sun, Sparkles, Info, X, Trees, Gamepad2, HeartCrack, CloudRain, Cloud, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoveTreePage.css';

const TREE_STAGES = {
  1: { name: 'Hạt giống', img: '/tree/level-1.svg', size: 140 },
  2: { name: 'Mầm non', img: '/tree/level-2.svg', size: 180 },
  3: { name: 'Cây nhỏ', img: '/tree/level-3.svg', size: 260 },
  4: { name: 'Cây trưởng thành', img: '/tree/level-4.svg', size: 320 },
  5: { name: 'Cây đơm hoa', img: '/tree/level-5.svg', size: 400 },
};

const LoveTreePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [expRequired, setExpRequired] = useState(100);
  const [loading, setLoading] = useState(true);
  const [isWatering, setIsWatering] = useState(false);
  const [isSunning, setIsSunning] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [expFloaters, setExpFloaters] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [weather, setWeather] = useState(null);

  const now = new Date();
  const isSameDay = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === now.toDateString();
  };

  const hasWateredToday = isSameDay(tree?.lastWateredAt);
  const hasSunnedToday = isSameDay(tree?.lastSunlightAt);

  useEffect(() => {
    fetchTree();
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      // Mặc định lấy thời tiết Hà Nội (hoặc có thể dùng geolocation)
      const res = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,precipitation');
      if (res.data && res.data.current) {
        setWeather({
          temp: res.data.current.temperature_2m,
          rain: res.data.current.precipitation
        });
      }
    } catch (e) {
      console.error("Lỗi thời tiết", e);
    }
  };

  const fetchTree = async () => {
    try {
      const res = await treeService.getTree();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
      }
    } catch (e) {
      showToast('Không thể tải thông tin cây', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInteract = async (action) => {
    if (action === 'water') setIsWatering(true);
    if (action === 'sunlight') setIsSunning(true);

    try {
      const currentLevel = tree.level;
      const currentExp = tree.exp || 0;
      const res = await treeService.interact(action, weather);
      
      if (res.success) {
        const newExp = res.data.exp || 0;
        const expDiff = newExp - currentExp;
        
        if (expDiff !== 0) {
          const id = Date.now();
          setExpFloaters(prev => [...prev, { id, diff: Math.round(expDiff) }]);
          setTimeout(() => {
            setExpFloaters(prev => prev.filter(f => f.id !== id));
          }, 2000);
        }

        setTree(res.data);
        setExpRequired(res.expRequired);
        
        // Hiện hiệu ứng nếu lên cấp
        if (res.data.level > currentLevel) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 3000);
          showToast(`Cây đã lớn lên cấp ${res.data.level}! 🎉`, 'success');
        } else {
          showToast(res.message, 'success');
        }
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      if (e.response?.data?.message) {
        showToast(e.response.data.message, 'error');
      } else {
        showToast('Có lỗi xảy ra', 'error');
      }
    } finally {
      setTimeout(() => {
        setIsWatering(false);
        setIsSunning(false);
      }, 1500);
    }
  };

  const handleRevive = async () => {
    if (tree?.fertilizers < 1) {
      showToast('Bạn không đủ phân bón! Hãy chơi game để kiếm thêm nhé.', 'error');
      return;
    }
    
    try {
      const res = await treeService.revive();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        setLevelUpAnimation(true);
        setTimeout(() => setLevelUpAnimation(false), 2000);
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const stage = TREE_STAGES[Math.min(tree?.level || 1, 5)];
  const expPercent = Math.min(100, ((tree?.exp || 0) / expRequired) * 100);

  // Dynamic Streak UI logic
  const currentStreak = tree?.streak || 0;
  
  // Logic kiểm tra xem user hiện tại đã tương tác hôm nay chưa
  const userInteraction = tree?.userInteractions?.find(ui => 
    ui.user === user?._id || ui.user?._id === user?._id
  );
  const hasInteractedToday = userInteraction?.lastActionAt && new Date(userInteraction.lastActionAt).toDateString() === new Date().toDateString();
  
  const getStreakTier = (streak) => {
    if (streak >= 100) return 'legendary';
    if (streak >= 30) return 'gold';
    if (streak >= 7) return 'silver';
    return 'basic';
  };

  const getFlameColor = (streak) => {
    if (streak >= 100) return "#be185d"; 
    if (streak >= 30) return "#d97706";  
    if (streak >= 7) return "#3b82f6";   
    if (streak > 0) return "#ea580c";    
    return "#9ca3af";
  };
  
  const getFlameFill = (streak) => {
    if (streak >= 100) return "#f472b6";
    if (streak >= 30) return "#fbbf24";
    if (streak >= 7) return "#93c5fd";
    if (streak > 0) return "#fb923c";
    return "none";
  };

  const getTierName = (streak) => {
    if (streak >= 100) return 'Huyền Thoại';
    if (streak >= 30) return 'Cấp Vàng';
    if (streak >= 7) return 'Cấp Bạc';
    return 'Khởi Đầu';
  };

  const streakTier = getStreakTier(currentStreak);

  return (
    <div className="tree-page">
      <Header 
        title="Cây Tình Yêu" 
        showBack={true} 
        transparent={true} 
        rightContent={
          <button className="guide-icon-btn" onClick={() => setShowGuide(true)}>
            <Info size={24} color="#333" />
          </button>
        }
      />

      <main className="tree-garden">
        {/* Background elements */}
        <div className="sky-bg">
          <div className="light-rays"></div>
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
          
          {weather && (
            <div className="weather-widget">
              {weather.rain > 0 ? <CloudRain size={20} color="#4fc3f7" /> : 
                (weather.temp >= 30 ? <Sun size={20} color="#ffb74d" /> : <Cloud size={20} color="#fff" />)}
              <span>{weather.temp}°C</span>
            </div>
          )}
        </div>
        
        <div className="grass-ground-back"></div>
        <div className="grass-ground-back-right"></div>
        <div className="grass-ground"></div>

        {Array.from({ length: 15 }).map((_, i) => (
          <div key={`ff-${i}`} className="firefly" style={{
            left: `${Math.random() * 100}%`,
            bottom: `${10 + Math.random() * 50}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${6 + Math.random() * 8}s`
          }}></div>
        ))}

        {/* Thanh trạng thái */}
        <div className="tree-hud">
          <div className="hud-card">
            <h2 className="tree-name">{stage.name} (Cấp {tree?.level})</h2>
            
            <div className="exp-bar-container">
              <div className="exp-labels">
                <span>EXP</span>
                <span>{Math.floor(tree?.exp)} / {expRequired}</span>
              </div>
              <div className="progress-bg">
                <motion.div 
                  className="progress-fill exp-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${expPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className={`streak-bar-container tier-${streakTier}`}>
              <div className="streak-icon-wrapper">
                <Flame size={26} color={getFlameColor(currentStreak)} className={currentStreak > 0 ? "flame-animate" : ""} fill={getFlameFill(currentStreak)} />
              </div>
              <div className="streak-info">
                <div className="streak-title">Chuỗi {getTierName(currentStreak)}</div>
                <div className="streak-value">
                  <span className="streak-count">{currentStreak}</span> ngày liên tiếp
                </div>
              </div>
            </div>

            <div className="fertilizer-info">
              <span>Phân bón: <strong>{tree?.fertilizers || 0}</strong> 👝</span>
              <button className="play-game-btn" onClick={() => navigate('/tree-game')}>
                <Gamepad2 size={16} /> Chơi game
              </button>
            </div>
          </div>
        </div>

        {/* Cây ở trung tâm */}
        <div className="tree-center-container">
          <AnimatePresence>
            {isWatering && (
              <motion.div 
                className="water-drops-animation"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Droplets size={48} color="#4fc3f7" strokeWidth={1.5} />
              </motion.div>
            )}
            
            {isSunning && (
              <motion.div 
                className="sun-rays-animation"
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Sun size={64} color="#ffb74d" strokeWidth={1.5} fill="#ffe082" />
              </motion.div>
            )}

            {levelUpAnimation && <LevelUpEffect />}
          </AnimatePresence>

          <motion.div
            key={`${tree?.level}-${tree?.isWithered}`}
            className="tree-image-wrapper"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
          >
            <img 
              src={stage.img} 
              alt={stage.name} 
              className={`tree-img level-${tree?.level} ${tree?.isWithered ? 'withered' : ''}`} 
              style={{ width: stage.size, height: stage.size }}
            />
            
            <AnimatePresence>
              {expFloaters.map(f => (
                <motion.div
                  key={f.id}
                  className={`exp-floater ${f.diff > 0 ? 'positive' : 'negative'}`}
                  initial={{ opacity: 0, y: 0, scale: 0.1, x: '-50%' }}
                  animate={{ 
                    opacity: [0, 1, 1, 0], 
                    y: [0, -60, -90, -110], 
                    scale: [0.1, 1.4, 1, 1],
                    x: '-50%' 
                  }}
                  transition={{ 
                    duration: 1.8, 
                    times: [0, 0.2, 0.7, 1],
                    ease: "easeOut" 
                  }}
                >
                  {f.diff > 0 ? `+${f.diff}` : f.diff} EXP
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Nút hành động */}
        <div className="tree-actions">
          {tree?.isWithered ? (
            <motion.button 
              className="action-btn revive-btn"
              whileTap={{ scale: 0.9 }}
              onClick={handleRevive}
            >
              <div className="btn-icon-circle revive-circle">
                <HeartCrack size={24} color="#fff" />
              </div>
              <span>Hồi sinh (-1 👝)</span>
            </motion.button>
          ) : (
            <>
              <motion.button 
                className="action-btn water-btn"
                whileTap={hasInteractedToday ? {} : { scale: 0.9 }}
                onClick={() => handleInteract('water')}
                disabled={isWatering || isSunning || hasInteractedToday}
              >
                <div className={`btn-icon-circle water-circle ${hasInteractedToday ? 'disabled' : ''}`}>
                  <Droplets size={24} color="#fff" />
                </div>
                <span>Tưới nước</span>
              </motion.button>
              
              <motion.button 
                className="action-btn sun-btn"
                whileTap={hasInteractedToday ? {} : { scale: 0.9 }}
                onClick={() => handleInteract('sunlight')}
                disabled={isWatering || isSunning || hasInteractedToday}
              >
                <div className={`btn-icon-circle sun-circle ${hasInteractedToday ? 'disabled' : ''}`}>
                  <Sun size={24} color="#fff" />
                </div>
                <span>Phơi nắng</span>
              </motion.button>
            </>
          )}
        </div>
      </main>

      {/* Modal Hướng Dẫn */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGuide(false)}
          >
            <motion.div 
              className="guide-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="guide-close-btn"
                onClick={() => setShowGuide(false)}
              >
                <X size={20} />
              </button>
              
              <div className="guide-header">
                <div className="guide-icon-wrapper">
                  <Trees size={32} color="#f26989" />
                </div>
                <h3>Cách chăm sóc cây</h3>
              </div>

              <div className="guide-body">
                <div className="guide-item">
                  <div className="g-icon water"><Droplets size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Tưới nước:</strong> Tăng chỉ số nước, cộng 15 EXP.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon sun"><Sun size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Phơi nắng:</strong> Tăng chỉ số ánh sáng, cộng 15 EXP.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon level"><Sparkles size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Lên cấp:</strong> Khi đầy thanh EXP, cây sẽ tự động lên cấp và thay đổi hình dáng lớn hơn.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon wither" style={{background: '#8d6e63'}}><HeartCrack size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Cây Héo:</strong> Nếu bỏ quên cây 24h, cây sẽ héo úa. Cần dùng Phân bón để hồi sinh.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon game" style={{background: '#ab47bc'}}><Gamepad2 size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Phân Bón:</strong> Kiếm bằng cách chơi Minigame Lật Thẻ Trí Nhớ.
                  </div>
                </div>
                <div className="guide-note">
                  <em>Lưu ý: Mỗi ngày chỉ được tưới nước và phơi nắng 1 lần. Hãy cùng nhau chăm sóc mỗi ngày nhé!</em>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoveTreePage;
