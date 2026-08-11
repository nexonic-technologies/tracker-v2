import { nanoid } from 'nanoid';

// Simple delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

// A basic conflict resolver that just takes the server version for now
// In a real app, this could show a UI to the user to choose between their changes and the server's
const conflictResolver = {
  resolve: async (mutation, serverVersion) => {
    console.warn(`Conflict detected for mutation ${mutation.id}. Adopting server version.`);
    return serverVersion; // simple last-write-wins (server wins here if it's considered authoritative)
  }
};

export class OptimisticQueue {
  constructor(maxQueueSize = 100) {
    this.queue = [];
    this.maxSize = maxQueueSize;
    this.processing = false;
  }

  enqueue(mutation) {
    if (this.queue.length >= this.maxSize) {
      throw new Error('Queue overflow');
    }

    const id = nanoid();
    const item = {
      id,
      ...mutation,
      status: 'pending',
      retries: 0,
      maxRetries: 3,
      timestamp: Date.now()
    };

    this.queue.push(item);
    return id;
  }

  async process(apiCall) {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const mutation = this.queue[0];

      try {
        // Call API with conflict detection
        const response = await apiCall(mutation);
        
        mutation.status = 'success';
        this.queue.shift(); // Remove from queue
        
        console.log(`Mutation ${mutation.id} synced`);
      } catch (error) {
        if (error.response?.status === 409 || error.code === 'CONFLICT') {
          // Handle conflict: server version differs
          const serverVersion = error.response?.data?.serverVersion;
          const resolved = await conflictResolver.resolve(
            mutation,
            serverVersion
          );

          if (resolved) {
            mutation.updates = resolved;
            mutation.retries++;
          } else {
            // User rejected resolution, keep in queue or drop
            break;
          }
        } else if (mutation.retries < mutation.maxRetries) {
          mutation.retries++;
          // Exponential backoff
          await delay(Math.pow(2, mutation.retries) * 1000);
        } else {
          // Max retries exceeded
          mutation.status = 'failed';
          this.queue.shift();
          console.error(`Mutation ${mutation.id} failed after retries`);
        }
      }
    }

    this.processing = false;
  }

  peek() {
    return this.queue[0];
  }

  getStatus(id) {
    return this.queue.find(m => m.id === id)?.status;
  }

  clear() {
    this.queue = [];
  }
}
