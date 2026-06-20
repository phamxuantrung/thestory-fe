import api from './api';

export const futureLetterService = {
  getLetters: async () => {
    const res = await api.get('/future-letters');
    return res.data;
  },

  createLetter: async (data) => {
    const res = await api.post('/future-letters', data);
    return res.data;
  },

  updateLetter: async (id, data) => {
    const res = await api.put(`/future-letters/${id}`, data);
    return res.data;
  },

  deleteLetter: async (id) => {
    const res = await api.delete(`/future-letters/${id}`);
    return res.data;
  }
};
