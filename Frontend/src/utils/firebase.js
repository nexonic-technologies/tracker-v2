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
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  if (!messaging) {
    console.warn("Firebase Messaging is not supported in this environment");
    return null;
  }
  
  try {
    const permissionPromise = Notification.requestPermission();
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve("default"), 3000));
    const permission = await Promise.race([permissionPromise, timeoutPromise]);

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
      
      const tokenPromise = getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      const tokenTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
      const currentToken = await Promise.race([tokenPromise, tokenTimeout]);

      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Notification permission not granted.');
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
