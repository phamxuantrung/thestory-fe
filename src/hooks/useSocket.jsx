import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

let globalSocket = null;
let activeCount = 0;
let disconnectTimer = null;

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
      globalSocket = io(import.meta.env.VITE_SOCKET_URL || 'https://thestory-be.onrender.com', {
        transports: ['websocket'],
      });

      globalSocket.on('connect', () => {
        console.log('🔌 Socket connected');
        globalSocket.emit('user:join', user._id);
      });

      globalSocket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
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
        
        if (activeCount === 0) {
          disconnectTimer = setTimeout(() => {
            if (activeCount === 0 && globalSocket) {
              globalSocket.disconnect();
              globalSocket = null;
            }
          }, 2000); // Delay disconnect for page transitions
        }
      }
    };
  }, [user]);

  return socket;
};

export const getSocket = () => globalSocket;
