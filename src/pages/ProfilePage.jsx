import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Avatar from '../components/Avatar';
import { LogOut, User, Camera, KeyRound, Save, X, Image as ImageIcon } from 'lucide-react';
import './ProfilePage.css';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love1&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love2&backgroundColor=e0e7ff',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love3&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love4&backgroundColor=fef3c7',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love5&backgroundColor=fee2e2',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love6&backgroundColor=dbeafe',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love7&backgroundColor=f3e8ff',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Love8&backgroundColor=ffedd5',
];

const ProfilePage = () => {
  const { user, logout, login } = useAuth(); // Need login to re-fetch/update user context? Wait, we can just update localStorage or refetch. useAuth usually has a refetch method or we can just reload the page.
  const [activeModal, setActiveModal] = useState(null); // 'name', 'avatar', 'password', 'logout'
  const [loading, setLoading] = useState(false);
  
  // Name Edit
  const [editName, setEditName] = useState(user?.displayName || '');
  
  // Birthday Edit
  const [editBirthday, setEditBirthday] = useState(user?.birthday ? user.birthday.split('T')[0] : '');

  // Bio Edit
  const [editBio, setEditBio] = useState(user?.bio || '');
  
  // Password Edit
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Avatar Edit
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleUpdateName = async () => {
    if (!editName.trim()) return showToast('Tên không được để trống', 'error');
    setLoading(true);
    try {
      const res = await authService.updateMe({ displayName: editName });
      if (res.success) {
        showToast('Cập nhật tên thành công', 'success');
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1000); // Tạm thời reload để update context
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBirthday = async () => {
    if (!editBirthday) return showToast('Vui lòng chọn ngày sinh', 'error');
    setLoading(true);
    try {
      const res = await authService.updateMe({ birthday: editBirthday });
      if (res.success) {
        showToast('Cập nhật sinh nhật thành công', 'success');
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBio = async () => {
    setLoading(true);
    try {
      const res = await authService.updateMe({ bio: editBio });
      if (res.success) {
        showToast('Cập nhật mô tả thành công', 'success');
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return showToast('Vui lòng nhập đủ thông tin', 'error');
    if (newPassword !== confirmPassword) return showToast('Mật khẩu xác nhận không khớp', 'error');
    
    setLoading(true);
    try {
      const res = await authService.changePassword(oldPassword, newPassword);
      if (res.success) {
        showToast('Đổi mật khẩu thành công', 'success');
        setActiveModal(null);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPresetAvatar = async (url) => {
    setLoading(true);
    try {
      const res = await authService.updateMe({ avatar: url });
      if (res.success) {
        showToast('Cập nhật ảnh đại diện thành công', 'success');
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    setLoading(true);
    try {
      const res = await authService.uploadAvatar(formData);
      if (res.success) {
        showToast('Tải ảnh lên thành công', 'success');
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi khi tải ảnh', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.log(e);
    }
    logout();
  };

  return (
    <div className="page profile-page">
      <Header title="Cá nhân" />
      
      <main className="profile-content">
        <motion.div 
          className="profile-header-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="profile-avatar-wrapper" onClick={() => setActiveModal('avatar')}>
            <Avatar user={user} className="profile-avatar" />
            <div className="avatar-edit-badge">
              <Camera size={16} color="#fff" />
            </div>
          </div>
          
          <h2 className="profile-name">
            {user?.displayName || user?.username}
            <button className="edit-name-btn" onClick={() => {
              setEditName(user?.displayName || '');
              setActiveModal('name');
            }}>
              <User size={16} />
            </button>
          </h2>
          <p className="profile-username">@{user?.username}</p>
        </motion.div>

        <div className="profile-actions-list">
          <motion.div 
            className="action-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => {
              setEditBirthday(user?.birthday ? user.birthday.split('T')[0] : '');
              setActiveModal('birthday');
            }}
          >
            <div className="action-icon" style={{background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', color: 'white'}}>
              <span className="material-symbols-outlined">cake</span>
            </div>
            <div className="action-info">
              <h3>Sinh nhật</h3>
              <p>{user?.birthday ? new Date(user.birthday).toLocaleDateString('vi-VN') : 'Thêm ngày sinh của bạn'}</p>
            </div>
          </motion.div>

          <motion.div 
            className="action-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            onClick={() => {
              setEditBio(user?.bio || '');
              setActiveModal('bio');
            }}
          >
            <div className="action-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', color: 'white'}}>
              <span className="material-symbols-outlined">description</span>
            </div>
            <div className="action-info">
              <h3>Mô tả bản thân</h3>
              <p>{user?.bio ? (user.bio.length > 30 ? user.bio.substring(0, 30) + '...' : user.bio) : 'Giới thiệu bản thân để AI hiểu bạn hơn'}</p>
            </div>
          </motion.div>

          <motion.div 
            className="action-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => setActiveModal('password')}
          >
            <div className="action-icon password-icon">
              <KeyRound size={24} color="#fff" />
            </div>
            <div className="action-info">
              <h3>Đổi mật khẩu</h3>
              <p>Bảo vệ tài khoản của bạn</p>
            </div>
          </motion.div>

          <motion.div 
            className="action-card logout-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setActiveModal('logout')}
          >
            <div className="action-icon logout-icon">
              <LogOut size={24} color="#fff" />
            </div>
            <div className="action-info">
              <h3>Đăng xuất</h3>
              <p>Tạm biệt và hẹn gặp lại</p>
            </div>
          </motion.div>
        </div>
      </main>

      <BottomNav />

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'name' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={20} /></button>
              <h3>Đổi Tên Hiển Thị</h3>
              <input 
                type="text" 
                className="profile-input" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nhập tên mới..."
              />
              <button className="profile-btn primary" onClick={handleUpdateName} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </motion.div>
          </div>
        )}

        {activeModal === 'birthday' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={20} /></button>
              <h3>Ngày Sinh Nhật</h3>
              <input 
                type="date" 
                className="profile-input" 
                value={editBirthday} 
                onChange={(e) => setEditBirthday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{ WebkitAppearance: 'none', appearance: 'none', maxWidth: '100%' }}
              />
              <button className="profile-btn primary" onClick={handleUpdateBirthday} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </motion.div>
          </div>
        )}

        {activeModal === 'bio' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={20} /></button>
              <h3>Mô tả bản thân</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px', textAlign: 'center' }}>
                Giới thiệu tính cách, sở thích để AI tạo thử thách thú vị hơn.
              </p>
              <textarea 
                className="profile-input" 
                value={editBio} 
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Ví dụ: Tôi là người hướng nội, thích đọc sách và uống cà phê..."
                rows={4}
                maxLength={300}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#999', marginTop: '-12px', marginBottom: '16px' }}>
                {editBio.length}/300
              </div>
              <button className="profile-btn primary" onClick={handleUpdateBio} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </motion.div>
          </div>
        )}

        {activeModal === 'password' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={20} /></button>
              <h3>Đổi Mật Khẩu</h3>
              <input 
                type="password" 
                className="profile-input" 
                value={oldPassword} 
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Mật khẩu cũ"
              />
              <input 
                type="password" 
                className="profile-input" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới"
              />
              <input 
                type="password" 
                className="profile-input" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu mới"
              />
              <button className="profile-btn primary" onClick={handleChangePassword} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </motion.div>
          </div>
        )}

        {activeModal === 'avatar' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal avatar-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={20} /></button>
              <h3>Chọn Ảnh Đại Diện</h3>
              
              <div className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={24} />
                <span>Tải ảnh từ thiết bị</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              
              <div className="avatar-divider"><span>Hoặc chọn ảnh mẫu</span></div>
              
              <div className="avatar-grid">
                {PRESET_AVATARS.map((url, idx) => (
                  <div key={idx} className="avatar-preset-item" onClick={() => handleSelectPresetAvatar(url)}>
                    <img src={url} alt={`Preset ${idx}`} />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'logout' && (
          <div className="profile-modal-overlay">
            <motion.div 
              className="profile-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 style={{ color: '#ef4444' }}>Đăng xuất?</h3>
              <p style={{ textAlign: 'center', marginBottom: '24px', color: '#666' }}>
                Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?
              </p>
              <div className="modal-actions-row">
                <button className="profile-btn secondary" onClick={() => setActiveModal(null)}>Hủy</button>
                <button className="profile-btn danger" onClick={handleLogout}>Đăng xuất</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
