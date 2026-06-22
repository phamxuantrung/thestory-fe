import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// Chuyển VAPID public key từ base64url sang Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PUSH_SETUP_KEY = 'push-setup-done';

const PushNotificationSetup = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Kiểm tra trình duyệt có hỗ trợ không
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Nếu đã setup rồi và quyền vẫn còn — bỏ qua
    if (localStorage.getItem(PUSH_SETUP_KEY) === 'true' && Notification.permission === 'granted') return;

    // Đợi một chút cho app load xong mới hỏi
    const timer = setTimeout(async () => {
      try {
        // Xin quyền gửi thông báo
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Lấy VAPID public key từ server
        const { data } = await api.get('/push/vapid-public-key');
        const publicKey = data?.data?.publicKey;
        if (!publicKey) return;

        // Đăng ký Service Worker và lấy Push Subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Gửi subscription lên backend
        await api.post('/push/subscribe', { subscription });
        localStorage.setItem(PUSH_SETUP_KEY, 'true');
        console.log('✅ Push notification đã được đăng ký');
      } catch (err) {
        console.warn('Push setup error:', err);
      }
    }, 3000); // Chờ 3 giây sau khi đăng nhập

    return () => clearTimeout(timer);
  }, [user]);

  // Không render gì cả — component chạy ngầm
  return null;
};

export default PushNotificationSetup;
