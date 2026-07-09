import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ts_token') || sessionStorage.getItem('ts_token');
    const savedUser = localStorage.getItem('ts_user') || sessionStorage.getItem('ts_user');
    const savedPartner = localStorage.getItem('ts_partner') || sessionStorage.getItem('ts_partner');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedPartner) setPartner(JSON.parse(savedPartner));
      // Verify token with server
      authService
        .getMe()
        .then((res) => {
          if (res.success) {
            setUser(res.data);
            setPartner(res.data.partnerId || null);
            // Cập nhật lại localStorage để tránh mất dữ liệu (ví dụ heart) ở lần tải lại trang sau
            const storage = localStorage.getItem('ts_token') ? localStorage : sessionStorage;
            storage.setItem('ts_user', JSON.stringify(res.data));
            if (res.data.partnerId) {
              storage.setItem('ts_partner', JSON.stringify(res.data.partnerId));
            }
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password, rememberMe = false) => {
    const res = await authService.login(username, password, rememberMe);
    if (res.success) {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('ts_token', res.data.token);
      storage.setItem('ts_user', JSON.stringify(res.data.user));
      if (res.data.partner) storage.setItem('ts_partner', JSON.stringify(res.data.partner));
      setUser(res.data.user);
      setPartner(res.data.partner);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (_) {}
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    localStorage.removeItem('ts_partner');
    sessionStorage.removeItem('ts_token');
    sessionStorage.removeItem('ts_user');
    sessionStorage.removeItem('ts_partner');
    setUser(null);
    setPartner(null);
  };

  const updatePartnerStatus = (isOnline, lastSeen) => {
    setPartner((prev) => (prev ? { ...prev, isOnline, lastSeen } : prev));
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
    const savedUser = JSON.parse(localStorage.getItem('ts_user') || sessionStorage.getItem('ts_user') || '{}');
    const updatedUser = { ...savedUser, ...userData };
    if (localStorage.getItem('ts_token')) {
      localStorage.setItem('ts_user', JSON.stringify(updatedUser));
    } else if (sessionStorage.getItem('ts_token')) {
      sessionStorage.setItem('ts_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, partner, loading, login, logout, updatePartnerStatus, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
