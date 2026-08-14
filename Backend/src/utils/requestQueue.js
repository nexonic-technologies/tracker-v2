/**
 * Request Queue Manager
 * Prevents race conditions by queuing concurrent requests per device/user
 * Similar to AWS SQS with FIFO ordering per partition key (device fingerprint)
 */

import { getFingerprintKey } from '../utils/deviceFingerprint.js';

// Read limits from environment — allows runtime tuning without code changes
const ENV_MAX_CONCURRENT_PER_DEVICE = parseInt(process.env.QUEUE_MAX_CONCURRENT_PER_DEVICE || '2', 10);
const ENV_MAX_SERVER_CONCURRENT     = parseInt(process.env.QUEUE_MAX_SERVER_CONCURRENT     || '50', 10);
const ENV_MAX_SIZE_PER_DEVICE       = parseInt(process.env.QUEUE_MAX_SIZE_PER_DEVICE       || '100', 10);
const ENV_REQUEST_TIMEOUT_MS        = parseInt(process.env.QUEUE_REQUEST_TIMEOUT_MS        || '30000', 10);

class RequestQueue {
  constructor(options = {}) {
    this.queues = new Map();     // fingerprint -> queue array
    this.processing = new Map(); // fingerprint -> active count
    this.metrics = new Map();    // fingerprint -> metrics
    this._serverProcessing = 0;  // global active count across all devices

    this.config = {
      maxConcurrentPerDevice: options.maxConcurrentPerDevice ?? ENV_MAX_CONCURRENT_PER_DEVICE,
      maxServerConcurrent:    options.maxServerConcurrent    ?? ENV_MAX_SERVER_CONCURRENT,
      maxQueueSize:           options.maxQueueSize           ?? ENV_MAX_SIZE_PER_DEVICE,
      requestTimeout:         options.requestTimeout         ?? ENV_REQUEST_TIMEOUT_MS,
      cleanupInterval:        options.cleanupInterval        || 60 * 60 * 1000
    };

    this.startCleanup();
  }

  /**
   * Queue a request for processing
   */
  enqueue(fingerprint, handler, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      timeout = this.config.requestTimeout,
      metadata = {}
    } = options;

    // Initialize queue if needed
    if (!this.queues.has(fingerprint)) {
      this.queues.set(fingerprint, []);
      this.processing.set(fingerprint, 0);
      this.metrics.set(fingerprint, {
        queued: 0,
        processed: 0,
        failed: 0,
        totalWaitTime: 0
      });
    }

    const queue = this.queues.get(fingerprint);

    // Check queue size
    if (queue.length >= this.config.maxQueueSize) {
      return {
        success: false,
        reason: 'queue_full',
        message: `Queue full for device ${fingerprint}`
      };
    }

