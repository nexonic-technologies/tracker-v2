import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@providers/AuthProvider';

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      socketRef.current = io(import.meta.env.VITE_API_BASE_URL || 'http://10.232.224.208:3000', {
        withCredentials: true
      });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('join', user.id);
      });

      socketRef.current.on('notification', (notification) => {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [user]);

  return socketRef.current;
};

export default useSocket;
