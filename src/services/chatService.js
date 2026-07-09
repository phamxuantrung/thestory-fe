import api from './api';

let cachedMessages = null;
let cachedPinned = null;
let cachedStickers = null;

try {
  const savedMsg = localStorage.getItem('chat_cache_messages');
  if (savedMsg) cachedMessages = JSON.parse(savedMsg);
  
  const savedPinned = localStorage.getItem('chat_cache_pinned');
  if (savedPinned) cachedPinned = JSON.parse(savedPinned);

  const savedStickers = localStorage.getItem('chat_cache_stickers');
  if (savedStickers) cachedStickers = JSON.parse(savedStickers);
} catch (e) {}

export const chatService = {
  getCachedData: () => ({
    messages: cachedMessages,
    pinned: cachedPinned,
    stickers: cachedStickers
  }),

  getMessages: (page = 1) =>
    api.get(`/chat?page=${page}&limit=50&t=${Date.now()}`).then((r) => {
      if (page === 1) {
        if (r.data && r.data.data && r.data.data.messages) {
          cachedMessages = r.data.data.messages;
          try { localStorage.setItem('chat_cache_messages', JSON.stringify(cachedMessages)); } catch(e) {}
        }
      }
      return r.data;
    }),

  getPinned: () =>
    api.get('/chat/pinned').then((r) => {
      cachedPinned = r.data;
      try { localStorage.setItem('chat_cache_pinned', JSON.stringify(cachedPinned)); } catch(e) {}
      return r.data;
    }),

  getUnreadCount: () =>
    api.get('/chat/unread').then((r) => r.data),

  sendMessage: (content, replyTo = null, type = 'text') =>
    api.post('/chat', { content, type, replyTo }).then((r) => r.data),

  sendMediaMessage: (formData) =>
    api.post('/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteMessage: (id) =>
    api.delete(`/chat/${id}`).then((r) => r.data),

  pinMessage: (id) =>
    api.put(`/chat/${id}/pin`).then((r) => r.data),

  reactMessage: (id, emoji) =>
    api.put(`/chat/${id}/react`, { emoji }).then((r) => r.data),

  markSeen: () =>
    api.put('/chat/seen').then((r) => r.data),

  getCustomStickers: () =>
    api.get('/stickers').then((r) => {
      cachedStickers = r.data;
      try { localStorage.setItem('chat_cache_stickers', JSON.stringify(cachedStickers)); } catch(e) {}
      return r.data;
    }),

  uploadCustomSticker: (formData) =>
    api.post('/stickers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteCustomSticker: (id) =>
    api.delete(`/stickers/${id}`).then((r) => r.data),

  clearChat: () =>
    api.post('/chat/clear').then((r) => r.data),
};
