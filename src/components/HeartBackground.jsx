import { useEffect, useRef } from 'react';
import './HeartBackground.css';

const HeartBackground = ({ count = 20 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hearts = [];
    const emojis = ['💕', '💗', '💖', '💝', '🌸', '✨', '💞'];

    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.className = 'floating-heart';
      heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDelay = `${Math.random() * 8}s`;
      heart.style.animationDuration = `${6 + Math.random() * 6}s`;
      heart.style.fontSize = `${12 + Math.random() * 20}px`;
      heart.style.opacity = `${0.3 + Math.random() * 0.5}`;
      container.appendChild(heart);
      hearts.push(heart);
    }

    return () => {
      hearts.forEach((h) => h.remove());
    };
  }, [count]);

  return <div ref={containerRef} className="heart-bg" aria-hidden="true" />;
};

export default HeartBackground;
