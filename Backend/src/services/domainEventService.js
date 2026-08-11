// src/services/domainEventService.js
import Redis from 'ioredis';
import createQueue from '../utils/queueFactory.js';

const eventQueue = createQueue('domain-events');
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

// Initialize Redis for idempotency checks in production
let redisClient = null;
if (process.env.REDIS_HOST) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
    redisClient.on('error', (err) => {
      console.warn('⚠️ DomainEvent Redis idempotency client error:', err.message);
    });
  } catch (err) {
    console.error('Failed to initialize Redis client for domain events:', err.message);
  }
}

// In-memory fallback cache for development
const localIdempotencyCache = new Set();
setInterval(() => {
  localIdempotencyCache.clear();
}, 24 * 60 * 60 * 1000); // Auto-clear every 24 hours to prevent memory leaks

/**
 * Check if the event has already been successfully processed (idempotency guard)
 * @param {string} eventId 
 * @returns {Promise<boolean>}
 */
async function checkAndMarkProcessed(eventId) {
  if (!eventId) return false;
  
  if (redisClient) {
    try {
      const key = `event_processed:${eventId}`;
      const result = await redisClient.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
      return result !== 'OK'; // If it wasn't set successfully, it means it already exists
    } catch (err) {
      console.warn('[DomainEvent] Redis idempotency check failed, falling back to in-memory:', err.message);
    }
  }

  // Fallback to local memory cache
  if (localIdempotencyCache.has(eventId)) {
    return true;
  }
  localIdempotencyCache.add(eventId);
  return false;
}

class DomainEventService {
  constructor() {
    this.setupProcessor();
  }

  /**
   * Safely emit a domain event to the background queue (asynchronous/fire-and-forget)
   * @param {string} eventType - 'create', 'update', 'delete', 'transition'
   * @param {object} payload 
   */
  async emit(eventType, { eventId, modelName, modelId, actorId, beforeSnapshot = {} }) {
    try {
      const id = eventId || `${eventType}_${modelName}_${modelId}_${Date.now()}`;
      await eventQueue.add('process-event', {
        eventId: id,
        eventType,
        modelName,
        modelId: modelId?.toString(),
        actorId: actorId?.toString(),
        beforeSnapshot,
        timestamp: Date.now()
      }, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      });
    } catch (err) {
      console.error(`[DomainEvent] Failed to enqueue event ${eventType} for ${modelName}:`, err.message);
    }
  }

  setupProcessor() {
    // Process domain event worker tasks
    eventQueue.process('process-event', 5, async (job) => {
      const { eventId, eventType, modelName, modelId, actorId, beforeSnapshot, timestamp } = job.data;

      // 1. Idempotency Check
      const isDuplicate = await checkAndMarkProcessed(eventId);
      if (isDuplicate) {
        // console.log(`[DomainEvent] Event ${eventId} already processed. Skipping duplicate.`);
        return { success: true, reason: 'Duplicate event skipped' };
      }

      try {
        const { getModel } = await import('../utils/appRegistry.js');

        // 2. Fetch the latest document state from DB
        const Model = getModel(modelName);
        if (!Model) {
          console.warn(`[DomainEventWorker] Model "${modelName}" not found in registry.`);
          return { success: false, reason: `Model ${modelName} not found` };
        }

        const doc = await Model.findById(modelId).lean();
        if (!doc && eventType !== 'delete') {
          console.warn(`[DomainEventWorker] Document ${modelId} for model ${modelName} not found.`);
          return { success: false, reason: `Document ${modelId} not found` };
        }

        // 3. Fetch actor user details if available
        let actorDetails = null;
        if (actorId) {
          const Employee = getModel('employees');
          if (Employee) {
            actorDetails = await Employee.findById(actorId).lean();
          }
        }

        // 4. Delegate to the Dynamic Notification Dispatcher
        const { default: dynamicNotificationDispatcher } = await import('./dynamicNotificationDispatcher.js');
        await dynamicNotificationDispatcher.evaluate({
          eventType,
          modelName,
          modelId,
          doc,
          beforeSnapshot,
          actorId,
          actorDetails,
          timestamp
        });

        return { success: true };
      } catch (err) {
        console.error(`[DomainEventWorker] Failed to process job ${job.id}:`, err.stack || err.message);
        throw err; // Throw to let Bull queue retry
      }
    });
  }
}

export default new DomainEventService();
