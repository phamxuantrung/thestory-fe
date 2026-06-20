import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSocket, getSocket } from '../hooks/useSocket';
import { chatService } from '../services/chatService';
import { showToast } from '../components/Toast';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { removeBackground } from '@imgly/background-removal';
import './ChatPage.css';

const EMOJI_REACTIONS = ['❤️', '😘', '😍', '🥺', '😂', '👏', '😡'];

const ANIMATED_REACTIONS = {
  '❤️': 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif',
  '😘': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.gif',
  '😍': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif',
  '🥺': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.gif',
  '😂': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif',
  '👏': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif',
  '😡': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif',
};

const STICKERS = [
  { id: 'love', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.gif', label: 'Yêu' },
  { id: 'hearteyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif', label: 'Mê mẩn' },
  { id: 'kiss', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.gif', label: 'Hôn' },
  { id: 'hug', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f917/512.gif', label: 'Ôm' },
  { id: 'hearthands', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1faf6/512.gif', label: 'Bắn tim' },
  { id: 'sparkleheart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.gif', label: 'Lấp lánh' },
  { id: 'twohearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f495/512.gif', label: 'Nhịp đập' },
  { id: 'loveletter', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48c/512.gif', label: 'Thư tình' },
  { id: 'rose', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f339/512.gif', label: 'Hoa hồng' },
  { id: 'pleading', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.gif', label: 'Năn nỉ' },
  { id: 'drool', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f924/512.gif', label: 'Thèm' },
  { id: 'hot', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f975/512.gif', label: 'Nóng bỏng' },
  { id: 'angry', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif', label: 'Giận dỗi' },
  { id: 'cry', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif', label: 'Khóc nhè' },
  { id: 'sleep', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f634/512.gif', label: 'Ngủ ngon' },
  { id: 'melting', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae0/512.gif', label: 'Tan chảy' },
];

const formatTime = (d) => {
  const date = new Date(d);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDetailedTime = (d) => {
  const date = new Date(d);
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return timeStr;
  if (date.toDateString() === yesterday.toDateString()) return `Hôm qua ${timeStr}`;
  
  const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = (d1 - d2) / (1000 * 60 * 60 * 24);
  
  if (diffDays < 7) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[date.getDay()]} ${timeStr}`;
  }
  return `${date.getDate()} Th${date.getMonth() + 1}, ${timeStr}`;
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuth();
  const socket = useSocket(); // ensure socket is initialized
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [reactingTo, setReactingTo] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showPokeAnim, setShowPokeAnim] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [customStickers, setCustomStickers] = useState([]);
  const [activeStickerTab, setActiveStickerTab] = useState(() => {
    try {
      const saved = localStorage.getItem('thestory_recent_stickers');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? 'recent' : 'system';
    } catch {
      return 'system';
    }
  });
  const [isUploadingSticker, setIsUploadingSticker] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [recentStickers, setRecentStickers] = useState(() => {
    try {
      const saved = localStorage.getItem('thestory_recent_stickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const bottomRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const stickerInputRef = useRef(null);
  const inputAreaRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);
  const swipeDirectionRef = useRef(null);
  const longPressTimer = useRef(null);
  const [inputAreaHeight, setInputAreaHeight] = useState(64);
  const typingTimerRef = useRef(null);
  const forceScrollRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true, force = false) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
    
    if (force || isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }
  }, []);

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const res = await chatService.getMessages();
        if (res.success) setMessages(res.data.messages);
        
        // Mark as read immediately on load
        chatService.markSeen().catch(console.error);
        const s = getSocket();
        if (s) s.emit('chat:seen');

        const pinned = await chatService.getPinned();
        if (pinned.success && pinned.data.length > 0) setPinnedMessage(pinned.data[0]);
        
        try {
          const customSticks = await chatService.getCustomStickers();
          if (customSticks.success) setCustomStickers(customSticks.data);
        } catch (e) {
          console.error('Lỗi tải sticker tự tạo:', e);
        }
      } catch {
        showToast('Không thể tải tin nhắn', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) scrollToBottom(false, true);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true, forceScrollRef.current);
    forceScrollRef.current = false;
  }, [messages, isTyping, scrollToBottom]);

  // Measure input area height dynamically
  useEffect(() => {
    if (!inputAreaRef.current) return;
    const observer = new ResizeObserver(() => {
      if (inputAreaRef.current) {
        setInputAreaHeight(inputAreaRef.current.offsetHeight);
      }
    });
    observer.observe(inputAreaRef.current);
    return () => observer.disconnect();
  }, [replyTo, mediaPreview]);

  // Socket listeners — re-register whenever socket becomes available
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onMessage = (msg) => {
      setMessages((prev) => {
        if (msg.sender._id === user?._id) {
          const fakeIdx = prev.findIndex(m => m.isSending && m.type === msg.type && m.content === msg.content);
          if (fakeIdx !== -1) {
            const newMsgs = [...prev];
            newMsgs[fakeIdx] = msg;
            return newMsgs;
          }
        }
        return [...prev, msg];
      });
      if (msg.sender._id !== user?._id) s.emit('chat:seen');
    };
    const onTyping = ({ isTyping: t }) => setIsTyping(t);
    const onReacted = ({ messageId, reactions }) =>
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions } : m));
    const onPinned = ({ pinnedMessage: pm }) => {
      setPinnedMessage(pm);
    };
    const onDeleted = ({ messageId }) =>
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    const onPoke = ({ displayName }) => {
      setShowPokeAnim(displayName);
      showToast(`💕 ${displayName} đang nhớ bạn!`);
      setTimeout(() => setShowPokeAnim(null), 3000);
    };
    const onSeen = () =>
      setMessages((prev) => prev.map((m) =>
        m.sender._id === user?._id ? { ...m, isRead: true } : m
      ));

    const onUnpinned = () => {
      setPinnedMessage(null);
    };

    s.on('chat:message', onMessage);
    s.on('chat:typing', onTyping);
    s.on('chat:reacted', onReacted);
    s.on('chat:pinned', onPinned);
    s.on('chat:unpinned', onUnpinned);
    s.on('chat:deleted', onDeleted);
    s.on('chat:poke', onPoke);
    s.on('chat:seen', onSeen);

    return () => {
      s.off('chat:message', onMessage);
      s.off('chat:typing', onTyping);
      s.off('chat:reacted', onReacted);
      s.off('chat:pinned', onPinned);
      s.off('chat:unpinned', onUnpinned);
      s.off('chat:pinned', onPinned);
      s.off('chat:deleted', onDeleted);
      s.off('chat:poke', onPoke);
      s.off('chat:seen', onSeen);
    };
  }, [socket, user]); // re-run when socket instance changes

  const handleTyping = (val) => {
    setInput(val);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('chat:typing', { isTyping: true });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing', { isTyping: false });
    }, 1500);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !mediaFile) return;
    const s = getSocket();
    if (!s) { showToast('Chưa kết nối, thử lại sau', 'error'); return; }
    setIsSending(true);
    s.emit('chat:typing', { isTyping: false });

    try {
      const tempId = `temp-${Date.now()}`;
      const fakeMsg = {
        _id: tempId,
        sender: user,
        content: text,
        type: mediaFile ? (mediaFile.type.startsWith('video') ? 'video' : 'image') : 'text',
        mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : null,
        replyTo: replyTo,
        createdAt: new Date().toISOString(),
        isSending: true
      };
      forceScrollRef.current = true;
      setMessages(prev => [...prev, fakeMsg]);

      if (mediaFile) {
        // Upload media via REST
        const formData = new FormData();
        formData.append('media', mediaFile);
        if (text) formData.append('content', text);
        if (replyTo) formData.append('replyTo', replyTo._id);
        const res = await chatService.sendMediaMessage(formData);
        if (res.success) {
          // Thay thế tin nhắn ảo bằng thật
          setMessages((prev) => prev.map(m => m._id === tempId ? res.data : m));
          // Broadcast cho partner qua socket (server dùng _preloaded, không lưu DB lại)
          s.emit('chat:send', {
            content: text || '',
            type: res.data.type,
            mediaUrl: res.data.mediaUrl,
            mediaPublicId: res.data.mediaPublicId,
            replyTo: replyTo?._id || null,
            _preloaded: res.data,
            _senderId: user?._id, // để server biết không emit lại cho mình
          });
        }
        setMediaFile(null);
        setMediaPreview(null);
      } else {
        s.emit('chat:send', {
          content: text,
          type: 'text',
          replyTo: replyTo?._id || null,
        });
      }
      setInput('');
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      // Remove optimistic message if error
      setMessages(prev => prev.filter(m => !m.isSending || m.content !== text));
      showToast('Không thể gửi tin nhắn', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSticker = (sticker) => {
    const s = getSocket();
    
    const fakeMsg = {
      _id: `temp-${Date.now()}`,
      sender: user,
      content: sticker.url,
      type: 'sticker',
      replyTo: null,
      createdAt: new Date().toISOString(),
      isSending: true
    };
    forceScrollRef.current = true;
    setMessages(prev => [...prev, fakeMsg]);

    s?.emit('chat:send', {
      content: sticker.url,
      type: 'sticker',
    });
    setShowStickers(false);

    // Save to recents
    const newRecents = [sticker, ...recentStickers.filter(sItem => sItem.url !== sticker.url)].slice(0, 16);
    setRecentStickers(newRecents);
    localStorage.setItem('thestory_recent_stickers', JSON.stringify(newRecents));
  };

  const handleStickerFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    let finalFile = file;
    setIsAiProcessing(true);
    showToast('Đang khởi động AI tách nền (có thể mất vài giây lần đầu)...');
    
    try {
      const imageBlob = await removeBackground(file);
      finalFile = new File([imageBlob], "sticker.png", { type: "image/png" });
    } catch (aiError) {
      console.error('Lỗi tách nền:', aiError);
      showToast('Tách nền thất bại, đang dùng ảnh gốc', 'error');
    } finally {
      setIsAiProcessing(false);
    }

    setIsUploadingSticker(true);
    try {
      const formData = new FormData();
      formData.append('media', finalFile);
      const res = await chatService.uploadCustomSticker(formData);
      if (res.success) {
        setCustomStickers([res.data, ...customStickers]);
        showToast('Đã thêm sticker mới! 🎉');
      }
    } catch {
      showToast('Không thể tải lên sticker', 'error');
    } finally {
      setIsUploadingSticker(false);
      e.target.value = '';
    }
  };

  const handleDeleteSticker = async (stickerId) => {
    try {
      await chatService.deleteCustomSticker(stickerId);
      setCustomStickers(customStickers.filter(s => s._id !== stickerId));
      showToast('Đã xóa sticker');
    } catch {
      showToast('Lỗi khi xóa sticker', 'error');
    }
  };

  const handlePoke = () => {
    const socket = getSocket();
    socket?.emit('chat:poke');
    showToast('💕 Đã gửi rung rung!');
  };

  const handleReact = (msgId, emoji) => {
    const s = getSocket();
    s?.emit('chat:react', { messageId: msgId, emoji });
    setReactingTo(null);
  };

  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeDirectionRef.current = null;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;

    if (!swipeDirectionRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
        swipeDirectionRef.current = 'vertical';
      } else if (Math.abs(deltaX) > 10) {
        swipeDirectionRef.current = 'horizontal';
      }
    }

    if (swipeDirectionRef.current === 'horizontal') {
      if (deltaX < 0 && containerRef.current) {
        containerRef.current.style.setProperty('--swipe-x', `${Math.max(-60, deltaX)}px`);
        containerRef.current.classList.add('is-swiping');
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    swipeDirectionRef.current = null;
    if (containerRef.current) {
      containerRef.current.style.setProperty('--swipe-x', `0px`);
      containerRef.current.classList.remove('is-swiping');
    }
  };

  // Mouse drag support for desktop
  const handleMouseDown = (e) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    swipeDirectionRef.current = null;
  };

  const handleMouseMove = (e) => {
    if (!touchStartRef.current) return;
    
    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;

    if (!swipeDirectionRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
        swipeDirectionRef.current = 'vertical';
      } else if (Math.abs(deltaX) > 10) {
        swipeDirectionRef.current = 'horizontal';
      }
    }

    if (swipeDirectionRef.current === 'horizontal') {
      if (deltaX < 0 && containerRef.current) {
        containerRef.current.style.setProperty('--swipe-x', `${Math.max(-60, deltaX)}px`);
        containerRef.current.classList.add('is-swiping');
      }
    }
  };

  const handleMouseUp = () => {
    touchStartRef.current = null;
    swipeDirectionRef.current = null;
    if (containerRef.current) {
      containerRef.current.style.setProperty('--swipe-x', `0px`);
      containerRef.current.classList.remove('is-swiping');
    }
  };

  const handlePin = (msgId) => {
    const socket = getSocket();
    socket?.emit('chat:pin', { messageId: msgId });
    setReactingTo(null);
  };

  const handleUnpin = () => {
    const socket = getSocket();
    socket?.emit('chat:unpin');
    setPinnedMessage(null);
  };

  const handleDelete = async (msgId) => {
    try {
      await chatService.deleteMessage(msgId);
      const socket = getSocket();
      socket?.emit('chat:delete', { messageId: msgId });
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch {
      showToast('Không thể xóa', 'error');
    }
  };

  const handleLongPressTouchStart = (msgId) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setReactingTo(prev => prev === msgId ? null : msgId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEndOrMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setMediaPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const isMine = (msg) => msg.sender?._id === user?._id;

  return (
    <div className="chat-page">
      <Header title="Trò Chuyện" showBack={true} onBack={() => navigate('/')} />

      {/* Pinned message banner */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            className="pinned-banner"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
          >
            <span className="material-symbols-outlined pin-icon" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
            <div className="pinned-content">
              <span className="pinned-label">Tin nhắn đã ghim</span>
              <span className="pinned-text">
                {pinnedMessage.type === 'image' ? '🖼️ Hình ảnh' : pinnedMessage.content}
              </span>
            </div>
            <button className="unpin-btn" onClick={handleUnpin}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poke animation */}
      <AnimatePresence>
        {showPokeAnim && (
          <motion.div
            className="poke-overlay"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <div className="poke-hearts">
              {['💕', '💗', '💓', '💞'].map((h, i) => (
                <motion.span key={i} className="poke-heart"
                  animate={{ y: [-10, -80], opacity: [1, 0] }}
                  transition={{ delay: i * 0.15, duration: 1.2 }}
                >{h}</motion.span>
              ))}
            </div>
            <p className="poke-text">{showPokeAnim} đang nhớ bạn! 💕</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={`chat-messages-container ${pinnedMessage ? 'has-pinned' : ''}`} 
        style={{ paddingBottom: inputAreaHeight + 20 }}
        ref={containerRef}
        onClick={() => { setReactingTo(null); setShowStickers(false); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <div className="chat-loading">
            <div className="spinner" />
          </div>
        ) : (
          messages.map((msg, idx) => {
            const mine = isMine(msg);
            
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const timeDiffMins = prevMsg ? (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) / 1000 / 60 : 0;
            const isDiffDay = prevMsg && new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
            const showTimeDivider = !prevMsg || isDiffDay || timeDiffMins > 15;

            const nextMsg = messages[idx + 1];
            const nextTimeDiffMins = nextMsg ? (new Date(nextMsg.createdAt) - new Date(msg.createdAt)) / 1000 / 60 : 0;
            const nextIsDiffDay = nextMsg && new Date(msg.createdAt).toDateString() !== new Date(nextMsg.createdAt).toDateString();
            const nextShowsTimeDivider = !nextMsg || nextIsDiffDay || nextTimeDiffMins > 15;

            const isLastInGroup = !nextMsg || nextMsg.sender?._id !== msg.sender?._id || nextShowsTimeDivider;
            const myReaction = msg.reactions?.find((r) => r.userId === user?._id);

            return (
              <Fragment key={msg._id}>
                {showTimeDivider && (
                  <div className="time-divider"><span>{formatDetailedTime(msg.createdAt)}</span></div>
                )}
                <motion.div
                      className={`message-row ${mine ? 'mine' : 'theirs'} ${msg.reactions?.length > 0 ? 'has-reactions' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
                  >
                    {/* Avatar — chỉ hiện nếu là người kia và cuối nhóm */}
                    {!mine && isLastInGroup && (
                      <div className={`msg-avatar ${msg.sender?.gender}`}>
                        <Avatar user={msg.sender} />
                      </div>
                    )}
                    {!mine && !isLastInGroup && <div className="msg-avatar-spacer" />}

                    <div className="message-col">
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className={`reply-preview ${mine ? 'mine' : ''}`}>
                          <span className="reply-bar" />
                          <span className="reply-text">
                            {msg.replyTo.type === 'image' ? '🖼️ Hình ảnh' : msg.replyTo.content}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`bubble ${mine ? 'bubble-mine' : 'bubble-theirs'} ${msg.type === 'sticker' ? 'bubble-sticker' : ''} ${
                          (msg.type === 'image' || msg.type === 'video') && (!msg.content || msg.content.trim() === '') ? 'bubble-media-only' : ''
                        }`}
                        onDoubleClick={() => handleReact(msg._id, '❤️')}
                        onTouchStart={() => handleLongPressTouchStart(msg._id)}
                        onTouchEnd={handleTouchEndOrMove}
                        onTouchMove={handleTouchEndOrMove}
                        onTouchCancel={handleTouchEndOrMove}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reactingTo === msg._id) setReactingTo(null);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          // Desktop fallback if needed
                          if (e.pointerType === 'mouse') {
                            setReactingTo(reactingTo === msg._id ? null : msg._id);
                          }
                        }}
                      >
                        {/* Media */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <img
                            src={msg.mediaUrl}
                            alt="media"
                            className="bubble-media-img"
                            onClick={(e) => { e.stopPropagation(); window.open(msg.mediaUrl, '_blank'); }}
                          />
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <video src={msg.mediaUrl} controls className="bubble-media-video" />
                        )}
                        {msg.type === 'sticker' ? (
                          <img src={msg.content} alt="sticker" className="sticker-img" />
                        ) : (
                          msg.content && <span className="bubble-text">{msg.content}</span>
                        )}
                      </div>
                      
                      {msg.isSending && (
                        <div style={{ fontSize: '0.65rem', color: '#a0aec0', marginTop: '4px', textAlign: mine ? 'right' : 'left', fontStyle: 'italic', paddingRight: '4px' }}>Đang gửi...</div>
                      )}

                      {/* Seen */}
                      {mine && msg._id === messages[messages.length - 1]?._id && msg.isRead && (
                        <span className="seen-label">Đã xem ✓</span>
                      )}

                      {/* Reactions display */}
                      {msg.reactions?.length > 0 && (
                        <div className={`reactions-display ${mine ? 'mine' : ''}`}>
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="reaction-chip">
                              {ANIMATED_REACTIONS[r.emoji] ? (
                                <>
                                  <img 
                                    src={ANIMATED_REACTIONS[r.emoji]} 
                                    alt={r.emoji} 
                                    className="animated-reaction" 
                                    onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} 
                                  />
                                  <span style={{display: 'none'}}>{r.emoji}</span>
                                </>
                              ) : r.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Context menu */}
                    <AnimatePresence>
                      {reactingTo === msg._id && (
                        <motion.div
                          className={`context-menu ${mine ? 'context-mine' : 'context-theirs'}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="emoji-row">
                            {EMOJI_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                className={`emoji-react-btn ${myReaction?.emoji === emoji ? 'active' : ''}`}
                                onClick={() => handleReact(msg._id, emoji)}
                              >
                                {ANIMATED_REACTIONS[emoji] ? (
                                  <>
                                    <img 
                                      src={ANIMATED_REACTIONS[emoji]} 
                                      alt={emoji} 
                                      className="animated-reaction-menu" 
                                      onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} 
                                    />
                                    <span style={{display: 'none'}}>{emoji}</span>
                                  </>
                                ) : emoji}
                              </button>
                            ))}
                          </div>
                          <div className="context-actions">
                            <button onClick={() => { setReplyTo(msg); setReactingTo(null); }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>reply</span>
                              Trả lời
                            </button>
                            <button onClick={() => handlePin(msg._id)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>push_pin</span>
                              Ghim
                            </button>
                            {mine && (
                              <button className="danger" onClick={() => { handleDelete(msg._id); setReactingTo(null); }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                Xóa
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Hidden swipe timestamp */}
                    <span className="hidden-time">{formatTime(msg.createdAt)}</span>
                  </motion.div>
              </Fragment>
            );
          })
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              className="typing-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="msg-avatar-container">
                <div className={`msg-avatar ${partner?.gender === 'male' ? 'male' : 'female'}`}>
                  <Avatar user={partner} />
                </div>
              </div>
              <div className="typing-bubble">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Sticker panel */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            className="sticker-panel"
            style={{ bottom: inputAreaHeight }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
          >
            <div className="sticker-tabs">
              <button className={activeStickerTab === 'recent' ? 'active' : ''} onClick={() => setActiveStickerTab('recent')} style={{ flex: '0.5' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', display: 'block' }}>schedule</span>
              </button>
              <button className={activeStickerTab === 'system' ? 'active' : ''} onClick={() => setActiveStickerTab('system')}>Mặc định</button>
              <button className={activeStickerTab === 'custom' ? 'active' : ''} onClick={() => setActiveStickerTab('custom')}>Tự tạo</button>
            </div>
            
            <div className="sticker-list">
              {activeStickerTab === 'recent' ? (
                recentStickers.length > 0 ? (
                  recentStickers.map((s, idx) => (
                    <button key={`recent-${idx}`} className="sticker-btn" onClick={() => handleSendSticker(s)}>
                      <img 
                        src={s.url} 
                        alt={s.label || 'sticker'} 
                        className="sticker-btn-img" 
                        onError={() => {
                          const updatedRecents = recentStickers.filter(item => item.url !== s.url);
                          setRecentStickers(updatedRecents);
                          localStorage.setItem('thestory_recent_stickers', JSON.stringify(updatedRecents));
                        }}
                      />
                      {s.label && <span className="sticker-label">{s.label}</span>}
                    </button>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a48191', padding: '20px', fontSize: '0.9rem' }}>
                    Chưa có sticker nào sử dụng gần đây
                  </div>
                )
              ) : activeStickerTab === 'system' ? (
                STICKERS.map((s) => (
                  <button key={s.id} className="sticker-btn" onClick={() => handleSendSticker(s)}>
                    <img src={s.url} alt={s.label} className="sticker-btn-img" />
                    <span className="sticker-label">{s.label}</span>
                  </button>
                ))
              ) : (
                <>
                  <button className="sticker-btn add-sticker-btn" onClick={() => stickerInputRef.current?.click()} disabled={isUploadingSticker || isAiProcessing}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                      {isAiProcessing ? 'smart_toy' : isUploadingSticker ? 'hourglass_empty' : 'add'}
                    </span>
                    <span className="sticker-label">
                      {isAiProcessing ? 'Đang tách nền AI...' : isUploadingSticker ? 'Đang tải lên...' : 'Thêm mới'}
                    </span>
                  </button>
                  <input type="file" ref={stickerInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleStickerFileChange} />
                  
                  {customStickers.map((s) => (
                    <div key={s._id} className="custom-sticker-wrapper">
                      <button className="sticker-btn" onClick={() => handleSendSticker({ url: s.url })}>
                        <img src={s.url} alt="custom" className="sticker-btn-img" />
                      </button>
                      {s.userId === user?._id && (
                        <button className="delete-sticker-btn" onClick={() => handleDeleteSticker(s._id)}>
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={`chat-input-area ${isInputFocused ? 'keyboard-open' : ''}`} ref={inputAreaRef}>
        {/* Reply banner */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              className="reply-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <span className="material-symbols-outlined" style={{ color: '#f26989' }}>reply</span>
              <div className="reply-banner-content">
                <span className="reply-banner-name">{replyTo.sender?.displayName}</span>
                <span className="reply-banner-text">{replyTo.type === 'image' ? '🖼️ Hình ảnh' : replyTo.content}</span>
              </div>
              <button className="reply-cancel" onClick={() => setReplyTo(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media preview */}
        <AnimatePresence>
          {mediaPreview && (
            <motion.div
              className="media-preview-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <img src={mediaPreview} alt="preview" className="media-preview-thumb" />
              <button className="remove-media" onClick={() => { setMediaFile(null); setMediaPreview(null); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="input-row">
          {/* Sticker button */}
          <button
            className={`input-action-btn ${showStickers ? 'active' : ''}`}
            onClick={() => setShowStickers(!showStickers)}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>sentiment_very_satisfied</span>
          </button>

          {/* Media upload */}
          <button className="input-action-btn" onClick={() => fileInputRef.current?.click()}>
            <span className="material-symbols-outlined">image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleMediaSelect}
          />

          {/* Text input */}
          <div className="input-bubble-wrapper">
            <textarea
              className="chat-input"
              placeholder="Nhắn tin cho người thương..."
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onFocus={() => {
                setIsInputFocused(true);
                setShowStickers(false);
                const socket = getSocket();
                if (socket) socket.emit('chat:typing', { isTyping: true });
              }}
              onBlur={() => {
                setIsInputFocused(false);
                const socket = getSocket();
                if (socket) socket.emit('chat:typing', { isTyping: false });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
            />
          </div>

          {/* Poke / Send */}
          {input.trim() || mediaFile ? (
            <motion.button
              className="send-btn"
              onClick={handleSend}
              disabled={isSending}
              whileTap={{ scale: 0.9 }}
            >
              {isSending ? (
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              )}
            </motion.button>
          ) : (
            <motion.button
              className="poke-btn"
              onClick={() => handleSendSticker({ url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif', label: 'Trái tim' })}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              ❤️
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
