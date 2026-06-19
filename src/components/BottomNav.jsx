import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/home', label: 'Trang chủ', iconName: 'home' },
  { path: '/memories', label: 'Kỷ niệm', iconName: 'favorite' },
  { path: '/memories/add', label: 'Thêm', iconName: 'add', isSpecial: true },
  { path: '/chat', label: 'Trò chuyện', iconName: 'chat_bubble' },
  { path: '#account', label: 'Cá nhân', iconName: 'person' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav-v2">
      {navItems.map(({ path, label, iconName, isSpecial }) => {
        const isActive = location.pathname === path;
        
        if (isSpecial) {
          return (
            <Link
              key={label}
              to={path}
              className="nav-item-v2 special-add-wrapper"
            >
              <div className="add-btn-circle">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>{iconName}</span>
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={label}
            to={path}
            className={`nav-item-v2 ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              if (path.startsWith('#')) e.preventDefault();
            }}
          >
            <span className="material-symbols-outlined nav-icon-v2" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{iconName}</span>
            <span className="nav-label-v2">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
