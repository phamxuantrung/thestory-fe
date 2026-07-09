import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import ImageLoader from '../../components/ImageLoader';

const STATUS_MAP = {
  pending:   { label: 'Đang chờ',      color: '#d97706', bg: 'rgba(251,191,36,0.12)',  icon: 'schedule'        },
  confirmed: { label: 'Đang thực hiện', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', icon: 'autorenew'       },

  fulfilled: { label: 'Đã thực hiện',  color: '#16a34a', bg: 'rgba(34,197,94,0.12)',   icon: 'check_circle'    },
  rejected:  { label: 'Bị từ chối',    color: '#dc2626', bg: 'rgba(239,68,68,0.12)',   icon: 'cancel'          },
  cancelled: { label: 'Đã huỷ',        color: '#dc2626', bg: 'rgba(239,68,68,0.12)',   icon: 'do_not_disturb' },
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

const ManageOrdersPage = () => {
  const { updateUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { orderId, action, label }

  const fetchOrders = async () => {
    try {
      const res = await api.get('/store/partner-orders');
      if (res.data.success) setOrders(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) updateUser(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      const res = await api.put(`/store/orders/${actionModal.orderId}/status`, { action: actionModal.action });
      if (res.data.success) { fetchOrders(); fetchUserData(); }
    } catch (e) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setActionModal(null); }
  };

  const [activeFilter, setActiveFilter] = useState('pending');

  const FILTERS = [
    { key: 'all',       label: 'Tất cả' },
    { key: 'pending',   label: 'Đang chờ' },
    { key: 'confirmed', label: 'Đang thực hiện' },
    { key: 'fulfilled', label: 'Đã thực hiện' },
    { key: 'rejected',  label: 'Đã từ chối' },
    { key: 'cancelled', label: 'Đã huỷ' },
  ];

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter);

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };


  const actionConfig = {
    confirm:  { label: 'Xác nhận đơn',     btnColor: 'linear-gradient(135deg, #34d399, #16a34a)', shadowColor: 'rgba(22,163,74,0.25)',    icon: 'verified',   confirmIcon: 'check_circle' },
    reject:   { label: 'Từ chối đơn',      btnColor: 'linear-gradient(135deg, #f87171, #dc2626)', shadowColor: 'rgba(220,38,38,0.25)',    icon: 'cancel',     confirmIcon: 'cancel'       },
    fulfill:  { label: 'Đánh dấu đã thực hiện', btnColor: 'linear-gradient(135deg, #60a5fa, #2563eb)', shadowColor: 'rgba(37,99,235,0.25)', icon: 'task_alt',   confirmIcon: 'task_alt'     },
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Section Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', letterSpacing: '2px', color: '#b98868', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e87a90', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          QUẢN LÝ ĐƠN HÀNG
        </div>
        <h2 style={{ margin: 0, fontSize: '1.9rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#0d1b2a', fontWeight: 600, lineHeight: 1.15 }}>
          Đơn nhận được
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.92rem', color: '#8d99ae', fontStyle: 'italic' }}>
          Xử lý các yêu cầu từ người ấy
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
      {!loading && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.55)', borderRadius: '24px', border: '1.5px dashed rgba(242,105,137,0.25)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'rgba(242,105,137,0.35)', display: 'block', marginBottom: '12px', fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <p style={{ margin: 0, color: '#b0a0a8', fontSize: '1rem', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>Chưa có đơn hàng nào</p>
          <p style={{ margin: '6px 0 0 0', color: '#c4b0b8', fontSize: '0.85rem' }}>Người ấy chưa đặt gì từ tạp hoá của bạn</p>
        </motion.div>
      )}

      {/* Filtered empty */}
      {!loading && orders.length > 0 && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.55)', borderRadius: '24px', border: '1.5px dashed rgba(242,105,137,0.2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(242,105,137,0.3)', display: 'block', marginBottom: '8px' }}>filter_list_off</span>
          <p style={{ margin: 0, color: '#b0a0a8', fontSize: '0.95rem', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>Không có đơn nào ở trạng thái này</p>
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
                      <ImageLoader src={o.product.image} alt={o.product?.name} style={{ width: '100%', height: '100%' }} />
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

                {/* Action Buttons */}
                {(o.status === 'pending' || o.status === 'confirmed') && (
                  <div style={{ padding: '12px 16px 16px 16px', display: 'flex', gap: '10px' }}>
                    {o.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setActionModal({ orderId: o._id, action: 'confirm', ...actionConfig.confirm })}
                          style={{
                            flex: 1, padding: '10px 8px', border: 'none', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                            color: '#065f46', fontWeight: 700, fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '5px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>verified</span>
                          Xác nhận
                        </button>
                        <button
                          onClick={() => setActionModal({ orderId: o._id, action: 'reject', ...actionConfig.reject })}
                          style={{
                            flex: 1, padding: '10px 8px', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '12px',
                            background: 'rgba(255,240,242,0.9)',
                            color: '#dc2626', fontWeight: 700, fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '5px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                          Từ chối
                        </button>
                      </>
                    )}
                    {o.status === 'confirmed' && (
                      <button
                        onClick={() => setActionModal({ orderId: o._id, action: 'fulfill', ...actionConfig.fulfill })}
                        style={{
                          flex: 1, padding: '10px', border: 'none', borderRadius: '12px',
                          background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                          color: '#1d4ed8', fontWeight: 700, fontSize: '0.88rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        Đã thực hiện
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Action Confirm Modal (Bottom Sheet) */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActionModal(null)}
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
                <span className="material-symbols-outlined" style={{ fontSize: '44px', fontVariationSettings: "'FILL' 1", background: actionModal.btnColor, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {actionModal.confirmIcon}
                </span>
                <h3 style={{ margin: '10px 0 6px', fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#1a1a2e' }}>{actionModal.label}?</h3>
                <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.9rem' }}>Hành động này sẽ cập nhật trạng thái đơn hàng.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setActionModal(null)}
                  style={{ flex: 1, padding: '13px', border: '1.5px solid #e5e7eb', borderRadius: '14px', background: 'white', color: '#4b5563', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleAction}
                  style={{ flex: 1, padding: '13px', border: 'none', borderRadius: '14px', background: actionModal.btnColor, color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 14px ${actionModal.shadowColor}` }}
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageOrdersPage;
