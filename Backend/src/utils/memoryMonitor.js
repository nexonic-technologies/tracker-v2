// utils/memoryMonitor.js
import { activeConnections } from '../index.js';

class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.lastGC = Date.now();
    this.memoryThreshold = 1024 * 1024 * 1024; // 1GB
    this.connectionThreshold = 1000;
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      connections: activeConnections?.size || 0,
      uptime: Math.round((Date.now() - this.startTime) / 1000 / 60) // minutes
    };
  }

  checkMemoryHealth() {
    const stats = this.getMemoryStats();
    const warnings = [];

    if (stats.heapUsed > this.memoryThreshold / 1024 / 1024) {
      warnings.push(`High heap usage: ${stats.heapUsed}MB`);
    }

    if (stats.connections > this.connectionThreshold) {
      warnings.push(`High connection count: ${stats.connections}`);
    }

    if (stats.heapUsed / stats.heapTotal > 0.9) {
      warnings.push(`Heap utilization critical: ${Math.round(stats.heapUsed / stats.heapTotal * 100)}%`);
    }

    return { stats, warnings };
  }

  forceGarbageCollection() {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = Math.round((before - after) / 1024 / 1024);
      // console.log(`🗑️ Garbage collection freed ${freed}MB`);
      this.lastGC = Date.now();
      return freed;
    }
    return 0;
  }

  startMonitoring(intervalMs = 60000) {
    setInterval(() => {
      const { stats, warnings } = this.checkMemoryHealth();

      if (warnings.length > 0) {
        // console.warn('⚠️ Memory warnings:', warnings);
        // // console.log('📊 Memory stats:', stats);

        // Auto garbage collection if heap usage is high
        if (stats.heapUsed > 512 && Date.now() - this.lastGC > 300000) { // 5 minutes
          this.forceGarbageCollection();
        }
      }
    }, intervalMs);
  }

  getHealthEndpoint() {
    return (req, res) => {
      const { stats, warnings } = this.checkMemoryHealth();
      res.json({
        status: warnings.length === 0 ? 'healthy' : 'warning',
        memory: stats,
        warnings,
        timestamp: new Date().toISOString()
      });
    };
  }
}

export default new MemoryMonitor();