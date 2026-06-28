import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Home, Store, MessageCircle, Gamepad2, X, Map, Heart, Ticket, MoonStar } from 'lucide-react';
import { telepathyService } from '../services/telepathyService';
import { luckyWheelService } from '../services/luckyWheelService';
import { useAuth } from '../hooks/useAuth';
import TelepathyModal from './TelepathyModal';
import LuckyWheelModal from './LuckyWheelModal';
import NumerologyModal from './NumerologyModal';
import './AssistiveTouch.css';

const AssistiveTouch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnanswered, setHasUnanswered] = useState(false);
  const [isTelepathyModalOpen, setIsTelepathyModalOpen] = useState(false);
  const [hasWheelSpin, setHasWheelSpin] = useState(false);
  const [isLuckyWheelModalOpen, setIsLuckyWheelModalOpen] = useState(false);
  const [isNumerologyModalOpen, setIsNumerologyModalOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const constraintsRef = useRef(null);
  const idleTimerRef = useRef(null);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 10000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    checkDailyStatus();
    const interval = setInterval(checkDailyStatus, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const checkDailyStatus = async () => {
    try {
      // Check Telepathy
      const res = await telepathyService.getTodayQuiz();
      if (res.success && res.data) {
        const myId = user?._id || user?.id;
        if (!res.data.answers || !res.data.answers[myId]) {
          setHasUnanswered(true);
        } else {
          setHasUnanswered(false);
        }
      }
      
      // Check Lucky Wheel
      const wheelRes = await luckyWheelService.getStatus();
      if (wheelRes.success && wheelRes.data) {
        setHasWheelSpin(wheelRes.data.hasSpin);
      }
    } catch (err) {
      console.log('Không lấy được trạng thái hằng ngày:', err);
    }
  };

  if (!user) return null;

  const handleMenuClick = (action) => {
    setIsOpen(false);
    setTimeout(() => {
      action();
    }, 300);
  };

  const menuItems = [
    { id: 'home', icon: <Home size={28} />, label: 'Trang chủ', action: () => navigate('/') },
    { id: 'telepathy', icon: <BrainCircuit size={28} />, label: 'Thần giao', action: () => setIsTelepathyModalOpen(true), hasBadge: hasUnanswered },
    { id: 'wheel', icon: <Ticket size={28} />, label: 'Vòng quay', action: () => setIsLuckyWheelModalOpen(true), hasBadge: hasWheelSpin },
    { id: 'numerology', icon: <MoonStar size={28} />, label: 'Thần số học', action: () => setIsNumerologyModalOpen(true) },
    { id: 'store', icon: <Store size={28} />, label: 'Cửa hàng', action: () => navigate('/store') },
    { id: 'games', icon: <Gamepad2 size={28} />, label: 'Giải trí', action: () => navigate('/games') },
  ];

  return (
    <>
      <div className="assistive-touch-container" ref={constraintsRef}>
        <motion.div
          className={`assistive-btn ${isOpen ? 'hidden' : ''}`}
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => {
            setIsIdle(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          }}
          onDragEnd={resetIdleTimer}
          whileTap={{ scale: 0.9 }}
          onClick={() => { resetIdleTimer(); setIsOpen(true); }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: isIdle ? 0.3 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="assistive-btn-inner">
            <Heart size={24} className="assistive-core-icon" fill="url(#assistiveGrad)" stroke="none" />
            <svg width="0" height="0">
              <linearGradient id="assistiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </svg>
          </div>
          {(hasUnanswered || hasWheelSpin) && <div className="assistive-badge-dot pulse"></div>}
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="assistive-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              className="assistive-menu-box"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="assistive-grid">
                {menuItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="assistive-menu-item"
                    onClick={() => handleMenuClick(item.action)}
                  >
                    <div className="assistive-icon-wrapper">
                      {item.icon}
                      {item.hasBadge && <div className="assistive-badge-dot pulse"></div>}
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TelepathyModal 
        isOpen={isTelepathyModalOpen} 
        onClose={() => {
          setIsTelepathyModalOpen(false);
          checkDailyStatus();
        }} 
        onReward={(hearts) => {
          if (user) {
            updateUser({ heart: (user.heart || 0) + hearts });
          }
        }}
      />

      <LuckyWheelModal 
        isOpen={isLuckyWheelModalOpen}
        onClose={() => {
          setIsLuckyWheelModalOpen(false);
          checkDailyStatus();
        }}
      />

      <NumerologyModal 
        isOpen={isNumerologyModalOpen}
        onClose={() => setIsNumerologyModalOpen(false)}
      />
    </>
  );
};

export default AssistiveTouch;
