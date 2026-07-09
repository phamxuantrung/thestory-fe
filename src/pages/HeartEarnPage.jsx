import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { heartService } from '../services/heartService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CATEGORY_COLOR = {
  chat: { bg: 'rgba(59,130,246,0.1)', icon: '#3b82f6' },
  memory: { bg: 'rgba(168,85,247,0.1)', icon: '#a855f7' },
  mood: { bg: 'rgba(251,191,36,0.12)', icon: '#d97706' },
  letter: { bg: 'rgba(232,67,147,0.1)', icon: '#e84393' },
  location: { bg: 'rgba(249,115,22,0.1)', icon: '#f97316' },
  store: { bg: 'rgba(236,72,153,0.1)', icon: '#ec4899' },
  game: { bg: 'rgba(16,185,129,0.1)', icon: '#10b981' },
  tree: { bg: 'rgba(34,197,94,0.1)', icon: '#22c55e' },
  quest: { bg: 'rgba(99,102,241,0.1)', icon: '#6366f1' },
  diary: { bg: 'rgba(20,184,166,0.1)', icon: '#14b8a6' },
  checkin: { bg: 'rgba(245,158,11,0.1)', icon: '#f59e0b' },
  other: { bg: 'rgba(107,114,128,0.1)', icon: '#6b7280' },
};

