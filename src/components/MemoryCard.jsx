import { motion } from 'framer-motion';
import { Heart, MapPin, Calendar, Trash2 } from 'lucide-react';
import { memoryService } from '../services/memoryService';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';
import { useState } from 'react';
import './MemoryCard.css';

const CATEGORY_LABELS = {
  trip: { label: 'Chuyến đi', icon: 'flight_takeoff' },
  date: { label: 'Hẹn hò', icon: 'volunteer_activism' },
  activity: { label: 'Hoạt động', icon: 'celebration' },
  milestone: { label: 'Cột mốc', icon: 'emoji_events' },
  daily: { label: 'Hàng ngày', icon: 'local_cafe' },
  special: { label: 'Đặc biệt', icon: 'stars' },
};

const MOOD_LABELS = {
  happy: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Smiling%20Eyes.png',
  romantic: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Hearts.png',
  excited: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png',
  peaceful: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Relieved%20Face.png',
  nostalgic: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pleading%20Face.png',
  fun: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Rolling%20on%20the%20Floor%20Laughing.png',
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const MemoryCard = ({ memory, onDelete, onLike, onClick }) => {
  const { user } = useAuth();
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(memory.likes || []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLiked = localLikes.includes(user?._id);
  const category = CATEGORY_LABELS[memory.category] || CATEGORY_LABELS.daily;
  const hasImages = memory.images && memory.images.length > 0;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);

    // Optimistic update
    const wasLiked = localLikes.includes(user._id);
    setLocalLikes((prev) =>
      wasLiked ? prev.filter((id) => id !== user._id) : [...prev, user._id]
    );

    try {
      await memoryService.toggleLike(memory._id);
      onLike && onLike(memory._id);
    } catch {
      // Revert on error
      setLocalLikes((prev) =>
        wasLiked ? [...prev, user._id] : prev.filter((id) => id !== user._id)
      );
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Xóa kỷ niệm này?')) return;
    try {
      await memoryService.delete(memory._id);
      showToast('Đã xóa kỷ niệm');
      onDelete && onDelete(memory._id);
    } catch {
      showToast('Không thể xóa', 'error');
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeImageIndex) {
      setActiveImageIndex(newIndex);
    }
  };

  return (
    <motion.div
      className="memory-card card"
      onClick={() => onClick && onClick(memory)}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Image Carousel */}
      {hasImages && (
        <div className="memory-card-img-container">
          <div className="memory-card-img-carousel" onScroll={handleScroll}>
            {memory.images.map((img, idx) => {
              const src = img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`;
              return (
                <div key={idx} className="carousel-img-wrapper">
                  <div className="img-skeleton" />
                  <img
                    src={src}
                    alt={`${memory.title} - ${idx + 1}`}
                    loading="lazy"
                    onLoad={(e) => {
                      e.target.classList.add('img-loaded');
                      e.target.previousSibling.classList.add('img-skeleton-hidden');
                    }}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23fdf2f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23f26989">⚠️</text></svg>';
                      e.target.previousSibling.classList.add('img-skeleton-hidden');
                    }}
                  />
                </div>
              );
            })}
          </div>
          {memory.images.length > 1 && (
            <div className="carousel-dots">
              {memory.images.map((_, idx) => (
                <div key={idx} className={`dot ${idx === activeImageIndex ? 'active' : ''}`} />
              ))}
            </div>
          )}
          {memory.images.length > 1 && (
            <div className="img-counter-pill">
              {activeImageIndex + 1}/{memory.images.length}
            </div>
          )}
          
          {/* Floating Mood Emoji — always top-left */}
          <div className="floating-mood">
            {MOOD_LABELS[memory.mood] && (
              <img src={MOOD_LABELS[memory.mood]} alt={memory.mood} className="mood-img" />
            )}
          </div>
        </div>
      )}

      <div className="memory-card-body">
        {/* Top row: Category & Date */}
        <div className="memory-card-meta-row">
          <span className="badge">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>{category.icon}</span> {category.label}
          </span>
          <span className="meta-item date-item">
            <Calendar size={14} />
            {formatDate(memory.date)}
          </span>
        </div>

        {/* Title */}
        <h3 className="memory-card-title">{memory.title}</h3>

        {/* Meta Location */}
        {!hasImages && memory.location && (
          <div className="memory-meta">
            <span className="meta-item">
              <MapPin size={12} />
              {memory.location}
            </span>
          </div>
        )}

        {/* Description */}
        {memory.description && (
          <div className="memory-desc-container">
            <p className="memory-desc-text">
              {isExpanded ? memory.description : (memory.description.length > 120 ? `${memory.description.slice(0, 120)}...` : memory.description)}
              {memory.description.length > 120 && (
                <span 
                  className="read-more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? ' Thu gọn' : ' Xem thêm'}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="memory-card-footer">
          <div className="memory-author">
            <div className={`author-avatar-wrapper ${memory.createdBy?.gender}`}>
              {memory.createdBy?.avatar ? (
                <img 
                  src={memory.createdBy.avatar.startsWith('http') ? memory.createdBy.avatar : `http://localhost:5000${memory.createdBy.avatar}`} 
                  alt="avatar" 
                  className="author-avatar-img" 
                />
              ) : (
                <div className="author-avatar-placeholder">
                  <span className="avatar-text-v2" style={{ fontWeight: '700', fontSize: '13px', color: memory.createdBy?.gender === 'male' ? '#4a90e2' : '#f26989' }}>
                    {memory.createdBy?.gender === 'male' ? 'XT' : 'PD'}
                  </span>
                </div>
              )}
            </div>
            <span className="author-name">{memory.createdBy?.displayName}</span>
          </div>

          <div className="memory-actions">
            <motion.button
              className={`like-btn-v2 ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              whileTap={{ scale: 1.1 }}
            >
              <Heart size={16} fill={isLiked ? '#f26989' : '#a38794'} color={isLiked ? '#f26989' : '#a38794'} />
              <span className="like-count">{localLikes.length}</span>
            </motion.button>

            {memory.createdBy?._id === user?._id && (
              <motion.button
                className="delete-btn-v2"
                onClick={handleDelete}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 size={16} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MemoryCard;
