import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

let socket = null;

export const useSocket = () => {
  const { user, updatePartnerStatus } = useAuth();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!user || connectedRef.current) return;

    socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      socket.emit('user:join', user._id);
      connectedRef.current = true;
    });

    socket.on('partner:online', ({ isOnline, lastSeen }) => {
      updatePartnerStatus(isOnline, lastSeen);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      connectedRef.current = false;
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        connectedRef.current = false;
      }
    };
  }, [user]);

  return socket;
};

export const getSocket = () => socket;