// ── HeartParticle animation ───────────────────────────────────────────────────
const HeartBurst = ({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {[...Array(8)].map((_, i) => (
        <motion.div key={i}
          initial={{ opacity: 1, y: '50vh', x: `${30 + i * 5}vw`, scale: 0.6 }}
          animate={{ opacity: 0, y: `${10 + Math.random() * 30}vh`, x: `${25 + i * 6 + (Math.random() - 0.5) * 10}vw`, scale: 1.4 }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: i * 0.05 }}
          style={{ position: 'absolute', fontSize: '1.6rem' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#e84393', fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </motion.div>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const HeartEarnPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [checkin, setCheckin] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [verifyingTask, setVerifyingTask] = useState(null); // taskId đang kiểm tra
  const [verifiedTasks, setVerifiedTasks] = useState({}); // { taskId: true | { reason } }
  const [showBurst, setShowBurst] = useState(false);
  const [earnedMsg, setEarnedMsg] = useState('');

  // Ngày hôm nay trong tuần (0=T2...6=CN)
  const todayDayOfWeek = (() => {
    const vnStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnStr);
    return (vnDate.getDay() + 6) % 7;
  })();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([heartService.getCheckin(), heartService.getTasks()]);
      if (c.success) setCheckin(c.data);
      if (t.success) {
        setTasks(t.data);
        // Tự động verify tất cả task chưa hoàn thành
        const pending = t.data?.tasks?.filter(task => !task.completed) ?? [];
        if (pending.length > 0) {
          const results = await Promise.all(
            pending.map(task =>
              heartService.verifyTask(task.taskId)
                .then(res => ({ taskId: task.taskId, verified: res.verified, reason: res.reason }))
                .catch(() => ({ taskId: task.taskId, verified: false, reason: null }))
            )
          );
          const verifyMap = {};
          results.forEach(({ taskId, verified, reason }) => {
            verifyMap[taskId] = verified ? true : (reason ? { reason } : false);
          });
          setVerifiedTasks(verifyMap);
        }
      }
    } catch {
      showToast('Không thể tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCheckin = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await heartService.doCheckin();
      if (res.success) {
        setCheckin(res.data);
        updateUser({ heart: res.newTotal });
        setEarnedMsg(`+${res.heartEarned}`);
        setShowBurst(true);
        showToast(`Điểm danh thành công! +${res.heartEarned} Heart`, 'success');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi điểm danh', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleVerifyTask = async (taskId) => {
    if (verifyingTask) return;
    setVerifyingTask(taskId);
    try {
      const res = await heartService.verifyTask(taskId);
      if (res.success) {
        if (res.verified) {
          setVerifiedTasks(prev => ({ ...prev, [taskId]: true }));
          showToast('Hoàn thành nhiệm vụ! Bấm nhận Heart để nhận thưởng ❤️', 'success');
        } else {
          setVerifiedTasks(prev => ({ ...prev, [taskId]: { reason: res.reason } }));
          showToast(res.reason || 'Chưa hoàn thành điều kiện', 'error');
        }
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi kiểm tra', 'error');
    } finally {
      setVerifyingTask(null);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (completingTask) return;
    setCompletingTask(taskId);
    try {
      const res = await heartService.completeTask(taskId);
      if (res.success) {
        setTasks(res.data);
        updateUser({ heart: res.newTotal });
        setEarnedMsg(`+${res.heartEarned}`);
        setShowBurst(true);
        showToast(`Hoàn thành! +${res.heartEarned} Heart`, 'success');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi hoàn thành nhiệm vụ', 'error');
    } finally {
      setCompletingTask(null);
    }
  };

  const todayChecked = checkin?.days?.[todayDayOfWeek]?.checkedIn ?? false;
  const tasksCompleted = tasks?.tasks?.filter(t => t.completed).length ?? 0;
  const tasksTotal = tasks?.tasks?.length ?? 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fdf2f8 0%, #fff 50%, #fce7f3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#f9a8c9', fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fdf2f8 0%, #fff 50%, #fce7f3 100%)', paddingBottom: '80px' }}>
      <Header title="Kiếm Heart" showBack={true} />

      {/* Heart burst animation */}
      {showBurst && <HeartBurst onDone={() => { setShowBurst(false); setEarnedMsg(''); }} />}

      {/* Earned popup */}
      <AnimatePresence>
        {earnedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.6 }}
            style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', color: 'white', padding: '10px 24px', borderRadius: '999px', fontWeight: 800, fontSize: '1.3rem', zIndex: 9000, boxShadow: '0 8px 24px rgba(232,67,147,0.4)', pointerEvents: 'none' }}
          >
            {earnedMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '0 1.5rem', marginTop: 'calc(5rem + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', letterSpacing: '2px', color: '#b98868', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e87a90', fontVariationSettings: "'FILL' 1" }}>favorite</span>
            KIẾM HEART
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '2rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#0d1b2a', fontWeight: 700, lineHeight: 1.15 }}>
            Nhận Heart hằng ngày
          </h1>
          <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.9rem', fontStyle: 'italic' }}>
            Điểm danh &amp; hoàn thành nhiệm vụ để kiếm Heart
          </p>
        </motion.div>

        {/* Heart balance card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: 'linear-gradient(135deg, #f9a8c9 0%, #e84393 100%)', borderRadius: '24px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 8px 32px rgba(232,67,147,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Số Heart hiện có</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{user?.heart ?? 0}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'white', fontVariationSettings: "'FILL' 1" }}>favorite</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>Nhiệm vụ tuần</p>
            <p style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>{tasksCompleted}/{tasksTotal}</p>
          </div>
        </motion.div>

        {/* ── Điểm danh section ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: '24px', padding: '20px', marginBottom: '16px', border: '1.5px solid rgba(255,183,197,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e84393', fontVariationSettings: "'FILL' 1" }}>event_available</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#1a1a2e', fontWeight: 700 }}>Điểm danh hằng tuần</h2>
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#8d99ae' }}>
              {checkin?.days?.filter(d => d.checkedIn).length ?? 0}/7 ngày
            </span>
          </div>

          {/* 7-day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '16px' }}>
            {checkin?.days?.map((day, idx) => {
              const isToday = idx === todayDayOfWeek;
              const isPast = idx < todayDayOfWeek;
              return (
                <motion.div
                  key={idx}
                  whileTap={isToday && !day.checkedIn ? { scale: 0.92 } : {}}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '8px 4px', borderRadius: '14px', cursor: isToday && !day.checkedIn ? 'pointer' : 'default',
                    background: day.checkedIn
                      ? 'linear-gradient(135deg, #f9a8c9, #e84393)'
                      : isToday
                        ? 'rgba(249,168,201,0.15)'
                        : 'rgba(0,0,0,0.03)',
                    border: isToday && !day.checkedIn
                      ? '2px solid rgba(232,67,147,0.5)'
                      : day.checkedIn
                        ? '2px solid transparent'
                        : '2px solid transparent',
                    opacity: isPast && !day.checkedIn ? 0.4 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: day.checkedIn ? 'white' : isToday ? '#e84393' : '#8d99ae', textTransform: 'uppercase' }}>
                    {DAY_LABELS[idx]}
                  </span>
                  {day.checkedIn ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isToday ? '#e84393' : '#8d99ae' }}>+{day.heartReward}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Checkin button */}
          <motion.button
            whileTap={!todayChecked ? { scale: 0.97 } : {}}
            onClick={!todayChecked ? handleCheckin : undefined}
            disabled={todayChecked || checkingIn}
            style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '16px',
              background: todayChecked
                ? 'rgba(107,114,128,0.08)'
                : 'linear-gradient(135deg, #f9a8c9, #e84393)',
              color: todayChecked ? '#9ca3af' : 'white',
              fontWeight: 700, fontSize: '0.95rem', cursor: todayChecked ? 'not-allowed' : 'pointer',
              boxShadow: todayChecked ? 'none' : '0 4px 16px rgba(232,67,147,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: todayChecked ? "'FILL' 1" : "'FILL' 0" }}>
              {todayChecked ? 'check_circle' : 'event_available'}
            </span>
            {checkingIn ? 'Đang điểm danh...' : todayChecked ? `Đã điểm danh hôm nay (+${checkin?.days?.[todayDayOfWeek]?.heartReward})` : `Điểm danh hôm nay (+${checkin?.days?.[todayDayOfWeek]?.heartReward ?? 0})`}
          </motion.button>
        </motion.div>

        {/* ── Nhiệm vụ tuần section ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e84393', fontVariationSettings: "'FILL' 1" }}>assignment</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#1a1a2e', fontWeight: 700 }}>Nhiệm vụ tuần này</h2>
            {tasksTotal > 0 && (
              <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '999px', background: 'rgba(232,67,147,0.1)', color: '#e84393', fontSize: '0.78rem', fontWeight: 700 }}>
                {tasksCompleted}/{tasksTotal}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {tasksTotal > 0 && (
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', marginBottom: '14px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(tasksCompleted / tasksTotal) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #f9a8c9, #e84393)', borderRadius: '999px' }}
              />
            </div>
          )}

          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks?.tasks?.map((task, idx) => {
              const cat = CATEGORY_COLOR[task.category] || CATEGORY_COLOR.other;
              return (
                <motion.div
                  key={task.taskId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + idx * 0.06 }}
                  style={{
                    background: task.completed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '18px',
                    padding: '14px 16px',
                    border: task.completed ? '1.5px solid rgba(34,197,94,0.2)' : '1.5px solid rgba(255,183,197,0.25)',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    opacity: task.completed ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Category icon */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: cat.icon, fontVariationSettings: "'FILL' 1" }}>{task.icon}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.92rem', color: task.completed ? '#9ca3af' : '#1a1a2e', textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.title}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#8d99ae' }}>
                      {task.description}
                    </p>
                  </div>

                  {/* Reward & action */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#e84393', fontWeight: 800, fontSize: '0.9rem' }}>
                      +{task.heartReward}
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </div>

                    {task.completed ? (
                      // Đã hoàn thành
                      <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#22c55e', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : verifiedTasks[task.taskId] === true ? (
                      // Đủ điều kiện → nút nhận hồng
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleCompleteTask(task.taskId)}
                        disabled={completingTask === task.taskId}
                        style={{ padding: '6px 13px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 2px 10px rgba(232,67,147,0.35)', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        {completingTask === task.taskId ? '...' : 'Nhận!'}
                      </motion.button>
                    ) : (
                      // Chưa đủ điều kiện → nút xám, không bấm được
                      <button
                        disabled
                        style={{ padding: '6px 12px', border: 'none', borderRadius: '12px', background: 'rgba(0,0,0,0.06)', color: '#b0b7c3', fontWeight: 600, fontSize: '0.75rem', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                        Chưa đủ
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* All done state */}
          {tasksCompleted === tasksTotal && tasksTotal > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '24px', marginTop: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: '20px', border: '1.5px dashed rgba(34,197,94,0.3)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#22c55e', fontVariationSettings: "'FILL' 1", display: 'block', marginBottom: '8px' }}>celebration</span>
              <p style={{ margin: '0 0 4px', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700, color: '#1a1a2e', fontSize: '1rem' }}>Hoàn thành tất cả!</p>
              <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.85rem' }}>Nhiệm vụ mới sẽ xuất hiện vào tuần sau 💌</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HeartEarnPage;
