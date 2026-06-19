import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';

const navItems = [
  { path: '/home', label: 'Trang chủ', iconName: 'home' },
  { path: '/memories', label: 'Kỷ niệm', iconName: 'favorite' },
  { path: '/memories/add', label: 'Thêm', iconName: 'add', isSpecial: true },
  { path: '/chat', label: 'Trò chuyện', iconName: 'chat_bubble' },
  { path: '#account', label: 'Cá nhân', iconName: 'person' },
];

const BottomNav = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUnread = () => {
      chatService.getUnreadCount()
        .then(res => {
          if (res.success) setUnreadCount(res.data.count);
        })
        .catch(console.error);
    };

    // Fetch unread count on mount
    fetchUnread();

    // Re-fetch on window focus to ensure it's always up to date
    window.addEventListener('focus', fetchUnread);
    return () => window.removeEventListener('focus', fetchUnread);
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    const handleNewMessage = (msg) => {
      // Ensure we don't count our own messages
      if (msg && msg.sender && String(msg.sender._id) === String(user._id)) return;
      showToast('Có tin nhắn mới tới BottomNav', 'success');
      setUnreadCount(prev => prev + 1);
    };
    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, user]);

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
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="material-symbols-outlined nav-icon-v2" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{iconName}</span>
              {path === '/chat' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-4px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#f26989',
                  borderRadius: '50%',
                  border: '2px solid white',
                  zIndex: 10
                }} />
              )}
            </div>
            <span className="nav-label-v2">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
