import React from 'react';
import './Avatar.css';

const Avatar = ({ user, className = '', style = {} }) => {
  if (!user) return null;

  // Nếu user có avatar, hiển thị luôn
  if (user.avatar) {
    // Sửa lỗi đường dẫn tương đối (cho local uploads)
    const avatarUrl = user.avatar.startsWith('http') 
      ? user.avatar 
      : `http://localhost:5000/${user.avatar.replace(/\\/g, '/')}`;
      
    return (
      <img 
        src={avatarUrl} 
        alt={user.displayName || user.username || 'Avatar'} 
        className={`global-avatar ${className}`} 
        style={style} 
      />
    );
  }

  // Fallback: Nếu không có avatar, sinh avatar mặc định từ DiceBear
  // Dùng id hoặc username hoặc tên để tạo seed cố định cho mỗi user
  const seed = user._id || user.username || user.displayName || 'default';
  
  // Nền theo giới tính (tùy chọn)
  const bgColor = user.gender === 'male' ? 'e0e7ff' : 'fce7f3';
  
  const defaultUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=${bgColor}`;

  return (
    <img 
      src={defaultUrl} 
      alt={user.displayName || user.username || 'Avatar'} 
      className={`global-avatar ${className}`} 
      style={style} 
    />
  );
};

export default Avatar;
