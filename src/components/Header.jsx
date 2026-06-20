import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Header.css';

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
      <div className="header-right">
        {rightContent}
      </div>
    </header>
  );
};

export default Header;
