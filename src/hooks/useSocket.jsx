import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

let globalSocket = null;
let activeCount = 0;
let disconnectTimer = null;
let globalAudioCtx = null;

const unlockAudio = () => {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) globalAudioCtx = new AudioContext();
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(console.error);
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
}

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
          try {
            if (!globalAudioCtx) return;
            const ctx = globalAudioCtx;
            if (ctx.state === 'suspended') return;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1); 
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          } catch(e) {
            console.error('Audio failed:', e);
          }
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
