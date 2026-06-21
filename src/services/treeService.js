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

  addReward: async (coins) => {
    const res = await api.post('/tree/reward', { coins });
    return res.data;
  },

  buyItem: async (item) => {
    const res = await api.post('/tree/buy-item', { item });
    return res.data;
  },

  usePotion: async () => {
    const res = await api.post('/tree/use-potion');
    return res.data;
  },

  useProp: async () => {
    const res = await api.post('/tree/use-prop');
    return res.data;
  },

  restoreStreak: async () => {
    const res = await api.post('/tree/restore-streak');
    return res.data;
  },

  resetStreak: async () => {
    const res = await api.post('/tree/reset-streak');
    return res.data;
  },

  sprayPest: async () => {
    const res = await api.post('/tree/spray-pest');
    return res.data;
  },

  pullWeed: async () => {
    const res = await api.post('/tree/pull-weed');
    return res.data;
  },

  devCheat: async (action) => {
    const res = await api.post('/tree/dev-cheat', { action });
    return res.data;
  }
};
