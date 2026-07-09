import { motion } from 'framer-motion';
import { Heart, Sparkles, Star } from 'lucide-react';
import './LevelUpEffect.css';

const LevelUpEffect = () => {
  // Tạo 24 hạt (particles) bay ra xung quanh
  const particles = Array.from({ length: 24 });

  return (
    <div className="level-up-container">
      {/* Vòng sáng tỏa ra từ trung tâm */}
      <motion.div
        className="glow-ring"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 6, opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      
      {/* Cột sáng chiếu từ dưới lên */}
      <motion.div
        className="light-pillar"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: [0, 0.5, 0] }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      {/* Các hạt bay ra */}
      {particles.map((_, i) => {
        const angle = (Math.PI * 2 * i) / particles.length;
        const radius = 120 + Math.random() * 80; // Bán kính bay từ 120-200px
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // Random icon: 50% Heart, 25% Sparkles, 25% Star
        const rand = Math.random();
        const Icon = rand > 0.5 ? Heart : (rand > 0.25 ? Sparkles : Star);
        const color = i % 2 === 0 ? '#ff7eb3' : '#ffb199'; // Hồng và Cam đào
        const size = 16 + Math.random() * 20;

        return (
          <motion.div
            key={i}
            className="particle"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ 
              x: x, 
              y: y - 50, // Bay bổng lên một chút
              scale: [0, 1.2, 0],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360
            }}
            transition={{ 
              duration: 1 + Math.random() * 1, // Random thời gian 1-2s
              ease: "easeOut" 
            }}
          >
            <Icon size={size} color={color} fill={Icon === Heart || Icon === Star ? color : 'none'} strokeWidth={1.5} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default LevelUpEffect;
