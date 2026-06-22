import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/store/partner', label: 'Tạp hoá', iconName: 'storefront' },
  { path: '/store/mine', label: 'Của tôi', iconName: 'inventory_2' },
  { path: '/store/orders', label: 'Đơn nhận', iconName: 'receipt_long' },
  { path: '/store/cart', label: 'Giỏ hàng', iconName: 'shopping_cart' },
];

const StoreBottomNav = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav-v2">
      {navItems.map(({ path, label, iconName }) => {
        const isActive = location.pathname === path;
        
        return (
          <Link
            key={label}
            to={path}
            className={`nav-item-v2 ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              if (path.startsWith('#')) e.preventDefault();
            }}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="material-symbols-outlined nav-icon-v2" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{iconName}</span>
            </div>
            <span className="nav-label-v2">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default StoreBottomNav;
