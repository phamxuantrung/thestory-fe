import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookHeart, Plus, X, Calendar as CalendarIcon, Mail, BookOpen, MapPin, Trees, Gem, PawPrint, Target } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { authService } from '../services/authService';
import { showToast } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { getUpcomingEvents } from '../utils/dateHelpers';
import { treeService } from '../services/treeService';
import { questService } from '../services/questService';
import { chatService } from '../services/chatService';
import api from '../services/api';
import { telepathyService } from '../services/telepathyService';
import TelepathyModal from '../components/TelepathyModal';
import DailyMoodReminderModal from '../components/DailyMoodReminderModal';
import { moodService } from '../services/moodService';
import { MOODS } from '../utils/constants';
import './HomePage.css';

const LOVE_QUOTES = [
  'Gặp được em là điều may mắn nhất trong cuộc đời anh.',
  'Mỗi ngày trôi qua anh lại yêu em nhiều hơn ngày hôm qua.',
  'Cảm ơn em vì đã luôn ở bên cạnh anh.',
  'Nụ cười của em là bình yên của anh.',
];

const HOBBY_CATEGORIES = [
  { id: 'food', label: 'Đồ ăn', icon: 'restaurant' },
  { id: 'drink', label: 'Đồ uống', icon: 'local_cafe' },
  { id: 'color', label: 'Màu sắc', icon: 'palette' },
  { id: 'size', label: 'Size/Đồ', icon: 'checkroom' },
  { id: 'place', label: 'Địa điểm', icon: 'location_on' },
  { id: 'other', label: 'Khác', icon: 'star' },
];

const getDaysSince = (dateStr) => {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatLastSeen = (dateStr) => {
  if (!dateStr) return 'Vừa mới';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));
  if (diffMinutes < 1) return 'Vừa mới';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return date.toLocaleDateString('vi-VN');
};

const renderMoodIcon = (moodId) => {
  if (!moodId) return '❓';
  const m = MOODS.find(x => x.id === moodId);
  if (!m) return '❓';
  return <img src={m.emojiUrl} alt={m.label} style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }} />;
};

