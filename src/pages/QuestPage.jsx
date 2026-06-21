import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Circle, AlertCircle, RefreshCw, Star, History, X, Clock, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { questService } from '../services/questService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import './QuestPage.css';
import confetti from 'canvas-confetti';

const QuestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Lịch sử
  const [showHistory, setShowHistory] = useState(false);
  const [historyQuests, setHistoryQuests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const res = await questService.getActiveQuests();
      if (res.success) {
        setQuests(res.data || []);
        if (res.refreshCount !== undefined) {
          setRefreshCount(res.refreshCount);
        }
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistory(true);
    if (historyQuests.length === 0) {
      try {
        setLoadingHistory(true);
        const res = await questService.getQuestHistory();
        if (res.success) {
          setHistoryQuests(res.data || []);
        }
      } catch (err) {
        showToast('Lỗi khi tải lịch sử', 'error');
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleGenerateQuests = async (force = false) => {
    try {
      setGenerating(true);
      setError(null);
      const res = await questService.generateQuests(force);
      if (res.success) {
        setQuests(res.data);
        if (res.refreshCount !== undefined) {
          setRefreshCount(res.refreshCount);
        }
        showToast('Đã nhận thử thách mới tuần này!', 'success');
      } else {
        showToast(res.message || 'Có lỗi xảy ra', 'error');
        setError(res.message);
      }
    } catch (err) {
      console.error('Error from generateQuests:', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi khi gọi AI';
      showToast(msg, 'error');
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (questId) => {
    try {
      const res = await questService.acceptQuest(questId);
      if (res.success) {
        setQuests(prev => prev.map(q => q._id === questId ? res.data : q));
        if (res.isNowAcceptedByMe) {
          showToast('Đã nhận thử thách! Cùng cố gắng nhé.', 'success');
        } else {
          showToast('Đã hủy nhận thử thách.', 'info');
        }
      } else {
        showToast(res.message || 'Lỗi khi nhận thử thách', 'error');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi không xác định');
      showToast(err.response?.data?.message || 'Lỗi khi nhận nhiệm vụ', 'error');
    }
  };

  const handleComplete = async (questId) => {
    try {
      const res = await questService.completeQuest(questId);
      if (res.success) {
        // Cập nhật lại list
        setQuests(prev => prev.map(q => q._id === questId ? res.data : q));

        if (res.bothCompleted) {
          showToast('Nhiệm vụ hoàn thành! Đã cộng phần thưởng.', 'success');
          triggerConfetti();
        } else if (res.isNowCompletedByMe) {
          showToast('Đã xác nhận! Đang chờ người ấy...', 'success');
        } else {
          showToast('Đã hủy xác nhận nhiệm vụ.', 'info');
        }
      } else {
        showToast(res.message || 'Lỗi xác nhận', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi xác nhận nhiệm vụ', 'error');
    }
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f26989', '#ffb74d', '#4fc3f7']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f26989', '#ffb74d', '#4fc3f7']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const renderHeader = () => (
    <Header 
      title="Thử Thách Cặp Đôi" 
      showBack={true} 
      rightContent={
        <button 
          className="history-btn"
          onClick={handleOpenHistory}
          title="Lịch sử thử thách"
        >
          <History size={20} />
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="quest-page">
        {renderHeader()}
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={32} color="#f26989" />
          <p>Đang tải thử thách...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-page">
      {renderHeader()}

      <main className="quest-content">
        <div className="quest-hero">
          <div className="quest-hero-icon">
            <Star size={40} color="#ffb74d" fill="#ffe082" />
          </div>
          <p className="quest-hero-desc">
            Hoàn thành các thử thách hàng tuần được thiết kế riêng cho hai bạn để nhận EXP nuôi Cây tình yêu nhé!
          </p>
        </div>

        {quests.length === 0 ? (
          <div className="empty-quests">
            <div className="empty-icon-wrapper">
              <AlertCircle size={48} color="#f26989" />
            </div>
            <h3>Tuần này chưa có thử thách nào</h3>
            <p>Hãy để AI tạo ngay 5 thử thách mới dựa trên sở thích của hai bạn!</p>
            {error && <p className="error-text">{error}</p>}
            <button
              className={`generate-btn ${generating ? 'loading' : ''}`}
              onClick={() => handleGenerateQuests(false)}
              disabled={generating}
            >
              {generating ? (
                <><RefreshCw size={20} className="animate-spin" /> Đang tạo...</>
              ) : (
                'Tạo Thử Thách Ngay'
              )}
            </button>
          </div>
        ) : (
          <div className="quests-list">
            <AnimatePresence>
              {quests.map((quest, index) => {
                const userId = user?._id || user?.id;
                const isCompletedByMe = quest.completedBy.includes(userId);
                const progressCount = quest.completedBy.length;
                const isFullyCompleted = quest.status === 'completed';

                return (
                  <motion.div
                    key={quest._id}
                    className={`quest-card ${isFullyCompleted ? 'completed' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="quest-card-header">
                      <h3>{quest.title}</h3>
                      <div className="quest-reward">
                        <span className="exp-reward">+{quest.expReward} EXP</span>
                      </div>
                    </div>
                    <p className="quest-desc">{quest.description}</p>

                    <div className="quest-progress-section">
                      <div className="progress-dots">
                        <div className={`progress-dot ${progressCount >= 1 ? 'active' : ''}`}></div>
                        <div className={`progress-dot ${progressCount >= 2 ? 'active' : ''}`}></div>
                      </div>
                      <span className="progress-text">
                        {isFullyCompleted ? 'Đã hoàn thành!' : `Tiến độ: ${progressCount}/2`}
                      </span>
                    </div>

                    {isFullyCompleted ? null : (
                      quest.acceptedBy && quest.acceptedBy.length >= 2 ? (
                        <button
                          className={`complete-btn ${isCompletedByMe ? 'done' : ''}`}
                          onClick={() => handleComplete(quest._id)}
                          disabled={isFullyCompleted}
                        >
                          {isCompletedByMe ? (
                            <><CheckCircle2 size={20} /> {isFullyCompleted ? 'Hoàn tất' : 'Đã xác nhận (Bấm để hủy)'}</>
                          ) : (
                            <><Circle size={20} /> Xác nhận đã làm</>
                          )}
                        </button>
                      ) : (
                        (() => {
                          const hasPartnerAccepted = quest.acceptedBy && quest.acceptedBy.length === 1 && !quest.acceptedBy.includes(userId);
                          const amIAccepted = quest.acceptedBy && quest.acceptedBy.includes(userId);
                          return (
                            <button
                              className={`complete-btn ${amIAccepted ? 'done' : 'accept-mode'} ${hasPartnerAccepted ? 'partner-waiting' : ''}`}
                              onClick={() => handleAccept(quest._id)}
                              style={
                                amIAccepted 
                                  ? {} 
                                  : hasPartnerAccepted 
                                    ? { background: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)', animation: 'pulse 2s infinite' } 
                                    : { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
                              }
                            >
                              {amIAccepted ? (
                                <><Clock size={20} /> Đã nhận (Chờ người ấy...)</>
                              ) : hasPartnerAccepted ? (
                                <><Heart size={20} className="animate-bounce" /> Người ấy đang chờ! Nhận ngay</>
                              ) : (
                                <><Star size={20} /> Nhận thử thách ngay</>
                              )}
                            </button>
                          );
                        })()
                      )
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className="refresh-section">
              <p>Thử thách mới sẽ tự động có vào đầu tuần tới.</p>
              <button 
                className={`refresh-btn ${generating ? 'loading' : ''} ${refreshCount >= 3 ? 'disabled' : ''}`}
                onClick={() => handleGenerateQuests(true)}
                disabled={generating || refreshCount >= 3}
              >
                <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Đang làm mới...' : (refreshCount >= 3 ? 'Hết lượt làm mới' : 'Làm mới thử thách tuần này')}
              </button>
              <p className="refresh-limit">Lượt làm mới còn lại: {Math.max(0, 3 - refreshCount)}/3</p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            className="history-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
          >
            <motion.div 
              className="history-modal-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="history-modal-header">
                <h3>Lịch Sử Thử Thách</h3>
                <button onClick={() => setShowHistory(false)} className="close-btn">
                  <X size={24} />
                </button>
              </div>

              <div className="history-list">
                {loadingHistory ? (
                  <div className="loading-state">
                    <RefreshCw className="animate-spin" size={24} color="#f26989" />
                    <p>Đang tải...</p>
                  </div>
                ) : historyQuests.length === 0 ? (
                  <div className="empty-history">
                    <History size={40} color="#e0e0e0" />
                    <p>Chưa có thử thách nào được hoàn thành.</p>
                  </div>
                ) : (
                  historyQuests.map((quest) => (
                    <div key={quest._id} className="history-item">
                      <div className="history-item-icon">
                        <CheckCircle2 size={24} color="#81c784" />
                      </div>
                      <div className="history-item-info">
                        <h4>{quest.title}</h4>
                        <span className="history-date">
                          Hoàn thành: {new Date(quest.completedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="history-item-reward">
                        +{quest.expReward} EXP
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestPage;
