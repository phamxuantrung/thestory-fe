import api from './api';

export const telepathyService = {
  getTodayQuiz: async () => {
    const res = await api.get('/telepathy/today');
    return res.data;
  },
  answerQuiz: async (choice) => {
    const res = await api.post('/telepathy/answer', { choice });
    return res.data;
  }
};
