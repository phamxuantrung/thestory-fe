import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookHeart, Plus, X, Calendar as CalendarIcon, Mail, BookOpen, MapPin, Trees } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { authService } from '../services/authService';
import { showToast } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { getUpcomingEvents } from '../utils/dateHelpers';
import { treeService } from '../services/treeService';
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
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa mới';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
};

const HomePage = () => {
  const { user, partner, updateUser } = useAuth();
  const socket = useSocket();
  const [days, setDays] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tree state
  const [treeData, setTreeData] = useState(null);
  const [expRequired, setExpRequired] = useState(100);

  // Blind bag state
  const [isQuoteRevealed, setIsQuoteRevealed] = useState(false);

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

  useEffect(() => {
    if (user?.anniversaryDate) {
      setDays(getDaysSince(user.anniversaryDate));
    }
  }, [user]);

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const res = await treeService.getTree();
        if (res.success) {
          setTreeData(res.data);
          setExpRequired(res.expRequired);
        }
      } catch (error) {
        console.error('Failed to fetch tree data', error);
      }
    };
    fetchTreeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const upcomingEvents = getUpcomingEvents(user, partner);

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

  return (
    <div className="home-page-v2">
      <Header title="Trang chủ" showBack={true} />

      <motion.main
        className="home-main-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
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
              <div className="tree-widget-fill" style={{ width: `${Math.min(100, ((treeData?.exp || 0) / expRequired) * 100)}%` }}></div>
              <div className="tree-widget-left">
                <div className="tree-widget-icon">
                  <span className="material-symbols-outlined">
                    {treeData?.activeWeather === 'storm' ? 'storm' : treeData?.activeWeather === 'drought' ? 'local_fire_department' : 'psychiatry'}
                  </span>
                </div>
                <div className="tree-widget-info">
                  <span className="tree-widget-title">Cây Tình Yêu (Cấp {treeData?.level || 1})</span>
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
          {/* Upcoming Events Widget */}
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

          </div>
        </motion.section>

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
                <div className="offline-dot-v2" style={{ backgroundColor: partner?.isOnline ? '#f26989' : 'rgba(79, 68, 72, 0.5)' }}></div>
                <p className="offline-text">{partner?.isOnline ? 'Đang online' : `Hoạt động ${formatLastSeen(partner?.lastSeen)}`}</p>
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
    </div>
  );
};

export default HomePage;
