import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';


const STATUS_MAP = {
  pending:   { label: 'Đang chờ',      color: '#d97706', bg: 'rgba(251,191,36,0.12)',   icon: 'schedule'         },
  confirmed: { label: 'Đang thực hiện', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', icon: 'autorenew'        },
  fulfilled: { label: 'Đã thực hiện',  color: '#16a34a', bg: 'rgba(34,197,94,0.12)',    icon: 'check_circle'     },
  rejected:  { label: 'Bị từ chối',    color: '#dc2626', bg: 'rgba(239,68,68,0.12)',    icon: 'block'            },
  cancelled: { label: 'Đã huỷ',        color: '#6b7280', bg: 'rgba(107,114,128,0.10)',  icon: 'cancel'           },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, color: '#888', bg: 'rgba(0,0,0,0.06)', icon: 'info' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '999px',
      background: s.bg, color: s.color,
      fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {s.label}
    </span>
  );
};

const MyOrdersPage = () => {
  const { updateUser } = useAuth();
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null); // order id đang chờ xác nhận cancel

  const fetchMyOrders = async () => {
    try {
      const res = await api.get('/store/my-orders');
      if (res.data.success) setMyOrders(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) updateUser(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMyOrders(); }, []);

  const handleCancel = async (orderId) => {
    try {
      const res = await api.put(`/store/orders/${orderId}/status`, { action: 'cancel' });
      if (res.data.success) { fetchMyOrders(); fetchUserData(); }
    } catch (e) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setConfirmId(null); }
  };

  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(
    location.state?.filter || 'all'
  );


  const FILTERS = [
    { key: 'all',       label: 'Tất cả' },
    { key: 'pending',   label: 'Đang chờ' },
    { key: 'confirmed', label: 'Đang thực hiện' },
    { key: 'fulfilled', label: 'Đã thực hiện' },
    { key: 'cancelled', label: 'Đã huỷ' },
    { key: 'rejected',  label: 'Bị từ chối' },
  ];

  const filtered = activeFilter === 'all' ? myOrders : myOrders.filter(o => o.status === activeFilter);

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };


  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Section Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', letterSpacing: '2px', color: '#b98868', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e87a90', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          MÓN QUÀ ĐÃ ĐẶT
        </div>
        <h2 style={{ margin: 0, fontSize: '1.9rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#0d1b2a', fontWeight: 600, lineHeight: 1.15 }}>
          Giỏ hàng của bạn
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.92rem', color: '#8d99ae', fontStyle: 'italic' }}>
          Theo dõi các đơn hàng bạn đã đặt
        </p>
      </div>

      {/* Filter chips */}
      {!loading && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '999px',
                border: activeFilter === f.key ? 'none' : '1.5px solid rgba(255,183,197,0.4)',
                background: activeFilter === f.key
                  ? 'linear-gradient(135deg, #f9a8c9, #e84393)'
                  : 'rgba(255,255,255,0.7)',
                color: activeFilter === f.key ? '#fff' : '#8c5a6b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: activeFilter === f.key ? '0 3px 10px rgba(232,67,147,0.3)' : 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#f9a8c9', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!loading && myOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.55)', borderRadius: '24px', border: '1.5px dashed rgba(242,105,137,0.25)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'rgba(242,105,137,0.35)', display: 'block', marginBottom: '12px', fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
          <p style={{ margin: 0, color: '#b0a0a8', fontSize: '1rem', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>Giỏ hàng đang trống...</p>
          <p style={{ margin: '6px 0 0 0', color: '#c4b0b8', fontSize: '0.85rem' }}>Hãy ghé tạp hoá của người ấy nhé!</p>
        </motion.div>
      )}

      {/* Filtered empty */}
      {!loading && myOrders.length > 0 && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.55)', borderRadius: '24px', border: '1.5px dashed rgba(242,105,137,0.2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(242,105,137,0.3)', display: 'block', marginBottom: '8px' }}>filter_list_off</span>
          <p style={{ margin: 0, color: '#b0a0a8', fontSize: '0.95rem', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>Không có đơn nào theo trạng thái này</p>
        </motion.div>
      )}

      {/* Order List */}
      {!loading && filtered.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((o) => (
            <motion.div key={o._id} variants={itemVariants}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,240,245,0.85) 100%)',
                borderRadius: '20px',
                border: '1.5px solid rgba(255,183,197,0.35)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(242,105,137,0.08)',
                overflow: 'hidden',
              }}>
                {/* Card Body */}
                <div style={{ display: 'flex', gap: '14px', padding: '16px', alignItems: 'center' }}>
                  {/* Product Image */}
                  {o.product?.image && (
                    <div style={{ width: '68px', height: '68px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                      <img src={o.product.image} alt={o.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                    <h4 style={{
                      margin: 0, fontSize: '1rem',
                      fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#1a1a2e',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {o.product?.name || 'Sản phẩm đã xoá'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e84393', fontWeight: 800, fontSize: '0.97rem' }}>
                        {o.priceAtPurchase}
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        {o.quantity > 1 && <span style={{ color: '#8d99ae', fontWeight: 500, fontSize: '0.8rem' }}>× {o.quantity}</span>}
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                </div>

                {/* Cancel Button */}
                {o.status === 'pending' && (
                  <div style={{ padding: '12px 16px 16px 16px' }}>
                    <button
                      onClick={() => setConfirmId(o._id)}
                      style={{
                        width: '100%', padding: '10px', border: '1.5px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px', background: 'rgba(255,240,242,0.8)',
                        color: '#dc2626', fontWeight: 700, fontSize: '0.88rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px', transition: 'all 0.2s'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      Huỷ đơn
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Confirm Cancel Modal */}
      <AnimatePresence>
        {confirmId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
            >
              <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '99px', margin: '0 auto 24px' }} />
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', color: '#f87171', fontVariationSettings: "'FILL' 1" }}>cancel</span>
                <h3 style={{ margin: '10px 0 6px', fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#1a1a2e' }}>Huỷ đơn hàng?</h3>
                <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.9rem' }}>Sau khi huỷ, Heart sẽ được hoàn lại cho bạn.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setConfirmId(null)}
                  style={{ flex: 1, padding: '13px', border: '1.5px solid #e5e7eb', borderRadius: '14px', background: 'white', color: '#4b5563', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  Không
                </button>
                <button
                  onClick={() => handleCancel(confirmId)}
                  style={{ flex: 1, padding: '13px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #f87171, #dc2626)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.25)' }}
                >
                  Xác nhận huỷ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyOrdersPage;
