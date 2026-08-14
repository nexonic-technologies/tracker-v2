/**
 * Race Condition Handler
 * Prevents concurrent modifications to the same document
 * Uses optimistic locking (version field) and distributed locks
 */

import { getFingerprintKey } from '../utils/deviceFingerprint.js';

class RaceConditionHandler {
  constructor(options = {}) {
    this.locks = new Map(); // docId -> lock info
    this.versions = new Map(); // docId -> version
    
    this.config = {
      lockTimeout: options.lockTimeout || 30000, // 30 seconds
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 100,
      cleanupInterval: options.cleanupInterval || 60 * 60 * 1000,
      enableDistributedLocks: options.enableDistributedLocks || false
    };

    this.startCleanup();
  }

  /**
   * Helper to get version safely
   */
  _getVersion(docId) {
    const v = this.versions.get(docId);
    return (typeof v === 'object' && v !== null) ? v.version : (v || 0);
  }

  /**
   * Acquire a lock on a document
   */
  async acquireLock(docId, fingerprint, options = {}) {
    const {
      timeout = this.config.lockTimeout,
      priority = 'normal'
    } = options;

    const now = Date.now();
    const lockKey = `lock_${docId}`;

    // Check existing lock
    if (this.locks.has(lockKey)) {
      const existingLock = this.locks.get(lockKey);

      // Check if lock has expired
      if (now < existingLock.expiresAt) {
        // Lock is still active
        if (existingLock.fingerprint === fingerprint) {
          // Same device has the lock - can proceed
          existingLock.expiresAt = now + timeout;
          existingLock.renewals++;
          
          return {
            success: true,
            acquired: false,
            renewed: true,
            lockId: existingLock.id,
            expiresAt: new Date(existingLock.expiresAt).toISOString()
          };
        }

        // Different device has the lock
        return {
          success: false,
          reason: 'lock_held_by_another_device',
          heldBy: existingLock.fingerprint,
          expiresAt: new Date(existingLock.expiresAt).toISOString(),
          waitTime: Math.ceil((existingLock.expiresAt - now) / 1000)
        };
      }

      // Lock has expired, remove it
      this.locks.delete(lockKey);
    }

    // Create new lock
    const lockId = `${docId}_${fingerprint}_${Date.now()}`;
    const lock = {
      id: lockId,
      docId,
      fingerprint,
      acquiredAt: now,
      expiresAt: now + timeout,
      renewals: 0,
      priority,
      version: this._getVersion(docId)
    };

    this.locks.set(lockKey, lock);

    return {
      success: true,
      acquired: true,
      lockId,
      version: lock.version,
      expiresAt: new Date(lock.expiresAt).toISOString()
    };
  }

  /**
   * Release a lock
   */
  releaseLock(docId, lockId, fingerprint) {
    const lockKey = `lock_${docId}`;
    const lock = this.locks.get(lockKey);

    if (!lock) {
      return {
        success: false,
        reason: 'lock_not_found'
      };
    }

    // Verify lock ownership
    if (lock.fingerprint !== fingerprint || lock.id !== lockId) {
      return {
        success: false,
        reason: 'lock_ownership_mismatch'
      };
    }

    this.locks.delete(lockKey);

    return {
      success: true,
      message: 'Lock released'
    };
  }

  /**
   * Check version conflict (optimistic locking)
   */
  checkVersionConflict(docId, currentVersion, newVersion = null) {
    const storedVersion = this._getVersion(docId);

    if (currentVersion !== storedVersion) {
      return {
        conflict: true,
        reason: 'version_mismatch',
        expectedVersion: storedVersion,
        providedVersion: currentVersion,
        message: `Expected version ${storedVersion}, got ${currentVersion}`
      };
    }

    return {
      conflict: false,
      currentVersion: storedVersion,
      nextVersion: newVersion || storedVersion + 1
    };
  }

  /**
   * Increment version on successful write
   */
  incrementVersion(docId) {
    const currentVersion = this._getVersion(docId);
    const newVersion = currentVersion + 1;
    this.versions.set(docId, { version: newVersion, updatedAt: Date.now() });

    return newVersion;
  }

