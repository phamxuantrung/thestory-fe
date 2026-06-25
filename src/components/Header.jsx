import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Header.css';

// Nút Market đẹp – chỉ dùng ở trang chủ
const MarketButton = ({ onClick }) => (
  <button className="market-pill-btn" onClick={onClick} aria-label="Mở gian hàng">
    <span
      className="material-symbols-outlined market-pill-icon"
      style={{ fontVariationSettings: "'FILL' 1" }}
    >
      shopping_bag
    </span>
  </button>
);

// Icon tim + số hearts – dùng ở trang store
const StoreHeartBadge = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="store-heart-badge">
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '18px', color: '#f26989', fontVariationSettings: "'FILL' 1" }}
      >
        favorite
      </span>
      <span style={{ fontWeight: '800', color: '#1f2937' }}>{user.heart || 0}</span>
    </div>
  );
};

const Header = ({
  title,
  showBack = true,
  onBack,
  rightContent,
  leftContent,
  transparent = false,
  showMarketBtn = false,   // chỉ truyền true ở trang chủ
  showHeartCount = false,  // chỉ truyền true ở trang store
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`global-header ${isScrolled ? 'scrolled' : ''} ${transparent ? 'transparent' : ''}`}>
      <div className="header-left">
        {leftContent ? leftContent : (
          showBack && (
            <button
              className="back-btn"
              onClick={() => onBack ? onBack() : navigate(-1)}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )
        )}
      </div>

      <div className="header-center">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Nút market – chỉ trang chủ */}
        {showMarketBtn && (
          <MarketButton onClick={() => navigate('/store')} />
        )}

        {/* Số hearts – chỉ trang store */}
        {showHeartCount && (
          <div
            className="store-btn-container"
            style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={() => navigate('/store')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <StoreHeartBadge />
          </div>
        )}

        {rightContent}
      </div>
    </header>
  );
};

export default Header;
