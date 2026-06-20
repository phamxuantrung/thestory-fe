import api from './api';

export const locationService = {
  getLocations: async () => {
    const res = await api.get('/locations');
    return res.data;
  },

  addLocation: async (data) => {
    const res = await api.post('/locations', data);
    return res.data;
  },

  deleteLocation: async (id) => {
    const res = await api.delete(`/locations/${id}`);
    return res.data;
  }
};
