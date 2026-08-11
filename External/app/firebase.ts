import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (SSR-safe initialization check)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | null = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase Messaging is not supported in this browser.");
    }
  });
}

export const requestFirebaseToken = async (): Promise<string | null> => {
  if (typeof window === "undefined" || !messaging) {
    console.warn("Firebase Messaging is not supported in this environment");
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      let registration;
      if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
        const swUrl = `/firebase-messaging-sw.js` +
          `?apiKey=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '')}` +
          `&authDomain=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '')}` +
          `&projectId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '')}` +
          `&storageBucket=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '')}` +
          `&messagingSenderId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '')}` +
          `&appId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '')}` +
          `&measurementId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '')}`;
        registration = await navigator.serviceWorker.register(swUrl);
      }

      const currentToken = await getToken(messaging, { 
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
        serviceWorkerRegistration: registration
      });
      return currentToken || null;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
    return null;
  }
};

export const onMessageListener = (): Promise<any> => {
  if (!messaging) return new Promise((_, reject) => reject("Messaging not supported"));
  return new Promise((resolve) => {
    onMessage(messaging!, (payload) => {
      resolve(payload);
    });
  });
};
