import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import Cropper from 'react-easy-crop';

// ── Image crop utils ──────────────────────────────────────────────
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg'));
}

// ── Add / Edit product modal (bottom sheet) ───────────────────────
const AddEditProductModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price || '');
      setPreviewUrl(initialData.image || '');
      setCroppedImage(null);
    } else {
      setName(''); setPrice(''); setPreviewUrl(''); setCroppedImage(null);
    }
  }, [initialData, isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImageSrc(reader.result); setIsCropperOpen(true); });
      reader.readAsDataURL(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((_, pix) => setCroppedAreaPixels(pix), []);

  const handleCropSave = async () => {
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setIsCropperOpen(false);
    } catch { alert('Không thể cắt ảnh'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewUrl) { alert('Vui lòng chọn ảnh cho sản phẩm'); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', Number(price));
    if (croppedImage) formData.append('image', croppedImage, 'product.jpg');
    await onSave(formData);
    setLoading(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Cropper overlay — full screen premium */}
          {isCropperOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 4000, display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                <button
                  onClick={() => setIsCropperOpen(false)}
                  style={{ width: '36px', height: '36px', border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                </button>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Chỉnh ảnh</p>
                  <p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'white', fontSize: '1rem', fontWeight: 600 }}>Cắt theo tỉ lệ 4:5</p>
                </div>
                <div style={{ width: '36px' }} />{/* spacer */}
              </div>

              {/* Crop area */}
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <Cropper
                  image={imageSrc} crop={crop} zoom={zoom} aspect={4 / 5}
                  onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}
                  style={{
                    containerStyle: { background: '#0d0d0d' },
                    cropAreaStyle: { border: '2px solid rgba(249,168,201,0.8)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)' },
                  }}
                />
                {/* Grid hint */}
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>pinch</span>
                  Chụm để thu phóng · Kéo để căn chỉnh
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{ padding: '16px 20px 32px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                {/* Zoom slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Thu phóng</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 700 }}>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range" min={1} max={3} step={0.05} value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#f26989', cursor: 'pointer', height: '4px' }}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setIsCropperOpen(false)}
                    style={{ flex: 1, padding: '14px', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleCropSave}
                    style={{ flex: 2, padding: '14px', border: 'none', borderRadius: '16px', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(232,67,147,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>crop</span>
                    Xác nhận cắt
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main form — bottom sheet */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '28px 28px 0 0', padding: '8px 24px 36px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Drag handle */}
              <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '99px', margin: '12px auto 20px' }} />

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#f26989', fontVariationSettings: "'FILL' 1" }}>
                  {initialData ? 'edit' : 'add_shopping_cart'}
                </span>
                <h3 style={{ margin: '8px 0 4px', fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontStyle: 'italic', color: '#1a1a2e' }}>
                  {initialData ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm mới'}
                </h3>
                <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.88rem' }}>Chia sẻ những món quà yêu thương</p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Image preview & upload */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Ảnh sản phẩm</label>

                  {previewUrl ? (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}>
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '8px 14px', border: 'none', borderRadius: '20px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span> Đổi ảnh
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      style={{ width: '100%', aspectRatio: '4/5', border: '2px dashed rgba(242,105,137,0.35)', borderRadius: '16px', background: 'rgba(249,168,201,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: '#f26989' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>add_photo_alternate</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Chọn ảnh từ thiết bị</span>
                    </button>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                </div>

                {/* Name */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tên sản phẩm / dịch vụ</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder="VD: Đấm lưng 15 phút"
                    style={{ width: '100%', padding: '13px 16px', border: '1.5px solid rgba(255,183,197,0.4)', borderRadius: '14px', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'rgba(255,255,255,0.8)', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#f26989'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,183,197,0.4)'}
                  />
                </div>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Giá (Heart ❤)</label>
                  <input
                    type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0"
                    placeholder="VD: 50"
                    style={{ width: '100%', padding: '13px 16px', border: '1.5px solid rgba(255,183,197,0.4)', borderRadius: '14px', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'rgba(255,255,255,0.8)', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#f26989'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,183,197,0.4)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={onClose}
                    style={{ flex: 1, padding: '14px', border: '1.5px solid #e5e7eb', borderRadius: '14px', background: 'white', color: '#4b5563', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                    Huỷ
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, padding: '14px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #f9a8c9, #e84393)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(232,67,147,0.3)' }}>
                    {loading ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Đăng ngay')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Delete confirm bottom sheet ───────────────────────────────────
const DeleteConfirmSheet = ({ product, onConfirm, onCancel }) => (
  <AnimatePresence>
    {product && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 3500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '28px 28px 0 0', padding: '28px 24px 36px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
        >
          <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '99px', margin: '0 auto 24px' }} />
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '44px', color: '#f87171', fontVariationSettings: "'FILL' 1" }}>delete</span>
            <h3 style={{ margin: '10px 0 4px', fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#1a1a2e' }}>Xoá sản phẩm?</h3>
            <p style={{ margin: 0, color: '#8d99ae', fontSize: '0.88rem' }}>
              <strong style={{ color: '#1a1a2e' }}>{product.name}</strong> sẽ bị ẩn khỏi gian hàng.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '13px', border: '1.5px solid #e5e7eb', borderRadius: '14px', background: 'white', color: '#4b5563', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Không</button>
            <button onClick={onConfirm} style={{ flex: 1, padding: '13px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #f87171, #dc2626)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.25)' }}>Xoá</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Main Page ─────────────────────────────────────────────────────
const MyStorePage = () => {
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const fetchMyProducts = async () => {
    try {
      const res = await api.get('/store/my-products');
      if (res.data.success) setMyProducts(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyProducts(); }, []);

  const handleSaveProduct = async (data) => {
    try {
      if (editingProduct) {
        await api.put(`/store/products/${editingProduct._id}`, data);
      } else {
        await api.post('/store/products', data);
      }
      fetchMyProducts();
    } catch { alert('Có lỗi xảy ra khi lưu sản phẩm'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    try {
      await api.delete(`/store/products/${deletingProduct._id}`);
      fetchMyProducts();
    } catch { alert('Có lỗi xảy ra'); }
    finally { setDeletingProduct(null); }
  };

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Section Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', letterSpacing: '2px', color: '#b98868', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e87a90', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          BOUTIQUE CỦA TÔI
        </div>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '2.2rem', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#0d1b2a', fontWeight: 600, lineHeight: 1.1 }}>
          Tạp hoá của bạn
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', color: '#8d99ae', fontStyle: 'italic' }}>
          {myProducts.length > 0 ? `${myProducts.length} sản phẩm đang bày bán` : 'Quản lý các món quà yêu thương'}
        </p>

        {/* Add button — full width */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          style={{
            width: '100%', padding: '13px', border: 'none', borderRadius: '16px',
            background: 'linear-gradient(135deg, #f9a8c9 0%, #e84393 100%)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232,67,147,0.3)',
            fontSize: '0.95rem', fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: 'relative', overflow: 'hidden'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          Đăng sản phẩm mới
        </motion.button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#f9a8c9', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!loading && myProducts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.55)', borderRadius: '24px', border: '1.5px dashed rgba(242,105,137,0.3)', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'rgba(242,105,137,0.35)', display: 'block', marginBottom: '12px', fontVariationSettings: "'FILL' 1" }}>storefront</span>
          <p style={{ margin: 0, color: '#b0a0a8', fontSize: '1rem', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>Gian hàng đang trống...</p>
          <p style={{ margin: '6px 0 0 0', color: '#c4b0b8', fontSize: '0.85rem' }}>Chạm để đăng món quà đầu tiên!</p>
        </motion.div>
      )}

      {/* Product Grid — 2 columns like PartnerStorePage */}
      {!loading && myProducts.length > 0 && (
        <motion.div
          variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}
        >
          {myProducts.map(p => (
            <motion.div
              key={p._id}
              variants={itemVariants}
              style={{ cursor: 'pointer' }}
              onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
            >
              {/* Image card with dark overlay */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                {/* Dark gradient overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
                  background: 'linear-gradient(to top, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.55) 55%, transparent 100%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '14px', pointerEvents: 'none'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2 }}>
                    {p.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                      {p.price}
                      <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#f9a8c9', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </div>
                    <div style={{ background: 'rgba(242,105,137,0.3)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: '10px', color: '#ffe5ec', fontSize: '0.72rem', fontWeight: 600 }}>
                      Đã bán {p.sold || 0}
                    </div>
                  </div>
                </div>

                {/* Delete button — top right */}
                <button
                  onClick={e => { e.stopPropagation(); setDeletingProduct(p); }}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '32px', height: '32px', border: 'none', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', pointerEvents: 'all'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                </button>


              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AddEditProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingProduct}
        onSave={handleSaveProduct}
      />

      <DeleteConfirmSheet
        product={deletingProduct}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
};

export default MyStorePage;
