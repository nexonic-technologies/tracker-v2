import EventEmitter from 'events';
import Bull from 'bull';

class InMemoryQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.processors = new Map();
  }

  process(name, concurrency, handler) {
    if (typeof concurrency === 'function') {
      handler = concurrency;
    }
    this.processors.set(name, handler);
  }

  async add(name, data, options = {}) {
    const job = {
      id: `${this.name}_${Math.random().toString(36).substring(7)}`,
      data,
      name,
      attempts: 0,
      maxAttempts: options.attempts || 1
    };

    setImmediate(async () => {
      const processor = this.processors.get(name);
      if (!processor) {
        const fallbackProcessor = this.processors.get('__default__') || Array.from(this.processors.values())[0];
        if (fallbackProcessor) {
          await this._runJob(fallbackProcessor, job, options);
        } else {
          console.warn(`[InMemoryQueue] No processor registered for job: ${name}`);
        }
        return;
      }

      await this._runJob(processor, job, options);
    });

    return job;
  }

  async _runJob(processor, job, options) {
    const run = async () => {
      try {
        const result = await processor(job);
        this.emit('completed', job, result);
      } catch (err) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          const delay = options.backoff?.delay || 1000;
          setTimeout(run, delay);
        } else {
          this.emit('failed', job, err);
        }
      }
    };
    await run();
  }
}

export function createQueue(name) {
  const useRedis = !!process.env.REDIS_HOST;

  if (useRedis) {
    console.log(`[QueueFactory] Initializing Redis Bull queue for: ${name}`);
    return new Bull(name, {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      }
    });
  } else {
    console.log(`[QueueFactory] Initializing In-Memory fallback queue for: ${name}`);
    return new InMemoryQueue(name);
  }
}

export default createQueue;
