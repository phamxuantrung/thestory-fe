import api from './api';

export const chatService = {
  getMessages: (page = 1) =>
    api.get(`/chat?page=${page}&limit=50`).then((r) => r.data),

  getPinned: () =>
    api.get('/chat/pinned').then((r) => r.data),

  getUnreadCount: () =>
    api.get('/chat/unread').then((r) => r.data),

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
    api.get('/stickers').then((r) => r.data),

  uploadCustomSticker: (formData) =>
    api.post('/stickers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteCustomSticker: (id) =>
    api.delete(`/stickers/${id}`).then((r) => r.data),
};
