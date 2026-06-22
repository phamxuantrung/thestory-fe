import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import Cropper from 'react-easy-crop';

// Utils for crop
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

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
}

// Modal component for Add/Edit
const AddEditProductModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  // Image handling
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null); // The Blob
  const [previewUrl, setPreviewUrl] = useState(''); // The URL for display

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Cropper states
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
      setName('');
      setPrice('');
      setPreviewUrl('');
      setCroppedImage(null);
    }
  }, [initialData, isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setIsCropperOpen(true);
      });
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(croppedBlob);
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setIsCropperOpen(false);
    } catch (e) {
      console.error(e);
      alert('Không thể cắt ảnh');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewUrl) {
      alert('Vui lòng chọn ảnh cho sản phẩm');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', Number(price));
    if (croppedImage) {
      formData.append('image', croppedImage, 'product.jpg');
    }

    await onSave(formData);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="store-modal-overlay">
        <div className="store-modal-content">
          <h2>{initialData ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm mới'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tên sản phẩm/dịch vụ</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="VD: Đấm lưng 15 phút" />
            </div>
            <div className="form-group">
              <label>Giá (Heart)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" placeholder="VD: 50" />
            </div>

            <div className="form-group image-upload-group">
              <label>Ảnh sản phẩm</label>
              {previewUrl && (
                <div className="preview-container" style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <img src={previewUrl} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '2px solid rgba(255,183,197,0.5)' }} />
                </div>
              )}
              <button
                type="button"
                className="btn-select-image"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px dashed #f79ab5', background: '#fdf2f8', color: '#d94c73', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => fileInputRef.current.click()}
              >
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '6px' }}>add_photo_alternate</span>
                {previewUrl ? 'Chọn ảnh khác' : 'Chọn ảnh từ thiết bị'}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Huỷ</button>
              <button type="submit" disabled={loading} className="btn-save">{loading ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </form>
        </div>
      </div>

      {isCropperOpen && (
        <div className="store-modal-overlay" style={{ zIndex: 2000 }}>
          <div className="store-modal-content" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0 }}>Cắt ảnh (1:1)</h3>
            <div style={{ position: 'relative', flex: 1, background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button onClick={() => setIsCropperOpen(false)} className="btn-cancel">Huỷ</button>
              <button onClick={handleCropSave} className="btn-save">Cắt ảnh</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MyStorePage = () => {
  const [myProducts, setMyProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchMyProducts = async () => {
    try {
      const res = await api.get('/store/my-products');
      if (res.data.success) setMyProducts(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const handleSaveProduct = async (data) => {
    try {
      if (editingProduct) {
        await api.put(`/store/products/${editingProduct._id}`, data);
      } else {
        await api.post('/store/products', data);
      }
      fetchMyProducts();
    } catch (e) {
      alert('Có lỗi xảy ra khi lưu sản phẩm');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá sản phẩm này?')) return;
    try {
      await api.delete(`/store/products/${id}`);
      fetchMyProducts();
    } catch (e) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="my-store-container" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="my-store-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#8c5a6b', fontFamily: "'Playfair Display', serif", fontWeight: '700' }}>Cửa hàng của bạn</h2>
          <p style={{ margin: 0, color: '#8c5a6b', fontSize: '0.9rem', opacity: 0.8 }}>Quản lý các món quà yêu thương</p>
        </div>
        <button className="add-product-btn" style={{ margin: 0, width: 'auto', padding: '10px 16px', borderRadius: '12px' }} onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span> Thêm
        </button>
      </div>

      <div className="product-table-wrapper" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '16px',
        padding: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 183, 197, 0.4)',
        boxShadow: '0 4px 12px rgba(242, 105, 137, 0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {myProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(242, 105, 137, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-primary)' }}>storefront</span>
            </div>
            <h3 style={{ margin: 0, color: '#8c5a6b', fontSize: '1.2rem', fontFamily: "'Playfair Display', serif" }}>Gian hàng trống</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Bạn chưa đăng món quà nào lên gian hàng.</p>
          </div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(242, 105, 137, 0.2)' }}>
                <th style={{ padding: '12px 4px', color: '#8c5a6b', fontWeight: 700, width: '64px' }}>Ảnh</th>
                <th style={{ padding: '12px 4px', color: '#8c5a6b', fontWeight: 700 }}>Tên Sản Phẩm</th>
                <th style={{ padding: '12px 4px', color: '#8c5a6b', fontWeight: 700, width: '80px' }}>Giá</th>
                <th style={{ padding: '12px 4px', color: '#8c5a6b', fontWeight: 700, width: '50px', textAlign: 'center' }}>Xoá</th>
              </tr>
            </thead>
            <tbody>
              {myProducts.map(p => (
                <tr
                  key={p._id}
                  onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                  style={{ borderBottom: '1px solid rgba(255, 183, 197, 0.3)', transition: 'background 0.2s', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(242, 105, 137, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                    <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'block' }} />
                  </td>
                  <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                    <div style={{ color: '#8c5a6b', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '8px 4px', color: '#8c5a6b', fontWeight: 700, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {p.price} <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>favorite</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p._id); }}
                      style={{
                        padding: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        background: 'rgba(242, 105, 137, 0.1)',
                        color: 'var(--color-primary)',
                        border: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(242, 105, 137, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(242, 105, 137, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AddEditProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default MyStorePage;
