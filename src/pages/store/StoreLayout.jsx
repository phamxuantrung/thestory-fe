import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import StoreBottomNav from '../../components/StoreBottomNav';
import '../StorePage.css';

const StoreLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="store-page-container">
      <Header title="Gian Hàng Tình Yêu" showBack={true} onBack={() => navigate('/')} showHeartCount={true} />
      
      <div className="store-content">
        <Outlet />
      </div>

      <StoreBottomNav />
    </div>
  );
};

export default StoreLayout;
