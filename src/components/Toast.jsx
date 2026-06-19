import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const toastVariants = {
  initial: { y: '-100%' },
  animate: { y: 0, transition: { type: 'spring', damping: 20, stiffness: 200 } },
  exit: { y: '-100%', transition: { duration: 0.3, ease: 'easeInOut' } },
};

let showToastFn = null;

export const showToast = (message, type = 'success') => {
  // Disabled by user request
  // if (showToastFn) showToastFn(message, type);
};

const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    showToastFn = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => { showToastFn = null; };
  }, []);

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(({ id, message, type }) => (
          <motion.div
            key={id}
            className={`toast toast-${type}`}
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className={`toast-icon-wrapper toast-icon-${type}`}>
              {type === 'success' ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
            </div>
            {message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
