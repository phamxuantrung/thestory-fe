import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

// ── Success modal ─────────────────────────────────────────────────
const SuccessModal = ({ product, onClose }) => (
  <AnimatePresence>
    {product && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{ width: '100%', maxWidth: '340px', background: 'white', borderRadius: '28px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          {/* Animated check */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '38px', color: 'white', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </motion.div>

          <h3 style={{ margin: '0 0 6px', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1.4rem', color: '#1a1a2e' }}>Đặt hàng thành công!</h3>
          <p style={{ margin: '0 0 6px', color: '#8d99ae', fontSize: '0.9rem' }}>
            <strong style={{ color: '#1a1a2e' }}>{product.name}</strong>
          </p>
          <p style={{ margin: '0 0 24px', color: '#8d99ae', fontSize: '0.88rem' }}>Đơn hàng đang chờ người ấy xác nhận nhé 💌</p>

          <button
            onClick={onClose}
            style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(232,67,147,0.3)' }}
          >
            Xem giỏ hàng
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Error modal ───────────────────────────────────────────────────
const ErrorModal = ({ message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '320px', background: 'white', borderRadius: '24px', padding: '28px 24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '44px', color: '#f87171', fontVariationSettings: "'FILL' 1", display: 'block', marginBottom: '12px' }}>error</span>
          <h3 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#1a1a2e' }}>Oops!</h3>
          <p style={{ margin: '0 0 20px', color: '#8d99ae', fontSize: '0.9rem' }}>{message}</p>
          <button onClick={onClose} style={{ width: '100%', padding: '13px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #f87171, #dc2626)', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Đóng</button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Main Page ─────────────────────────────────────────────────────
const PartnerStorePage = () => {
  const navigate = useNavigate();
  const { partner, updateUser } = useAuth();
  const [partnerProducts, setPartnerProducts] = useState([]);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  const [successProduct, setSuccessProduct] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchPartnerProducts = async () => {
    try {
      const res = await api.get('/store/partner-products');
      if (res.data.success) setPartnerProducts(res.data.data);
    } catch (e) { console.error(e); }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) updateUser(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPartnerProducts();
    fetchUserData();
  }, []);

  const openBuyModal = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setIsBuyModalOpen(true);
  };

  const closeBuyModal = () => {
    setIsBuyModalOpen(false);
    setSelectedProduct(null);
  };

  const handleBuy = async () => {
    if (!selectedProduct || buying) return;
    setBuying(true);
    try {
      const res = await api.post('/store/buy', { productId: selectedProduct._id, quantity });
      if (res.data.success) {
        closeBuyModal();
        fetchUserData();
        fetchPartnerProducts();
        setSuccessProduct(selectedProduct);
      }
    } catch (e) {
      setErrorMessage(e.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setBuying(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessProduct(null);
    navigate('/store/cart', { state: { filter: 'pending' } });
  };

  return (
    <div className="partner-store-container" style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Store Banner */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', letterSpacing: '2px', color: '#b98868', fontWeight: 600, textTransform: 'uppercase' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#e87a90', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          CURATED BOUTIQUE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h2 style={{ margin: 0, fontSize: '2.2rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#0d1b2a', fontWeight: 600, lineHeight: 1.1 }}>
            Tạp hoá của
          </h2>
          <h2 style={{ margin: 0, fontSize: '2.8rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', background: 'linear-gradient(90deg, #e5989b, #ffb5a7, #e5989b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, lineHeight: 1.1, paddingRight: '8px', paddingBottom: '12px', marginTop: '-4px' }}>
            {partner?.displayName || 'Người ấy'}
          </h2>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#8d99ae', fontStyle: 'italic' }}>
          Khám phá những món quà yêu thương
        </p>
      </div>

      {/* Product List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#8c5a6b', fontSize: '1.1rem' }}>Sản phẩm nổi bật ({partnerProducts.length})</h3>
      </div>

      <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {partnerProducts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(242, 105, 137, 0.3)', marginBottom: '8px' }}>inventory_2</span>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Người ấy chưa đăng món quà nào.</p>
          </div>
        ) : partnerProducts.map(p => (
          <div
            key={p._id}
            className="partner-product-item"
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', padding: 0, background: 'transparent', border: 'none' }}
            onClick={() => openBuyModal(p)}
          >
            {/* Image & Overlay */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
              <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.6) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px', pointerEvents: 'none' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#fff', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2 }}>
                  {p.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                    {p.price} <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                  <div style={{ background: 'rgba(242,105,137,0.3)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '12px', color: '#ffe5ec', fontSize: '0.75rem', fontWeight: 600 }}>
                    Đã bán {p.sold || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buy Modal — bottom sheet sát mép */}
      <AnimatePresence>
        {isBuyModalOpen && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeBuyModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end' }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'white', borderRadius: '28px 28px 0 0', padding: '12px 20px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
            >
              {/* Drag handle */}
              <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '99px', margin: '0 auto 20px' }} />

              {/* Product info */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
                <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '76px', height: '76px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#1a1a2e' }}>{selectedProduct.name}</h3>
                  <p style={{ margin: 0, color: '#e84393', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedProduct.price}
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    <span style={{ fontSize: '0.8rem', color: '#8d99ae', fontWeight: 500 }}>/ món</span>
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: '16px' }}>
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.95rem' }}>Số lượng</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ width: '38px', height: '38px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove</span>
                  </button>
                  <span style={{ fontWeight: 800, width: '32px', textAlign: 'center', fontSize: '1rem', color: '#1a1a2e' }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    style={{ width: '38px', height: '38px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e84393' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  </button>
                </div>
              </div>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.95rem' }}>Tổng cộng</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#e84393', fontWeight: 900, fontSize: '1.4rem' }}>
                  {selectedProduct.price * quantity}
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleBuy}
                disabled={buying}
                style={{ width: '100%', background: buying ? '#f9a8c9' : 'linear-gradient(90deg, #e84393, #f26989)', color: 'white', border: 'none', borderRadius: '16px', padding: '15px', fontSize: '1rem', fontWeight: 700, cursor: buying ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(232,67,147,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                {buying ? 'Đang xử lý...' : 'Xác nhận mua'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success modal */}
      <SuccessModal product={successProduct} onClose={handleSuccessClose} />

      {/* Error modal */}
      <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
    </div>
  );
};

export default PartnerStorePage;
