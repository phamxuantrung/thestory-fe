import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { telepathyService } from '../services/telepathyService';
import { useAuth } from '../hooks/useAuth';
import confetti from 'canvas-confetti';
import './TelepathyModal.css';

const TelepathyModal = ({ isOpen, onClose, onReward }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      fetchQuiz();
    }
  }, [isOpen]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await telepathyService.getTodayQuiz();
      if (res.success) {
        setQuiz(res.data);
        
        // Cập nhật trạng thái nếu đã trả lời từ trước và có data mới
        const myId = user?._id || user?.id;
        const myChoice = res.data.answers?.[myId];
        const partnerChoice = Object.keys(res.data.answers || {}).find(k => k !== myId) ? res.data.answers[Object.keys(res.data.answers || {}).find(k => k !== myId)] : null;
        
        if (myChoice && partnerChoice) {
          if (myChoice === partnerChoice) {
            setResult({ bothAnswered: true, isMatched: true });
            if (!res.data.rewarded) {
              triggerConfetti();
              if (onReward) onReward(20);
            }
          } else {
            setResult({ bothAnswered: true, isMatched: false });
          }
        } else if (myChoice) {
          setResult({ bothAnswered: false, isMatched: false });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleSelect = async (choice) => {
    const myId = user?._id || user?.id;
    console.log("Selecting:", choice, "myId:", myId, "quiz:", quiz);
    if (answering || (quiz && quiz.answers && quiz.answers[myId])) {
      console.log("Returned early. answering:", answering, "alreadyAnswered:", (quiz && quiz.answers && quiz.answers[myId]));
      return;
    }
    
    try {
      setAnswering(true);
      // Giả lập trạng thái chọn tạm thời cho UI nhanh nhẹn
      setQuiz(prev => ({
        ...prev,
        answers: {
          ...prev.answers,
          [myId]: choice
        }
      }));

      const res = await telepathyService.answerQuiz(choice);
      if (res.success) {
        setQuiz(res.data);
        setResult(res.result);
        
        if (res.result.bothAnswered && res.result.isMatched) {
          triggerConfetti();
          if (res.result.rewarded && onReward) {
            onReward(20);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnswering(false);
    }
  };

  if (!isOpen) return null;

  const myId = user?._id || user?.id;
  const myChoice = quiz?.answers?.[myId];
  const isBothAnswered = result?.bothAnswered;

  return (
    <AnimatePresence>
      <motion.div 
        className="telepathy-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="telepathy-modal"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <button className="telepathy-close-btn" onClick={onClose}>
            <X size={24} />
          </button>

          <div className="telepathy-header">
            <div className="telepathy-icon-wrapper">
              <Heart size={32} className="heart-icon" />
            </div>
            <h2>Thần giao cách cảm</h2>
            <p>Hôm nay hai bạn có chung suy nghĩ không?</p>
          </div>

          <div className="telepathy-content">
            {loading ? (
              <div className="telepathy-loading">
                <Loader2 className="animate-spin" size={40} color="#db2777" />
                <p>Đang kết nối tâm linh...</p>
              </div>
            ) : (
              <div className="telepathy-cards-container">
                <div 
                  className={`telepathy-card card-a ${myChoice === 'A' ? 'selected' : ''} ${myChoice && myChoice !== 'A' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('A')}
                >
                  <div className="card-bg"></div>
                  <span className="card-letter">A</span>
                  <h3>{quiz?.optionA}</h3>
                  {myChoice === 'A' && <CheckCircle2 className="selected-icon" size={28} />}
                </div>

                <div className="telepathy-vs">VS</div>

                <div 
                  className={`telepathy-card card-b ${myChoice === 'B' ? 'selected' : ''} ${myChoice && myChoice !== 'B' ? 'dimmed' : ''}`}
                  onClick={() => handleSelect('B')}
                >
                  <div className="card-bg"></div>
                  <span className="card-letter">B</span>
                  <h3>{quiz?.optionB}</h3>
                  {myChoice === 'B' && <CheckCircle2 className="selected-icon" size={28} />}
                </div>
              </div>
            )}
          </div>

          {!loading && myChoice && (
            <div className="telepathy-status">
              {isBothAnswered ? (
                result?.isMatched ? (
                  <motion.div 
                    className="telepathy-result matched"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <h3>Tuyệt vờiiii!</h3>
                    <p>Hai bạn đã có cùng suy nghĩ!</p>
                    <div className="reward-pill">
                      <span>+20</span> <Heart size={16} fill="#ef4444" color="#ef4444" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="telepathy-result unmatched"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    <h3>Trái dấu hút nhau! 🧲</h3>
                    <p>Dù khác biệt nhưng vẫn yêu nhau nhé!</p>
                  </motion.div>
                )
              ) : (
                <div className="telepathy-waiting">
                  <div className="pulse-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <p>Đang đợi người ấy chọn...</p>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TelepathyModal;
