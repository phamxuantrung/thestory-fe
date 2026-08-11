import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { memoryService } from '../services/memoryService';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';

const navItems = [
  { path: '/home', label: 'Trang chủ', iconName: 'home' },
  { path: '/memories', label: 'Kỷ niệm', iconName: 'favorite' },
  { path: '/memories/add', label: 'Thêm', iconName: 'add', isSpecial: true },
  { path: '/chat', label: 'Trò chuyện', iconName: 'chat_bubble' },
  { path: '/profile', label: 'Cá nhân', iconName: 'person' },
];

const BottomNav = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMemoriesCount, setUnreadMemoriesCount] = useState(0);
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (location.pathname === '/memories') {
      setUnreadMemoriesCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchUnread = () => {
      chatService.getUnreadCount()
        .then(res => {
          if (res.success) setUnreadCount(res.data.count);
        })
        .catch(console.error);
      
      memoryService.getUnreadCount()
        .then(res => {
          if (res.success) setUnreadMemoriesCount(res.data.count);
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

    const handleNewMemory = (data) => {
      if (data && data.createdBy && String(data.createdBy) === String(user._id)) return;
      if (location.pathname !== '/memories') {
        showToast('Gấu vừa thêm 1 kỷ niệm mới!', 'success');
        setUnreadMemoriesCount(prev => prev + 1);
      }
    };

    const handleDeletedMemory = (data) => {
      if (data && data.createdBy && String(data.createdBy) === String(user._id)) return;
      setUnreadMemoriesCount(prev => Math.max(0, prev - 1));
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('memory:new', handleNewMemory);
    socket.on('memory:deleted', handleDeletedMemory);
    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('memory:new', handleNewMemory);
      socket.off('memory:deleted', handleDeletedMemory);
    };
  }, [socket, user, location.pathname]);

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
              {path === '/memories' && unreadMemoriesCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  backgroundColor: '#f26989',
                  borderRadius: '9px',
                  border: '2px solid white',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {unreadMemoriesCount > 9 ? '9+' : unreadMemoriesCount}
                </span>
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
