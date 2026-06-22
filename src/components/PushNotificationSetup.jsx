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

const PushNotificationSetup = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Kiểm tra trình duyệt có hỗ trợ không
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Quyền đã bị từ chối — bỏ qua
    if (Notification.permission === 'denied') return;

    const timer = setTimeout(async () => {
      try {
        // Đợi SW ready
        const registration = await navigator.serviceWorker.ready;

        // Lấy VAPID public key từ server
        const { data } = await api.get('/push/vapid-public-key');
        const publicKey = data?.data?.publicKey;
        if (!publicKey) return;

        // Kiểm tra subscription hiện tại
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Chưa có hoặc đã hết hạn — xin quyền và đăng ký mới
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        // Gửi subscription lên backend (backend tự dedup)
        await api.post('/push/subscribe', { subscription });
        console.log('✅ Push notification đã được đăng ký');
      } catch (err) {
        console.warn('Push setup error:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

export default PushNotificationSetup;