const HomePage = () => {
  const { user, partner, updateUser } = useAuth();
  const socket = useSocket();
  const [days, setDays] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tree state
  const [treeData, setTreeData] = useState(null);
  const [expRequired, setExpRequired] = useState(100);

  // Quests state
  const [activeQuests, setActiveQuests] = useState([]);
  const [isQuestsExpanded, setIsQuestsExpanded] = useState(false);

  // Orders state
  const [activeOrders, setActiveOrders] = useState([]);
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);

  // Blind bag state
  const [isQuoteRevealed, setIsQuoteRevealed] = useState(false);

  // Mood Reminder state
  const [showMoodReminder, setShowMoodReminder] = useState(false);
  const [myMood, setMyMood] = useState(null);
  const [partnerMood, setPartnerMood] = useState(null);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    const currentKey = `${todayStr}_${partner?.dailyMessageDate || 'none'}`;
    const savedKey = localStorage.getItem('blindBagOpenedKey');

    if (savedKey === currentKey) {
      setIsQuoteRevealed(true);
    } else {
      setIsQuoteRevealed(false);
    }
  }, [partner?.dailyMessageDate]);

  // Modal thay đổi ngày kỷ niệm
  const [showDateModal, setShowDateModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  // Modal quản lý sở thích
  const [showHobbyModal, setShowHobbyModal] = useState(false);
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbyCategory, setHobbyCategory] = useState('food');
  const [editingHobbyIndex, setEditingHobbyIndex] = useState(null);
  const [isUpdatingHobby, setIsUpdatingHobby] = useState(false);

  // Daily message modal
  const [showDailyMessageModal, setShowDailyMessageModal] = useState(false);
  const [dailyMessageInput, setDailyMessageInput] = useState('');
  const [isUpdatingDailyMessage, setIsUpdatingDailyMessage] = useState(false);

  // Love Stone Popup
  const [showLoveStonePopup, setShowLoveStonePopup] = useState(false);

  const handleUseStone = async () => {
    try {
      const res = await treeService.useStone();
      if (res.success) {
        setTreeData(res.data);
        setShowLoveStonePopup(true);
        setTimeout(() => setShowLoveStonePopup(false), 5000);

        // Gửi tin nhắn chat
        const msgText = "🎉 Chúc mừng! Hai bạn đã đổi 1 Love Stone để lấy một buổi hẹn hò lãng mạn cuối tuần này! Hãy lên lịch ngay thôi! 🍷🥩";
        if (socket) {
          socket.emit('chat:send', { content: msgText, type: 'text', replyTo: null });
        } else {
          await chatService.sendMessage(msgText);
        }
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  useEffect(() => {
    if (user?.anniversaryDate) {
      setDays(getDaysSince(user.anniversaryDate));
    }
  }, [user]);

  useEffect(() => {
    if (user && partner) {
      treeService.getTree().then(res => {
        if (res.success && res.data) {
          setTreeData(res.data);
          const currentLevel = res.data.level;
          let required = 100;
          if (currentLevel === 1) required = 300;
          else if (currentLevel === 2) required = 1000;
          else if (currentLevel === 3) required = 3000;
          else if (currentLevel === 4) required = 8000;
          else required = 15000;
          setExpRequired(required);
        }
      }).catch(err => console.log('Không tải được cây:', err));

      questService.getActiveQuests().then(res => {
        if (res.success) {
          setActiveQuests(res.data || []);
        }
      }).catch(err => console.log('Không tải được nhiệm vụ:', err));

      api.get('/store/partner-orders').then(res => {
        if (res.data.success && res.data.data) {
          const active = res.data.data.filter(order => ['pending', 'confirmed'].includes(order.status));
          setActiveOrders(active);
        }
      }).catch(err => console.log('Không tải được đơn hàng:', err));
    }
  }, [user, partner]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Kiểm tra nhắc nhở cập nhật Mood
  useEffect(() => {
    if (!user) return;

    const fetchTodayMood = async () => {
      const getVNDateString = () => {
        const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
        return `${vnTime.getUTCFullYear()}-${vnTime.getUTCMonth() + 1}-${vnTime.getUTCDate()}`;
      };

      const todayStr = getVNDateString();

      try {
        const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const month = vnTime.getUTCMonth() + 1;
        const year = vnTime.getUTCFullYear();
        
        const res = await moodService.getStats(month, year);
        if (res.success && res.data && res.data.raw) {
          const myId = user._id || user.id;
          const partnerId = partner?._id || partner?.id;

          let myTodayMood = null;
          let partnerTodayMood = null;

          res.data.raw.forEach(m => {
            const moodDate = new Date(m.date);
            const vnMoodDate = new Date(moodDate.getTime() + 7 * 60 * 60 * 1000);
            if (`${vnMoodDate.getUTCFullYear()}-${vnMoodDate.getUTCMonth() + 1}-${vnMoodDate.getUTCDate()}` === todayStr) {
              const uid = String(m.user._id || m.user.id || m.user);
              if (uid === String(myId)) {
                myTodayMood = m.mood;
              } else if (partnerId && uid === String(partnerId)) {
                partnerTodayMood = m.mood;
              }
            }
          });

          setMyMood(myTodayMood);
          setPartnerMood(partnerTodayMood);

          if (!myTodayMood) {
            // Chưa có mood, kiểm tra xem có nên hiện nhắc nhở không
            if (localStorage.getItem('dailyMoodSkipDate') !== todayStr && sessionStorage.getItem('dailyMoodRemindLater') !== 'true') {
              setShowMoodReminder(true);
            }
          }
        }
      } catch (error) {
        console.log('Error checking mood stats:', error);
      }
    };

    fetchTodayMood();
  }, [user]);

  const handleSkipMoodReminder = () => {
    const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = `${vnTime.getUTCFullYear()}-${vnTime.getUTCMonth() + 1}-${vnTime.getUTCDate()}`;
    localStorage.setItem('dailyMoodSkipDate', todayStr);
    setShowMoodReminder(false);
  };

  const handleRemindLaterMood = () => {
    sessionStorage.setItem('dailyMoodRemindLater', 'true');
    setShowMoodReminder(false);
  };

  const upcomingEvents = getUpcomingEvents(user, partner);

  const userId = user?._id || user?.id;
  const partnerId = partner?._id || partner?.id;

  const pendingQuestsForMe = activeQuests.filter(quest => {
    if (!partnerId || !userId) return false;
    const partnerAccepted = quest.acceptedBy?.includes(partnerId);
    const iAccepted = quest.acceptedBy?.includes(userId);
    const partnerCompleted = quest.completedBy?.includes(partnerId);
    const iCompleted = quest.completedBy?.includes(userId);
    
    // Nếu người ấy đã nhận mà mình chưa nhận
    if (partnerAccepted && !iAccepted) return true;
    
    // Nếu cả hai đã nhận, người ấy đã xác nhận hoàn thành mà mình chưa xác nhận
    if (iAccepted && partnerCompleted && !iCompleted) return true;
    
    return false;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 6) return 'Đêm khuya rồi 🌙';
    if (h < 12) return 'Buổi sáng ☀️';
    if (h < 18) return 'Buổi chiều 🌤️';
    return 'Buổi tối 🌆';
  };

  const handleUpdateAnniversary = async () => {
    if (!newDate) return;
    setIsUpdatingDate(true);
    try {
      const res = await authService.updateMe({ anniversaryDate: newDate });
      if (res.success) {
        updateUser({ anniversaryDate: newDate });
        setDays(getDaysSince(newDate));
        setShowDateModal(false);
        showToast('Đã cập nhật ngày kỷ niệm', 'success');
      }
    } catch (error) {
      showToast('Cập nhật thất bại', 'error');
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleSaveHobby = async () => {
    if (!hobbyInput.trim()) return;
    setIsUpdatingHobby(true);
    try {
      let newHobbies = [...(user?.partnerHobbies || [])];
      const hobbyObj = { category: hobbyCategory, text: hobbyInput.trim() };

      if (editingHobbyIndex !== null) {
        newHobbies[editingHobbyIndex] = hobbyObj;
      } else {
        newHobbies.push(hobbyObj);
      }

      const res = await authService.updatePartnerHobbies(newHobbies);
      if (res.success) {
        updateUser({ partnerHobbies: newHobbies });
        setShowHobbyModal(false);
        showToast('Đã lưu sở thích', 'success');
      }
    } catch (error) {
      showToast('Lưu thất bại', 'error');
    } finally {
      setIsUpdatingHobby(false);
    }
  };

  const handleDeleteHobby = async (index) => {
    if (!window.confirm('Bạn có chắc muốn xóa sở thích này?')) return;
    try {
      let newHobbies = [...(user?.partnerHobbies || [])];
      newHobbies.splice(index, 1);
      const res = await authService.updatePartnerHobbies(newHobbies);
      if (res.success) {
        updateUser({ partnerHobbies: newHobbies });
        showToast('Đã xóa sở thích', 'success');
      }
    } catch (error) {
      showToast('Xóa thất bại', 'error');
    }
  };

  const openDateModal = () => {
    setNewDate(user?.anniversaryDate ? user.anniversaryDate.split('T')[0] : '');
    setShowDateModal(true);
  };

  const handleSaveDailyMessage = async () => {
    if (!dailyMessageInput.trim()) return;
    setIsUpdatingDailyMessage(true);
    try {
      const res = await authService.updateMe({ dailyMessage: dailyMessageInput });
      if (res.success) {
        updateUser({ dailyMessage: dailyMessageInput, dailyMessageDate: res.data.dailyMessageDate || new Date().toISOString() });
        setShowDailyMessageModal(false);
        showToast('Đã gửi lời yêu thương', 'success');
      }
    } catch (error) {
      showToast('Gửi thất bại', 'error');
    } finally {
      setIsUpdatingDailyMessage(false);
    }
  };

  const isMessageValidToday = (msgDate) => {
    if (!msgDate) return false;
    const date = new Date(msgDate);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const partnerMessageValid = isMessageValidToday(partner?.dailyMessageDate);
  const myMessageValid = isMessageValidToday(user?.dailyMessageDate);

  const getTreeStageName = (level) => {
    const names = {
      1: 'Hạt giống',
      2: 'Mầm non',
      3: 'Cây nhỏ',
      4: 'Cây trưởng thành',
      5: 'Cây đơm hoa'
    };
    return names[Math.min(level || 1, 5)];
  };

  const getExpRequired = (level) => {
    const requirements = {
      1: 300,
      2: 700,
      3: 1200,
      4: 2500,
      5: 5000
    };
    return requirements[level] || 5000;
  };

  return (
    <div className="home-page-v2">
      <Header title="Trang chủ" showBack={false} showMarketBtn={true} />

      <motion.main
        className="home-main-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Nhắc nhở bản thân đang dỗi */}
        {user?.isAngry && (
          <motion.div
            className="self-angry-reminder"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="reminder-icon">
              <span className="material-symbols-outlined">mood_bad</span>
            </div>
            <div className="reminder-text">
              <p>Bạn đang <strong>dỗi người ấy</strong>, hai bạn đã làm hoà rồi chứ?</p>
            </div>
            <Link to="/profile" className="reminder-btn">
              Tắt dỗi
            </Link>
          </motion.div>
        )}

        {/* Báo động đỏ */}
        {partner?.isAngry && (
          <motion.div
            className="angry-alert-banner"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <div className="angry-alert-icon">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div className="angry-alert-text">
              <h3>BÁO ĐỘNG ĐỎ!</h3>
              <p>Người ấy đang dỗi bạn! Hãy nhắn tin làm hòa và dỗ dành ngay đi!</p>
            </div>
            <Link to="/chat" className="angry-alert-btn">
              Đi dỗ ngay
            </Link>
          </motion.div>
        )}

        {/* Thông báo Đơn hàng đang chờ / thực hiện */}
        {activeOrders.length > 0 && (
          <motion.div
            className="home-orders-section"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <div 
              className={`home-orders-header ${isOrdersExpanded ? 'expanded' : ''}`}
              onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
            >
              <div className="home-orders-header-left">
                <div className="home-orders-icon-wrapper">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                  <div className="home-orders-badge">
                    <span className="home-orders-badge-pulse"></span>
                    <span>{activeOrders.length}</span>
                  </div>
                </div>
                <div className="home-orders-title">
                  <h3>Đơn hàng chờ xử lý</h3>
                  <p>Chạm để xem chi tiết</p>
                </div>
              </div>
              <motion.div 
                className="home-orders-toggle"
                animate={{ rotate: isOrdersExpanded ? 180 : 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <span className="material-symbols-outlined">expand_more</span>
              </motion.div>
            </div>
            
            <AnimatePresence>
              {isOrdersExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="home-orders-list" style={{ marginTop: '8px' }}>
                    {activeOrders.map(order => (
                      <Link to="/store/orders" key={order._id} style={{ textDecoration: 'none' }}>
                        <div className="home-order-card">
                          <div className="home-order-img-wrapper">
                            <img src={order.product?.image} alt={order.product?.name} />
                            <div className="home-order-qty">x{order.quantity}</div>
                          </div>
                          <div className="home-order-info">
                            <p className="home-order-name">{order.product?.name || 'Sản phẩm'}</p>
                            <div className="home-order-meta">
                              <span className={`home-order-status status-${order.status}`}>
                                {order.status === 'pending' ? 'Đang chờ' : 'Đang thực hiện'}
                              </span>
                              <span className="home-order-price">
                                {order.priceAtPurchase} <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '4px' }}>
                    <Link to="/store/orders" className="home-orders-view-all">
                      Đi đến Quản lý Đơn
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Thông báo Thử thách chờ xác nhận */}
        {pendingQuestsForMe.length > 0 && (
          <motion.div
            className="home-orders-section"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <div 
              className={`home-orders-header ${isQuestsExpanded ? 'expanded' : ''}`}
              onClick={() => setIsQuestsExpanded(!isQuestsExpanded)}
            >
              <div className="home-orders-header-left">
                <div className="home-orders-icon-wrapper" style={{ background: 'linear-gradient(135deg, #fbd3e9, #bb377d)' }}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                  <div className="home-orders-badge">
                    <span className="home-orders-badge-pulse"></span>
                    <span>{pendingQuestsForMe.length}</span>
                  </div>
                </div>
                <div className="home-orders-title">
                  <h3>Thử thách chờ xác nhận</h3>
                  <p>Người ấy đang chờ bạn</p>
                </div>
              </div>
              <motion.div 
                className="home-orders-toggle"
                animate={{ rotate: isQuestsExpanded ? 180 : 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <span className="material-symbols-outlined">expand_more</span>
              </motion.div>
            </div>
            
            <AnimatePresence>
              {isQuestsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="home-orders-list" style={{ marginTop: '8px' }}>
                    {pendingQuestsForMe.map(quest => {
                      const partnerAccepted = quest.acceptedBy?.includes(partnerId);
                      const iAccepted = quest.acceptedBy?.includes(userId);
                      
                      let statusText = '';
                      let badgeClass = '';
                      if (partnerAccepted && !iAccepted) {
                        statusText = 'Chờ bạn nhận';
                        badgeClass = 'status-pending'; // Cam
                      } else {
                        statusText = 'Chờ bạn xác nhận';
                        badgeClass = 'status-confirmed'; // Tím
                      }

                      return (
                        <Link to="/quests" key={quest._id} style={{ textDecoration: 'none' }}>
                          <div className="home-order-card">
                            <div className="home-order-info" style={{ marginLeft: '4px' }}>
                              <p className="home-order-name" style={{ whiteSpace: 'normal', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                                {quest.title}
                              </p>
                              <div className="home-order-meta" style={{ marginTop: '8px' }}>
                                <span className={`home-order-status ${badgeClass}`}>
                                  {statusText}
                                </span>
                                <span className="home-order-price" style={{ color: '#d97706', fontSize: '0.8rem' }}>
                                  +{quest.expReward} EXP
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '4px' }}>
                    <Link to="/quests" className="home-orders-view-all">
                      Đi đến Thử Thách
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Hero Section: Counter */}
        <motion.section variants={itemVariants} className="seamless-section hero-counter" onClick={openDateModal} style={{ cursor: 'pointer' }}>
          <div className="hero-heart-bg opacity-30"></div>
          <span className="counter-subtitle">Chúng ta đã bên nhau</span>

          <div className="counter-main">
            <div className="counter-bg-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
            <div className="counter-numbers">
              <motion.span
                className="counter-days"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
              >
                {days}
              </motion.span>
              <span className="counter-unit">ngày</span>
            </div>
          </div>
          <p className="counter-date-text">
            Kể từ ngày {user?.anniversaryDate ? new Date(user.anniversaryDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </motion.section>

        {/* Dashboard Widgets */}
        <div className="dashboard-widgets">

          {/* Love Tree Status Widget */}
          <Link to="/tree" style={{ textDecoration: 'none' }}>
            <motion.section variants={itemVariants} className={`seamless-section widget-card tree-widget ${treeData?.activeWeather === 'storm' ? 'weather-storm' : treeData?.activeWeather === 'drought' ? 'weather-drought' : ''} ${(treeData?.isWithered || treeData?.hasPest || treeData?.isStreakBroken || treeData?.activeWeather === 'drought' || (treeData?.activeWeather === 'storm' && !treeData?.hasTreeProp)) ? 'tree-danger' : ''}`} whileTap={{ scale: 0.98 }}>
              <div className="tree-widget-fill" style={{ width: `${Math.min(100, ((treeData?.exp || 0) / getExpRequired(treeData?.level || 1)) * 100)}%` }}></div>
              <div className="tree-widget-left">
                <div className="tree-widget-icon">
                  <span className="material-symbols-outlined">
                    {treeData?.activeWeather === 'storm' ? 'storm' : treeData?.activeWeather === 'drought' ? 'local_fire_department' : 'psychiatry'}
                  </span>
                </div>
                <div className="tree-widget-info">
                  <span className="tree-widget-title">{getTreeStageName(treeData?.level || 1)} (Cấp {treeData?.level || 1})</span>
                  <span className="tree-widget-desc" style={{
                    color: (treeData?.isWithered || treeData?.hasPest || treeData?.isStreakBroken || treeData?.activeWeather === 'drought' || (treeData?.activeWeather === 'storm' && !treeData?.hasTreeProp)) ? '#ef4444' : undefined,
                    fontWeight: (treeData?.isWithered || treeData?.hasPest || treeData?.isStreakBroken || treeData?.activeWeather !== 'none') ? '600' : 'normal'
                  }}>
                    {treeData?.isWithered ? 'Cây đang héo! Cần hồi sinh' :
                      treeData?.hasPest ? 'Cây đang bị sâu tấn công!' :
                        treeData?.isStreakBroken ? 'Chuỗi chăm sóc đã gãy!' :
                          (treeData?.activeWeather === 'storm' && !treeData?.hasTreeProp) ? 'Bão lớn! Cây sắp gãy đổ!' :
                            treeData?.activeWeather === 'drought' ? 'Hạn hán! Tưới nước ngay kẻo cháy!' :
                              'Chạm để tưới nước & chăm sóc'}
                  </span>
                </div>
              </div>
              <div className="tree-widget-right">
                <span className="material-symbols-outlined arrow-icon">chevron_right</span>
              </div>
            </motion.section>
          </Link>

          {/* Quests Widget */}
          <Link to="/quests" style={{ textDecoration: 'none' }}>
            <motion.section variants={itemVariants} className="seamless-section widget-card quest-widget-card" whileTap={{ scale: 0.98 }}>
              <div className="quest-widget-fill" style={{ width: `${Math.min(100, (activeQuests.length > 0 ? (activeQuests.filter(q => q.status === 'completed').length / activeQuests.length) * 100 : 0))}%` }}></div>
              <div className="quest-widget-content">
                <div className="quest-widget-left">
                  <div className="quest-widget-icon">
                    <span className="material-symbols-outlined">task_alt</span>
                  </div>
                  <div className="quest-widget-info">
                    <h3 className="quest-widget-title">Thử Thách Tuần</h3>
                    <p className="quest-widget-desc">
                      {activeQuests.length > 0
                        ? `${activeQuests.filter(q => q.status === 'completed').length}/${activeQuests.length} hoàn thành`
                        : 'Chạm để tạo nhiệm vụ mới'}
                    </p>
                  </div>
                </div>
                <div className="quest-widget-right">
                  <span className="material-symbols-outlined arrow-icon">chevron_right</span>
                </div>
              </div>
            </motion.section>
          </Link>

          {/* Heart Earn Widget */}
          <Link to="/heart" style={{ textDecoration: 'none' }}>
            <motion.section variants={itemVariants} className="seamless-section widget-card" whileTap={{ scale: 0.98 }}
              style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(249,168,201,0.18) 0%, rgba(255,255,255,0.85) 100%)', border: '1.5px solid rgba(249,168,201,0.35)' }}
            >
              {/* glow fill */}
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'linear-gradient(90deg, rgba(249,168,201,0.15), transparent)', borderRadius: 'inherit', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(232,67,147,0.25)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'white', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e' }}>Kiếm Heart</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c5a6b' }}>
                    Điểm danh & nhiệm vụ tuần · <strong style={{ color: '#e84393' }}>{user?.heart ?? 0}</strong>
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e87a90' }}>chevron_right</span>
              </div>
            </motion.section>
          </Link>

          {/* Mood Tracker Widget */}
          <Link to="/shared-diary" style={{ textDecoration: 'none' }}>
            <motion.section variants={itemVariants} className="seamless-section widget-card mood-widget" whileTap={{ scale: 0.98 }}>
              <div className="mood-widget-content">
                <div className={`mood-item ${myMood ? myMood : 'none'}`}>
                  <div className="mood-avatar-wrap">
                    <img src={user?.avatar || '/default-avatar.png'} alt="Me" />
                    <div className="mood-emoji-badge">
                      {renderMoodIcon(myMood)}
                    </div>
                  </div>
                  <span className="mood-name">Bạn</span>
                </div>
                
                <div className="mood-center-graphic">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#f43f5e', fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </motion.div>
                  <span className="mood-center-text">Hôm nay</span>
                </div>

                <div className={`mood-item ${partnerMood ? partnerMood : 'none'}`}>
                  <div className="mood-avatar-wrap">
                    <img src={partner?.avatar || '/default-avatar.png'} alt="Partner" />
                    <div className="mood-emoji-badge">
                      {renderMoodIcon(partnerMood)}
                    </div>
                  </div>
                  <span className="mood-name">{partner?.displayName?.trim().split(' ').pop() || 'Người ấy'}</span>
                </div>
              </div>
            </motion.section>
          </Link>

          <motion.section variants={itemVariants} className="seamless-section widget-card events-widget">
            <div className="quote-header-v2" style={{ marginBottom: '12px' }}>
              <span className="material-symbols-outlined">event_upcoming</span>
              <span className="quote-title-v2">Sự kiện sắp tới</span>
            </div>
            <div className="events-list">
              {upcomingEvents.map((ev, index) => (
                <div key={index} className="event-item">
                  <div className="event-icon"><span className="material-symbols-outlined">{ev.icon}</span></div>
                  <div className="event-info">
                    <span className="event-name">{ev.name}</span>
                    <span className="event-date">{ev.date.toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="event-days-left">
                    {ev.daysLeft === 0 ? <span className="today-badge">Hôm nay!</span> : <span>Còn <strong>{ev.daysLeft}</strong> ngày</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Tiện ích tình yêu */}
        <motion.section variants={itemVariants} className="seamless-section features-card" style={{ marginTop: '0', paddingTop: '1rem' }}>
          <div className="quote-header-v2">
            <span className="material-symbols-outlined">apps</span>
            <span className="quote-title-v2">Tiện ích tình yêu</span>
          </div>
          <div className="features-grid-v2">

            {/* Hộp thư tương lai */}
            <Link to="/future-letters" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #ffe4ef, #fce7f3)' }}>
                  <Mail color="#f26989" size={28} strokeWidth={2.5} className="anim-mail" />
                </div>
                <span className="utility-title">Hộp thư</span>
              </motion.div>
            </Link>

            {/* Nhật ký chung */}
            <Link to="/shared-diary" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
                  <BookOpen color="#4caf50" size={28} strokeWidth={2.5} className="anim-book" />
                </div>
                <span className="utility-title">Nhật ký</span>
              </motion.div>
            </Link>

            {/* Bản đồ tình yêu */}
            <Link to="/map" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)' }}>
                  <MapPin color="#ff9800" size={28} strokeWidth={2.5} className="anim-pin" />
                </div>
                <span className="utility-title">Bản đồ</span>
              </motion.div>
            </Link>

            {/* Chăm cây tình yêu */}
            <Link to="/tree" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #e1f5fe, #b3e5fc)' }}>
                  <Trees color="#03a9f4" size={28} strokeWidth={2.5} className="anim-tree" />
                </div>
                <span className="utility-title">Chăm cây</span>
              </motion.div>
            </Link>

            {/* Vườn thú */}
            <Link to="/pet-sanctuary" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #f3e5f5, #e1bee7)' }}>
                  <PawPrint color="#9c27b0" size={28} strokeWidth={2.5} className="anim-pet" />
                </div>
                <span className="utility-title">Vườn thú</span>
              </motion.div>
            </Link>

            {/* Thử thách tuần */}
            <Link to="/quests" style={{ textDecoration: 'none' }}>
              <motion.div className="utility-card" whileTap={{ scale: 0.95 }}>
                <div className="utility-icon-wrapper" style={{ background: 'linear-gradient(135deg, #fbe9e7, #ffccbc)' }}>
                  <Target color="#ff5722" size={28} strokeWidth={2.5} className="anim-target" />
                </div>
                <span className="utility-title">Thử thách</span>
              </motion.div>
            </Link>

          </div>
        </motion.section>

        {/* Love Stones Widget */}
        {treeData?.loveStones > 0 && (
          <motion.section
            variants={itemVariants}
            className="seamless-section love-stone-card"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <div
              className="love-stone-content"
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #fdf2f8, #fbcfe8)',
                borderRadius: '24px',
                border: '2px solid #f9a8d4',
                boxShadow: '0 8px 24px rgba(236, 72, 153, 0.25)'
              }}
            >
              {/* Dynamic shining background */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                  zIndex: 0
                }}
                animate={{ x: ['-200%', '200%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              />

              {/* Fire Background Effect */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={`fire-${i}`}
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: `${Math.random() * 100}%`,
                    width: `${15 + Math.random() * 25}px`,
                    height: `${20 + Math.random() * 40}px`,
                    background: `radial-gradient(ellipse, ${['#f43f5e', '#fbbf24', '#f9a8d4', '#ec4899'][Math.floor(Math.random() * 4)]} 0%, transparent 70%)`,
                    borderRadius: '50%',
                    filter: 'blur(4px)',
                    zIndex: 0,
                    mixBlendMode: 'overlay'
                  }}
                  animate={{
                    y: [0, -60 - Math.random() * 50],
                    x: [0, (Math.random() - 0.5) * 40],
                    scale: [1, 0.8, 0],
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 2,
                    repeat: Infinity,
                    ease: 'easeIn',
                    delay: Math.random() * 2
                  }}
                />
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1, position: 'relative' }}>
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {/* Pulsing Aura */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{ position: 'absolute', inset: '-10px', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}
                  />
                  {/* Floating Stone */}
                  <motion.img
                    src="/tree/love-stone.png"
                    alt="Love Stone"
                    animate={{ y: [-4, 4, -4], rotate: [-3, 3, -3] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(219,39,119,0.5))', zIndex: 1 }}
                  />
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.75rem', color: '#db2777', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Tủ Kính Tình Yêu</div>
                  <div style={{ fontSize: '1.2rem', color: '#be185d', fontWeight: '900', textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
                    {treeData.loveStones} Love Stone
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: ['0 4px 12px rgba(236, 72, 153, 0.4)', '0 4px 24px rgba(236, 72, 153, 0.9)', '0 4px 12px rgba(236, 72, 153, 0.4)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={handleUseStone}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  background: 'linear-gradient(135deg, #f43f5e, #db2777)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  fontWeight: '900',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                Dùng Ngay
              </motion.button>
            </div>
          </motion.section>
        )}

        {/* Couple Status Card */}
        {partner && (
          <motion.section variants={itemVariants} className="seamless-section couple-status-card">
            <div className="couple-avatars-overlap">
              <div className="overlap-avatar self-avatar z-10">
                <Avatar user={user} className="avatar-img" />
              </div>
              <div className="overlap-avatar partner-avatar z-0">
                <Avatar user={partner} className="avatar-img" />
              </div>
            </div>

            <div className="couple-status-info flex-grow">
              <div className="partner-name-row">
                <h2 className="partner-name-v2">{partner?.displayName}</h2>
              </div>
              <div className="partner-offline-row">
                <div className="offline-dot-v2" style={{ backgroundColor: partner?.isAngry ? '#ef4444' : (partner?.isOnline ? '#f26989' : 'rgba(79, 68, 72, 0.5)') }}></div>
                <p className="offline-text" style={{ color: partner?.isAngry ? '#ef4444' : undefined, fontWeight: partner?.isAngry ? 'bold' : 'normal' }}>
                  {partner?.isAngry ? 'Đang dỗi' : (partner?.isOnline ? 'Đang online' : `Hoạt động ${formatLastSeen(partner?.lastSeen)}`)}
                </p>
              </div>
            </div>

            <div className="heart-beat-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
          </motion.section>
        )}

        {/* Daily Message Card */}
        {user?.gender === 'male' ? (
          <motion.section
            variants={itemVariants}
            className="seamless-section quote-card-v2"
            onClick={() => {
              setDailyMessageInput(myMessageValid ? user?.dailyMessage : '');
              setShowDailyMessageModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="blind-bag-cover">
              <div className="blind-bag-icon-wrapper">
                <span className="material-symbols-outlined" style={{ filter: 'none', color: '#f26989' }}>edit_note</span>
              </div>
              <h3 className="blind-bag-title">Gửi lời yêu thương</h3>
              <p className="blind-bag-subtitle">Chạm để viết lời nhắn cho cô ấy hôm nay nhé!</p>
            </div>
          </motion.section>
        ) : (
          <motion.section
            variants={itemVariants}
            className="seamless-section quote-card-v2"
            onClick={() => {
              if (!isQuoteRevealed) {
                setIsQuoteRevealed(true);
                const todayStr = new Date().toDateString();
                const currentKey = `${todayStr}_${partner?.dailyMessageDate || 'none'}`;
                localStorage.setItem('blindBagOpenedKey', currentKey);
              }
            }}
            style={{ cursor: isQuoteRevealed ? 'default' : 'pointer' }}
          >
            <AnimatePresence mode="wait">
              {!isQuoteRevealed ? (
                <motion.div
                  key="blind-bag-cover"
                  className="blind-bag-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="blind-bag-icon-wrapper">
                    <span className="material-symbols-outlined">favorite</span>
                    <span className="material-symbols-outlined gift-icon">featured_seasonal_and_gifts</span>
                  </div>
                  <h3 className="blind-bag-title">Túi mù tình yêu</h3>
                  <p className="blind-bag-subtitle">Chạm để xé túi mù xem lời nhắn hôm nay</p>
                </motion.div>
              ) : (
                <motion.div
                  key="quote-content"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, type: 'spring' }}
                  className="quote-inner-content"
                >
                  <div className="quote-header-v2">
                    <span className="material-symbols-outlined">mark_as_unread</span>
                    <span className="quote-title-v2">Lời yêu thương hôm nay</span>
                  </div>
                  <p className="quote-content-v2">
                    {partnerMessageValid && partner?.dailyMessage ? `"${partner.dailyMessage}"` : "Anh ấy chưa gửi lời nhắn nào hôm nay cả!"}
                  </p>
                  <div className="quote-bg-icon">
                    <span className="material-symbols-outlined">format_quote</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Partner Hobbies Card */}
        {partner && (
          <motion.section variants={itemVariants} className="seamless-section hobbies-card">
            <div className="quote-header-v2" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined">loyalty</span>
                <span className="quote-title-v2">Sở thích của {partner?.displayName}</span>
              </div>
              <button
                className="add-hobby-btn"
                onClick={() => {
                  setHobbyInput('');
                  setHobbyCategory('food');
                  setEditingHobbyIndex(null);
                  setShowHobbyModal(true);
                }}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>

            <div className="hobbies-container">
              {user?.partnerHobbies && user.partnerHobbies.length > 0 ? (
                <div className="hobbies-list">
                  {user.partnerHobbies.map((hobby, index) => {
                    const isString = typeof hobby === 'string';
                    const catId = isString ? 'other' : (hobby.category || 'other');
                    const text = isString ? hobby : hobby.text;
                    const catObj = HOBBY_CATEGORIES.find(c => c.id === catId) || HOBBY_CATEGORIES[5];

                    return (
                      <div
                        key={index}
                        className="hobby-chip"
                        onClick={() => {
                          setHobbyInput(text);
                          setHobbyCategory(catId);
                          setEditingHobbyIndex(index);
                          setShowHobbyModal(true);
                        }}
                      >
                        <div className="hobby-chip-icon-wrapper">
                          <span className="material-symbols-outlined">{catObj.icon}</span>
                        </div>
                        <span className="hobby-text">{text}</span>
                        <div className="hobby-actions">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHobby(index);
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-hobbies-text">Chưa có sở thích nào. Hãy thêm để ghi nhớ nhé!</p>
              )}
            </div>
          </motion.section>
        )}

      </motion.main>

      <BottomNav />

      {/* Date Picker Modal */}
      <AnimatePresence>
        {showDateModal && (
          <motion.div
            className="date-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDateModal(false)}
          >
            <motion.div
              className="date-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setShowDateModal(false)}
              >
                <X size={20} />
              </button>

              <div className="date-modal-header">
                <div className="modal-icon-wrapper">
                  <CalendarIcon size={24} className="modal-icon" />
                </div>
                <h3>Ngày Bắt Đầu</h3>
                <p>Chọn ngày đánh dấu tình yêu của hai bạn</p>
              </div>

              <div className="modal-body">
                <input
                  type="date"
                  className="date-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleUpdateAnniversary}
                  disabled={isUpdatingDate || !newDate}
                >
                  {isUpdatingDate ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hobby Modal */}
      <AnimatePresence>
        {showHobbyModal && (
          <motion.div
            className="date-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHobbyModal(false)}
          >
            <motion.div
              className="date-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setShowHobbyModal(false)}
              >
                <X size={20} />
              </button>

              <div className="date-modal-header">
                <div className="modal-icon-wrapper">
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#f26989' }}>loyalty</span>
                </div>
                <h3>{editingHobbyIndex !== null ? 'Sửa Sở Thích' : 'Thêm Sở Thích'}</h3>
                <p>Ghi nhớ những gì {partner?.displayName} yêu thích</p>
              </div>

              <div className="modal-body">
                <div className="category-selector">
                  {HOBBY_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`category-chip ${hobbyCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setHobbyCategory(cat.id)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Trà sữa ít ngọt, Hoa hồng..."
                  value={hobbyInput}
                  onChange={(e) => setHobbyInput(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleSaveHobby}
                  disabled={isUpdatingHobby || !hobbyInput.trim()}
                >
                  {isUpdatingHobby ? 'Đang lưu...' : 'Lưu Sở Thích'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Message Modal (Male Only) */}
      <AnimatePresence>
        {showDailyMessageModal && (
          <motion.div
            className="date-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDailyMessageModal(false)}
          >
            <motion.div
              className="date-modal-content"
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setShowDailyMessageModal(false)}
              >
                <X size={20} />
              </button>

              <div className="date-modal-header">
                <div className="modal-icon-wrapper">
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#f26989' }}>edit_note</span>
                </div>
                <h3>Lời Yêu Thương</h3>
                <p>Viết lời nhắn gửi đến {partner?.displayName || 'cô ấy'}</p>
              </div>

              <div className="modal-body">
                <textarea
                  className="input"
                  rows="4"
                  placeholder="Nhập lời nhắn của bạn..."
                  value={dailyMessageInput}
                  onChange={(e) => setDailyMessageInput(e.target.value)}
                  style={{ resize: 'none', padding: '12px', minHeight: '100px' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleSaveDailyMessage}
                  disabled={isUpdatingDailyMessage || !dailyMessageInput.trim()}
                >
                  {isUpdatingDailyMessage ? 'Đang gửi...' : 'Gửi Lời Nhắn'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Love Stone Popup */}
      <AnimatePresence>
        {showLoveStonePopup && (
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pháo hoa giả lập */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ['#fbbf24', '#f43f5e', '#3b82f6', '#10b981', '#a855f7'][Math.floor(Math.random() * 5)],
                  top: '50%',
                  left: '50%'
                }}
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * window.innerWidth,
                  y: (Math.random() - 0.5) * window.innerHeight,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
              />
            ))}

            <motion.div
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
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
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
                fontSize: '2rem',
                marginBottom: '16px',
                fontWeight: '900',
                letterSpacing: '-0.5px'
              }}>
                Chúc Mừng!
              </h2>
              <p style={{ color: '#4c1d95', fontSize: '1.15rem', marginBottom: '16px', lineHeight: 1.6, fontWeight: '500' }}>
                Hai bạn đã đổi <br />
                <span style={{ display: 'inline-block', background: '#fce7f3', color: '#db2777', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', margin: '8px 0', border: '1px solid #fbcfe8' }}>
                  1 Love Stone
                </span>
                <br />
                để thưởng cho mình một buổi hẹn hò thật lãng mạn!
                <br /><br />
                <span style={{ fontSize: '0.95rem', opacity: 0.8 }}>Đừng quên chụp lại những khoảnh khắc đẹp nhé! 🍷🥩</span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood Reminder Modal */}
      <DailyMoodReminderModal
        isOpen={showMoodReminder}
        onSkip={handleSkipMoodReminder}
        onRemindLater={handleRemindLaterMood}
        onClose={() => setShowMoodReminder(false)}
      />
    </div>
  );
};

export default HomePage;
