import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Sparkles } from 'lucide-react';

export default function BatheMiniGame({ pet, petSrc, onComplete, onClose, playSFX }) {
  const [phase, setPhase] = useState("soap"); // "soap" | "rinse" | "done"
  const [soapProgress, setSoapProgress] = useState(0);
  const [rinseProgress, setRinseProgress] = useState(0);
  const [bubbles, setBubbles] = useState([]); // { x, y, id, scale }

  const containerRef = useRef(null);
  const petRef = useRef(null);

  const isDragging = useRef(false);
  const lastInteractionTime = useRef(0);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || phase === "done") return;

    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    if (!petRef.current || !containerRef.current) return;
    const petRect = petRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Check roughly if pointer is on pet area (with some padding)
    if (clientX >= petRect.left - 40 && clientX <= petRect.right + 40 &&
      clientY >= petRect.top - 40 && clientY <= petRect.bottom + 40) {

      const now = Date.now();

      if (phase === "soap") {
        if (now - lastInteractionTime.current > 80) {
          const localX = clientX - containerRect.left;
          const localY = clientY - containerRect.top;

          setBubbles(prev => {
            const newBubbles = [...prev, { id: now, x: localX, y: localY, scale: 0.6 + Math.random() * 0.6 }].slice(-60);
            return newBubbles;
          });
          setSoapProgress(prev => Math.min(100, prev + 3));
          lastInteractionTime.current = now;
        }
      } else if (phase === "rinse") {
        if (now - lastInteractionTime.current > 60) {
          const localX = clientX - containerRect.left;
          const localY = clientY - containerRect.top;

          setBubbles(prev => {
            const remaining = prev.filter(b => {
              const dist = Math.hypot(b.x - localX, b.y - localY);
              return dist > 60; // remove bubbles within 60px radius
            });
            setRinseProgress(rp => Math.min(100, rp + 2.5));
            return remaining;
          });
          lastInteractionTime.current = now;
        }
      }
    }
  }, [phase]);

  useEffect(() => {
    if (soapProgress >= 100 && phase === "soap") {
      setPhase("rinse");
      if (playSFX) playSFX('water');
    }
    if (rinseProgress >= 100 && phase === "rinse") {
      setBubbles([]);
      setPhase("done");
      if (playSFX) playSFX('win');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500);
    }
  }, [soapProgress, rinseProgress, phase, onComplete, playSFX]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0, zIndex: 100,
        backgroundImage: "url('/bathroom-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#a8edea",
        overflow: "hidden", userSelect: "none", touchAction: "none"
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onTouchMove={handlePointerMove}
      ref={containerRef}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)", pointerEvents: "none" }}></div>

      {/* Header */}
      <div style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top))", left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <button
          onClick={onClose}
          style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)",
            display: "flex", justifyContent: "center", alignItems: "center",
            border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <X size={28} color="#2f3542" />
        </button>

        <div style={{
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)",
          padding: "10px 24px", borderRadius: "99px",
          fontSize: "1.2rem", fontWeight: "bold", color: "#2f3542",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "2px solid rgba(255,255,255,1)"
        }}>
          {phase === "soap" ? "Xoa Xà Phòng 🧼" : phase === "rinse" ? "Xối Nước 🚿" : "Sạch Bong!"}
        </div>

        <div style={{ width: "48px" }} />
      </div>

      {/* Progress */}
      <div style={{ position: "absolute", top: "calc(80px + env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "80%", maxWidth: 400, height: 16, background: "rgba(255,255,255,0.5)", borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${phase === 'soap' ? soapProgress : rinseProgress}%` }}
          style={{ height: "100%", background: phase === "soap" ? "#ff9ff3" : "#48dbfb" }}
        />
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
        <motion.div
          style={{
            position: "absolute", bottom: "16%", zIndex: 0,
            width: "280px", height: "280px",
            display: "flex", justifyContent: "center", alignItems: "flex-end"
          }}
          animate={phase === "done" ? { y: [0, -40, 0] } : {}}
          transition={{ duration: 0.6, repeat: phase === "done" ? Infinity : 0, repeatType: "reverse" }}
        >
          <img
            ref={petRef}
            src={petSrc}
            alt="pet"
            style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.2))" }}
          />

          <motion.div
            className="dirt-overlay"
            style={{
              WebkitMaskImage: `url(${petSrc})`, maskImage: `url(${petSrc})`,
              position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
            }}
            animate={{ opacity: phase === "soap" ? 1 : Math.max(0, 1 - rinseProgress / 100) }}
          />
        </motion.div>

        <AnimatePresence>
          {bubbles.map(b => (
            <motion.div
              key={b.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: b.scale, opacity: phase === "done" ? 0 : 0.85 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
              style={{
                position: "absolute",
                left: b.x - 30, top: b.y - 30,
                width: 60, height: 60,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,1), rgba(255,255,255,0.5) 40%, rgba(200,230,255,0.3) 80%, rgba(255,255,255,0.9))",
                boxShadow: "inset 0 0 10px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.1)",
                zIndex: 5,
                pointerEvents: "none"
              }}
            >
              <div style={{ position: "absolute", top: "15%", left: "15%", width: "25%", height: "25%", background: "white", borderRadius: "50%", filter: "blur(1px)", transform: "rotate(-45deg)" }} />
            </motion.div>
          ))}
        </AnimatePresence>

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            style={{ position: "absolute", zIndex: 10, color: "#f1c40f", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          >
          </motion.div>
        )}
      </div>


    </motion.div>
  );
}
