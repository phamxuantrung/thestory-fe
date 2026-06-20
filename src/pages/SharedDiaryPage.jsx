import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { moodService } from '../services/moodService';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import './SharedDiaryPage.css';

const MOODS = [
  { id: 'very_happy', emojiUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Hearts.png', label: 'Rất hạnh phúc' },
  { id: 'happy', emojiUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Smiling%20Eyes.png', label: 'Vui vẻ' },
  { id: 'sad', emojiUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pensive%20Face.png', label: 'Buồn bã' },
  { id: 'angry', emojiUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Steam%20From%20Nose.png', label: 'Bực bội' },
];

const SharedDiaryPage = () => {
  const { user, partner } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [rawMoods, setRawMoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [selectedMood, setSelectedMood] = useState('happy');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [currentDate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await moodService.getStats(month, year);
      if (res.success) {
        setStats(res.data.stats);
        setRawMoods(res.data.raw);
      }
    } catch (error) {
      showToast('Lỗi tải nhật ký', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSubmitMood = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await moodService.logMood({ mood: selectedMood, note });
      if (res.success) {
        showToast('Đã lưu tâm trạng hôm nay!', 'success');
        fetchStats();
      }
    } catch (error) {
      showToast('Lỗi khi lưu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user already logged today
  const todayStr = new Date().toDateString();
  const myMoodToday = rawMoods.find(m => m.user._id === user._id && new Date(m.date).toDateString() === todayStr);

  return (
    <div className="shared-diary-page">
      <Header title="Nhật ký chung" showBack={true} />

      <main className="diary-main">
        {/* Form ghi nhận tâm trạng hôm nay */}
        <motion.section 
          className="today-mood-section glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="section-header">
            <h3>Hôm nay bạn thấy thế nào?</h3>
            <span className="date-text">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>

          <form onSubmit={handleSubmitMood} className="mood-form">
            <div className="mood-selector">
              {MOODS.map(m => (
                <button
                  type="button"
                  key={m.id}
                  className={`mood-btn ${selectedMood === m.id ? 'active' : ''}`}
                  onClick={() => setSelectedMood(m.id)}
                >
                  <img src={m.emojiUrl} alt={m.label} className={`emoji mood-${m.id}`} />
                  <span className="label">{m.label}</span>
                </button>
              ))}
            </div>


            <button type="submit" className="submit-btn w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : (myMoodToday ? 'Cập nhật' : 'Lưu tâm trạng')}
            </button>
          </form>
        </motion.section>

        {/* Thống kê tháng */}
        <motion.section 
          className="stats-section glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="month-selector">
            <button onClick={handlePrevMonth}><ChevronLeft /></button>
            <h3>Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}</h3>
            <button onClick={handleNextMonth}><ChevronRight /></button>
          </div>

          {isLoading ? (
            <p className="text-center py-4">Đang tải...</p>
          ) : stats ? (
            <div className="stats-container">
              {Object.keys(stats).map(uid => {
                const userStat = stats[uid];
                const isMe = uid === user._id;
                const name = isMe ? 'Bạn' : (userStat.displayName || partner?.displayName || 'Người ấy');
                
                return (
                  <div key={uid} className="user-stat-card">
                    <h4 className="user-name">{name}</h4>
                    <div className="stat-grid">
                      {MOODS.map(m => (
                        <div key={m.id} className="stat-item">
                          <img src={m.emojiUrl} alt={m.label} className="stat-emoji" />
                          <span className="stat-count">{userStat[m.id]} ngày</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </motion.section>
      </main>
    </div>
  );
};

export default SharedDiaryPage;
