import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, SortDesc, Sparkles, PlaneTakeoff, Heart, PartyPopper, Trophy, Coffee, Star } from 'lucide-react';
import { memoryService } from '../services/memoryService';
import MemoryCard from '../components/MemoryCard';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import { showToast } from '../components/Toast';
import './MemoriesPage.css';

const DashboardCustomizeIcon = ({ size, strokeWidth }) => (
  <span 
    className="material-symbols-outlined" 
    style={{ 
      fontSize: size, 
      fontVariationSettings: strokeWidth > 2 ? "'FILL' 1" : "'FILL' 0" 
    }}
  >
    dashboard_customize
  </span>
);

const CATEGORIES = [
  { value: '', label: 'Tất cả', Icon: DashboardCustomizeIcon },
  { value: 'trip', label: 'Chuyến đi', Icon: PlaneTakeoff },
  { value: 'date', label: 'Hẹn hò', Icon: Heart },
  { value: 'activity', label: 'Hoạt động', Icon: PartyPopper },
  { value: 'milestone', label: 'Cột mốc', Icon: Trophy },
  { value: 'daily', label: 'Hàng ngày', Icon: Coffee },
  { value: 'special', label: 'Đặc biệt', Icon: Star },
];

const MemoriesPage = () => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchMemories = useCallback(async (cat = selectedCategory, pageNum = 1) => {
    try {
      setLoading(true);
      const params = { sort: '-createdAt', page: pageNum, limit: 10 };
      if (cat) params.category = cat;

      const res = await memoryService.getAll(params);
      if (res.success) {
        if (pageNum === 1) {
          setMemories(res.data.memories);
        } else {
          setMemories((prev) => [...prev, ...res.data.memories]);
        }
        setHasMore(pageNum < res.data.pagination.pages);
        setPage(pageNum);
      }
    } catch (err) {
      showToast('Không thể tải kỷ niệm', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchMemories(selectedCategory, 1);
  }, [selectedCategory]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
  };

  const handleDelete = (id) => {
    setMemories((prev) => prev.filter((m) => m._id !== id));
  };

  const filteredMemories = memories.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page memories-page" style={{ paddingTop: '5rem' }}>
      {/* Header */}
      <Header 
        title="Góc Kỷ Niệm" 
      />

      {/* Search */}
      <div className="memories-search">
        <div className="input-wrapper">
          <Search className="input-icon" size={18} strokeWidth={2.5} />
          <input
            type="text"
            className="input search-input"
            placeholder="Tìm kiếm kỷ niệm của hai bạn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="category-scroll">
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.value}
            className={`category-chip ${selectedCategory === cat.value ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.value)}
            whileTap={{ scale: 0.95 }}
          >
            <cat.Icon size={18} strokeWidth={selectedCategory === cat.value ? 2.5 : 2} />
            <span>{cat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="page-content memories-content">
        {loading && memories.length === 0 ? (
          <div className="flex items-center justify-center" style={{ padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <motion.div
            className="empty-state custom-empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="empty-state-icon-wrapper">
              <div className="empty-state-circle">
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e75b7b', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>photo_camera</span>
              </div>
              <span className="material-symbols-outlined empty-state-star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <h3 className="empty-state-title-custom">Hành trình chưa kể...</h3>
            <p className="empty-state-desc-custom">
              Mỗi khoảnh khắc bên nhau là một viên ngọc quý. Hãy bắt đầu lưu giữ những kỷ niệm tuyệt đẹp của hai bạn ngay hôm nay.
            </p>
            <Link to="/memories/add" className="btn btn-primary" style={{ marginTop: 24, padding: '12px 24px', borderRadius: '24px' }}>
              <Plus size={16} /> Tạo kỷ niệm
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredMemories.map((memory) => (
              <MemoryCard
                key={memory._id}
                memory={memory}
                onDelete={handleDelete}
                onLike={() => {}}
              />
            ))}
          </AnimatePresence>
        )}

        {hasMore && !loading && (
          <motion.button
            className="btn btn-ghost load-more-btn"
            onClick={() => fetchMemories(selectedCategory, page + 1)}
            whileTap={{ scale: 0.97 }}
          >
            Xem thêm
          </motion.button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MemoriesPage;
