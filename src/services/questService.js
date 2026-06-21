import api from './api';

export const questService = {
  getActiveQuests: async () => {
    const res = await api.get('/quests');
    return res.data;
  },
  getQuestHistory: async () => {
    const res = await api.get('/quests/history');
    return res.data;
  },
  generateQuests: async (force = false) => {
    const res = await api.post('/quests/generate', { force });
    return res.data;
  },
  acceptQuest: async (questId) => {
    const res = await api.post(`/quests/${questId}/accept`);
    return res.data;
  },
  completeQuest: async (questId) => {
    const res = await api.post(`/quests/${questId}/complete`);
    return res.data;
  }
};
