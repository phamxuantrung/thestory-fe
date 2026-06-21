import api from './api';

let cachedMessages = null;
let cachedPinned = null;
let cachedStickers = null;

export const chatService = {
  getCachedData: () => ({
    messages: cachedMessages,
    pinned: cachedPinned,
    stickers: cachedStickers
  }),

  getMessages: (page = 1) =>
    api.get(`/chat?page=${page}&limit=50&t=${Date.now()}`).then((r) => {
      if (page === 1) cachedMessages = r.data.messages;
      return r.data;
    }),

  getPinned: () =>
    api.get('/chat/pinned').then((r) => {
      cachedPinned = r.data;
      return r.data;
    }),

  getUnreadCount: () =>
    api.get('/chat/unread').then((r) => r.data),

  sendMessage: (content, replyTo = null) =>
    api.post('/chat', { content, type: 'text', replyTo }).then((r) => r.data),

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
