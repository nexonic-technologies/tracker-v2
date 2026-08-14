import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.usingRedis = false;
    this.memoryCache = new Map(); // Fallback in-memory cache
    this.cacheTimers = new Map(); // Track TTL timers

    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis connection failed. Using in-memory cache fallback.');
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 50, 2000);
      },
      enableReadyCheck: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3
    });

    this.client.on('error', (err) => {
      console.error('⚠️  Redis Client Error - switching to in-memory cache:', err.code || err.message);
      this.usingRedis = false;
    });

    this.client.on('connect', () => {
      console.log('✓ Cache Service connected to Redis');
      this.usingRedis = true;
    });

    this.client.on('ready', () => {
      console.log('✓ Cache Service is ready');
      this.usingRedis = true;
    });

    // Test connection
    this.testConnection();
  }

  async testConnection() {
    try {
      await this.client.ping();
      this.usingRedis = true;
    } catch (err) {
      console.warn('⚠️  Redis not available. Using in-memory cache fallback.');
      this.usingRedis = false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (this.usingRedis) {
        const data = await this.client.get(key);
        if (data) {
          try {
            return JSON.parse(data);
          } catch (e) {
            return data;
          }
        }
        return null;
      } else {
        // Use in-memory cache
        return this.memoryCache.get(key) || null;
      }
    } catch (err) {
      console.error(`Cache get error for key ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = null) {
    try {
      if (this.usingRedis) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttl) {
          await this.client.setex(key, ttl, serialized);
        } else {
          await this.client.set(key, serialized);
        }
      } else {
        // Use in-memory cache
        // Clear existing timer if any
        if (this.cacheTimers.has(key)) {
          clearTimeout(this.cacheTimers.get(key));
        }

        this.memoryCache.set(key, value);

        // Set expiration timer if TTL is provided
        if (ttl) {
          const timer = setTimeout(() => {
            this.memoryCache.delete(key);
            this.cacheTimers.delete(key);
          }, ttl * 1000);
          this.cacheTimers.set(key, timer);
        }
      }
    } catch (err) {
      console.error(`Cache set error for key ${key}:`, err.message);
    }
  }

  /**
   * Delete a cache key or pattern
   * @param {string|string[]} pattern - Key or pattern to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(pattern) {
    try {
      if (this.usingRedis) {
        if (Array.isArray(pattern)) {
          return await this.client.del(...pattern);
        }
        
        // Support wildcard patterns
        if (pattern.includes('*')) {
          const keys = await this.client.keys(pattern);
          if (keys && keys.length > 0) {
            return await this.client.del(...keys);
          }
          return 0;
        }
        
        return await this.client.del(pattern);
      } else {
        // Use in-memory cache
        let count = 0;
        
        if (Array.isArray(pattern)) {
          pattern.forEach(key => {
            if (this.memoryCache.has(key)) {
              this.memoryCache.delete(key);
              if (this.cacheTimers.has(key)) {
                clearTimeout(this.cacheTimers.get(key));
                this.cacheTimers.delete(key);
              }
              count++;
            }
          });
        } else if (pattern.includes('*')) {
          // Wildcard pattern matching
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
              this.memoryCache.delete(key);
              if (this.cacheTimers.has(key)) {
                clearTimeout(this.cacheTimers.get(key));
                this.cacheTimers.delete(key);
              }
              count++;
            }
          }
        } else {
          if (this.memoryCache.has(pattern)) {
            this.memoryCache.delete(pattern);
            if (this.cacheTimers.has(pattern)) {
              clearTimeout(this.cacheTimers.get(pattern));
              this.cacheTimers.delete(pattern);
            }
            count++;
          }
        }
        
        return count;
      }
    } catch (err) {
      console.error(`Cache delete error for pattern ${pattern}:`, err.message);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async flush() {
    try {
      if (this.usingRedis) {
        await this.client.flushdb();
      } else {
        // Clear in-memory cache and timers
        this.cacheTimers.forEach(timer => clearTimeout(timer));
        this.cacheTimers.clear();
        this.memoryCache.clear();
      }
    } catch (err) {
      console.error('Cache flush error:', err.message);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      if (this.usingRedis) {
        const result = await this.client.exists(key);
        return result === 1;
      } else {
        return this.memoryCache.has(key);
      }
    } catch (err) {
      console.error(`Cache exists error for key ${key}:`, err.message);
      return false;
    }
  }
}

export default new CacheService();
