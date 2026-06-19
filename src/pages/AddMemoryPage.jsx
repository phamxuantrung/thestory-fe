import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, MapPin, Calendar, Tag, Smile } from 'lucide-react';
import { memoryService } from '../services/memoryService';
import { showToast } from '../components/Toast';
import { getSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import './AddMemoryPage.css';

const CATEGORIES = [
  { value: 'trip', label: 'Chuyến đi', icon: 'flight_takeoff' },
  { value: 'date', label: 'Hẹn hò', icon: 'volunteer_activism' },
  { value: 'activity', label: 'Hoạt động', icon: 'celebration' },
  { value: 'milestone', label: 'Cột mốc', icon: 'emoji_events' },
  { value: 'daily', label: 'Hàng ngày', icon: 'local_cafe' },
  { value: 'special', label: 'Đặc biệt', icon: 'stars' },
];

const MOODS = [
  { value: 'happy', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Smiling%20Eyes.png', label: 'Vui' },
  { value: 'romantic', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Hearts.png', label: 'Lãng mạn' },
  { value: 'excited', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png', label: 'Phấn khích' },
  { value: 'peaceful', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Relieved%20Face.png', label: 'Bình yên' },
  { value: 'nostalgic', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pleading%20Face.png', label: 'Hoài niệm' },
  { value: 'fun', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Rolling%20on%20the%20Floor%20Laughing.png', label: 'Vui nhộn' },
];

const AddMemoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    category: 'daily',
    mood: 'happy',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 10) {
      showToast('Tối đa 10 ảnh', 'error');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Preview
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Vui lòng nhập tiêu đề', 'error');
      return;
    }
    if (!form.date) {
      showToast('Vui lòng chọn ngày', 'error');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => formData.append(key, val));
    images.forEach((img) => formData.append('images', img));

    try {
      const res = await memoryService.create(formData);
      if (res.success) {
        // Notify partner via socket
        const socket = getSocket();
        if (socket) {
          socket.emit('memory:created', {
            ...res.data,
            createdBy: user._id,
          });
        }
        showToast('Đã lưu kỷ niệm! 💕');
        navigate('/memories');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể lưu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page add-memory-page" style={{ paddingTop: '4.5rem' }}>
      {/* Header */}
      <Header title="Thêm Kỷ Niệm" showBack={true} />

      <div className="page-content">
        <form onSubmit={handleSubmit} className="add-form">
          {/* Image upload */}
          <div className="image-upload-section">
            <button
              type="button"
              className="image-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="camera-icon-wrapper">
                <Camera size={24} strokeWidth={2} />
              </div>
              <span className="upload-title">Tải ảnh lên</span>
              <span className="upload-subtitle">Dung lượng tối đa 10MB {imagePreviews.length > 0 && `(${imagePreviews.length}/10)`}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />

            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="preview-item">
                    <img src={preview} alt={`Ảnh ${idx + 1}`} />
                    <button
                      type="button"
                      className="remove-img-btn"
                      onClick={() => removeImage(idx)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input
              type="text"
              className="input pill-input"
              placeholder="Hôm nay có gì đặc biệt?"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea
              className="input textarea rounded-textarea"
              placeholder="Kể lại câu chuyện của bạn..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Ngày diễn ra</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={18} />
              <input
                type="date"
                className="input pill-input with-icon"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">Địa điểm</label>
            <div className="input-wrapper">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                className="input pill-input with-icon"
                placeholder="Nơi chúng ta ghé thăm"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Phân loại</label>
            <div className="category-grid">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.value}
                  type="button"
                  className={`cat-pill ${form.category === cat.value ? 'active' : ''}`}
                  onClick={() => handleChange('category', cat.value)}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="material-symbols-outlined cat-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className="form-group">
            <label className="form-label">Cảm xúc</label>
            <div className="mood-container">
              {MOODS.map((mood) => (
                <motion.button
                  key={mood.value}
                  type="button"
                  className={`mood-emoji-btn ${form.mood === mood.value ? 'active' : ''}`}
                  onClick={() => handleChange('mood', mood.value)}
                  whileTap={{ scale: 0.9 }}
                >
                  {mood.imageUrl ? (
                    <img src={mood.imageUrl} alt={mood.label} className="mood-animated-emoji" />
                  ) : (
                    <span className="mood-emoji material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{mood.icon}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="btn btn-primary submit-btn-v2"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0", fontSize: '20px' }}>favorite</span>
                Lưu kỷ niệm
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryPage;
