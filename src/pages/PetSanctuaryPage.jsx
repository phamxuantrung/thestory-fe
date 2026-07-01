import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Heart, Sparkles, Sword, Wind, Brain, Clover, Timer, MapPin,
  ShoppingBag, PawPrint, X, Check, ChevronRight, Gem, AlertTriangle, Smile, Bath, Utensils, Gamepad2, Pencil, HandHeart, Store, Map, Shield, History
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import { RARITY, SPECIES, FOODS, DESTINATIONS, MAX_PETS, ITEMS } from "../utils/gameConfig";

/* ---------------------------------- DATA ---------------------------------- */

const CARE_THRESHOLD = 40;

/* --------------------------------- HELPERS --------------------------------- */

let audioCtx = null;
const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

export const playSFX = (type) => {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'crit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'dodge') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'die') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) { console.warn("Audio disabled", e); }
};

let bgmInterval = null;
export const playBGM = () => {
  try {
    const ctx = getAudioCtx();
    if (bgmInterval) clearInterval(bgmInterval);
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C E G C G E
    let i = 0;
    bgmInterval = setInterval(() => {
      if (ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[i % notes.length], ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      i++;
    }, 250);
  } catch (e) { console.warn("Audio disabled", e); }
};

export const stopBGM = () => {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
};

const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));

function statScoreOf(pet) {
  const s = pet.stats;
  return (s.str + s.agi + s.luk + s.int) / 4;
}

function expToNext(level) {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

function formatClock(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return [h, m, sc].map((x) => x.toString().padStart(2, "0")).join(":");
}

function formatDurationHours(h) {
  return h === 1 ? "1 giờ" : `${h} giờ`;
}

function getCurrentCare(pet, now) {
  if (!pet.care) return { happiness: 100, fullness: 100, cleanliness: 100 };
  if (pet.status === "exploring") return pet.care;
  const hours = Math.max(0, (now - new Date(pet.care.lastUpdate).getTime()) / 3600000);

  const speciesDef = SPECIES.find(s => s.id === pet.speciesId);
  const decay = speciesDef?.decay || { f: 5, h: 4, c: 3 };

  return {
    happiness: clamp(pet.care.happiness - decay.h * hours, pet.care.maxHappiness || 100),
    fullness: clamp(pet.care.fullness - decay.f * hours, pet.care.maxFullness || 100),
    cleanliness: clamp(pet.care.cleanliness - decay.c * hours, pet.care.maxCleanliness || 100),
  };
}

function isEligibleForExpedition(pet, now) {
  const care = getCurrentCare(pet, now);
  const score = statScoreOf(pet);
  return care.happiness > CARE_THRESHOLD &&
    care.fullness > CARE_THRESHOLD &&
    care.cleanliness > CARE_THRESHOLD &&
    score >= 10 &&
    pet.status === "idle";
}

const FLYING_SLOTS = [
  { left: 50, top: 15 }, // Top Center
  { left: 20, top: 20 }, // Top Left
  { left: 80, top: 20 }, // Top Right
  { left: 35, top: 35 }, // Inner Left
  { left: 65, top: 35 }, // Inner Right
  { left: 50, top: 30 }, // Mid Center
  { left: 20, top: 40 }, // Mid Left
  { left: 80, top: 40 }, // Mid Right
];

const GROUND_SLOTS = [
  { left: 50, top: 75 }, // Bottom Center
  { left: 20, top: 70 }, // Bottom Left
  { left: 80, top: 70 }, // Bottom Right
  { left: 35, top: 55 }, // Inner Left
  { left: 65, top: 55 }, // Inner Right
  { left: 50, top: 60 }, // Mid Center
  { left: 20, top: 85 }, // Very Bottom Left
  { left: 80, top: 85 }, // Very Bottom Right
];

// Hàm sinh vị trí dựa trên lưới phân loại bay/đi bộ
function getPseudoRandomPos(idStr, typeIndex, isFlying) {
  const slots = isFlying ? FLYING_SLOTS : GROUND_SLOTS;
  const slot = slots[typeIndex % slots.length];

  // Tạo dao động cực nhỏ để vị trí trông tự nhiên nhưng không làm mất đội hình
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) hash = idStr.charCodeAt(i) + ((hash << 5) - hash);

  const offsetX = (Math.abs(hash) % 6) - 3; // dao động từ -3% đến +3%
  const offsetY = (Math.abs(hash >> 3) % 6) - 3;

  return {
    left: `${Math.max(15, Math.min(85, slot.left + offsetX))}%`,
    top: `${Math.max(10, Math.min(85, slot.top + offsetY))}%`
  };
}

/* ------------------------------- SUB-COMPONENTS ------------------------------ */

const LazyImage = ({ src, alt, style, wrapperStyle, fallback, className, onErrorCallback, onLoadCallback }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center", ...wrapperStyle }} className={className}>
      {!loaded && !error && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmerLoad 1.5s infinite", borderRadius: "inherit", zIndex: 0 }} />
      )}
      {!error && (
        <img
          src={src}
          alt={alt}
          style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease", position: "relative", zIndex: 1 }}
          onLoad={(e) => {
            setLoaded(true);
            if (onLoadCallback) onLoadCallback(e);
          }}
          onError={(e) => {
            setError(true);
            if (onErrorCallback) onErrorCallback(e);
          }}
        />
      )}
      {error && fallback}
    </div>
  );
};

function RarityBadge({ rarity, size = "sm" }) {
  const r = RARITY[rarity] || RARITY.common;
  const pd = size === "sm" ? "2px 8px" : "4px 12px";
  const fs = size === "sm" ? "10px" : "12px";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "99px", fontWeight: "bold", fontSize: fs, padding: pd, background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
      <Gem size={size === "sm" ? 10 : 14} />
      {r.label}
    </span>
  );
}

function PetAvatar({ pet, size = "big" }) {
  const r = RARITY[pet?.rarity] || RARITY.common;
  const dim = size === "big" ? 96 : 56;

  // Tính phần trăm EXP
  const expPercent = pet ? Math.min(100, (pet.exp / expToNext(pet.level)) * 100) : 0;
  const strokeWidth = size === "big" ? 6 : 4;
  const radius = (dim - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (expPercent / 100) * circumference;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: dim, height: dim }}>
      {/* Vòng tròn EXP */}
      <svg width={dim} height={dim} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={dim / 2} cy={dim / 2} r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={dim / 2} cy={dim / 2} r={radius} stroke={r.color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }} />
      </svg>

      <div
        style={{
          width: "100%", height: "100%", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `radial-gradient(circle at 35% 30%, ${r.color}55, rgba(255,255,255,0.4) 70%)`,
          boxShadow: `inset 0 0 0 2px ${r.color}66`,
          backgroundColor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          position: "relative",
          zIndex: 1,
          transform: `scale(${size === "big" ? 0.9 : 0.85})` // Thu nhỏ xíu để không đè lên viền
        }}
      >
        <LazyImage
          src={`/pets/${pet?.speciesId}.png`}
          alt={pet?.name}
          style={{ width: size === "big" ? 64 : 32, height: size === "big" ? 64 : 32, objectFit: 'contain' }}
          fallback={<span style={{ fontSize: size === "big" ? 40 : 22 }}>{pet?.emoji}</span>}
        />
      </div>
      <div
        style={{
          position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(to right, #d94c73, #f26989)",
          color: "white", fontSize: size === "big" ? 11 : 9, fontWeight: "bold",
          padding: size === "big" ? "2px 8px" : "1px 6px",
          borderRadius: 12, border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          whiteSpace: "nowrap",
          zIndex: 2
        }}
      >
        Lv.{pet?.level}
      </div>
    </div>
  );
}

