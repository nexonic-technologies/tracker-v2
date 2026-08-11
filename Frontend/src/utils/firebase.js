import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging = null;

// Messaging is only supported in secure contexts (HTTPS or localhost)
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  } else {
    console.warn("Firebase Messaging is not supported in this browser (Likely because you are not on HTTPS or localhost).");
  }
});

export const requestFirebaseToken = async () => {
  if (!messaging) {
    console.warn("Firebase Messaging is not supported in this environment");
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      let registration;
      if ('serviceWorker' in navigator) {
        const swUrl = `/firebase-messaging-sw.js` +
          `?apiKey=${encodeURIComponent(import.meta.env.VITE_FIREBASE_API_KEY || '')}` +
          `&authDomain=${encodeURIComponent(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '')}` +
          `&projectId=${encodeURIComponent(import.meta.env.VITE_FIREBASE_PROJECT_ID || '')}` +
          `&storageBucket=${encodeURIComponent(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '')}` +
          `&messagingSenderId=${encodeURIComponent(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')}` +
          `&appId=${encodeURIComponent(import.meta.env.VITE_FIREBASE_APP_ID || '')}` +
          `&measurementId=${encodeURIComponent(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '')}`;
        registration = await navigator.serviceWorker.register(swUrl);
      }
      
      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messaging) return new Promise((_, reject) => reject("Messaging not supported"));
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};