  /**
   * Compare and swap (CAS) operation
   * Atomic update if version matches
   */
  compareAndSwap(docId, expectedVersion, updateFn) {
    const versionConflict = this.checkVersionConflict(docId, expectedVersion);

    if (versionConflict.conflict) {
      return {
        success: false,
        conflict: true,
        ...versionConflict
      };
    }

    try {
      const result = updateFn();
      const newVersion = this.incrementVersion(docId);

      return {
        success: true,
        result,
        newVersion,
        swapped: true
      };
    } catch (error) {
      return {
        success: false,
        reason: 'update_failed',
        error: error.message
      };
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(operation, docId) {
    let lastError;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (result.success) {
          return {
            ...result,
            attempts: attempt + 1
          };
        }

        // Check if it's a conflict that should be retried
        if (result.conflict || result.reason === 'lock_held_by_another_device') {
          lastError = result;
          
          // Wait before retrying
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error
        return result;
      } catch (error) {
        lastError = {
          success: false,
          reason: 'operation_failed',
          error: error.message
        };

        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      reason: 'max_retries_exceeded',
      lastError,
      attempts: this.config.maxRetries
    };
  }

  /**
   * Get lock status for a document
   */
  getLockStatus(docId) {
    const lockKey = `lock_${docId}`;
    const lock = this.locks.get(lockKey);
    const version = this._getVersion(docId);

    if (!lock) {
      return {
        docId,
        locked: false,
        version,
        timestamp: new Date().toISOString()
      };
    }

    const now = Date.now();
    const isActive = now < lock.expiresAt;

    return {
      docId,
      locked: isActive,
      lockId: lock.id,
      heldBy: lock.fingerprint,
      acquiredAt: new Date(lock.acquiredAt).toISOString(),
      expiresAt: new Date(lock.expiresAt).toISOString(),
      renewals: lock.renewals,
      priority: lock.priority,
      version,
      remainingTime: Math.max(0, lock.expiresAt - now)
    };
  }

  /**
   * Get all active locks
   */
  getAllLocks() {
    const now = Date.now();
    const locks = [];

    for (const [lockKey, lock] of this.locks.entries()) {
      const isActive = now < lock.expiresAt;
      
      if (isActive) {
        locks.push({
          lockId: lock.id,
          docId: lock.docId,
          fingerprint: lock.fingerprint,
          priority: lock.priority,
          remainingTime: lock.expiresAt - now,
          renewals: lock.renewals
        });
      }
    }

    return locks;
  }

  /**
   * Force release a lock (admin use)
   */
  forceRelease(docId) {
    const lockKey = `lock_${docId}`;
    const lock = this.locks.get(lockKey);

    if (!lock) {
      return { success: false, reason: 'lock_not_found' };
    }

    this.locks.delete(lockKey);

    return {
      success: true,
      message: 'Lock forcefully released',
      lockId: lock.id
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    let activeLocks = 0;
    let expiredLocks = 0;

    for (const lock of this.locks.values()) {
      if (now < lock.expiresAt) {
        activeLocks++;
      } else {
        expiredLocks++;
      }
    }

    return {
      trackedDocuments: this.versions.size,
      activeLocks,
      expiredLocks,
      totalVersions: this.versions.size,
      avgVersion: this.versions.size > 0 
        ? Array.from(this.versions.keys()).reduce((a, b) => a + this._getVersion(b), 0) / this.versions.size
        : 0
    };
  }

  /**
   * Cleanup expired locks
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      let cleanedVersions = 0;

      for (const [lockKey, lock] of this.locks.entries()) {
        if (now >= lock.expiresAt) {
          this.locks.delete(lockKey);
          cleaned++;
        }
      }

      // Clean up stale versions (older than 24 hours) to prevent memory leaks
      for (const [docId, info] of this.versions.entries()) {
        if (typeof info === 'object' && info.updatedAt && (now - info.updatedAt > 24 * 60 * 60 * 1000)) {
          this.versions.delete(docId);
          cleanedVersions++;
        }
      }

      if (cleaned > 0 && cleaned > 100) {
        console.warn(`[RaceConditionHandler] Cleaned ${cleaned} expired locks`);
      }
      if (cleanedVersions > 0) {
        console.warn(`[RaceConditionHandler] Cleaned ${cleanedVersions} stale versions`);
      }
    }, this.config.cleanupInterval);

    this.cleanupTimer.unref();
  }

  /**
   * Stop cleanup timer
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global instance
const raceConditionHandler = new RaceConditionHandler({
  lockTimeout: 30000,
  maxRetries: 3,
  retryDelay: 100
});

/**
 * Middleware for automatic race condition handling
 */
export const raceConditionMiddleware = (options = {}) => {
  const {
    enabled = true,
    documentIdExtractor = (req) => req.params.id,
    fingerprintExtractor = (req) => getFingerprintKey(req)
  } = options;

  return async (req, res, next) => {
    if (!enabled) {
      return next();
    }

    // Only apply to mutations. Skip for GET, or if the action is a read-only query (read, list, statistics)
    const isGet = req.method === 'GET';
    const action = req.params?.action;
    const isReadAction = ['read', 'list', 'statistics'].includes(action);
    const isReadPath = req.path?.includes('/read/') || req.path?.includes('/list/') || req.path?.includes('/statistics/');

    if (isGet || isReadAction || isReadPath) {
      return next();
    }

    const docId = documentIdExtractor(req);
    const fingerprint = fingerprintExtractor(req);

    if (!docId) {
      return next();
    }

    // Attempt to acquire lock
    const lockResult = await raceConditionHandler.acquireLock(docId, fingerprint);

    if (!lockResult.success) {
      return res.status(409).json({
        success: false,
        message: 'Document is being modified by another device',
        reason: lockResult.reason,
        conflict: true,
        waitTime: lockResult.waitTime
      });
    }

    // Attach lock to request
    req.lock = {
      docId,
      lockId: lockResult.lockId,
      version: lockResult.version
    };

    // Release lock when response is finished or closed
    const release = () => {
      if (req.lock) {
        raceConditionHandler.releaseLock(req.lock.docId, req.lock.lockId, fingerprint);
        req.lock = null; // Prevent double release
      }
    };
    res.on('finish', release);
    res.on('close', release);

    next();
  };
};

export { raceConditionHandler };
export default raceConditionHandler;