function CareBar({ icon: Icon, label, value, max = 100, colorType }) {
  let color = "var(--color-primary)";
  if (value < CARE_THRESHOLD) color = "#ff4757";
  else if (colorType === 'food') color = "#f2b155";
  else if (colorType === 'bath') color = "#4db8ff";
  else if (colorType === 'happy') color = "#f26989";

  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Icon size={14} color={color} /> {label}</span>
        <span style={{ color: color }}>{value}/{max}</span>
      </div>
      <div style={{ width: "100%", height: "10px", background: "rgba(0,0,0,0.05)", borderRadius: "99px", overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 1s ease", borderRadius: "99px" }} />
      </div>
    </div>
  );
}

function StatBar({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, alignItems: "center", background: "rgba(0,0,0,0.02)", padding: "12px 4px", borderRadius: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "bold" }}>
        <div style={{ background: "white", padding: "6px", borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Icon size={16} color={color} />
        </div>
        {label}
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function PetCombatSprite({ pet, currentLog }) {
  const isTarget = currentLog?.targetId === pet._id;
  const isAttacker = currentLog?.attackerId === pet._id;
  const isDead = pet.hp <= 0;

  const hpPct = Math.max(0, (pet.hp / pet.maxHp) * 100);

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isAttacker ? [1, 1.4, 1] : 1,
        x: isAttacker ? [0, pet.team === 'A' ? 120 : -120, 0] : (isTarget && currentLog?.type !== 'dodge' ? [0, -5, 5, -5, 0] : 0),
        y: isAttacker ? [0, -20, 0] : 0,
        filter: isDead ? "grayscale(100%)" : (isTarget && currentLog?.type !== 'dodge' ? ["brightness(1)", "brightness(2) drop-shadow(0 0 10px red)", "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)", "brightness(1)"] : "brightness(1)"),
        opacity: isDead ? 0.4 : 1,
        zIndex: isAttacker ? 50 : 1
      }}
      transition={{
        duration: isAttacker ? 0.6 : 0.4,
        times: isAttacker ? [0, 0.15, 1] : undefined
      }}
      style={{
        position: "relative", width: 60, height: 85, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0
      }}
    >
      <div style={{ position: "relative", width: 50, height: 50, display: "flex", justifyContent: "center", alignItems: "center" }}>
        {/* Team Indicator Aura */}
        <div style={{
          position: "absolute",
          inset: -5,
          borderRadius: "50%",
          border: pet.team === 'B' ? "2px solid rgba(255, 71, 87, 0.6)" : "2px solid rgba(77, 184, 255, 0.6)",
          background: pet.team === 'B' ? "radial-gradient(circle, rgba(255,71,87,0.3) 0%, transparent 70%)" : "radial-gradient(circle, rgba(77,184,255,0.3) 0%, transparent 70%)",
          zIndex: 0
        }} />
        <LazyImage src={`/pets/${pet.speciesId}.png`} alt={pet.name} style={{ width: 48, height: 48, objectFit: 'contain', zIndex: 1, position: "relative" }} fallback={<span style={{ fontSize: "2.2rem", zIndex: 1, position: "relative" }}>{pet.emoji}</span>} />
      </div>
      <div style={{ width: "100%", height: 10, background: "#ff4757", borderRadius: 5, marginTop: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,0.4)", position: "relative" }}>
        <div style={{ width: `${hpPct}%`, height: "100%", background: "#7fd8a6", borderRadius: 5, transition: "width 0.3s ease" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.5rem", fontWeight: "900", color: "white", textShadow: "0 1px 2px black" }}>
          {pet.hp}/{pet.maxHp}
        </div>
      </div>
      <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "white", marginTop: 4, textShadow: "0 2px 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>
        {pet.name}
      </div>

      {/* Floating Text */}
      <AnimatePresence>
        {isTarget && (
          <motion.div
            key={currentLog.logId} // Ensure re-render on consecutive attacks
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ y: -50, opacity: 0, scale: 1.5 }}
            transition={{ duration: 1 }}
            style={{ position: "absolute", top: -20, fontWeight: "900", fontSize: "1.5rem", color: currentLog.type === 'dodge' ? "#4db8ff" : (currentLog.type === 'crit' ? "#ffeb3b" : "#ff4757"), textShadow: "0 2px 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap", zIndex: 20 }}
          >
            {currentLog.type === 'dodge' ? "Né!" : `-${currentLog.damage}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* --------------------------------- MAIN PAGE --------------------------------- */

export default function PetSanctuaryPage() {
  const { user, updateUser } = useAuth();
  const [pets, setPets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState(null); // 'petDetail', 'shop', 'map', 'reward', 'reveal', 'feed'
  const [selectedDest, setSelectedDest] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [shopTab, setShopTab] = useState("pets");

  // Mới: Giao diện đấu trường / Vườn của Gấu
  const [viewMode, setViewMode] = useState("my"); // "my" or "partner"
  const [partnerPets, setPartnerPets] = useState([]);
  const [combatLogs, setCombatLogs] = useState([]);
  const [combatResult, setCombatResult] = useState(null);
  const [combatTeamA, setCombatTeamA] = useState([]);
  const [combatTeamB, setCombatTeamB] = useState([]);
  const [myDefenseTeam, setMyDefenseTeam] = useState([]);
  const [partnerDefenseTeam, setPartnerDefenseTeam] = useState([]);
  const [attackTeamSelection, setAttackTeamSelection] = useState([]);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [currentDamageLog, setCurrentDamageLog] = useState(null);
  const [combatHistoryList, setCombatHistoryList] = useState([]);
  const [partnerShieldUntil, setPartnerShieldUntil] = useState(null);

  const toastId = useRef(0);

  const addToast = useCallback((text, type = "info") => {
    const id = ++toastId.current;
    setToasts((t) => {
      const last = t[t.length - 1];
      if (last && last.text === text && last.type === type) {
        const count = (last.count || 1) + 1;
        return [...t.slice(0, t.length - 1), { ...last, count }];
      }
      const newToasts = [...t, { id, text, type, count: 1 }];
      if (newToasts.length > 3) {
        return newToasts.slice(newToasts.length - 3);
      }
      return newToasts;
    });
    setTimeout(() => {
      setToasts((t) => {
        if (!t.some(x => x.id === id)) return t;
        return t.filter((x) => x.id !== id);
      });
    }, 3800);
  }, []);

  const [combatCooldown, setCombatCooldown] = useState(0);

  useEffect(() => {
    if (user?.lastCombatDate) {
      const msPassed = now - new Date(user.lastCombatDate).getTime();
      const msLeft = 24 * 60 * 60 * 1000 - msPassed;
      setCombatCooldown(Math.max(0, msLeft));
    } else {
      setCombatCooldown(0);
    }
  }, [user?.lastCombatDate, now]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchPets = useCallback(async () => {
    try {
      const res = await api.get('/pets');
      if (res.data.success) {
        setPets(res.data.pets || []);
        setMyDefenseTeam(res.data.defenseTeam || []);
      }
      if (user?.partnerId) {
        const resP = await api.get('/pets/partner');
        if (resP.data.success) {
          setPartnerPets(resP.data.pets || []);
          setPartnerDefenseTeam(resP.data.defenseTeam || []);
          setPartnerShieldUntil(resP.data.partnerShieldUntil || null);
        }
      }
    } catch (err) {
      addToast("Không thể tải Vườn Thú", "error");
    } finally {
      setLoaded(true);
    }
  }, [addToast, user?.partnerId]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  // Combat Playback Effect
  useEffect(() => {
    if (modal?.type !== 'combatPlayback') {
      stopBGM();
      return;
    }
    if (playbackIdx === 0 && combatLogs?.length > 0) {
      playBGM();
    }
  }, [modal, playbackIdx, combatLogs]);

  const handleNextTurn = () => {
    if (!combatLogs || playbackIdx >= combatLogs.length) {
      stopBGM();
      setModal({ type: 'combatLogs' });
      return;
    }

    const log = combatLogs[playbackIdx];
    setCurrentDamageLog({ ...log, logId: playbackIdx });

    // Phát âm thanh tương ứng
    if (log.type) playSFX(log.type);

    // Cập nhật HP
    if (log.targetHPLeft !== undefined) {
      setCombatTeamA(prev => prev.map(p => p._id === log.targetId ? { ...p, hp: log.targetHPLeft } : p));
      setCombatTeamB(prev => prev.map(p => p._id === log.targetId ? { ...p, hp: log.targetHPLeft } : p));
    }

    setPlaybackIdx(idx => idx + 1);
  };

  async function handleCombat() {
    if (attackTeamSelection.length === 0) {
      addToast("Vui lòng chọn đội hình xuất chiến!", "error");
      return;
    }
    try {
      const res = await api.post('/pets/combat', { myTeamIds: attackTeamSelection });
      if (res.data.success) {
        setCombatResult(res.data.result);
        setCombatLogs(res.data.logs);
        setCombatTeamA(res.data.teamA);
        setCombatTeamB(res.data.teamB);
        let newUpdates = { lastCombatDate: res.data.lastCombatDate };
        if (res.data.result.reward > 0) {
          newUpdates.heart = user.heart + res.data.result.reward;
        }
        updateUser(newUpdates);
        fetchPets(); // Refresh stats (care minus)

        // Bắt đầu playback
        setPlaybackIdx(0);
        setCurrentDamageLog(null);
        setModal({ type: 'combatPlayback' });
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi chiến đấu", "error");
    }
  }

  async function handleSaveDefenseTeam(selectedIds) {
    try {
      const res = await api.put('/pets/defense-team', { petIds: selectedIds });
      if (res.data.success) {
        addToast("Đã lưu Đội Thủ thành công!", "success");
        setMyDefenseTeam(selectedIds);
        setModal(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi lưu đội thủ", "error");
    }
  }

  async function handleBuy(species) {
    if (user.heart < species.price) {
      addToast("Không đủ Heart để đón thú cưng này!", "error");
      return;
    }
    try {
      const res = await api.post('/pets/buy', { ...species, speciesId: species.id });
      if (res.data.success) {
        updateUser({ heart: res.data.heart });
        setPets((p) => [...p, res.data.pet]);
        setModal({ type: "reveal", pet: res.data.pet });
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi giao dịch", "error");
    }
  }

  async function handleBuyFood(food) {
    if (user.heart < food.price) {
      addToast("Không đủ Heart!", "error");
      return;
    }
    try {
      const res = await api.post('/pets/buy-food', { foodId: food.id, amount: 1 });
      if (res.data.success) {
        updateUser({ heart: res.data.heart, petFoods: res.data.petFoods });
        addToast(`Đã mua 1 ${food.name}!`, "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi mua hàng", "error");
    }
  }

  async function handleCare(petId, action, foodId = null) {
    const p = pets.find((x) => x._id === petId);
    if (!p) return;
    if (p.status === "exploring") {
      addToast("Thú cưng đang đi xa, không thể chăm sóc lúc này!", "error");
      return;
    }

    try {
      const res = await api.post(`/pets/${petId}/care`, { type: action, foodId });
      if (res.data.success) {
        setPets((prev) => prev.map((x) => (x._id === petId ? res.data.pet : x)));
        if (res.data.petFoods) {
          updateUser({ petFoods: res.data.petFoods });
        }
        const msg = action === "feed" ? "Cho ăn no nê! 🍖" : action === "play" ? "Đã vuốt ve bé! ❤️" : "Tắm rửa sạch sẽ! 🛁";
        addToast(msg, "success");
        if (action === "feed") {
          // Trở về chi tiết thú cưng sau khi ăn
          setModal({ type: "petDetail", petId: petId });
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi chăm sóc", "error");
    }
  }

  async function handleSellPet(petId) {
    const pet = pets.find((x) => x._id === petId);
    if (!pet) return;
    const speciesDef = SPECIES.find(s => s.id === pet.speciesId);
    if (!speciesDef) return;
    const sellRatio = 0.4 + (pet.level - 1) * 0.1;
    const sellValue = Math.floor(speciesDef.price * sellRatio);

    if (!window.confirm(`Bạn có chắc muốn thả ${pet.name} về rừng? Bạn sẽ nhận lại ${sellValue} Heart.`)) {
      return;
    }

    try {
      const res = await api.delete(`/pets/${petId}/sell`);
      if (res.data.success) {
        setPets((prev) => prev.filter((x) => x._id !== petId));
        updateUser({ heart: res.data.heart });
        addToast(res.data.message || "Đã thả về rừng", "success");
        setModal(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Không thể bán", "error");
    }
  }

  async function handleBuyItem(itemId) {
    try {
      const res = await api.post('/pets/buy-item', { itemId });
      if (res.data.success) {
        updateUser({ heart: res.data.heart, shieldUntil: res.data.shieldUntil });
        addToast(res.data.message, "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Mua vật phẩm thất bại", "error");
    }
  }

  async function fetchCombatHistory() {
    try {
      const res = await api.get('/pets/combat-history');
      if (res.data.success) {
        setCombatHistoryList(res.data.history || []);
        setModal({ type: "combatHistory" });
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Không thể tải lịch sử đấu trường", "error");
    }
  }

  async function commitRename(petId) {
    setRenaming(null);
    if (!renameValue.trim()) return;
    try {
      const res = await api.put(`/pets/${petId}/name`, { name: renameValue });
      if (res.data.success) {
        setPets((prev) => prev.map((x) => (x._id === petId ? res.data.pet : x)));
        addToast("Đổi tên thành công!", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Đổi tên thất bại", "error");
    }
  }

  async function startExpedition(petId, destId) {
    try {
      const res = await api.post(`/pets/${petId}/expedition/start`, { destinationId: destId });
      if (res.data.success) {
        setPets((prev) => prev.map((x) => (x._id === petId ? res.data.pet : x)));
        addToast("Đã khởi hành thám hiểm!", "success");
        setModal(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Không thể thám hiểm", "error");
    }
  }

  async function claimReward(petId) {
    try {
      const res = await api.post(`/pets/${petId}/expedition/collect`);
      if (res.data.success) {
        if (res.data.dead) {
          setPets((prev) => prev.filter(p => p._id !== petId));
          setModal({ type: "dead", petName: res.data.petName });
        } else {
          updateUser({ heart: res.data.heart });
          setPets((prev) => prev.map((x) => (x._id === petId ? res.data.pet : x)));
          setModal({ type: "reward", data: res.data.reward, pet: res.data.pet, leveled: res.data.leveled, foundFoods: res.data.foundFoods });
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Không thể thu hoạch", "error");
    }
  }

  async function handleDevAction(action) {
    try {
      const res = await api.post('/pets/dev', { action });
      if (res.data.success) {
        addToast(res.data.message || "Thành công!", "success");
        if (res.data.userHeart !== undefined) updateUser({ heart: res.data.userHeart });
        fetchPets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Lỗi hệ thống", "error");
    }
  }

  if (!loaded) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--gradient-main)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Lấy chi tiết pet hiện tại nếu đang mở modal detail
  const detailPet = modal?.petId ? pets.find(p => p._id === modal.petId) : null;

  return (
    <div className="app-container garden-wrap">
      <GlobalStyle />

      {/* Toast */}
      <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: 0, right: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: t.type === "error" ? "#ff4757" : "var(--color-primary)",
                color: "white", padding: "10px 20px", borderRadius: "99px",
                fontWeight: "bold", fontSize: "14px", boxShadow: "0 4px 12px rgba(242, 105, 137, 0.4)",
                display: "flex", alignItems: "center", gap: "8px"
              }}
            >
              {t.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
              {t.text} {t.count > 1 && <span style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: "10px", fontSize: "0.8em" }}>x{t.count}</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Standard Header */}
      <Header title="Khu Vườn Cổ Tích" transparent={true} showHeartCount={true} />

      {/* View Mode Toggle */}
      {user?.partnerId && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 110px)", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(255,255,255,0.85)", borderRadius: "30px", display: "flex", padding: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", backdropFilter: "blur(12px)" }}>
          <button
            style={{ border: "none", fontFamily: "var(--font-body), sans-serif", whiteSpace: "nowrap", minWidth: "120px", display: "flex", justifyContent: "center", alignItems: "center", background: viewMode === "my" ? "#ffffff" : "transparent", color: viewMode === "my" ? "var(--color-primary)" : "var(--text-secondary)", fontWeight: viewMode === "my" ? "800" : "600", padding: "10px 20px", borderRadius: "24px", fontSize: "0.95rem", boxShadow: viewMode === "my" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none", transition: "all 0.3s", cursor: "pointer" }}
            onClick={() => setViewMode("my")}
          >
            Vườn của Tôi
          </button>
          <button
            style={{ border: "none", fontFamily: "var(--font-body), sans-serif", whiteSpace: "nowrap", minWidth: "120px", display: "flex", justifyContent: "center", alignItems: "center", background: viewMode === "partner" ? "#ffffff" : "transparent", color: viewMode === "partner" ? "var(--color-primary)" : "var(--text-secondary)", fontWeight: viewMode === "partner" ? "800" : "600", padding: "10px 20px", borderRadius: "24px", fontSize: "0.95rem", boxShadow: viewMode === "partner" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none", transition: "all 0.3s", cursor: "pointer" }}
            onClick={() => setViewMode("partner")}
          >
            Vườn của Gấu
          </button>
        </div>
      )}

      {/* Shield Badge */}
      {(() => {
        const formatTimeLeft = (ms) => {
          const days = Math.floor(ms / (24 * 60 * 60 * 1000));
          const hrs = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
          if (days > 0) return `${days} ngày ${hrs} giờ`;
          if (hrs > 0) return `${hrs} giờ ${mins} phút`;
          return `${mins} phút`;
        };

        if (viewMode === "my" && user?.shieldUntil && new Date(user.shieldUntil).getTime() > now) {
          const msLeft = new Date(user.shieldUntil).getTime() - now;
          return (
            <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 165px)", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "6px 16px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", color: "#0984e3", fontWeight: "bold", fontSize: "0.85rem", backdropFilter: "blur(4px)", border: "1px solid rgba(9, 132, 227, 0.2)", whiteSpace: "nowrap" }}>
              <Shield size={16} color="#0984e3" fill="#74b9ff" /> Đang được bảo vệ ({formatTimeLeft(msLeft)})
            </div>
          );
        }

        if (viewMode === "partner" && partnerShieldUntil && new Date(partnerShieldUntil).getTime() > now) {
          const msLeft = new Date(partnerShieldUntil).getTime() - now;
          return (
            <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 165px)", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "6px 16px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", color: "#0984e3", fontWeight: "bold", fontSize: "0.85rem", backdropFilter: "blur(4px)", border: "1px solid rgba(9, 132, 227, 0.2)", whiteSpace: "nowrap" }}>
              <Shield size={16} color="#0984e3" fill="#74b9ff" /> Gấu đang bật Khiên ({formatTimeLeft(msLeft)})
            </div>
          );
        }
        return null;
      })()}

      {/* Khu vực Vườn (Garden Area) */}
      <div className="garden-area">
        {(viewMode === "my" ? pets : partnerPets).length === 0 ? (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: "24px", backdropFilter: "blur(8px)" }}>
            <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>Vườn đang trống</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{viewMode === "my" ? "Hãy vào Cửa Hàng để đón các bé nhé!" : "Gấu nhà bạn chưa nuôi bé nào cả!"}</p>
          </div>
        ) : (
          (() => {
            let flyCount = 0;
            let groundCount = 0;
            const currentPets = viewMode === "my" ? pets : partnerPets;
            return currentPets.map((pet, idx) => {
              const speciesId = pet.speciesId || pet.type;
              const emoji = pet.emoji || SPECIES.find(s => s.id === speciesId)?.emoji || '🐾';
              const isFlying = ["owl", "dragon", "phoenix"].includes(speciesId);
              const typeIndex = isFlying ? flyCount++ : groundCount++;

              const exploring = pet.status === "exploring";
              const pos = getPseudoRandomPos(pet._id, typeIndex, isFlying);
              const r = RARITY[pet.rarity] || RARITY.common;
              const care = getCurrentCare(pet, now);

              // Trung bình cộng của 3 chỉ số chăm sóc
              const careAvg = (care.fullness + care.happiness + care.cleanliness) / 3;
              let dotColor = "#7fd8a6"; // xanh
              if (careAvg < 40) dotColor = "#ff4757"; // đỏ
              else if (careAvg < 70) dotColor = "#f2b155"; // vàng

              const level = pet.level || 1;
              const scale = Math.min(1.5, 1 + (level - 1) * 0.05);
              const isEpic = level >= 10;
              const isLegendary = level >= 20;

              let dropShadowStr = `0 4px 8px ${r.glow}`;
              if (isLegendary) dropShadowStr = `0 0 16px ${r.color}, 0 0 24px ${r.color}`;
              else if (isEpic) dropShadowStr = `0 0 12px ${r.color}`;

              if (exploring) {
                const endMs = new Date(pet.expeditionEnd).getTime();
                const ready = endMs <= now;
                return (
                  <div key={pet._id} className="garden-pet pet-float" style={{ left: pos.left, top: pos.top, animationDelay: `${(idx % 5) * 0.4}s` }} onClick={() => viewMode === "my" ? setModal({ type: "petDetail", petId: pet._id }) : setModal({ type: "combatChallenge", partnerPet: pet })}>
                    <div style={{ position: "relative", filter: "grayscale(40%) opacity(80%)", display: "flex", justifyContent: "center", alignItems: "center", width: 70 * scale, height: 70 * scale, borderRadius: "50%" }}>
                      {isEpic && !isLegendary && (
                        <div style={{ position: "absolute", width: "120%", height: "120%", borderRadius: "50%", background: `radial-gradient(circle, ${r.color}33, transparent 60%)`, animation: "auraPulse 2s ease-in-out infinite", zIndex: 1 }} />
                      )}
                      <LazyImage
                        src={`/pets/${speciesId}.png`}
                        alt={pet.name}
                        style={{ width: 48 * scale, height: 48 * scale, objectFit: 'contain', filter: isLegendary ? "none" : `drop-shadow(${dropShadowStr})`, animation: isLegendary ? "contourFire 1s ease-in-out infinite alternate" : "none", position: "relative", zIndex: 2 }}
                        fallback={<div style={{ fontSize: `${2.5 * scale}rem`, filter: isLegendary ? "none" : `drop-shadow(${dropShadowStr})`, animation: isLegendary ? "contourFire 1s ease-in-out infinite alternate" : "none", position: "relative", zIndex: 2 }}>{emoji}</div>}
                      />
                    </div>
                    {/* Exploration Status Tag (replaces Name Tag) */}
                    <div style={{
                      marginTop: "4px",
                      background: ready ? "linear-gradient(135deg, #7fd8a6, #2d985a)" : "rgba(255,255,255,0.8)",
                      backdropFilter: "blur(4px)",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      border: ready ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,1)",
                      boxShadow: ready ? "0 4px 12px rgba(45, 152, 90, 0.4)" : "0 2px 8px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      zIndex: 10,
                      animation: ready ? "floatY 1.5s ease-in-out infinite alternate" : "none"
                    }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "900", color: ready ? "white" : "var(--text-primary)", whiteSpace: "nowrap" }}>
                        {ready ? "🎁 Xong!" : "Đang đi..."}
                      </span>
                    </div>
                  </div>
                );
              }



              return (
                <div key={pet._id} className="garden-pet pet-float" style={{ left: pos.left, top: pos.top, animationDelay: `${(idx % 5) * 0.4}s` }} onClick={() => viewMode === "my" ? setModal({ type: "petDetail", petId: pet._id }) : setModal({ type: "teamCombatChallenge" })}>
                  {/* Thú cưng */}
                  <div style={{ position: "relative", width: 70 * scale, height: 70 * scale, display: "flex", justifyContent: "center", alignItems: "center", background: `radial-gradient(circle, ${r.color}33, transparent 70%)`, borderRadius: "50%" }}>

                    {isEpic && !isLegendary && (
                      <div style={{ position: "absolute", width: "120%", height: "120%", borderRadius: "50%", background: `radial-gradient(circle, ${r.color}33, transparent 60%)`, animation: "auraPulse 2s ease-in-out infinite", zIndex: 1 }} />
                    )}
                    <LazyImage
                      src={`/pets/${speciesId}.png`}
                      alt={pet.name}
                      style={{ width: 64 * scale, height: 64 * scale, objectFit: 'contain', filter: isLegendary ? "none" : `drop-shadow(${dropShadowStr})`, animation: isLegendary ? "contourFire 1s ease-in-out infinite alternate" : "none", position: "relative", zIndex: 2 }}
                      fallback={<span style={{ fontSize: `${3 * scale}rem`, filter: isLegendary ? "none" : `drop-shadow(${dropShadowStr})`, animation: isLegendary ? "contourFire 1s ease-in-out infinite alternate" : "none", position: "relative", zIndex: 2 }}>{emoji}</span>}
                    />
                  </div>

                  {/* Name tag */}
                  <div style={{ marginTop: "4px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,1)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-primary)", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pet.name}</span>
                    {/* Status dot */}
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor }}></div>
                  </div>
                </div>
              );
            })
          })()
        )}
      </div>

      {/* Bottom Toolbars (chỉ hiện trong vườn của mình) */}
      {/* Bottom Toolbars (chỉ hiện trong vườn của mình) */}
      {viewMode === "my" && (
        <>
          <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", gap: "14px", zIndex: 10 }}>
            <button
              style={{ width: 56, height: 56, borderRadius: "20px", background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255,255,255,0.8)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "#ff4757", transition: "all 0.2s" }}
              onClick={() => { setShopTab("pets"); setModal({ type: "shop" }); }}
            >
              <Store size={26} strokeWidth={2.5} />
            </button>
            <button
              style={{ width: 56, height: 56, borderRadius: "20px", background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255,255,255,0.8)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "#fca311", transition: "all 0.2s" }}
              onClick={() => setModal({ type: "map" })}
            >
              <Map size={26} strokeWidth={2.5} />
            </button>
            <button
              style={{ width: 56, height: 56, borderRadius: "20px", background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255,255,255,0.8)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "#4facfe", transition: "all 0.2s" }}
              onClick={() => {
                setAttackTeamSelection([...myDefenseTeam]); // Pre-fill with existing defense team
                setModal({ type: "defenseTeamSetup" });
              }}
            >
              <Shield size={26} strokeWidth={2.5} />
            </button>
          </div>
          <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 10 }}>
            <button
              style={{ width: 56, height: 56, borderRadius: "20px", background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.1), inset 0 2px 4px rgba(255,255,255,0.8)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "#8e44ad", transition: "all 0.2s" }}
              onClick={fetchCombatHistory}
            >
              <History size={26} strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      {/* Đấu Trường Tổng Lực Button (hiện bên vườn Gấu) */}
      {viewMode === "partner" && partnerPets.length > 0 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          {partnerShieldUntil && new Date(partnerShieldUntil).getTime() > now ? (
            <button
              style={{
                padding: "18px 40px",
                fontFamily: "var(--font-body)",
                fontSize: "1.3rem",
                fontWeight: "900",
                borderRadius: "40px",
                background: "#dfe6e9",
                color: "#b2bec3",
                border: "3px solid #fff",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
                cursor: "not-allowed",
                whiteSpace: "nowrap"
              }}
              disabled={true}
            >
              🛡️ ĐANG BẬT KHIÊN
            </button>
          ) : (
            <button
              style={{
                padding: "18px 40px",
                fontFamily: "var(--font-body)",
                fontSize: "1.3rem",
                fontWeight: "900",
                borderRadius: "40px",
                background: "linear-gradient(135deg, #ff4757, #ff6b81)",
                color: "white",
                border: "3px solid #fff",
                boxShadow: "0 8px 30px rgba(255, 71, 87, 0.5)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                animation: "pulseCombatBtn 2s infinite"
              }}
              onClick={() => {
                setAttackTeamSelection([]);
                setModal({ type: "teamCombatChallenge" });
              }}
            >
              ⚔️ ĐẠI CHIẾN TỔNG LỰC
            </button>
          )}
        </div>
      )}

      {/* Modals (BottomSheet style) */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setModal(null)} />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                background: "var(--bg-main)",
                width: "100%",
                maxHeight: modal.type === "combatPlayback" ? "100vh" : "85vh",
                height: modal.type === "combatPlayback" ? "100vh" : "auto",
                borderTopLeftRadius: modal.type === "combatPlayback" ? 0 : "28px",
                borderTopRightRadius: modal.type === "combatPlayback" ? 0 : "28px",
                position: "relative", zIndex: 1, display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)"
              }}
            >
              {/* Drag handle */}
              {modal.type !== "combatPlayback" && (
                <div style={{ width: "40px", height: "5px", background: "rgba(0,0,0,0.1)", borderRadius: "3px", margin: "12px auto" }}></div>
              )}

              <div style={{ overflowY: "auto", padding: modal.type === "combatPlayback" ? 0 : "16px 20px 40px", flex: 1, display: modal.type === "combatPlayback" ? "flex" : "block", flexDirection: "column" }}>

                {/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (() => {
                  const pet = detailPet;
                  const exploring = pet.status === "exploring";
                  const endMs = new Date(pet.expeditionEnd).getTime();
                  const startMs = new Date(pet.expeditionStart).getTime();
                  const ready = exploring && endMs <= now;
                  const progress = exploring ? Math.min(100, ((now - startMs) / (endMs - startMs)) * 100) : 0;
                  const r = RARITY[pet.rarity] || RARITY.common;
                  const care = getCurrentCare(pet, now);

                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                        <PetAvatar pet={pet} size="big" />

                        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                          {renaming === pet._id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => commitRename(pet._id)}
                              onKeyDown={(e) => e.key === "Enter" && commitRename(pet._id)}
                              style={{ width: "150px", border: "none", borderBottom: "2px solid var(--color-primary)", background: "transparent", fontSize: "1.4rem", fontWeight: "900", color: "var(--text-primary)", outline: "none", textAlign: "center" }}
                            />
                          ) : (
                            <div onClick={() => { setRenaming(pet._id); setRenameValue(pet.name); }} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                              <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "var(--text-primary)" }}>{pet.name}</span>
                              <Pencil size={14} color="var(--text-muted)" />
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: "8px" }}><RarityBadge rarity={pet.rarity} /></div>
                      </div>

                      {/* Thông số No/Vui/Tắm */}
                      {!exploring && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))", padding: "20px", borderRadius: "24px", marginBottom: "20px", border: "1px solid rgba(255,255,255,1)", boxShadow: "0 8px 32px rgba(0,0,0,0.05)" }}>
                          <CareBar icon={Utensils} label="Độ No" value={care.fullness} max={pet.care?.maxFullness || 100} colorType="food" />
                          <CareBar icon={Smile} label="Vui Vẻ" value={care.happiness} max={pet.care?.maxHappiness || 100} colorType="happy" />
                          <CareBar icon={Bath} label="Sạch Sẽ" value={care.cleanliness} max={pet.care?.maxCleanliness || 100} colorType="bath" />
                        </div>
                      )}

                      {/* Các chỉ số chiến đấu */}
                      <div style={{ display: "flex", gap: "8px", padding: "16px", background: "white", borderRadius: "24px", border: "1px solid rgba(0,0,0,0.03)", marginBottom: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                        <StatBar icon={Sword} label="Sức Mạnh" value={pet.stats.str} color="#ff4757" />
                        <StatBar icon={Wind} label="Nhanh Nhẹn" value={pet.stats.agi} color="#4db8ff" />
                        <StatBar icon={Brain} label="Trí Tuệ" value={pet.stats.int} color="#8f6fff" />
                        <StatBar icon={Clover} label="May Mắn" value={pet.stats.luk} color="#7fd8a6" />
                      </div>

                      {/* Hành động */}
                      {!exploring ? (() => {
                        const playCooldown = pet.care?.lastPlayed ? Math.max(0, 3600000 - (now - new Date(pet.care.lastPlayed).getTime())) : 0;
                        const batheCooldown = pet.care?.lastBathed ? Math.max(0, 14400000 - (now - new Date(pet.care.lastBathed).getTime())) : 0;
                        const formatCD = (ms) => {
                          const m = Math.ceil(ms / 60000);
                          if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
                          return `${m}p`;
                        };
                        return (
                          <>
                            <div style={{ display: "flex", gap: "12px" }}>
                              <button className="btn btn-primary" style={{ flex: 1, padding: "16px 0", fontSize: "1.05rem", borderRadius: "20px", background: "linear-gradient(to right, #f26989, #d94c73)", boxShadow: "0 8px 24px rgba(242, 105, 137, 0.4)" }} onClick={() => setModal({ type: "feed", petId: pet._id })}>
                                <Utensils size={20} /> Cho ăn
                              </button>
                              <button className="btn btn-primary" disabled={playCooldown > 0} style={{ flex: 1, padding: "16px 0", fontSize: "1.05rem", borderRadius: "20px", background: playCooldown > 0 ? "#ccc" : "linear-gradient(to right, #7fd8a6, #4db8ff)", boxShadow: playCooldown > 0 ? "none" : "0 8px 24px rgba(127, 216, 166, 0.4)", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }} onClick={() => handleCare(pet._id, "play")}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><HandHeart size={20} /> Vuốt ve</div>
                                {playCooldown > 0 && <span style={{ fontSize: "0.75rem", fontWeight: "bold", background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: "8px" }}>Chờ {formatCD(playCooldown)}</span>}
                              </button>
                              <button className="btn btn-primary" disabled={batheCooldown > 0} style={{ flex: 1, padding: "16px 0", fontSize: "1.05rem", borderRadius: "20px", background: batheCooldown > 0 ? "#ccc" : "linear-gradient(to right, #8f6fff, #4db8ff)", boxShadow: batheCooldown > 0 ? "none" : "0 8px 24px rgba(143, 111, 255, 0.4)", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }} onClick={() => handleCare(pet._id, "bathe")}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Bath size={20} /> Tắm</div>
                                {batheCooldown > 0 && <span style={{ fontSize: "0.75rem", fontWeight: "bold", background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: "8px" }}>Chờ {formatCD(batheCooldown)}</span>}
                              </button>
                            </div>

                            <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                              <button
                                style={{ background: "transparent", border: "1px solid #ff4757", color: "#ff4757", padding: "8px 16px", borderRadius: "16px", fontSize: "0.9rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}
                                onClick={() => handleSellPet(pet._id)}
                              >
                                Thả về rừng (Bán)
                              </button>
                            </div>
                          </>
                        );
                      })() : (
                        <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: "20px", padding: "20px", textAlign: "center" }}>
                          <div style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "bold" }}>
                            Đang thám hiểm {DESTINATIONS.find(d => d.id === pet.destinationId)?.name}...
                          </div>
                          {ready ? (
                            <button className="btn btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: "1.1rem", background: "#7fd8a6", boxShadow: "0 4px 16px rgba(127,216,166,0.4)", borderRadius: "16px" }} onClick={() => claimReward(pet._id)}>
                              Thu hoạch ngay
                            </button>
                          ) : (
                            <>
                              <div style={{ width: "100%", height: "10px", background: "rgba(0,0,0,0.05)", borderRadius: "5px", overflow: "hidden", marginBottom: "10px" }}>
                                <div style={{ width: `${progress}%`, height: "100%", background: "var(--color-primary)", transition: "width 1s linear" }} />
                              </div>
                              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "900", fontVariantNumeric: "tabular-nums" }}>
                                <Timer size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                                Còn lại: {formatClock(endMs - now)}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Modal: Cửa Hàng & Siêu Thị */}
                {modal.type === "shop" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)", fontSize: "1.6rem", margin: 0 }}>Cửa Hàng (Vườn: {pets.length}/{MAX_PETS})</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>

                    <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", padding: "4px", borderRadius: "16px", marginBottom: "20px" }}>
                      <button
                        onClick={() => setShopTab("pets")}
                        style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: shopTab === "pets" ? "white" : "transparent", color: shopTab === "pets" ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: "bold", boxShadow: shopTab === "pets" ? "var(--shadow-sm)" : "none", transition: "all 0.2s" }}
                      >
                        Thú Cưng
                      </button>
                      <button
                        onClick={() => setShopTab("foods")}
                        style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: shopTab === "foods" ? "white" : "transparent", color: shopTab === "foods" ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: "bold", boxShadow: shopTab === "foods" ? "var(--shadow-sm)" : "none", transition: "all 0.2s" }}
                      >
                        Thực Phẩm
                      </button>
                      <button
                        onClick={() => setShopTab("items")}
                        style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: shopTab === "items" ? "white" : "transparent", color: shopTab === "items" ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: "bold", boxShadow: shopTab === "items" ? "var(--shadow-sm)" : "none", transition: "all 0.2s" }}
                      >
                        Vật Phẩm
                      </button>
                    </div>

                    {shopTab === "pets" && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                        {SPECIES.map((s) => (
                          <div key={s.id} className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                            <LazyImage
                              src={`/pets/${s.id}.png`}
                              alt={s.name}
                              style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: "8px" }}
                              fallback={<div style={{ fontSize: "3rem", marginBottom: "8px" }}>{s.emoji}</div>}
                            />
                            <div style={{ fontWeight: "800", fontSize: "1rem", color: "var(--text-primary)" }}>{s.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px", padding: "2px 8px", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                              Tier {s.tier}
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ width: "100%", padding: "10px 0", fontSize: "0.9rem", opacity: pets.length >= MAX_PETS ? 0.5 : 1 }}
                              disabled={pets.length >= MAX_PETS}
                              onClick={() => handleBuy(s)}
                            >
                              {pets.length >= MAX_PETS ? "Vườn Đầy" : <><Heart size={14} fill="white" /> {s.price}</>}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {shopTab === "foods" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {FOODS.map((f) => (
                          <div key={f.id} className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ fontSize: "2.5rem", background: "rgba(0,0,0,0.03)", borderRadius: "20px", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <LazyImage
                                src={`/foods/${f.id}.png`}
                                alt={f.name}
                                style={{ width: 48, height: 48, objectFit: 'contain' }}
                                fallback={<div>{f.emoji}</div>}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "var(--text-primary)" }}>{f.name}</div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                Hồi: <span style={{ color: "#f2b155", fontWeight: "bold" }}>+{f.fullness} No</span>
                                {f.happiness > 0 && <span style={{ marginLeft: "8px", color: "#f26989", fontWeight: "bold" }}>+{f.happiness} Vui</span>}
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                Đang có: {user?.petFoods?.find(x => x.foodId === f.id)?.quantity || 0}
                              </div>
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ padding: "10px 16px", fontSize: "1rem" }}
                              onClick={() => handleBuyFood(f)}
                            >
                              <Heart size={16} fill="white" /> {f.price}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {shopTab === "items" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {ITEMS.map((item) => (
                          <div key={item.id} className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ fontSize: "2.5rem", background: "rgba(0,0,0,0.03)", borderRadius: "20px", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <LazyImage
                                src={`/items/${item.id}.png`}
                                alt={item.name}
                                style={{ width: 48, height: 48, objectFit: 'contain' }}
                                fallback={<div>{item.emoji}</div>}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "var(--text-primary)" }}>{item.name}</div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                {item.desc}
                              </div>
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ padding: "10px 16px", borderRadius: "16px" }}
                              onClick={() => handleBuyItem(item.id)}
                            >
                              <Heart size={16} fill="white" /> {item.price}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Modal: Chọn Thực Phẩm Để Ăn */}
                {modal.type === "feed" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "var(--text-primary)" }}>Tủ Lạnh</h3>
                      <button onClick={() => setModal({ type: "petDetail", petId: modal.petId })} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "20px" }}>Chọn thực phẩm để cho thú cưng ăn.</p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {(() => {
                        const availableFoods = FOODS.map(f => ({ ...f, qty: user?.petFoods?.find(x => x.foodId === f.id)?.quantity || 0 })).filter(f => f.qty > 0);
                        if (availableFoods.length === 0) {
                          return (
                            <div style={{ textAlign: "center", padding: "30px 20px", background: "white", borderRadius: "20px" }}>
                              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🛒</div>
                              <h4 style={{ margin: 0, color: "var(--text-primary)" }}>Tủ lạnh đang trống</h4>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" }}>Vào cửa hàng để mua thức ăn cho bé nhé!</p>
                              <button className="btn btn-primary" style={{ padding: "10px 24px", borderRadius: "16px" }} onClick={() => { setModal({ type: "shop" }); setShopTab("foods"); }}>Đi chợ ngay</button>
                            </div>
                          );
                        }
                        return availableFoods.map(f => (
                          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "white", padding: "12px", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.05)" }}>
                            <div style={{ fontSize: "2rem", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.03)", borderRadius: "16px" }}>
                              <LazyImage
                                src={`/foods/${f.id}.png`}
                                alt={f.name}
                                style={{ width: 40, height: 40, objectFit: 'contain' }}
                                fallback={<div>{f.emoji}</div>}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--text-primary)" }}>{f.name}</div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                Hồi: <span style={{ color: "#f2b155", fontWeight: "bold" }}>+{f.fullness} No</span>
                                {f.happiness > 0 && <span style={{ marginLeft: "8px", color: "#f26989", fontWeight: "bold" }}>+{f.happiness} Vui</span>}
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>Kho: {f.qty}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.9rem", borderRadius: "16px" }} onClick={() => handleCare(modal.petId, "feed", f.id)}>
                                Dùng
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 4. Modal: Bản đồ */}
                {modal.type === "map" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.6rem", margin: 0 }}>Thám Hiểm</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {DESTINATIONS.map((d) => (
                        <div key={d.id} className="card" style={{ padding: "16px", borderLeft: `6px solid ${d.color}`, position: "relative", overflow: "hidden", minHeight: "150px", display: "flex", flexDirection: "column" }}>

                          {/* Map Background */}
                          <div style={{
                            position: "absolute", inset: 0,
                            backgroundImage: `url('/maps/${d.id}.png')`,
                            backgroundSize: "cover", backgroundPosition: "center",
                            opacity: 1, zIndex: 0
                          }} />

                          {/* Fade Overlay for text readability */}
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to right, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.4) 100%)",
                            zIndex: 1
                          }} />

                          <div style={{ position: "relative", zIndex: 2, display: "flex", flex: 1, flexDirection: "column" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "900", fontSize: "1.2rem", color: "var(--text-primary)" }}>{d.name}</div>
                              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "12px", fontWeight: "600", maxWidth: "80%" }}>{d.desc}</p>

                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.8rem" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", borderRadius: "12px", color: "var(--color-primary)", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                  <Timer size={12} /> {formatDurationHours(d.durationHours)}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", borderRadius: "12px", color: "#f2b155", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                  <Heart size={12} fill="#f2b155" /> {d.rewardMin}-{d.rewardMax}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", padding: "4px 8px", borderRadius: "12px", color: "#8f6fff", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                  <Brain size={12} /> ĐK: {d.statRec} đ
                                </span>
                              </div>
                            </div>

                            <button
                              className="btn btn-primary"
                              style={{ width: "100%", marginTop: "16px", background: d.color, boxShadow: `0 4px 12px ${d.color}66`, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                              onClick={() => {
                                const readyPets = pets.filter((p) => isEligibleForExpedition(p, now));
                                if (!readyPets.length) {
                                  addToast("Không có thú cưng rảnh rỗi hoặc đủ điều kiện!", "error");
                                } else {
                                  setSelectedDest(d);
                                  setModal({ type: "selectPet", dest: d });
                                }
                              }}
                            >
                              <MapPin size={16} /> Bắt đầu thám hiểm
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Modal: Chọn thú cưng đi thám hiểm */}
                {modal.type === "selectPet" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)" }}>Cử Đi Thám Hiểm</h3>
                      <button onClick={() => setModal({ type: "map" })} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: "16px", padding: "16px", marginBottom: "20px", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                      Chọn thú cưng đi đến <strong>{modal.dest.name}</strong>. Yêu cầu Điểm tổng hợp ≥ {modal.dest.statRec}.
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {pets.filter(p => isEligibleForExpedition(p, now)).map(pet => {
                        const score = statScoreOf(pet);
                        const canGo = score >= modal.dest.statRec;

                        const speciesDef = SPECIES.find(s => s.id === pet.speciesId);
                        const baseDanger = modal.dest.baseDanger || 0;
                        const fragility = speciesDef ? (speciesDef.fragility || 1.0) : 1.0;
                        const deathChance = Math.max(0, baseDanger * fragility * (1 - pet.level * 0.05));
                        const deathPct = (deathChance * 100).toFixed(1);

                        return (
                          <div key={pet._id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "white", padding: "12px", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.05)", opacity: canGo ? 1 : 0.5 }}>
                            <PetAvatar pet={pet} size="small" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "800", fontSize: "1.1rem", color: "var(--text-primary)" }}>{pet.name}</div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                Điểm tổng: {score.toFixed(1)} | Tử vong: <span style={{ color: '#ff4757', fontWeight: 'bold' }}>{deathPct}%</span>
                              </div>
                            </div>
                            {canGo ? (
                              <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.9rem", background: modal.dest.color, boxShadow: `0 4px 12px ${modal.dest.color}66`, borderRadius: "16px" }} onClick={() => startExpedition(pet._id, modal.dest.id)}>
                                Đi
                              </button>
                            ) : (
                              <div style={{ fontSize: "0.8rem", color: "#ff4757", fontWeight: "bold", textAlign: "center" }}>Không đủ<br />điều kiện</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Modal: Thành viên mới */}
                {modal.type === "reveal" && (
                  <div style={{ textAlign: "center", paddingTop: "20px" }}>
                    <h2 style={{ fontFamily: "var(--font-heading, 'Nunito', sans-serif)", color: "var(--text-primary)", marginBottom: "24px", fontSize: "2rem", fontWeight: "900" }}>
                      Thành viên mới!
                    </h2>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                      <PetAvatar pet={modal.pet} size="big" />
                    </div>
                    <h3 style={{ fontSize: "1.6rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
                      {modal.pet.name}
                    </h3>
                    <div style={{ marginBottom: "24px", display: "flex", justifyContent: "center" }}><RarityBadge rarity={modal.pet.rarity} /></div>
                    <div style={{ display: "flex", gap: "12px", marginBottom: "32px", background: "rgba(0,0,0,0.02)", padding: "16px", borderRadius: "20px" }}>
                      <StatBar icon={Sword} label="STR" value={modal.pet.stats.str} color="#ff4757" />
                      <StatBar icon={Wind} label="AGI" value={modal.pet.stats.agi} color="#4db8ff" />
                      <StatBar icon={Brain} label="INT" value={modal.pet.stats.int} color="#8f6fff" />
                      <StatBar icon={Clover} label="LUK" value={modal.pet.stats.luk} color="#7fd8a6" />
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1.2rem", borderRadius: "20px" }} onClick={() => setModal(null)}>Tuyệt vời!</button>
                  </div>
                )}

                {/* 6.5. Modal: Nhận thưởng */}
                {modal.type === "reward" && (
                  <div style={{ textAlign: "center", paddingTop: "10px", display: "flex", flexDirection: "column", alignItems: "center" }}>



                    <h2 style={{ fontFamily: "var(--font-heading, 'Nunito', sans-serif)", color: "var(--color-primary)", marginBottom: "4px", fontSize: "2.4rem", fontWeight: "900", textShadow: "0 2px 10px rgba(242, 105, 137, 0.2)" }}>
                      Thành Công!
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", marginBottom: "28px", padding: "0 20px", lineHeight: 1.5 }}>
                      Bé <strong style={{ color: "var(--color-primary)", fontSize: "1.15rem" }}>{modal.pet.name}</strong> đã tìm thấy kho báu sau chuyến đi dài!
                    </p>

                    {/* Reward Card */}
                    <div style={{ width: "100%", background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)", backdropFilter: "blur(20px)", padding: "28px 20px", borderRadius: "32px", boxShadow: "0 20px 40px rgba(242, 105, 137, 0.15), inset 0 2px 4px rgba(255,255,255,0.8)", border: "2px solid rgba(255,255,255,0.6)", marginBottom: "32px" }}>

                      {/* Coins/Hearts */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
                        <div style={{ background: "rgba(242, 177, 85, 0.15)", padding: "16px 32px", borderRadius: "24px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid rgba(242, 177, 85, 0.4)", boxShadow: "inset 0 4px 12px rgba(255,255,255,0.8)" }}>
                          <Heart fill="#f2b155" color="#f2b155" size={36} style={{ filter: "drop-shadow(0 4px 12px rgba(242, 177, 85, 0.5))", animation: "pulseAura 1.5s infinite alternate" }} />
                          <span style={{ fontSize: "3rem", fontWeight: "900", color: "#f2b155", textShadow: "0 4px 16px rgba(242, 177, 85, 0.4)", lineHeight: 1 }}>
                            +{modal.data.coins}
                          </span>
                        </div>
                      </div>

                      {/* Foods */}
                      {modal.foundFoods && modal.foundFoods.length > 0 && (
                        <>
                          <div style={{ margin: "24px 0", height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)" }}></div>
                          <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "16px", fontWeight: "800" }}>Chiến lợi phẩm</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                            {modal.foundFoods.map((ff, i) => {
                              const fd = FOODS.find(f => f.id === ff.foodId);
                              return fd ? (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", padding: "8px 16px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.03)" }}>
                                  <span style={{ fontSize: "1.6rem" }}>{fd.emoji}</span>
                                  <span style={{ fontWeight: "900", color: "var(--text-primary)", fontSize: "1.2rem" }}>x{ff.quantity}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {modal.leveled && (
                      <div style={{ background: "linear-gradient(135deg, #7fd8a6 0%, #2d985a 100%)", padding: "12px 24px", borderRadius: "24px", color: "white", fontWeight: "900", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "1.3rem", boxShadow: "0 8px 24px rgba(45, 152, 90, 0.4)", animation: "floatY 2s infinite alternate", border: "2px solid rgba(255,255,255,0.4)", marginBottom: "24px" }}>
                        <Sparkles size={24} color="#fff" fill="#fff" /> Lên cấp {modal.pet.level}!
                      </div>
                    )}

                    <button className="btn btn-primary" style={{ width: "100%", padding: "18px", fontSize: "1.3rem", fontWeight: "900", borderRadius: "24px", background: "linear-gradient(135deg, #f26989 0%, #d94c73 100%)", boxShadow: "0 10px 28px rgba(242, 105, 137, 0.4)", border: "none", color: "white", textTransform: "uppercase", letterSpacing: "1px" }} onClick={() => setModal(null)}>
                      Bỏ túi ngay!
                    </button>
                  </div>
                )}

                {/* 7. Modal: Tử vong */}
                {modal.type === "dead" && (
                  <div style={{ textAlign: "center", paddingTop: "20px" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "16px", animation: "floatY 2s ease-in-out infinite" }}>🪦</div>
                    <h2 style={{ fontFamily: "var(--font-heading)", color: "#ff4757", marginBottom: "16px", fontSize: "1.8rem" }}>
                      Tin buồn...
                    </h2>
                    <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
                      Trong chuyến thám hiểm vừa qua, <strong>{modal.petName}</strong> đã gặp phải nguy hiểm bất ngờ và không thể quay trở về...
                    </p>
                    <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1.1rem", borderRadius: "20px", background: "linear-gradient(to right, #636e72, #2d3436)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }} onClick={() => setModal(null)}>Vĩnh biệt...</button>
                  </div>
                )}

                {/* 8. Modal: Dev Mode */}
                {modal.type === "devMode" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.6rem", margin: 0 }}>🛠️ Dev Mode</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <button className="btn btn-primary" onClick={() => handleDevAction("add_hearts")}>💰 Nhận 5000 Tim</button>
                      <button className="btn btn-primary" onClick={() => handleDevAction("add_food")}>🍖 Thêm tất cả Thức ăn (x5)</button>
                      <button className="btn btn-primary" onClick={() => handleDevAction("level_up")}>⭐ Thăng cấp tất cả Thú cưng</button>
                      <button className="btn btn-primary" onClick={() => handleDevAction("skip_expedition")}>⏩ Hoàn thành Thám hiểm ngay</button>
                      <button className="btn btn-primary" onClick={() => handleDevAction("reset_cooldown")}>⏳ Reset thời gian chờ (Cooldown)</button>
                    </div>
                  </div>
                )}

                {/* 9. Modal: Thách đấu Combat */}
                {modal.type === "teamCombatChallenge" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.4rem", margin: 0 }}>⚔️ Đội Hình Tác Chiến</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>

                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" }}>Chọn tối đa 5 thú cưng để xuất chiến. Vị trí 1-2 là Tiền đạo (chịu sát thương vật lý).</p>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                      {/* Team My */}
                      <div style={{ flex: 1, minWidth: 0, background: "rgba(127, 216, 166, 0.1)", borderRadius: "16px", padding: "8px", border: "2px solid #7fd8a6" }}>
                        <h4 style={{ color: "#2d985a", textAlign: "center", marginBottom: "8px", fontSize: "0.9rem" }}>Phe Bạn (Công)</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {[0, 1, 2, 3, 4].map(idx => {
                            const selectedId = attackTeamSelection[idx];
                            const p = pets.find(x => x._id === selectedId);
                            return (
                              <div key={idx} style={{ height: 50, background: "white", borderRadius: "12px", border: "1px dashed #7fd8a6", display: "flex", alignItems: "center", padding: "0 6px", gap: "6px", minWidth: 0 }} onClick={() => {
                                if (p) setAttackTeamSelection(prev => prev.filter(id => id !== p._id));
                              }}>
                                <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: "50%", background: idx < 2 ? "#ff7675" : "#74b9ff", color: "white", fontSize: "0.7rem", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold" }}>{idx + 1}</div>
                                {p ? (
                                  <>
                                    <LazyImage src={`/pets/${p.speciesId}.png`} alt={p.name} style={{ width: 28, height: 28, flexShrink: 0, objectFit: 'contain' }} fallback={<span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{p.emoji}</span>} />
                                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                  </>
                                ) : <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trống...</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Team Partner (Defense) */}
                      <div style={{ flex: 1, minWidth: 0, background: "rgba(242, 105, 137, 0.1)", borderRadius: "16px", padding: "8px", border: "2px solid #f26989" }}>
                        <h4 style={{ color: "#d94c73", textAlign: "center", marginBottom: "8px", fontSize: "0.9rem" }}>Phe Gấu (Thủ)</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {[0, 1, 2, 3, 4].map(idx => {
                            // Nếu partner có defenseTeam, hiển thị theo đó. Nếu không hiển thị top 5
                            let p;
                            if (partnerDefenseTeam.length > 0) {
                              const defId = partnerDefenseTeam[idx];
                              p = partnerPets.find(x => x._id === defId);
                            } else {
                              const top5 = [...partnerPets].sort((a, b) => (b.stats.str + b.stats.agi + b.stats.int + b.stats.luk) - (a.stats.str + a.stats.agi + a.stats.int + a.stats.luk)).slice(0, 5);
                              p = top5[idx];
                            }

                            return (
                              <div key={idx} style={{ height: 50, background: "white", borderRadius: "12px", border: "1px solid #f26989", display: "flex", alignItems: "center", padding: "0 6px", gap: "6px", minWidth: 0 }}>
                                <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: "50%", background: idx < 2 ? "#ff7675" : "#74b9ff", color: "white", fontSize: "0.7rem", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold" }}>{idx + 1}</div>
                                {p ? (
                                  <>
                                    <LazyImage src={`/pets/${p.speciesId}.png`} alt={p.name} style={{ width: 28, height: 28, flexShrink: 0, objectFit: 'contain' }} fallback={<span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{p.emoji}</span>} />
                                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                  </>
                                ) : <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trống...</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <h4 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Chọn linh thú (Bấm để thêm)</h4>
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px" }}>
                      {pets.filter(p => p.status === 'idle' && (p.care?.happiness >= 30) && (p.care?.fullness >= 30) && !attackTeamSelection.includes(p._id)).map(p => (
                        <div key={p._id} style={{ minWidth: 60, height: 60, background: "var(--bg-glass-strong)", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} onClick={() => {
                          if (attackTeamSelection.length < 5) setAttackTeamSelection(prev => [...prev, p._id]);
                          else addToast("Đội hình tối đa 5 thú cưng!", "error");
                        }}>
                          <LazyImage src={`/pets/${p.speciesId}.png`} alt={p.name} style={{ width: 40, height: 40, objectFit: 'contain' }} fallback={<span style={{ fontSize: "1.8rem" }}>{p.emoji}</span>} />
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "16px", fontSize: "1.1rem", borderRadius: "20px", opacity: combatCooldown > 0 ? 0.6 : 1 }}
                      disabled={combatCooldown > 0}
                      onClick={handleCombat}
                    >
                      {combatCooldown > 0
                        ? `⚔️ ĐẠI CHIẾN ĐANG HỒI (${Math.floor(combatCooldown / 3600000)}h ${Math.floor((combatCooldown % 3600000) / 60000)}m)`
                        : "⚔️ BẮT ĐẦU ĐẠI CHIẾN!"}
                    </button>
                  </div>
                )}

                {/* 11. Modal: Thiết lập Đội Thủ */}
                {modal.type === "defenseTeamSetup" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.4rem", margin: 0 }}>🛡️ Lập Đội Thủ</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={24} /></button>
                    </div>

                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" }}>Thiết lập 5 thú cưng để phòng thủ khi Gấu sang thách đấu. Vị trí 1-2 là Tiền đạo (chịu đòn trước).</p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px", background: "rgba(0,198,255,0.1)", padding: "16px", borderRadius: "16px" }}>
                      {[0, 1, 2, 3, 4].map(idx => {
                        const selectedId = attackTeamSelection[idx];
                        const p = pets.find(x => x._id === selectedId);
                        return (
                          <div key={idx} style={{ height: 60, background: "white", borderRadius: "12px", border: "1px dashed #00c6ff", display: "flex", alignItems: "center", padding: "0 12px", gap: "12px" }} onClick={() => {
                            if (p) setAttackTeamSelection(prev => prev.filter(id => id !== p._id));
                          }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: idx < 2 ? "#ff7675" : "#74b9ff", color: "white", fontSize: "0.8rem", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold" }}>{idx + 1}</div>
                            {p ? (
                              <>
                                <LazyImage src={`/pets/${p.speciesId}.png`} alt={p.name} style={{ width: 40, height: 40, objectFit: 'contain' }} fallback={<span style={{ fontSize: "1.5rem" }}>{p.emoji}</span>} />
                                <div style={{ fontSize: "1rem", fontWeight: "bold", color: "var(--text-primary)", flex: 1 }}>{p.name}</div>
                              </>
                            ) : <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Bấm linh thú bên dưới để thêm vào ô này...</div>}
                          </div>
                        )
                      })}
                    </div>

                    <h4 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Kho linh thú của bạn</h4>
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px" }}>
                      {pets.filter(p => !attackTeamSelection.includes(p._id)).map(p => (
                        <div key={p._id} style={{ minWidth: 60, height: 60, background: "var(--bg-glass-strong)", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} onClick={() => {
                          if (attackTeamSelection.length < 5) setAttackTeamSelection(prev => [...prev, p._id]);
                          else addToast("Đội hình tối đa 5 thú cưng!", "error");
                        }}>
                          <LazyImage src={`/pets/${p.speciesId}.png`} alt={p.name} style={{ width: 40, height: 40, objectFit: 'contain' }} fallback={<span style={{ fontSize: "1.8rem" }}>{p.emoji}</span>} />
                        </div>
                      ))}
                    </div>

                    <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1.1rem", borderRadius: "20px", background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", border: "none", boxShadow: "0 4px 15px rgba(0,198,255,0.4)" }} onClick={() => handleSaveDefenseTeam(attackTeamSelection)}>💾 LƯU ĐỘI THỦ</button>
                  </div>
                )}

                {/* 10. Modal: Playback */}
                {modal.type === "combatPlayback" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "url('/arena-bg-dark.png') center/cover", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
                    <h3 style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "calc(env(safe-area-inset-top, 20px) + 20px) 16px 16px", color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.8)", fontSize: "1.8rem", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px" }}>Đại Chiến Tác Chiến</h3>

                    <div style={{ position: "relative", zIndex: 1, display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
                      {/* Team A */}
                      <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: "25px", minWidth: 0 }}>
                        {/* Hậu vệ */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "15px" }}>
                          {combatTeamA.filter(p => p.slot >= 3).map(p => (
                            <PetCombatSprite key={p._id} pet={p} currentLog={currentDamageLog} />
                          ))}
                        </div>
                        {/* Tiền đạo */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "40px" }}>
                          {combatTeamA.filter(p => p.slot <= 2).map(p => (
                            <PetCombatSprite key={p._id} pet={p} currentLog={currentDamageLog} />
                          ))}
                        </div>
                      </div>

                      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center", fontWeight: "900", color: "#ff4757", fontSize: "1.8rem", textShadow: "0 2px 8px rgba(0,0,0,0.8)", zIndex: 0, opacity: 0.5 }}>VS</div>

                      {/* Team B */}
                      <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: "25px", minWidth: 0 }}>
                        {/* Tiền đạo */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "40px" }}>
                          {combatTeamB.filter(p => p.slot <= 2).map(p => (
                            <PetCombatSprite key={p._id} pet={p} currentLog={currentDamageLog} />
                          ))}
                        </div>
                        {/* Hậu vệ */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "15px" }}>
                          {combatTeamB.filter(p => p.slot >= 3).map(p => (
                            <PetCombatSprite key={p._id} pet={p} currentLog={currentDamageLog} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ position: "relative", zIndex: 1, background: "rgba(0,0,0,0.6)", color: "white", padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: "bold", minHeight: "24px" }}>
                        {currentDamageLog?.msg || "Trận đấu chuẩn bị bắt đầu..."}
                      </div>

                      <button
                        onClick={handleNextTurn}
                        style={{
                          padding: "12px 40px",
                          fontSize: "1.2rem",
                          fontWeight: "bold",
                          borderRadius: "30px",
                          background: "linear-gradient(135deg, #ff9f43, #ff6b6b)",
                          color: "white",
                          border: "3px solid white",
                          boxShadow: "0 8px 24px rgba(255, 107, 107, 0.5)",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          animation: "pulseCombatBtn 2s infinite"
                        }}
                      >
                        {playbackIdx >= combatLogs?.length ? "Kết Thúc" : "Tiếp Theo ⏭️"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 11. Modal: Kết quả Combat */}
                {modal.type === "combatLogs" && combatResult && (
                  <div>
                    <h2 style={{ fontFamily: "var(--font-heading)", color: combatResult.isWin ? "var(--color-primary)" : "#ff4757", fontSize: "2rem", margin: "0 0 16px", textAlign: "center" }}>
                      {combatResult.isWin ? "ĐẠI THẮNG!" : "THẤT BẠI..."}
                    </h2>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px" }}>
                      <div style={{ background: "#4db8ff22", color: "#4db8ff", padding: "8px 16px", borderRadius: "20px", fontWeight: "bold", textAlign: "center" }}>
                        EXP Cả Đội<br />
                        <span style={{ fontSize: "1.5rem" }}>+{combatResult.expGain}</span>
                      </div>
                      {combatResult.reward > 0 && (
                        <div style={{ background: "#f2698922", color: "var(--color-primary)", padding: "8px 16px", borderRadius: "20px", fontWeight: "bold", textAlign: "center" }}>
                          Quà Tặng<br />
                          <span style={{ fontSize: "1.5rem" }}>+{combatResult.reward} ❤️</span>
                        </div>
                      )}
                    </div>

                    {combatResult.leveledPets && combatResult.leveledPets.length > 0 && (
                      <p style={{ textAlign: "center", color: "#f2b155", fontWeight: "bold", marginBottom: "16px", animation: "pulseAura 1s infinite alternate" }}>
                        🎉 Đã thăng cấp: {combatResult.leveledPets.join(", ")}! 🎉
                      </p>
                    )}

                    <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
                      *Lưu ý: Toàn đội đã tiêu hao rất nhiều thể lực (Độ Vui vẻ & Độ No). Hãy chăm sóc các bé nhé!
                    </p>

                    <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1.1rem", borderRadius: "20px" }} onClick={() => setModal(null)}>Trở về Vườn</button>
                  </div>
                )}

                {/* 12. Modal: Lịch Sử Đại Chiến */}
                {modal.type === "combatHistory" && (
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.4rem", margin: 0 }}>📜 Lịch Sử Đại Chiến</h2>
                      <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={24} /></button>
                    </div>

                    <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px" }}>
                      {combatHistoryList.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                          Chưa có trận chiến nào được ghi nhận.
                        </div>
                      ) : (
                        combatHistoryList.map(h => {
                          const isMeAttacker = h.attackerId === user._id;
                          const didIWin = isMeAttacker ? h.isAttackerWin : !h.isAttackerWin;

                          let bgColor = didIWin ? "rgba(46, 204, 113, 0.1)" : "rgba(231, 76, 60, 0.1)";
                          let borderColor = didIWin ? "#2ecc71" : "#e74c3c";
                          let textColor = didIWin ? "#27ae60" : "#c0392b";

                          let message = "";
                          if (isMeAttacker) {
                            message = h.isAttackerWin
                              ? `Bạn đã càn quét Đội Thủ của Gấu! 🏆 +${h.reward} tim`
                              : `Bạn đã thất bại khi công thành! ☠️`;
                          } else {
                            message = h.isAttackerWin
                              ? `Gấu đã đánh tan Đội Thủ của bạn! 💔 Bị cướp ${h.reward} tim`
                              : `Đội Thủ của bạn đã phòng ngự xuất sắc trước đợt tấn công của Gấu! 🛡️`;
                          }

                          // Format time
                          const dateObj = new Date(h.createdAt);
                          const timeStr = dateObj.toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

                          return (
                            <div key={h._id} style={{ padding: "12px", borderRadius: "16px", background: bgColor, borderLeft: `4px solid ${borderColor}`, display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ fontSize: "0.95rem", fontWeight: "bold", color: textColor }}>{message}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{timeStr}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
      body, html {
        overflow: hidden;
      }
      .garden-wrap {
        background-image: url('/garden-bg.png');
        background-size: cover;
        background-position: center bottom;
        background-repeat: no-repeat;
        height: 100vh;
        width: 100vw;
        position: relative;
        overflow: hidden;
      }
      .garden-wrap::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.4) 100%);
        pointer-events: none;
      }
      .garden-area {
        position: absolute;
        top: 130px;
        bottom: 100px;
        left: 0;
        right: 0;
      }
      .garden-pet {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: filter 0.2s;
        transform: translateX(-50%);
      }
      .garden-pet:active {
        filter: brightness(0.8);
      }
      .pet-float { 
        animation: floatY 4s ease-in-out infinite; 
      }
      @keyframes floatY { 
        0%, 100% { transform: translateX(-50%) translateY(0); } 
        50% { transform: translateX(-50%) translateY(-15px); } 
      }
      @keyframes auraSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes auraPulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.15); }
      }
      @keyframes contourFire {
        0% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.8)) drop-shadow(0 -4px 8px #f1c40f) drop-shadow(0 -8px 16px #e74c3c); transform: translateY(0); }
        50% { filter: drop-shadow(0 0 4px #fff) drop-shadow(0 -8px 12px #f39c12) drop-shadow(0 -16px 24px #d35400) drop-shadow(0 -24px 32px #c0392b); transform: translateY(-4px); }
        100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.8)) drop-shadow(0 -4px 8px #f1c40f) drop-shadow(0 -8px 16px #e74c3c); transform: translateY(0); }
      }
      
      /* Cải thiện thanh cuộn cho Modal */
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }
    `}} />
  );
}
