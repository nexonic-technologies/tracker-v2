// utils/pushSender.js
const PUSH_BATCH_SIZE = 100;
const pushQueue = [];
let isProcessing = false;

export const sendPush = async ({ pushToken, title, body, data }) => {
  return new Promise((resolve, reject) => {
    pushQueue.push({ pushToken, title, body, data, resolve, reject });
    processPushQueue();
  });
};

// Batch process push notifications
const processPushQueue = async () => {
  if (isProcessing || pushQueue.length === 0) return;
  
  isProcessing = true;
  
  try {
    while (pushQueue.length > 0) {
      const batch = pushQueue.splice(0, PUSH_BATCH_SIZE);
      
      const messages = batch.map(({ pushToken, title, body, data }) => ({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {}
      }));
      
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages)
        });
        
        const result = await response.json();
        
        // Resolve all promises in this batch
        batch.forEach(({ resolve }) => resolve(result));
        
      } catch (error) {
        console.error('Push notification batch failed:', error);
        batch.forEach(({ reject }) => reject(error));
      }
      
      // Small delay between batches to avoid rate limiting
      if (pushQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } finally {
    isProcessing = false;
  }
};