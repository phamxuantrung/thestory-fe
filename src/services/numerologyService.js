import api from './api';

export const numerologyService = {
  getTodayNumerology: async () => {
    const res = await api.get('/numerology/today');
    return res.data;
  }
};
