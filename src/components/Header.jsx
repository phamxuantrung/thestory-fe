import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Header.css';

const StoreHeartBadge = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f26989' }}>favorite</span>
      <span style={{ fontWeight: '800', color: '#1f2937' }}>{user.heart || 0}</span>
    </>
  );
};

const Header = ({ title, showBack = true, onBack, rightContent, leftContent, transparent = false }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
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
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Heart Balance & Store Link */}
        <div
          className="store-btn-container"
          style={{
            // display: 'flex', 
            display: 'none',
            alignItems: 'center',
            padding: '4px 8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => navigate('/store')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StoreHeartBadge />
          </span>
        </div>
        {rightContent}
      </div>
    </header>
  );
};

export default Header;