    // Create queue entry
    const entry = {
      id: `${fingerprint}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      handler,
      priority,
      timeout,
      metadata,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      status: 'queued',
      result: null,
      error: null
    };

    // Insert based on priority
    if (priority === 'high') {
      queue.unshift(entry);
    } else if (priority === 'low') {
      queue.push(entry);
    } else {
      queue.push(entry);
    }

    const metrics = this.metrics.get(fingerprint);
    metrics.queued++;

    // Process if not already processing
    this.processNext(fingerprint);

    return {
      success: true,
      queueId: entry.id,
      position: queue.indexOf(entry),
      queueLength: queue.length
    };
  }

  /**
   * Process next request in queue
   */
  async processNext(fingerprint) {
    const queue = this.queues.get(fingerprint);
    const processing = this.processing.get(fingerprint);

    if (!queue || queue.length === 0 ||
        processing >= this.config.maxConcurrentPerDevice ||
        this._serverProcessing >= this.config.maxServerConcurrent) {
      return;
    }

    const entry = queue.shift();
    this.processing.set(fingerprint, processing + 1);
    this._serverProcessing++;
    entry.status = 'processing';
    entry.startedAt = Date.now();

    try {
      // Execute with timeout — MUST return so the caller gets the result
      console.log(`[Queue DEBUG] [${new Date().toISOString()}] [processNext] Executing handler for entry ${entry.id}`);
      const result = await Promise.race([
        entry.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), entry.timeout)
        )
      ]);

      console.log(`[Queue DEBUG] [${new Date().toISOString()}] [processNext] Handler completed for entry ${entry.id}`);
      entry.status = 'completed';
      entry.completedAt = Date.now();
      entry.result = result;

      const metrics = this.metrics.get(fingerprint);
      metrics.processed++;
      metrics.totalWaitTime += entry.startedAt - entry.createdAt;

      return result; // propagate to enqueue() caller
    } catch (error) {
      entry.status = 'failed';
      entry.completedAt = Date.now();
      entry.error = error.message;

      const metrics = this.metrics.get(fingerprint);
      metrics.failed++;

      console.error(`Queue error for ${fingerprint}: ${error.message}`);
    } finally {
      // Decrement processing counters (per-device + global)
      const newProcessing = Math.max(0, this.processing.get(fingerprint) - 1);
      this.processing.set(fingerprint, newProcessing);
      this._serverProcessing = Math.max(0, this._serverProcessing - 1);

      // Process next in queue
      setImmediate(() => this.processNext(fingerprint));
    }
  }

  /**
   * Get queue status for a fingerprint
   */
  getStatus(fingerprint) {
    const queue = this.queues.get(fingerprint) || [];
    const processing = this.processing.get(fingerprint) || 0;
    const metrics = this.metrics.get(fingerprint) || {
      queued: 0,
      processed: 0,
      failed: 0,
      totalWaitTime: 0
    };

    return {
      fingerprint,
      queueLength: queue.length,
      processing,
      metrics,
      avgWaitTime: metrics.processed > 0 ? Math.round(metrics.totalWaitTime / metrics.processed) : 0,
      queue: queue.map(e => ({
        id: e.id,
        priority: e.priority,
        status: e.status,
        createdAt: new Date(e.createdAt).toISOString()
      }))
    };
  }

  /**
   * Get queue entry details
   */
  getEntry(fingerprint, queueId) {
    const queue = this.queues.get(fingerprint) || [];
    const entry = queue.find(e => e.id === queueId);

    if (!entry) {
      return null;
    }

    return {
      id: entry.id,
      status: entry.status,
      priority: entry.priority,
      createdAt: new Date(entry.createdAt).toISOString(),
      startedAt: entry.startedAt ? new Date(entry.startedAt).toISOString() : null,
      completedAt: entry.completedAt ? new Date(entry.completedAt).toISOString() : null,
      waitTime: (entry.startedAt || Date.now()) - entry.createdAt,
      processingTime: entry.completedAt ? entry.completedAt - (entry.startedAt || Date.now()) : null,
      result: entry.result,
      error: entry.error
    };
  }

  /**
   * Clear queue for a fingerprint
   */
  clear(fingerprint) {
    const queue = this.queues.get(fingerprint) || [];
    const clearedCount = queue.length;
    
    this.queues.set(fingerprint, []);
    this.processing.set(fingerprint, 0);
    
    return clearedCount;
  }

  /**
   * Get global statistics
   */
  getStats() {
    let totalQueued = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalProcessing = 0;

    for (const metrics of this.metrics.values()) {
      totalQueued += metrics.queued;
      totalProcessed += metrics.processed;
      totalFailed += metrics.failed;
    }

    for (const count of this.processing.values()) {
      totalProcessing += count;
    }

    return {
      trackedDevices: this.queues.size,
      totalQueued,
      totalProcessed,
      totalFailed,
      currentlyProcessing: totalProcessing,
      serverConcurrentLimit: this.config.maxServerConcurrent,
      perDeviceConcurrentLimit: this.config.maxConcurrentPerDevice,
      serverUtilization: `${totalProcessing}/${this.config.maxServerConcurrent}`,
      avgQueueSize: this.queues.size > 0
        ? Array.from(this.queues.values()).reduce((sum, q) => sum + q.length, 0) / this.queues.size
        : 0,
      successRate: totalQueued > 0 ? ((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2) + '%' : 'N/A'
    };
  }

  /**
   * Cleanup old queue records
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.cleanupInterval;

      for (const [fingerprint, queue] of this.queues.entries()) {
        // Remove if no activity
        const metrics = this.metrics.get(fingerprint);
        if (queue.length === 0 && metrics && (metrics.queued === 0 || now - (queue[queue.length - 1]?.completedAt || 0) > maxAge)) {
          this.queues.delete(fingerprint);
          this.processing.delete(fingerprint);
          this.metrics.delete(fingerprint);
        }
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

// Global singleton — limits fully driven by environment variables
const requestQueue = new RequestQueue();

/**
 * Express middleware for request queueing
 */
export const queueMiddleware = (options = {}) => {
  const {
    enabled = false, // Disabled by default, enable for specific endpoints
    keyGenerator = (req) => getFingerprintKey(req),
    shouldQueue = (req) => false, // Override this per route
    onQueueFull = (req, res) => {
      res.status(503).json({
        success: false,
        message: 'Server queue full, please retry later'
      });
    }
  } = options;

  return async (req, res, next) => {
    if (!enabled || !shouldQueue(req)) {
      return next();
    }

    const fingerprint = keyGenerator(req);
    const deviceQueue = requestQueue.queues.get(fingerprint) || [];

    console.log(`[Queue DEBUG] [${new Date().toISOString()}] Incoming: ${req.method} ${req.originalUrl} | Fingerprint: ${fingerprint} | Server Processing: ${requestQueue._serverProcessing}/${requestQueue.config.maxServerConcurrent} | Device Queue: ${deviceQueue.length}/${requestQueue.config.maxQueueSize}`);

    // ── Ceiling checks (fast-reject before touching queue) ──────────────────
    if (requestQueue._serverProcessing >= requestQueue.config.maxServerConcurrent) {
      console.log(`[Queue DEBUG] Rejected: Server processing limit reached (${requestQueue._serverProcessing} >= ${requestQueue.config.maxServerConcurrent})`);
      return onQueueFull(req, res);
    }

    if (deviceQueue.length >= requestQueue.config.maxQueueSize) {
      console.log(`[Queue DEBUG] Rejected: Device queue size limit reached (${deviceQueue.length} >= ${requestQueue.config.maxQueueSize})`);
      return onQueueFull(req, res);
    }

    // ── Deferred gate pattern ────────────────────────────────────────────────
    //
    // Two separate signals are needed:
    //
    //   gate            — resolves when it is THIS request's turn to run.
    //                     The middleware suspends here (await gate) so next()
    //                     is called exactly once, in queue order.
    //
    //   completionSignal — resolves when res.json / res.send fires, i.e. when
    //                     the actual HTTP response has been written. The queued
    //                     handler awaits this before returning, which keeps the
    //                     _serverProcessing slot occupied until the DB write +
    //                     response are truly done. Only then does processNext()
    //                     decrement the counter and process the next entry.
    //
    // Why res.json patching lives HERE (not inside the queued handler):
    //   If the patch were inside the handler, next() would have to be called
    //   first — but next() is what triggers the route that calls res.json.
    //   Race condition: next() fires → populateHelper calls res.json before
    //   the patch is applied. Patching here, before await gate, guarantees the
    //   override is in place before any downstream handler can respond.

    let openGate;
    const gate = new Promise((resolve) => { openGate = resolve; });

    let signalComplete;
    const completionSignal = new Promise((resolve) => { signalComplete = resolve; });

    // Setup cleanup on response completion or connection close
    const cleanup = () => {
      res.removeListener('finish', cleanup);
      res.removeListener('close', cleanup);
      signalComplete();
    };
    res.once('finish', cleanup);
    res.once('close', cleanup);

    // Patch res.json / res.send BEFORE the gate opens so the interception is
    // guaranteed to be in place when populateHelper eventually fires.
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function(data) {
      cleanup(); // release the queue slot
      return originalJson(data);
    };

    res.send = function(data) {
      cleanup(); // release the queue slot
      return originalSend(data);
    };

    // Enqueue: the queued handler opens the gate (unblocking next() below)
    // and then holds the slot open until the response is sent.
    const status = requestQueue.enqueue(fingerprint, async () => {
      console.log(`[Queue DEBUG] [Handler] Starting. Calling openGate().`);
      openGate();             // this request's turn — let next() fire
      console.log(`[Queue DEBUG] [Handler] openGate() called. Awaiting completionSignal.`);
      await completionSignal; // hold _serverProcessing slot until res is sent
      console.log(`[Queue DEBUG] [Handler] completionSignal resolved.`);
    }, {
      metadata: {
        route: req.originalUrl,
        method: req.method,
        action: req.params?.action,
        model: req.params?.model
      }
    });

    // enqueue() returns synchronously with the acceptance object.
    // success:false only happens if the queue was full (already checked above,
    // but guard again for safety in case of a race between the check and push).
    if (!status || !status.success) {
      // Restore originals so the error response isn't accidentally intercepted
      res.json = originalJson;
      res.send = originalSend;
      res.removeListener('finish', cleanup);
      res.removeListener('close', cleanup);
      return onQueueFull(req, res);
    }

    // Attach queue metadata for downstream inspection / debugging headers
    req.queue = {
      queueId: status.queueId,
      position: status.position,
      queueLength: status.queueLength
    };

    res.set('X-Queue-Position', String(status.position));
    res.set('X-Queue-Length', String(status.queueLength));

    // Block until it is this request's turn, then hand off to the route.
    // next() is called exactly once, in FIFO order per device.
    await gate;

    console.log(`[Queue DEBUG] Gate opened for: ${req.method} ${req.originalUrl} | ID: ${status.queueId} | req.destroyed=${req.destroyed}, res.destroyed=${res.destroyed}, res.writableEnded=${res.writableEnded}`);

    // If the request was aborted while in queue, bypass calling next()
    if (req.destroyed || res.destroyed || res.writableEnded) {
      console.log(`[Queue DEBUG] Bypassing next() because connection is aborted/ended`);
      return;
    }
    console.log(`[Queue DEBUG] Calling next() for: ${req.method} ${req.originalUrl} | ID: ${status.queueId}`);
    next();
  };
};

/**
 * Wrap a handler in queue processing
 */
export const wrapInQueue = (fingerprint, handler, options = {}) => {
  return requestQueue.enqueue(fingerprint, handler, options);
};

export { requestQueue };
export default requestQueue;
