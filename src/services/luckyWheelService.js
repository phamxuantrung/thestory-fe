import api from './api';

export const luckyWheelService = {
  getStatus: async () => {
    const res = await api.get('/wheel/status');
    return res.data;
  },
  spin: async () => {
    const res = await api.post('/wheel/spin');
    return res.data;
  }
};
