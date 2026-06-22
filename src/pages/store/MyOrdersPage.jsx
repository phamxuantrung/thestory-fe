import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const MyOrdersPage = () => {
  const { updateUser } = useAuth();
  const [myOrders, setMyOrders] = useState([]);

  const fetchMyOrders = async () => {
    try {
      const res = await api.get('/store/my-orders');
      if (res.data.success) setMyOrders(res.data.data);
    } catch (e) { console.error(e); }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        updateUser(res.data.data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const handleUpdateOrderStatus = async (orderId, action) => {
    if (!window.confirm('Xác nhận thao tác này?')) return;
    try {
      const res = await api.put(`/store/orders/${orderId}/status`, { action });
      if (res.data.success) {
        fetchMyOrders();
        fetchUserData(); // To update heart balance if rejected/cancelled
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Đang chờ';
      case 'confirmed': return 'Đã xác nhận';
      case 'fulfilled': return 'Đã thực hiện';
      case 'rejected': return 'Bị từ chối';
      case 'cancelled': return 'Đã huỷ';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#eab308';
      case 'confirmed': return '#3b82f6';
      case 'fulfilled': return '#22c55e';
      case 'rejected': 
      case 'cancelled': return '#ef4444';
      default: return 'inherit';
    }
  };

  return (
    <div className="order-list">
      {myOrders.length === 0 ? <p className="empty-text">Giỏ hàng trống.</p> : myOrders.map(o => (
        <div key={o._id} className="order-card">
          <div className="order-info">
            <h4>{o.product?.name || 'Sản phẩm đã xoá'}</h4>
            <p>Giá: {o.priceAtPurchase} <span className="material-symbols-outlined" style={{fontSize:'14px', color:'#f26989'}}>favorite</span></p>
            <p>Trạng thái: <strong style={{color: getStatusColor(o.status)}}>{getStatusText(o.status)}</strong></p>
          </div>
          <div className="order-actions">
            {o.status === 'pending' && (
              <button className="danger" onClick={() => handleUpdateOrderStatus(o._id, 'cancel')}>Huỷ đơn</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyOrdersPage;
