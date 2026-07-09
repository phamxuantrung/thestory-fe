import api from './api';

export const authService = {
  login: async (username, password, rememberMe) => {
    const res = await api.post('/auth/login', { username, password, rememberMe });
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateMe: async (data) => {
    const res = await api.put('/auth/me', data);
    return res.data;
  },

  updatePartnerHobbies: async (hobbies) => {
    const res = await api.put('/auth/me/partner-hobbies', { hobbies });
    return res.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const res = await api.put('/auth/me/password', { oldPassword, newPassword });
    return res.data;
  },

  uploadAvatar: async (formData) => {
    const res = await api.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
