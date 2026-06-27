import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

let globalSocket = null;
let activeCount = 0;
let disconnectTimer = null;

// ================= AUDIO UNLOCKING CHO IOS =================
let audioCtx = null;

const initAudio = () => {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // Play a silent beep to unlock the audio engine on iOS
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(0);
    osc.stop(0.1);
    
    window.removeEventListener('touchstart', initAudio);
    window.removeEventListener('click', initAudio);
  } catch (e) {
    console.error('Failed to init audio context:', e);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', initAudio, { once: true });
  window.addEventListener('click', initAudio, { once: true });
}

export const playNotificationSound = () => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  } catch(e) {
    console.error('Audio playback failed:', e);
  }
};
// ==========================================================

export const useSocket = () => {
  const { user, updatePartnerStatus } = useAuth();
  const [socket, setSocket] = useState(globalSocket);

  useEffect(() => {
    if (!user) return;

    activeCount++;

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    if (!globalSocket) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 
                        (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://thestory-be.onrender.com');
      
      globalSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
      });

      globalSocket.on('connect', () => {
        console.log('🔌 Socket connected');
        globalSocket.emit('user:join', user._id);
      });

      globalSocket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
      });

      // Fix for iOS PWA backgrounding
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('📱 App became visible. Socket connected:', globalSocket?.connected);
          if (globalSocket) {
            if (!globalSocket.connected) {
              globalSocket.connect();
            }
            // Always ensure we are in the correct room
            if (user && user._id) {
              globalSocket.emit('user:join', user._id);
            }
            // Emit a custom event so components can refresh data if needed
            window.dispatchEvent(new Event('app:resume'));
          }
        }
      });

      // Global notification for messages
      globalSocket.on('chat:message', (msg) => {
        const senderId = msg.sender?._id || msg.sender;
        if (window.location.pathname !== '/chat' && senderId !== user._id) {
          playNotificationSound();
        }
      });
    }

    setSocket(globalSocket);

    const onPartnerOnline = ({ isOnline, lastSeen }) => {
      updatePartnerStatus(isOnline, lastSeen);
    };

    globalSocket.on('partner:online', onPartnerOnline);

    return () => {
      activeCount--;
      if (globalSocket) {
        globalSocket.off('partner:online', onPartnerOnline);
      }
    };
  }, [user]);

  return socket;
};

export const getSocket = () => globalSocket;
