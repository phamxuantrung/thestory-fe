import api from './api';

export const heartService = {
  getCheckin: () => api.get('/heart/checkin').then(r => r.data),
  doCheckin: () => api.post('/heart/checkin').then(r => r.data),
  getTasks: () => api.get('/heart/tasks').then(r => r.data),
  verifyTask: (taskId) => api.post(`/heart/tasks/${taskId}/verify`).then(r => r.data),
  completeTask: (taskId) => api.post(`/heart/tasks/${taskId}/complete`).then(r => r.data),
};
