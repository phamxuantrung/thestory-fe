import api from './api';

export const memoryService = {
  getAll: async (params = {}) => {
    const res = await api.get('/memories', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/memories/${id}`);
    return res.data;
  },

  create: async (formData) => {
    const res = await api.post('/memories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/memories/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/memories/${id}`);
    return res.data;
  },

  toggleLike: async (id) => {
    const res = await api.post(`/memories/${id}/like`);
    return res.data;
  },
};
