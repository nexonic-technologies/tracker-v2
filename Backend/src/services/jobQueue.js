import EventEmitter from 'events';

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 10;
    this.batchSize = options.batchSize || 100;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000;
    
    this.queue = [];
    this.processing = [];
    this.completed = 0;
    this.failed = 0;
    this.isProcessing = false;
  }

  add(job) {
    this.queue.push({
      id: Date.now() + Math.random(),
      ...job,
      attempts: 0,
      createdAt: new Date()
    });
    
    if (!this.isProcessing) {
      this.process();
    }
  }

  addBatch(jobs) {
    jobs.forEach(job => this.add(job));
  }

  async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 || this.processing.length > 0) {
      // Fill processing slots
      while (this.processing.length < this.concurrency && this.queue.length > 0) {
        const job = this.queue.shift();
        this.processing.push(job);
        this.executeJob(job);
      }

      // Wait for at least one job to complete
      if (this.processing.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessing = false;
    this.emit('completed', { completed: this.completed, failed: this.failed });
  }

  async executeJob(job) {
    try {
      await job.handler(job.data);
      this.completed++;
      this.emit('job:completed', job);
    } catch (error) {
      job.attempts++;
      
      if (job.attempts < this.retryAttempts) {
        setTimeout(() => {
          this.queue.unshift(job);
        }, this.retryDelay);
        this.emit('job:retry', { job, error });
      } else {
        this.failed++;
        this.emit('job:failed', { job, error });
      }
    } finally {
      this.processing = this.processing.filter(p => p.id !== job.id);
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing.length,
      completed: this.completed,
      failed: this.failed
    };
  }
}

export default JobQueue;