import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Loader2 } from 'lucide-react';
import { luckyWheelService } from '../services/luckyWheelService';
import confetti from 'canvas-confetti';
import './LuckyWheelModal.css';

const PRIZES = [
  { id: 0, label: '100 Heart', color: '#e2b3c2', textColor: '#831843', type: 'heart' },
  { id: 1, label: '10 Heart', color: '#fce7f3', textColor: '#be185d', type: 'heart' },
  { id: 2, label: 'Tiếc quá', color: '#fbcfe8', textColor: '#be185d', type: 'miss' },
  { id: 3, label: '5 Heart', color: '#ffffff', textColor: '#64748b', type: 'heart' },
  { id: 4, label: '20 Heart', color: '#e2b3c2', textColor: '#831843', type: 'heart' },
  { id: 5, label: '10 Heart', color: '#fce7f3', textColor: '#be185d', type: 'heart' },
  { id: 6, label: 'Hụt rồi', color: '#ffffff', textColor: '#64748b', type: 'miss' },
  { id: 7, label: '5 Heart', color: '#fbcfe8', textColor: '#be185d', type: 'heart' },
  { id: 8, label: '10 Heart', color: '#fce7f3', textColor: '#be185d', type: 'heart' },
  { id: 9, label: 'Cố lên', color: '#ffffff', textColor: '#64748b', type: 'miss' },
  { id: 10, label: '10 Heart', color: '#fce7f3', textColor: '#be185d', type: 'heart' },
  { id: 11, label: '20 Heart', color: '#e2b3c2', textColor: '#831843', type: 'heart' },
  { id: 12, label: '10 Heart', color: '#fbcfe8', textColor: '#be185d', type: 'heart' },
];

const LuckyWheelModal = ({ isOpen, onClose }) => {
  const [hasSpin, setHasSpin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  // Fetch status on open
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await luckyWheelService.getStatus();
      if (res.success) {
        setHasSpin(res.data.hasSpin);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (spinning || !hasSpin) return;

    try {
      setSpinning(true);
      const res = await luckyWheelService.spin();
      if (res.success) {
        const prizeIndex = res.data.prizeIndex;

        // Calculate rotation: 
        // We want the chosen segment to stop at the TOP (270 degrees or -90 degrees in CSS math).
        // Segment angle is 360 / 13 = 27.6923 degrees
        // Segment center is prizeIndex * 27.6923 + (27.6923 / 2)
        // We want that center to end up at 270deg relative to container.
        const segmentAngle = 360 / PRIZES.length;
        const targetAngle = prizeIndex * segmentAngle + (segmentAngle / 2);

        // Add random extra spins (e.g. 5-7 full rotations)
        const extraSpins = (Math.floor(Math.random() * 3) + 5) * 360;

        // Calculate final rotation
        // The pointer is at the TOP. Top is 0 degrees in our setup? 
        // Actually, CSS rotate 0 means original. We need to subtract targetAngle.
        // Wait, if segment 0 is at 0 degrees, rotating the wheel backwards by targetAngle places it at the top.
        // Or if we rotate the wheel clockwise, we need: extraSpins + (360 - targetAngle)
        const newRotation = rotation + extraSpins + (360 - targetAngle) - (rotation % 360);

        setRotation(newRotation);

        // Wait for animation to finish
        setTimeout(() => {
          setResult(res.data.prize);
          setHasSpin(false);
          setSpinning(false);

          if (res.data.prize.type === 'heart') {
            triggerConfetti();
          }
        }, 5000); // 5 seconds spin
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
      setSpinning(false);
    }
  };

  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.6 } };
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



  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="wheel-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="wheel-modal-container"
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 50, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="wheel-top-bar">
            <div className="wheel-brand">
              <Heart size={20} fill="#be185d" color="#be185d" />
              <span>THE STORY</span>
            </div>
            <button className="wheel-close-btn" onClick={onClose} disabled={spinning}>
              <X size={24} />
            </button>
          </div>

          <div className="wheel-header">
            <h2>Vòng Quay May Mắn</h2>
            <p>Mỗi ngày 50% cơ hội nhận 1 lượt quay!</p>
          </div>

          <div className="wheel-content">
            {loading ? (
              <div className="wheel-loading">
                <Loader2 className="animate-spin" size={40} color="#db2777" />
                <p>Đang tải...</p>
              </div>
            ) : (
              <div className="wheel-wrapper">
                <div className="wheel-pointer"></div>
                <div
                  className="wheel-circle"
                  style={{
                    background: `conic-gradient(${PRIZES.map((p, i) => `${p.color} ${i * (360 / PRIZES.length)}deg ${(i + 1) * (360 / PRIZES.length)}deg`).join(', ')})`,
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
                  }}
                >
                  {/* Wheel segments */}
                  {PRIZES.map((prize, index) => {
                    const angle = index * (360 / 13) + (360 / 13 / 2);
                    return (
                      <div
                        key={index}
                        className="wheel-segment"
                        style={{
                          transform: `rotate(${angle}deg)`
                        }}
                      >
                        <div
                          className="segment-text"
                          style={{ color: prize.textColor }}
                        >
                          {prize.label}
                        </div>
                      </div>
                    );
                  })}

                  {/* Wheel separators */}
                  {PRIZES.map((_, index) => {
                    return (
                      <div
                        key={`sep-${index}`}
                        className="wheel-separator"
                        style={{
                          transform: `rotate(${index * (360 / 13)}deg)`
                        }}
                      ></div>
                    );
                  })}
                </div>

                <button
                  className={`spin-btn ${!hasSpin || spinning ? 'disabled' : ''}`}
                  onClick={handleSpin}
                  disabled={!hasSpin || spinning}
                >
                  QUAY
                </button>
              </div>
            )}
          </div>

          {!loading && result && (
            <motion.div
              className="wheel-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {result.type === 'heart' ? (
                <>
                  <h3>Tuyệt vờiiii!</h3>
                  <div className="reward-pill">
                    <span>+{result.value}</span> <Heart size={16} fill="#ef4444" color="#ef4444" />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="unmatched">Tiếc quá!</h3>
                  <p>Chúc bạn may mắn lần sau nhé!</p>
                </>
              )}
            </motion.div>
          )}

          <div className="wheel-footer-actions">
            <button onClick={() => alert('Tính năng Lịch sử đang phát triển')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
              Lịch sử
            </button>
            <button onClick={() => alert('Tính năng Thể lệ đang phát triển')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              Thể lệ
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LuckyWheelModal;
