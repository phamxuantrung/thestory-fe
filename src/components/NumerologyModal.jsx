import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoonStar, AlertCircle } from 'lucide-react';
import { numerologyService } from '../services/numerologyService';
import './NumerologyModal.css';

const NumerologyModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNumerology();
    }
  }, [isOpen]);

  const fetchNumerology = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await numerologyService.getTodayNumerology();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tính Thần Số Học.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="numerology-overlay" onClick={onClose}>
        <motion.div 
          className="numerology-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="num-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
          
          <div className="num-icon-wrapper">
            <MoonStar size={36} className="num-sparkle-icon" />
          </div>

          <div className="num-header">
            <h2>Năng Lượng Ngày Mới</h2>
            <p>Sự kết hợp Thần số học của hai bạn</p>
          </div>

          <div className="num-content">
            {loading && (
              <div className="num-loading">
                <div className="num-spinner"></div>
                <p>Vũ trụ đang gửi thông điệp...</p>
                <small>AI đang phân tích sự kết hợp ngày sinh của 2 bạn</small>
              </div>
            )}

            {error && (
              <div className="num-error">
                <AlertCircle size={48} color="#ef4444" />
                <p>{error}</p>
                <button className="num-btn-primary" onClick={onClose}>Đã hiểu</button>
              </div>
            )}

            {!loading && !error && data && (
              <motion.div 
                className="num-result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="energy-circle-container">
                  <div className="energy-circle pulse-glow">
                    <span className="energy-number">{data.energyNumber}</span>
                  </div>
                </div>
                
                <h3 className="num-meaning">{data.meaning}</h3>
                
                <div className="num-advice-box">
                  <p>{data.advice}</p>
                </div>

                <div className="num-action-box">
                  <h4>💡 Gợi ý thực hành</h4>
                  <p>{data.actionPrompt}</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NumerologyModal;
