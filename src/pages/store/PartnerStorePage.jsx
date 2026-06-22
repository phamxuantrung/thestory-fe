import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const PartnerStorePage = () => {
  const { partner, updateUser } = useAuth();
  const [partnerProducts, setPartnerProducts] = useState([]);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const fetchPartnerProducts = async () => {
    try {
      const res = await api.get('/store/partner-products');
      if (res.data.success) setPartnerProducts(res.data.data);
    } catch (e) { console.error(e); }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        updateUser(res.data.data);
      }
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
    if (!selectedProduct) return;
    if (!window.confirm(`Bạn có chắc muốn mua ${quantity} món này bằng ${selectedProduct.price * quantity} Heart không?`)) return;
    try {
      const res = await api.post('/store/buy', { productId: selectedProduct._id, quantity });
      if (res.data.success) {
        alert('Mua thành công!');
        fetchUserData(); // Cập nhật lại số Heart
        fetchPartnerProducts(); // Cập nhật số lượng đã bán
        closeBuyModal();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="partner-store-container" style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Store Banner */}
      <div style={{
        padding: '32px 16px 24px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
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

      <div className="product-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '16px' 
      }}>
        {partnerProducts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(242, 105, 137, 0.3)', marginBottom: '8px' }}>inventory_2</span>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Người ấy chưa đăng món quà nào.</p>
          </div>
        ) : partnerProducts.map(p => (
          <div 
            key={p._id} 
            className="partner-product-item" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              cursor: 'pointer',
              padding: 0,
              background: 'transparent',
              border: 'none'
            }}
            onClick={() => openBuyModal(p)}
          >
            
            {/* Image & Overlay Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/5',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}>
              {/* Product Image */}
              <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* Dark Gradient Overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60%',
                background: 'linear-gradient(to top, rgba(15, 15, 15, 0.95) 0%, rgba(15, 15, 15, 0.6) 50%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px',
                pointerEvents: 'none'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#fff', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2 }}>
                  {p.name}
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                    {p.price} <span className="material-symbols-outlined" style={{fontSize:'12px', color: '#fff', fontVariationSettings: "'FILL' 1"}}>favorite</span>
                  </div>
                  <div style={{ background: 'rgba(242, 105, 137, 0.3)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '12px', color: '#ffe5ec', fontSize: '0.75rem', fontWeight: 600 }}>
                    Đã bán {p.sold || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buy Modal */}
      {isBuyModalOpen && selectedProduct && (
        <div className="store-modal-overlay" style={{ zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={closeBuyModal}>
          <div 
            className="store-modal-content" 
            style={{ 
              width: '100%', 
              borderBottomLeftRadius: 0, 
              borderBottomRightRadius: 0, 
              padding: '24px',
              animation: 'slideUp 0.3s ease'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#333' }}>{selectedProduct.name}</h3>
                <p style={{ margin: 0, color: '#e84393', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {selectedProduct.price} <span className="material-symbols-outlined" style={{fontSize:'16px'}}>favorite</span>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: 600, color: '#555' }}>Số lượng</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f5f5f5', borderRadius: '8px', padding: '4px' }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: '32px', height: '32px', border: 'none', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                </button>
                <span style={{ fontWeight: 700, width: '20px', textAlign: 'center' }}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ width: '32px', height: '32px', border: 'none', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: 600, color: '#555' }}>Tổng cộng</span>
              <p style={{ margin: 0, color: '#e84393', fontWeight: 800, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {selectedProduct.price * quantity} <span className="material-symbols-outlined" style={{fontSize:'18px'}}>favorite</span>
              </p>
            </div>

            <button 
              onClick={handleBuy}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #e84393, #f26989)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(232, 67, 147, 0.25)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              Xác nhận mua
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerStorePage;
