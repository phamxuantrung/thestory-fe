import api from './api';

export const treeService = {
  getTree: async () => {
    const res = await api.get('/tree');
    return res.data;
  },

  interact: async (action, weather) => {
    const res = await api.post('/tree/interact', { action, weather });
    return res.data;
  },

  revive: async () => {
    const res = await api.post('/tree/revive');
    return res.data;
  },

  addFertilizer: async () => {
    const res = await api.post('/tree/add-fertilizer');
    return res.data;
  },
};
