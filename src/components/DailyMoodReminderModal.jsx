import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './DailyMoodReminderModal.css';

const DailyMoodReminderModal = ({ isOpen, onSkip, onRemindLater, onClose }) => {
  const navigate = useNavigate();

  const handleUpdateNow = () => {
    onClose();
    navigate('/shared-diary');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="daily-mood-reminder-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="daily-mood-reminder-modal"
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
          >
            <div className="daily-mood-icon-wrapper">
              <div className="daily-mood-icon-glow"></div>
              <motion.div 
                className="daily-mood-icon"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 0.5 }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </motion.div>
            </div>
            
            <h3>Cảm xúc của bạn<br/>thế nào rồi?</h3>
            <p>Người ấy đang rất muốn biết bạn đã trải qua một ngày như thế nào đấy!</p>

            <div className="daily-mood-actions">
              <motion.button 
                className="daily-mood-btn-primary" 
                onClick={handleUpdateNow}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_note</span>
                Cập nhật ngay
              </motion.button>
              
              <motion.button 
                className="daily-mood-btn-secondary" 
                onClick={onRemindLater}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
                Nhắc mình sau nhé
              </motion.button>
              
              <button className="daily-mood-btn-text" onClick={onSkip}>
                Hôm nay mình không muốn cập nhật
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DailyMoodReminderModal;
