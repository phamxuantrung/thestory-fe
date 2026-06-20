import api from './api';

export const moodService = {
  logMood: async (data) => {
    const res = await api.post('/moods', data);
    return res.data;
  },

  getStats: async (month, year) => {
    const res = await api.get('/moods/stats', { params: { month, year } });
    return res.data;
  },
};
