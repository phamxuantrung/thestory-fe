import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Unlock, Send, Calendar, Clock, ArrowLeft, Info, Edit3, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { futureLetterService } from '../services/futureLetterService';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import './FutureLetterPage.css';

const FutureLetterPage = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuth();
  const [letters, setLetters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  
  // Form state
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const res = await futureLetterService.getLetters();
      if (res.success) {
        setLetters(res.data);
      }
    } catch (error) {
      showToast('Lỗi khi tải thư', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLetter = async (e) => {
    e.preventDefault();
    if (!content.trim() || !unlockDate) {
      showToast('Vui lòng nhập đủ thông tin', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (editingLetterId) {
        res = await futureLetterService.updateLetter(editingLetterId, { content, unlockDate });
      } else {
        res = await futureLetterService.createLetter({ content, unlockDate });
      }

      if (res.success) {
        showToast(editingLetterId ? 'Đã cập nhật thư!' : 'Đã gửi thư đến tương lai! 💌', 'success');
        resetForm();
        fetchLetters();
      } else {
        showToast(res.message, 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Gửi thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLetter = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bức thư này không?')) return;
    
    try {
      const res = await futureLetterService.deleteLetter(editingLetterId);
      if (res.success) {
        showToast('Đã xóa thư', 'success');
        resetForm();
        fetchLetters();
      } else {
        showToast(res.message, 'error');
      }
    } catch (error) {
      showToast('Xóa thất bại', 'error');
    }
  };

  const handleEditLetter = (letter) => {
    setContent(letter.content);
    setUnlockDate(letter.unlockDate.split('T')[0]);
    setEditingLetterId(letter._id);
    setShowCompose(true);
  };

  const resetForm = () => {
    setContent('');
    setUnlockDate('');
    setEditingLetterId(null);
    setShowCompose(false);
  };

  const calculateTimeLeft = (targetDate) => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return 'Có thể mở';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    
    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    return `Còn ${hours} giờ`;
  };

  return (
    <div className="future-letter-page">
      <Header 
        title={showCompose ? "Viết thư" : "Hộp thư tương lai"} 
        showBack={!showCompose} 
        leftContent={
          showCompose ? (
            <button 
              onClick={resetForm}
              style={{
                background: 'rgba(121, 84, 101, 0.1)',
                border: 'none',
                color: '#795465',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <X size={20} />
            </button>
          ) : undefined
        }
        rightContent={
          !showCompose ? (
            <button 
              onClick={() => setShowCompose(true)}
              style={{
                background: 'rgba(217, 76, 115, 0.1)',
                border: 'none',
                color: '#d94c73',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          ) : undefined
        }
      />

      <main className="letter-main">
        {!showCompose ? (
          <>
            {isLoading ? (
              <div className="loading-spinner">Đang tải...</div>
            ) : letters.length === 0 ? (
              <div className="empty-state">
                <Mail size={48} className="empty-icon" />
                <p>Chưa có bức thư nào từ tương lai.</p>
                <p className="sub-text">Hãy là người đầu tiên gửi gắm yêu thương nhé!</p>
              </div>
            ) : (
              <div className="letters-list">
                {letters.map((letter) => {
                  const isSender = letter.sender._id === user?._id;
                  const isLocked = !letter.isUnlocked;

                  return (
                    <motion.div 
                      key={letter._id} 
                      className={`letter-card ${isLocked ? 'locked' : 'unlocked'} ${isSender && isLocked ? 'editable' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => isSender && isLocked ? handleEditLetter(letter) : null}
                      style={{ cursor: isSender && isLocked ? 'pointer' : 'default' }}
                    >
                      <div className="letter-header">
                        <div className="letter-meta">
                          <span className="sender-name">
                            {isSender ? 'Bạn gửi đi' : `Từ ${letter.sender.displayName}`}
                          </span>
                          <span className="create-date">
                            {new Date(letter.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="lock-icon-wrapper">
                          {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                        </div>
                      </div>

                      <div className="letter-body">
                        {isLocked ? (
                          <div className="locked-content">
                            <Clock size={32} className="clock-icon" />
                            <p className="countdown-text">{calculateTimeLeft(letter.unlockDate)}</p>
                            <p className="unlock-date-text">
                              Mở khóa ngày: {new Date(letter.unlockDate).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        ) : (
                          <div className="unlocked-content">
                            <p className="letter-text">{letter.content}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <motion.div 
            className="compose-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="compose-header">
              <div className="header-text">
                <h2>{editingLetterId ? 'Chỉnh sửa thư' : 'Viết thư gửi tương lai'}</h2>
                <p>Gửi đi một chút yêu thương, nhận lại một trời kỷ niệm.</p>
              </div>
            </div>
            
            <form onSubmit={handleSendLetter} className="compose-form">
              <div className="form-group">
                <label>
                  <Calendar size={16} color="#795465" /> Ngày được phép mở thư
                </label>
                <div className="date-input-wrapper">
                  <input 
                    type="date" 
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]} // Min là ngày mai
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label><Edit3 size={16} color="#795465" /> Lời nhắn</label>
                <textarea 
                  placeholder="Gửi gắm những lời yêu thương cho người ấy ở tương lai..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="6"
                  className="pink-textarea"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                {editingLetterId && (
                  <button 
                    type="button" 
                    className="submit-btn" 
                    style={{ 
                      background: '#f9f9f9', 
                      color: '#ff4d4f', 
                      flex: 1,
                      boxShadow: '0 8px 24px rgba(255, 77, 79, 0.15)'
                    }} 
                    onClick={handleDeleteLetter}
                  >
                    Xóa
                  </button>
                )}
                <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ flex: 2 }}>
                  {isSubmitting ? 'Đang lưu...' : (editingLetterId ? 'Cập nhật' : 'Gửi Thư')} <Send size={18} style={{marginLeft: '8px'}} fill="white"/>
                </button>
              </div>
            </form>

            <div className="info-box">
              <Info size={24} className="info-icon" />
              <p>Lá thư này sẽ được mã hóa và cất giữ an toàn. Chúng mình sẽ gửi thông báo cho cả hai vào đúng ngày bạn chọn để cùng nhau mở "hộp quà thời gian" này nhé.</p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default FutureLetterPage;
