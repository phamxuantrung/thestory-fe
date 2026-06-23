import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getSocket } from '../hooks/useSocket';
import { treeService } from '../services/treeService';
import { chatService } from '../services/chatService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import LevelUpEffect from '../components/LevelUpEffect';
import { Droplets, Sun, Sparkles, Info, X, Trees, Gamepad2, HeartCrack, CloudRain, Cloud, Flame, Coins, Shield, ShoppingCart, FlaskConical, Backpack, Bug, BellRing, MessageCircleHeart, Send, Gem } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoveTreePage.css';

import weed1 from '../assets/images/weed1.png';
import weed2 from '../assets/images/weed2.png';
import weed3 from '../assets/images/weed3.png';
import weed4 from '../assets/images/weed4.png';
import weed5 from '../assets/images/weed5.png';

const weedImages = [weed1, weed2, weed3, weed4, weed5];

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
  const [showShop, setShowShop] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [isRemindingInApp, setIsRemindingInApp] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [weather, setWeather] = useState(null);

  // Pest Minigame State
  const [isSpraying, setIsSpraying] = useState(false);
  const [sprayProgress, setSprayProgress] = useState(0);
  const [sprayParticles, setSprayParticles] = useState([]);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [activeWeeds, setActiveWeeds] = useState([]);



  const now = new Date();
  const isSameDay = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === now.toDateString();
  };

  useEffect(() => {
    fetchTree();
    fetchWeather();
  }, []);

  useEffect(() => {
    if (tree?.weedCount !== undefined) {
      setActiveWeeds(prev => {
        if (tree.weedCount > prev.length) {
          const added = [...prev];
          for (let i = prev.length; i < tree.weedCount; i++) {
            const usedIndexes = added.map(w => w.posIndex);
            let freeIndex = [0, 1, 2].find(idx => !usedIndexes.includes(idx));
            if (freeIndex === undefined) freeIndex = added.length % 3;
            added.push({ 
              id: Date.now() + Math.random(), 
              posIndex: freeIndex, 
              imgIndex: Math.floor(Math.random() * 5) 
            });
          }
          return added;
        } else if (tree.weedCount < prev.length) {
          return prev.slice(0, tree.weedCount);
        }
        return prev;
      });
    }
  }, [tree?.weedCount]);

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

  const startSprayingMinigame = () => {
    setShowItemMenu(false);
    setIsSpraying(true);
    setSprayProgress(0);
    setSprayParticles([]);
    showToast('Hãy vuốt liên tục trên màn hình để xịt thuốc trừ sâu!', 'info');
  };

  const handleSprayMove = (e) => {
    if (!isSpraying) return;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dist = Math.hypot(clientX - lastPosRef.current.x, clientY - lastPosRef.current.y);
    
    if (dist > 20) {
      lastPosRef.current = { x: clientX, y: clientY };
      
      const newParticle = { id: Date.now() + Math.random(), x: clientX - 30, y: clientY - 30 };
      setSprayParticles(prev => [...prev.slice(-15), newParticle]);
      
      setSprayProgress(prev => {
        const next = prev + 2;
        if (next >= 100 && prev < 100) {
          finishSpraying();
        }
        return next;
      });
    }
  };

  const finishSpraying = async () => {
    setIsSpraying(false);
    try {
      const res = await treeService.sprayPest();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        showToast(res.message, 'success');
        
        const id = Date.now();
        setExpFloaters(prev => [...prev, { id, diff: 5 }]);
        setTimeout(() => {
          setExpFloaters(prev => prev.filter(f => f.id !== id));
        }, 2000);
      }
    } catch (e) {
      showToast('Có lỗi xảy ra, vui lòng thử lại', 'error');
    }
  };

  const handlePlantTree = async () => {
    try {
      setShowSeedModal(false);
      const res = await treeService.plantTree();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        showToast('Đã gieo mầm Cây Tình Yêu thành công!', 'success');
        setLevelUpAnimation(true);
        setTimeout(() => setLevelUpAnimation(false), 3000);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Không thể trồng cây', 'error');
    }
  };

  const handleRemindInApp = async () => {
    setIsRemindingInApp(true);
    const isMale = user?.gender === 'male';
    const me = isMale ? 'anh' : 'em';
    const you = isMale ? 'em' : 'anh';
    const You = isMale ? 'Em' : 'Anh';

    const msgTexts = [
      `${You} ơi, bé cây tình yêu của tụi mình đang đợi kìa! Vào vườn vun đắp cho bé nó cùng ${me} nha 🥰🌱`,
      `Nhớ ${me} thì cũng đừng quên chăm cây tình yêu của hai đứa mình nha! Vào tưới nước đi nè ❤️`,
      `Cây tình yêu đang réo tên ${you} kìa! Mau mau vào chăm cây để tình mình thêm xanh nha 🥰✨`,
      `${You} ơi, ${me} vừa vào thăm cây tình yêu nè. ${You} cũng vào chăm cây cùng ${me} nha! 💖`
    ];
    const msgText = msgTexts[Math.floor(Math.random() * msgTexts.length)];
    
    try {
      // Gọi REST API để đảm bảo tin nhắn được lưu vào Database
      const res = await chatService.sendMessage(msgText);
      
      if (res.success) {
        const socket = getSocket();
        if (socket) {
          // Bắn socket với _preloaded để server chỉ broadcast cho partner mà không lưu trùng
          socket.emit('chat:send', { 
            content: msgText, 
            type: 'text', 
            replyTo: null,
            _preloaded: res.data,
            _senderId: user?._id
          });
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Hiệu ứng chờ
      showToast('Đã gửi lời nhắc qua Chat trong app!', 'success');
      setShowRemindModal(false);
    } catch (e) {
      showToast('Có lỗi xảy ra khi gửi tin nhắn', 'error');
    } finally {
      setIsRemindingInApp(false);
    }
  };

  const handleRemindFacebook = async () => {
    const isMale = user?.gender === 'male';
    const me = isMale ? 'anh' : 'em';
    const you = isMale ? 'em' : 'anh';
    const You = isMale ? 'Em' : 'Anh';

    const link = window.location.origin + '/tree';
    const msgTexts = [
      `${You} ơi, bé cây tình yêu của tụi mình đang đợi kìa! Vào vườn vun đắp cho bé nó cùng ${me} nha 🥰🌱`,
      `Nhớ ${me} thì cũng đừng quên chăm cây tình yêu của hai đứa mình nha! Vào tưới nước đi nè ❤️`,
      `Cây tình yêu đang réo tên ${You} kìa! Mau mau vào chăm cây để tình mình thêm xanh nha 🥰✨`,
      `${You} ơi, ${me} vừa vào thăm cây tình yêu nè. ${You} cũng vào chăm cây cùng ${me} nha! 💖`
    ];
    const msgText = msgTexts[Math.floor(Math.random() * msgTexts.length)];

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chăm cây tình yêu',
          text: msgText,
          url: link
        });
      } catch (error) {
        console.error('Lỗi khi chia sẻ:', error);
      }
    } else {
      // Fallback: Copy to clipboard and open messenger
      try {
        await navigator.clipboard.writeText(`${msgText}\n${link}`);
        showToast('Đã copy lời nhắn, bạn dán (paste) vào Messenger nhé!', 'success');
      } catch (e) {}
      
      const fbUri = `fb-messenger://share/?link=${encodeURIComponent(link)}`;
      window.location.href = fbUri;
      
      setTimeout(() => {
        window.open(`https://www.messenger.com/`, '_blank');
      }, 500);
    }
    
    setShowRemindModal(false);
  };

  const finishPulling = async () => {
    try {
      const res = await treeService.pullWeed();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        showToast(res.message, 'success');
        
        const id = Date.now();
        setExpFloaters(prev => [...prev, { id, diff: 5 }]);
        setTimeout(() => {
          setExpFloaters(prev => prev.filter(f => f.id !== id));
        }, 2000);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi nhổ cỏ', 'error');
    }
  };

  const handleInteract = async (action) => {
    const maxLvl = tree?.level >= 5 && tree?.exp >= expRequired;
    if (maxLvl) {
      showToast('Cây đã đạt cấp tối đa! Hãy thu hoạch Love Stone nhé.', 'error');
      return;
    }

    if (action === 'water') setIsWatering(true);
    if (action === 'sunlight') setIsSunning(true);

    try {
      const currentLevel = tree.level;
      const currentExp = tree.exp || 0;
      const res = await treeService.interact(action, weather);

      if (res.success) {
        // Sử dụng expChange từ backend nếu có, nếu không thì fallback
        const expDiff = res.expChange !== undefined ? res.expChange : (res.data.exp - currentExp);

        const id = Date.now();
        setExpFloaters(prev => [...prev, { id, diff: Math.round(expDiff) }]);
        setTimeout(() => {
          setExpFloaters(prev => prev.filter(f => f.id !== id));
        }, 2000);

        setTree(res.data);
        setExpRequired(res.expRequired);

        // Hiện hiệu ứng nếu lên cấp
        if (res.data.level > currentLevel) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 3000);
          showToast(`Cây đã lớn lên cấp ${res.data.level}! 🎉`, 'success');
        } else {
          showToast(res.message, res.message.includes('THẢM HỌA') ? 'error' : 'success');
        }
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      if (e.response?.data?.needsStreakDecision) {
        const wantsToReset = window.confirm(
          "Chuỗi của bạn đã bị gãy! \n\nHãy mở Túi Vật Phẩm để dùng Khiên khôi phục.\nHoặc nhấn OK để BỎ QUA chuỗi cũ và bắt đầu đếm lại từ 0."
        );
        if (wantsToReset) {
          handleResetStreak(action);
        } else {
          setShowItemMenu(true);
        }
      } else if (e.response?.data?.message) {
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
        setShowItemMenu(false);
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };
  const handleBuyItem = async (item) => {
    try {
      const res = await treeService.buyItem(item);
      if (res.success) {
        setTree(res.data);
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi mua vật phẩm', 'error');
    }
  };

  const handleRestoreStreak = async () => {
    if (tree?.shields < 1) {
      showToast('Bạn không đủ Khiên bảo vệ!', 'error');
      return;
    }
    try {
      const res = await treeService.restoreStreak();
      if (res.success) {
        setTree(res.data);
        showToast(res.message, 'success');
        setShowItemMenu(false);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleUseProp = async () => {
    try {
      const res = await treeService.useProp();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        showToast(res.message, 'success');
        setShowItemMenu(false);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleResetStreak = async (actionToResume) => {
    try {
      const res = await treeService.resetStreak();
      if (res.success) {
        setTree(res.data);
        if (actionToResume) {
          handleInteract(actionToResume);
        }
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleUsePotion = async () => {
    try {
      const res = await treeService.usePotion();
      if (res.success) {
        setTree(res.data);
        setExpRequired(res.expRequired);
        
        // Show floaters for exp
        const newFloater = { id: Date.now(), text: '+50 EXP' };
        setExpFloaters(prev => [...prev, newFloater]);
        setTimeout(() => {
          setExpFloaters(prev => prev.filter(f => f.id !== newFloater.id));
        }, 2000);

        if (res.message.includes('lên cấp')) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 2000);
        }
        showToast(res.message, 'success');
        setShowItemMenu(false);
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi dùng thuốc', 'error');
    }
  };

  const startPress = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setShowItemMenu(true);
    }, 500); // Giữ 500ms
  };

  const cancelPress = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleDevCheat = async (action) => {
    try {
      const res = await treeService.devCheat(action);
      if (res.success) {
        setTree(res.data);
        if (res.expRequired) setExpRequired(res.expRequired);
        showToast(res.message, 'success');
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
  const isMaxLevelAndExp = tree?.level >= 5 && tree?.exp >= expRequired;
  const expPercent = Math.min(100, ((tree?.exp || 0) / expRequired) * 100);

  const handleHarvestStone = async () => {
    try {
      const res = await treeService.harvestStone();
      if (res.success) {
        setTree(res.data);
        setExpRequired(100); // Level 1 exp
        setShowHarvestModal(true);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi thu hoạch', 'error');
    }
  };

  // Dynamic Streak UI logic
  const currentStreak = tree?.streak || 0;

  // Logic kiểm tra xem user hiện tại đã tương tác hôm nay chưa
  const userInteraction = tree?.userInteractions?.find(ui =>
    ui.user === user?._id || ui.user?._id === user?._id
  );
  const isDrought = tree?.activeWeather === 'drought';
  const hasWateredToday = !isDrought && userInteraction?.lastWateredAt && new Date(userInteraction.lastWateredAt).toDateString() === new Date().toDateString();
  const hasDroughtWateredEnough = isDrought && (userInteraction?.droughtWaterings || 0) >= 3;
  const isWaterButtonDone = hasWateredToday || hasDroughtWateredEnough;
  const hasSunlightToday = userInteraction?.lastSunlightAt && new Date(userInteraction.lastSunlightAt).toDateString() === new Date().toDateString();

  const getStreakTier = (streak) => {
    if (streak >= 100) return 'legendary';
    if (streak >= 30) return 'gold';
    if (streak >= 7) return 'silver';
    return 'basic';
  };

  const getFlameColor = (streak) => {
    if (tree?.isStreakBroken) return "#9ca3af";
    if (streak >= 100) return "#be185d";
    if (streak >= 30) return "#d97706";
    if (streak >= 7) return "#3b82f6";
    if (streak > 0) return "#ea580c";
    return "#9ca3af";
  };

  const getFlameFill = (streak) => {
    if (tree?.isStreakBroken) return "none";
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
        onBack={() => navigate('/home')}
        transparent={true}
        rightContent={
          <button className="guide-icon-btn" onClick={() => setShowGuide(true)}>
            <Info size={24} color="#333" />
          </button>
        }
      />

      <main className="tree-garden">
        {/* Background elements */}
        <div className={`sky-bg ${tree?.activeWeather === 'storm' ? 'storm' : ''} ${tree?.activeWeather === 'drought' ? 'drought' : ''}`}>
          <div className="light-rays"></div>
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>

          {tree?.activeWeather === 'storm' && <div className="rain-layer"></div>}

          {/* weather && (
            <div className="weather-widget">
              {tree?.activeWeather === 'storm' ? <CloudRain size={20} color="#4fc3f7" /> :
               tree?.activeWeather === 'drought' ? <Sun size={20} color="#ff3d00" /> :
               weather.rain > 0 ? <CloudRain size={20} color="#4fc3f7" /> :
                (weather.temp >= 30 ? <Sun size={20} color="#ffb74d" /> : <Cloud size={20} color="#fff" />)}
              <span>{tree?.activeWeather === 'drought' ? '45°C' : tree?.activeWeather === 'storm' ? '18°C' : `${weather.temp}°C`}</span>
            </div>
          ) */}
        </div>

        <div className={`grass-ground-back ${tree?.activeWeather === 'drought' ? 'drought' : ''}`}></div>
        <div className={`grass-ground-back-right ${tree?.activeWeather === 'drought' ? 'drought' : ''}`}></div>
        <div className={`grass-ground ${tree?.activeWeather === 'drought' ? 'drought' : ''}`}></div>

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
            {tree?.isPlanted !== false && stage && (
              <>
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
              </>
            )}

            <div className={`streak-bar-container tier-${streakTier} ${tree?.isStreakBroken ? 'broken' : ''}`}>
              <div className="streak-icon-wrapper">
                {tree?.isStreakBroken ? (
                  <Flame size={26} color="#94a3b8" />
                ) : (
                  <Flame size={26} color={getFlameColor(currentStreak)} className={(currentStreak > 0) ? "flame-animate" : ""} fill={getFlameFill(currentStreak)} />
                )}
              </div>
              <div className="streak-info">
                <div className="streak-title">Chuỗi {getTierName(currentStreak)}</div>
                <div className="streak-value">
                  {tree?.isStreakBroken ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Chuỗi đã gãy!</span>
                  ) : (
                    <><span className="streak-count">{currentStreak}</span> ngày liên tiếp</>
                  )}
                </div>
              </div>
            </div>

            {tree?.isPlanted !== false && tree?.activeWeather === 'drought' && (
              <div className="weather-hud" style={{ background: '#fff3e0', border: '1px solid #ffb74d', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>local_fire_department</span>
                <span>Tưới hạn hán: {userInteraction?.droughtWaterings || 0}/3 lần</span>
              </div>
            )}
            
            {tree?.isPlanted !== false && tree?.activeWeather === 'storm' && (
              <div className="weather-hud" style={{ background: '#e1f5fe', border: '1px solid #81d4fa', color: '#0277bd', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>storm</span>
                <span>{tree?.hasTreeProp ? 'Cây đã được chống cọc an toàn' : 'Bão lớn! Mất 10 EXP/Giờ'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {tree?.isPlanted === false ? (
          <div className="seed-bag-container" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div 
              className="seed-bag"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSeedModal(true)}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <img src="/tree/seed-bag.png" alt="Túi hạt giống" style={{ width: '150px', height: '150px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }} />
              <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', color: '#795465', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                Chạm để gieo hạt
              </div>
            </motion.div>
          </div>
        ) : (
          <>

        <AnimatePresence>
          {tree?.isWithered && tree?.witherReason && (
            <motion.div
              className="wither-reason-box"
              style={{
                position: 'relative',
                margin: '16px auto 0 auto',
                zIndex: 50,
                width: 'fit-content'
              }}
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
            >
              <HeartCrack size={18} style={{ flexShrink: 0 }} />
              <span>{tree.witherReason}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nút tác vụ bên phải */}
        <div className="side-actions-right">
          <button className="side-action-btn remind-action" onClick={() => setShowRemindModal(true)} title="Nhắc chăm cây">
            <BellRing size={24} color="#fff" />
          </button>
          {/* Nút DevTools đã bị ẩn theo yêu cầu
          {user?.code === 'ADMIN' && (
            <button className="side-action-btn dev-action" style={{ background: '#333' }} onClick={() => setShowDevMenu(true)} title="Dev Tools">
              <Bug size={24} color="#fff" />
            </button>
          )}
          */}
          <button className="side-action-btn item-use-action" onClick={() => setShowItemMenu(true)} title="Dùng vật phẩm">
            <Backpack size={24} color="#fff" />
          </button>
          <button className="side-action-btn shop-action" onClick={() => setShowShop(true)} title="Cửa hàng">
            <ShoppingCart size={24} color="#fff" />
          </button>
          <button className="side-action-btn game-action" onClick={() => navigate('/games')} title="Trung tâm Trò chơi">
            <Gamepad2 size={24} color="#fff" />
          </button>
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

          {/* Bỏ pest-bugs-container ở ngoài, di chuyển vào trong tree-image-wrapper để sát hình cây */}

          <motion.div
            key={`${tree?.level}-${tree?.isWithered}`}
            className="tree-image-wrapper"
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            style={{ zIndex: isSpraying ? 1001 : 1 }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
          >
            <img
              src={stage.img}
              alt={stage.name}
              draggable="false"
              className={`tree-img level-${tree?.level} ${tree?.isWithered ? 'withered' : ''} ${(tree?.activeWeather === 'storm' && !tree?.hasTreeProp) ? 'leaning' : ''} ${isMaxLevelAndExp ? 'harvestable' : ''}`}
              style={{ width: stage.size, height: stage.size, cursor: isMaxLevelAndExp ? 'pointer' : 'default' }}
              onClick={isMaxLevelAndExp ? handleHarvestStone : undefined}
            />

            {/* Cọc chống cây visual */}
            {tree?.hasTreeProp && (
              <div className="tree-prop-visual" style={{ 
                position: 'absolute', bottom: '10%', right: '35%', 
                width: '12px', height: '60%', background: '#8d6e63', 
                borderLeft: '2px solid #5d4037', borderRight: '2px solid #3e2723',
                borderRadius: '4px', transform: 'rotate(15deg)', zIndex: 0 
              }}></div>
            )}

            {/* Sâu bọ hiển thị trên thân cây */}
            {tree?.hasPest && (
              <div className="pest-bugs-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                <div className="pest-bug" style={{ position: 'absolute', top: '25%', left: '45%', fontSize: '36px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', animation: 'bugMove1 2s infinite alternate' }}>🐛</div>
                <div className="pest-bug" style={{ position: 'absolute', top: '40%', left: '55%', fontSize: '28px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', animation: 'bugMove2 3s infinite alternate', transform: 'scaleX(-1)' }}>🐛</div>
                <div className="pest-bug" style={{ position: 'absolute', top: '55%', left: '40%', fontSize: '32px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', animation: 'bugMove3 2.5s infinite alternate' }}>🐛</div>
              </div>
            )}

            {/* Cỏ dại hiển thị ở gốc cây */}
            {activeWeeds.map((weed) => {
              const weedPositions = [
                { bottom: '-20px', left: '50%', marginLeft: '-50px' }, // Ở giữa
                { bottom: '30px', left: '-40px', marginLeft: '0px' },  // Bên trái
                { bottom: '50px', left: '100%', marginLeft: '-60px' },  // Bên phải
              ];
              const pos = weedPositions[weed.posIndex % weedPositions.length];
              return (
                <motion.div 
                  key={weed.id}
                  className="weed-sprite-container" 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.8}
                  onDragEnd={(e, info) => {
                    const dist = Math.hypot(info.offset.x, info.offset.y);
                    if (dist > 150) {
                      setActiveWeeds(prev => prev.filter(w => w.id !== weed.id));
                      finishPulling();
                    }
                  }}
                  whileDrag={{ scale: 1.2, zIndex: 999 }}
                  style={{ 
                    position: 'absolute', bottom: pos.bottom, left: pos.left, marginLeft: pos.marginLeft,
                    zIndex: 100, cursor: 'grab', 
                    filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
                  }}
                >
                  <img 
                    src={weedImages[weed.imgIndex % weedImages.length]} 
                    alt="Cỏ dại"
                    style={{ 
                      width: '100px', height: '100px', objectFit: 'contain',
                      transformOrigin: 'bottom center'
                    }}
                    draggable="false"
                  />
                </motion.div>
              );
            })}

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

        <div className="tree-actions-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Nút hành động */}
          <div className="tree-actions">
            <motion.button
              className="action-btn water-btn"
              whileTap={(isWaterButtonDone || tree?.isStreakBroken) ? {} : { scale: 0.9 }}
              onClick={() => {
                if (tree?.isStreakBroken) {
                  showToast('Chuỗi đã gãy! Không thể tương tác lúc này. Hãy khôi phục chuỗi.', 'error');
                  return;
                }
                handleInteract('water');
              }}
              disabled={isWatering || isSunning || isWaterButtonDone || tree?.isStreakBroken}
            >
              <div className={`btn-icon-circle water-circle ${(isWaterButtonDone || tree?.isStreakBroken) ? 'disabled' : ''}`}>
                <Droplets size={24} color="#fff" />
              </div>
              <span>{tree?.isStreakBroken ? 'Đã khóa' : 'Tưới nước'}</span>
            </motion.button>

            <motion.button
              className="action-btn sun-btn"
              whileTap={(hasSunlightToday || tree?.isStreakBroken) ? {} : { scale: 0.9 }}
              onClick={() => {
                if (tree?.isStreakBroken) {
                  showToast('Chuỗi đã gãy! Không thể tương tác lúc này. Hãy khôi phục chuỗi.', 'error');
                  return;
                }
                handleInteract('sunlight');
              }}
              disabled={isWatering || isSunning || hasSunlightToday || tree?.isStreakBroken}
            >
              <div className={`btn-icon-circle sun-circle ${(hasSunlightToday || tree?.isStreakBroken) ? 'disabled' : ''}`}>
                <Sun size={24} color="#fff" />
              </div>
              <span>{tree?.isStreakBroken ? 'Đã khóa' : 'Phơi nắng'}</span>
            </motion.button>
          </div>
        </div>
        </>
        )}
      </main>

      {/* Modal Chọn Hạt Giống */}
      <AnimatePresence>
        {showSeedModal && (
          <motion.div
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSeedModal(false)}
          >
            <motion.div
              className="guide-modal-content"
              style={{ textAlign: 'center' }}
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="guide-close-btn"
                onClick={() => setShowSeedModal(false)}
              >
                <X size={20} />
              </button>
              <h2 style={{ color: '#d94c73', marginBottom: '16px', marginTop: '12px', fontSize: '1.5rem', fontWeight: 'bold' }}>Chọn Hạt Giống</h2>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '24px 0' }}>
                <div style={{ border: '2px solid #4caf50', borderRadius: '16px', padding: '16px', background: '#f1f8e9', cursor: 'pointer', width: '140px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#4caf50', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderBottomLeftRadius: '8px', fontWeight: 'bold' }}>Đã chọn</div>
                  <img src="/tree/level-1.svg" alt="Cây Tình Yêu" style={{ width: '60px', height: '60px', marginBottom: '8px' }} />
                  <h4 style={{ color: '#2e7d32', margin: '0 0 4px 0' }}>Cây Tình Yêu</h4>
                  <p style={{ fontSize: '0.75rem', color: '#4caf50', margin: 0 }}>Cơ bản</p>
                </div>
              </div>

              <p style={{ color: '#795465', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                Khi gieo hạt, hành trình chăm sóc cây sẽ chính thức bắt đầu. Hãy nhớ tưới nước và phơi nắng mỗi ngày nhé!
              </p>

              <button 
                onClick={handlePlantTree}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4caf50, #2e7d32)', color: 'white', border: 'none', padding: '14px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)' }}
              >
                Gieo Mầm Ngay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <strong>Chăm sóc:</strong> Mỗi người có thể vừa <strong>Tưới nước</strong> vừa <strong>Phơi nắng</strong> 1 lần/ngày để nhận tối đa EXP.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon sun" style={{ background: '#ea580c' }}><Flame size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Chuỗi (Streak):</strong> Để duy trì chuỗi, <strong>cả hai người</strong> đều phải thực hiện <strong>ít nhất một hành động</strong> mỗi ngày.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon wither" style={{ background: '#8d6e63' }}><HeartCrack size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Cây Héo:</strong> Cây sẽ héo nếu cả 2 không chăm sóc quá 24h HOẶC EXP kiếm được hôm qua quá ít ({'<'} 15 EXP). Dùng <strong>Phân bón</strong> để hồi sinh.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon shield" style={{ background: '#16a34a' }}><Bug size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Sâu Bệnh:</strong> Cây có tỷ lệ bị sâu cắn phá mỗi ngày, làm tụt điểm EXP liên tục. Hãy mua <strong>Thuốc Trừ Sâu</strong> và xịt chúng!
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon shield" style={{ background: '#60a5fa' }}><Shield size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Khiên bảo vệ:</strong> Tự động kích hoạt để giữ chuỗi khi 1 trong 2 người quên chăm sóc cây.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon game" style={{ background: '#ab47bc' }}><Gamepad2 size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Cửa Hàng:</strong> Chơi Lật Thẻ kiếm <strong>Xu</strong> để mua Phân bón hoặc Khiên bảo vệ.
                  </div>
                </div>
                <div className="guide-item">
                  <div className="g-icon level"><Sparkles size={20} color="#fff" /></div>
                  <div className="g-text">
                    <strong>Lên cấp:</strong> Khi đầy thanh EXP, cây sẽ lớn lên và đổi hình dáng.
                  </div>
                </div>
              </div>
              <div className="guide-note">
                <em>Mẹo: Thời tiết và thời gian lúc bạn chăm sóc sẽ ảnh hưởng lớn đến lượng EXP nhận được đó nha!</em>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Shop Modal */}
        {showShop && (
          <motion.div
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShop(false)}
          >
            <motion.div
              className="guide-modal-content shop-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="guide-close-btn"
                onClick={() => setShowShop(false)}
              >
                <X size={20} />
              </button>

              <div className="guide-header">
                <div className="guide-icon-wrapper" style={{ background: '#fffbeb' }}>
                  <ShoppingCart size={32} color="#f59e0b" />
                </div>
                <h3>Cửa Hàng Yêu Thương</h3>
                <div className="shop-balance">
                  <div className="balance-item" title="Xu">
                    <Coins size={18} color="#f59e0b" /> {tree?.coins || 0}
                  </div>
                  <div className="balance-item" title="Khiên bảo vệ">
                    <Shield size={18} color="#60a5fa" /> {tree?.shields || 0}
                  </div>
                  <div className="balance-item" title="Phân bón">
                    <HeartCrack size={18} color="#8d6e63" /> {tree?.fertilizers || 0}
                  </div>
                  <div className="balance-item" title="Thuốc tăng trưởng">
                    <FlaskConical size={18} color="#10b981" /> {tree?.growthPotions || 0}
                  </div>
                  <div className="balance-item" title="Thuốc trừ sâu">
                    <Bug size={18} color="#8b5cf6" /> {tree?.pesticides || 0}
                  </div>
                </div>
              </div>

              <div className="shop-items">
                <div className="shop-item">
                  <div className="item-icon potion" style={{ background: '#8b5cf6' }}><Bug size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Thuốc Trừ Sâu</h4>
                    <p>Tiêu diệt sâu rệp cắn phá cây.</p>
                  </div>
                  <button className="buy-btn" onClick={() => handleBuyItem('pesticide')} disabled={tree?.coins < 200}>
                    200 Xu
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon shield" style={{ background: '#f59e0b' }}><span className="material-symbols-outlined" style={{ color: '#fff' }}>fence</span></div>
                  <div className="item-details">
                    <h4>Cọc Chống Cây</h4>
                    <p>Giữ cây không bị gió bão quật ngã.</p>
                  </div>
                  <button className="buy-btn" onClick={() => handleBuyItem('tree_prop')} disabled={tree?.coins < 150}>
                    150 Xu
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon wither" style={{ background: '#8d6e63' }}><HeartCrack size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Phân Bón</h4>
                    <p>Hồi sinh cây khi bị héo.</p>
                  </div>
                  <button className="buy-btn" onClick={() => handleBuyItem('fertilizer')} disabled={tree?.coins < 200}>
                    200 Xu
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon shield" style={{ background: '#60a5fa' }}><Shield size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Khiên Bảo Vệ</h4>
                    <p>Tự động bảo vệ chuỗi khi quên.</p>
                  </div>
                  <button className="buy-btn" onClick={() => handleBuyItem('shield')} disabled={tree?.coins < 1000}>
                    1000 Xu
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon potion" style={{ background: '#10b981' }}><FlaskConical size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Thuốc Siêu Tăng Trưởng</h4>
                    <p>Giúp cây hấp thu ngay 50 EXP.</p>
                  </div>
                  <button className="buy-btn" onClick={() => handleBuyItem('potion')} disabled={tree?.coins < 250}>
                    250 Xu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemMenu && (
          <motion.div
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowItemMenu(false)}
          >
            <motion.div
              className="guide-modal-content shop-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="guide-close-btn"
                onClick={() => setShowItemMenu(false)}
              >
                <X size={20} />
              </button>

              <div className="guide-header">
                <div className="guide-icon-wrapper" style={{ background: '#d1fae5' }}>
                  <Backpack size={32} color="#10b981" />
                </div>
                <h3>Túi Vật Phẩm</h3>
              </div>

              <div className="shop-items">
                <div className="shop-item">
                  <div className="item-icon potion" style={{ background: '#8b5cf6' }}><Bug size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Thuốc Trừ Sâu (x{tree?.pesticides || 0})</h4>
                    <p>Dùng để diệt sâu bọ.</p>
                  </div>
                  <button 
                    className="buy-btn" 
                    style={{ background: ((tree?.pesticides || 0) > 0 && tree?.hasPest) ? 'linear-gradient(135deg, #a78bfa, #8b5cf6)' : '#ccc' }}
                    onClick={startSprayingMinigame} 
                    disabled={(tree?.pesticides || 0) <= 0 || !tree?.hasPest}
                  >
                    Dùng
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon wither" style={{ background: '#8d6e63' }}><HeartCrack size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Phân Bón (x{tree?.fertilizers || 0})</h4>
                    <p>Dùng để hồi sinh cây héo.</p>
                  </div>
                  <button 
                    className="buy-btn" 
                    style={{ background: ((tree?.fertilizers || 0) > 0 && tree?.isWithered) ? 'linear-gradient(135deg, #a1887f, #8d6e63)' : '#ccc' }}
                    onClick={handleRevive} 
                    disabled={(tree?.fertilizers || 0) <= 0 || !tree?.isWithered}
                  >
                    Dùng
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon shield" style={{ background: '#60a5fa' }}><Shield size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Khiên Bảo Vệ (x{tree?.shields || 0})</h4>
                    <p>Khôi phục chuỗi khi bị gãy.</p>
                  </div>
                  <button 
                    className="buy-btn" 
                    style={{ background: ((tree?.shields || 0) > 0 && tree?.isStreakBroken) ? 'linear-gradient(135deg, #93c5fd, #3b82f6)' : '#ccc' }}
                    onClick={handleRestoreStreak} 
                    disabled={(tree?.shields || 0) <= 0 || !tree?.isStreakBroken}
                  >
                    Dùng
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon potion" style={{ background: '#10b981' }}><FlaskConical size={24} color="#fff" /></div>
                  <div className="item-details">
                    <h4>Thuốc Siêu Tăng Trưởng (x{tree?.growthPotions || 0})</h4>
                    <p>Nhận ngay 50 EXP.</p>
                  </div>
                  <button 
                    className="buy-btn" 
                    style={{ background: ((tree?.growthPotions || 0) > 0 && !tree?.isWithered) ? 'linear-gradient(135deg, #34d399, #10b981)' : '#ccc' }}
                    onClick={handleUsePotion} 
                    disabled={(tree?.growthPotions || 0) <= 0 || tree?.isWithered}
                  >
                    Dùng
                  </button>
                </div>

                <div className="shop-item">
                  <div className="item-icon shield" style={{ background: '#f59e0b' }}><span className="material-symbols-outlined" style={{ color: '#fff' }}>fence</span></div>
                  <div className="item-details">
                    <h4>Cọc Chống Cây (x{tree?.treeProps || 0})</h4>
                    <p>Giữ cây an toàn trong bão lốc.</p>
                  </div>
                  <button 
                    className="buy-btn" 
                    style={{ background: ((tree?.treeProps || 0) > 0 && tree?.activeWeather === 'storm' && !tree?.hasTreeProp) ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#ccc' }}
                    onClick={handleUseProp} 
                    disabled={(tree?.treeProps || 0) <= 0 || tree?.activeWeather !== 'storm' || tree?.hasTreeProp}
                  >
                    Dùng
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev Menu Modal */}
      <AnimatePresence>
        {showDevMenu && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDevMenu(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <button className="close-btn" onClick={() => setShowDevMenu(false)}>×</button>
              <div className="guide-header">
                <div className="guide-icon-wrapper" style={{ background: '#374151' }}>
                  <Bug size={32} color="#fff" />
                </div>
                <h3>Developer Tools</h3>
              </div>
              <div className="shop-items" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button className="action-btn" style={{ background: '#8b5cf6', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('spawn_pest')}>Gây Sâu Bệnh</button>
                <button className="action-btn" style={{ background: '#22c55e', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('spawn_weed')}>Sinh Cỏ Dại</button>
                <button className="action-btn" style={{ background: '#0284c7', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('start_storm')}>Tạo Bão Lốc</button>
                <button className="action-btn" style={{ background: '#e65100', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('start_drought')}>Tạo Hạn Hán</button>
                <button className="action-btn" style={{ background: '#ef4444', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('wither')}>Héo Cây</button>
                <button className="action-btn" style={{ background: '#f59e0b', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('break_streak')}>Gãy Chuỗi</button>
                <button className="action-btn" style={{ background: '#10b981', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('add_coins')}>+1000 Xu</button>
                <button className="action-btn" style={{ background: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('add_exp')}>+1000 EXP</button>
                <button className="action-btn" style={{ background: '#f97316', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('add_streak')}>+10 Chuỗi</button>
                <button className="action-btn" style={{ background: '#8b5cf6', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('add_shield')}>+1 Khiên</button>
                <button className="action-btn" style={{ background: '#8d6e63', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }} onClick={() => handleDevCheat('add_fertilizer')}>+1 Phân Bón</button>
                <button className="action-btn" style={{ background: '#10b981', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', gridColumn: 'span 2' }} onClick={() => handleDevCheat('add_potion')}>+1 Thuốc Tăng Trưởng</button>
                <button className="action-btn" style={{ background: '#111', color: '#ff4444', padding: '10px', borderRadius: '8px', border: '2px solid #ff4444', fontWeight: 'bold', gridColumn: 'span 2', marginTop: '10px' }} onClick={() => { if(window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu Cây (Về cấp 1, mất hết đồ)?')) handleDevCheat('reset_all') }}>Xóa Toàn Bộ Dữ Liệu</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spraying Overlay & Minigame */}
      <AnimatePresence>
        {isSpraying && (
          <motion.div 
            className="spraying-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseMove={handleSprayMove}
            onTouchMove={handleSprayMove}
          >
            <div className="spray-progress-container">
              <div className="spray-progress-bar" style={{ width: `${Math.min(100, sprayProgress)}%` }}></div>
            </div>
            <div className="spray-instruction">Vuốt liên tục để diệt sâu!</div>

            {sprayParticles.map(p => (
              <motion.div 
                key={p.id}
                className="spray-cloud"
                initial={{ opacity: 0.8, scale: 0.5, x: p.x, y: p.y }}
                animate={{ opacity: 0, scale: 2, y: p.y - 100, x: p.x + (Math.random() - 0.5) * 50 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: 'absolute',
                  width: '60px',
                  height: '60px',
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0) 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Remind Modal */}
      <AnimatePresence>
        {showRemindModal && (
          <motion.div 
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRemindModal(false)}
          >
            <motion.div 
              className="guide-modal-content remind-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="guide-close-btn"
                onClick={() => setShowRemindModal(false)}
              >
                <X size={20} />
              </button>

              <div className="guide-header">
                <div className="guide-icon-wrapper bell-pulse" style={{ background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', width: '72px', height: '72px' }}>
                  <BellRing size={36} color="#e11d48" />
                </div>
                <h3 className="remind-header-text">Nhắc Nhở Đối Phương</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
                <p className="remind-desc" style={{ textAlign: 'center' }}>
                  Cây tình yêu đang cần chăm sóc! Hãy gửi ngay một lời nhắc nhở đáng yêu để cùng nhau vun đắp nhé.
                </p>
                <button 
                  className="remind-btn btn-app" 
                  onClick={handleRemindInApp}
                  disabled={isRemindingInApp}
                  style={{ opacity: isRemindingInApp ? 0.7 : 1, cursor: isRemindingInApp ? 'not-allowed' : 'pointer' }}
                >
                  {isRemindingInApp ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>sync</span>
                    </motion.div>
                  ) : (
                    <MessageCircleHeart size={24} />
                  )}
                  {isRemindingInApp ? 'Đang gửi...' : 'Gửi qua Chat trong App'}
                </button>
                <button 
                  className="remind-btn btn-fb" 
                  onClick={handleRemindFacebook}
                  disabled={isRemindingInApp}
                >
                  <Send size={24} />
                  Gửi qua Messenger
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Harvest Modal */}
      <AnimatePresence>
        {showHarvestModal && (
          <motion.div
            className="guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
          >
            {/* Sparkles outside */}
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#fbbf24',
                  top: '50%',
                  left: '50%',
                  boxShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24'
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * window.innerWidth * 0.8,
                  y: (Math.random() - 0.5) * window.innerHeight * 0.8,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 1.5 + Math.random(), repeat: Infinity, repeatDelay: Math.random() }}
              />
            ))}

            <motion.div
              className="guide-modal-content"
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
              style={{ 
                textAlign: 'center', 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.5)', 
                maxWidth: '380px',
                borderRadius: '32px',
                padding: '40px 30px',
                boxShadow: '0 24px 48px rgba(219, 39, 119, 0.25), inset 0 2px 4px rgba(255,255,255,0.8)'
              }}
            >
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 24px' }}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(circle, rgba(244,114,182,0.6) 0%, rgba(244,114,182,0) 70%)', borderRadius: '50%', zIndex: 0 }}
                />
                <motion.div 
                  animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                >
                  <img src="/tree/love-stone.png" alt="Love Stone" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 12px 24px rgba(219, 39, 119, 0.5))' }} />
                </motion.div>
              </div>
              
              <h2 style={{ 
                background: 'linear-gradient(135deg, #e11d48, #db2777, #9d174d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '2.2rem', 
                marginBottom: '12px', 
                fontWeight: '900',
                letterSpacing: '-0.5px'
              }}>
                Tuyệt Vời!
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '12px', fontWeight: '500' }}>
                Bạn vừa thu hoạch được
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
                <span style={{ color: '#db2777', fontSize: '2.5rem', fontWeight: '900' }}>+1</span>
                <span style={{ display: 'inline-block', background: '#fce7f3', color: '#db2777', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #fbcfe8', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(252, 231, 243, 0.5)' }}>
                  Love Stone
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHarvestModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #db2777)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '30px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 24px rgba(219, 39, 119, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  width: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Nhận Ngay!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LoveTreePage;
