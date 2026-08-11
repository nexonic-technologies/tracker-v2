import mongoose from 'mongoose';

class DatabaseIndexer {
  constructor() {
    this.indexedModels = new Set();
  }

  async createOptimalIndexes() {
    // console.log('🔍 Creating optimal database indexes...');

    try {
      // Employee indexes
      await this.indexModel('employees', [
        { 'basicInfo.email': 1 }, // Login queries
        { 'professionalInfo.employeeId': 1 }, // Employee ID lookups
        { 'professionalInfo.department': 1, 'professionalInfo.designation': 1 }, // Department/role filtering
        { 'professionalInfo.reportingManager': 1 }, // Manager queries
        { 'basicInfo.firstName': 1, 'basicInfo.lastName': 1 }, // Name searches
        { 'professionalInfo.status': 1, 'createdAt': -1 }, // Active employee lists
        { 'basicInfo.phoneNumber': 1 }, // Phone lookups
        { 'professionalInfo.joiningDate': -1 } // Joining date sorting
      ]);

      // Task indexes
      await this.indexModel('tasks', [
        { 'assignedTo': 1, 'status': 1 }, // Assigned task filtering
        { 'clientId': 1, 'status': 1 }, // Client task filtering
        { 'status': 1, 'priorityLevel': 1, 'createdAt': -1 }, // Task dashboard
        { 'createdBy': 1, 'createdAt': -1 }, // Created tasks
        { 'startDate': 1, 'endDate': 1 }, // Date range queries
        { 'assignedTo': 1, 'startDate': 1, 'endDate': 1 }, // Employee task timeline
        { 'title': 'text', 'description': 'text' }, // Text search
        { 'followers': 1 } // Follower notifications
      ]);

      // Attendance indexes
      await this.indexModel('attendances', [
        { 'employee': 1, 'date': -1 }, // Employee attendance history
        { 'date': -1, 'status': 1 }, // Daily attendance reports
        { 'employee': 1, 'status': 1, 'date': -1 }, // Employee status filtering
        { 'checkIn': 1 }, // Check-in time queries
        { 'checkOut': 1 }, // Check-out time queries
        { 'workHours': -1 }, // Work hours sorting
        { 'status': 1, 'date': -1 } // Status-based reports
      ]);

      // Leave indexes
      await this.indexModel('leaves', [
        { 'employeeId': 1, 'status': 1 }, // Employee leave status
        { 'managerId': 1, 'status': 1 }, // Manager approval queue
        { 'status': 1, 'createdAt': -1 }, // Leave approval dashboard
        { 'startDate': 1, 'endDate': 1 }, // Date range conflicts
        { 'employeeId': 1, 'startDate': 1, 'endDate': 1 }, // Employee leave timeline
        { 'leaveTypeId': 1, 'status': 1 }, // Leave type reports
        { 'departmentId': 1, 'status': 1 } // Department leave reports
      ]);

      // Notification indexes
      await this.indexModel('notifications', [
        { 'receiver': 1, 'read': 1, 'createdAt': -1 }, // User notifications
        { 'sender': 1, 'createdAt': -1 }, // Sent notifications
        { 'type': 1, 'createdAt': -1 }, // Notification type filtering
        { 'read': 1, 'createdAt': -1 }, // Unread notifications
        { 'receiver': 1, 'type': 1, 'read': 1 } // Combined filtering
      ]);

      // Session indexes
      await this.indexModel('sessions', [
        { 'userId': 1, 'isActive': 1 }, // Active user sessions
        { 'deviceUUID': 1 }, // Device-specific sessions
        { 'expiresAt': 1 }, // Session cleanup
        { 'userId': 1, 'createdAt': -1 }, // User session history
        { 'isActive': 1, 'lastActivity': -1 } // Active session monitoring
      ]);

      // Client indexes
      await this.indexModel('clients', [
        { 'name': 1 }, // Client name lookups
        { 'email': 1 }, // Email lookups
        { 'status': 1, 'createdAt': -1 }, // Active clients
        { 'contactPerson': 1 }, // Contact person searches
        { 'name': 'text', 'email': 'text' } // Text search
      ]);

      // Quotation indexes
      await this.indexModel('quotations', [
        { 'quotationNumber': 1 }, // Quotation number lookups
        { 'clientId': 1 }, // Client quotation history
        { 'status': 1, 'createdAt': -1 }, // Status-based filtering
        { 'assignedTo': 1, 'status': 1 }, // Assigned quotations
        { 'clientId': 1, 'status': 1, 'issueDate': -1 }, // Client active quotations
        { 'validUntil': 1 }, // Expiration queries
        { 'issueDate': -1 } // Date-based sorting
      ]);

      // Daily Activity indexes
      await this.indexModel('daily_activities', [
        { 'employee': 1, 'date': -1 }, // Employee activity history
        { 'date': -1 }, // Daily activity reports
        { 'employee': 1, 'createdAt': -1 }, // Employee activity timeline
        { 'totalHours': -1 } // Hours-based sorting
      ]);

      // Todo indexes
      await this.indexModel('todos', [
        { 'employee': 1, 'completed': 1 }, // Employee todo status
        { 'completed': 1, 'createdAt': -1 }, // Todo completion tracking
        { 'employee': 1, 'createdAt': -1 }, // Employee todo timeline
        { 'priority': 1, 'completed': 1 } // Priority-based filtering
      ]);

      // API Hit Log indexes (for monitoring)
      await this.indexModel('api_hit_logs', [
        { 'userId': 1, 'timestamp': -1 }, // User activity tracking
        { 'endpoint': 1, 'timestamp': -1 }, // Endpoint usage
        { 'method': 1, 'statusCode': 1, 'timestamp': -1 }, // Error tracking
        { 'timestamp': -1 }, // Time-based cleanup
        { 'responseTime': -1 } // Performance monitoring
      ]);

      // Activity-Centric Work Model indexes
      await this.indexModel('job_categories', [
        { 'isActive': 1, 'order': 1 },
        { 'name': 1 }
      ]);

      await this.indexModel('job_types', [
        { 'categoryId': 1, 'isActive': 1, 'order': 1 },
        { 'isActive': 1, 'order': 1 },
        { 'name': 1 },
        { 'defaultDeliveryStage': 1 }
      ]);

      // TTL indexes for cleanup
      await this.createTTLIndexes();

      // console.log('✅ Database indexes created successfully');

    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
      throw error;
    }
  }

  async indexModel(modelName, indexes) {
    try {
      const collection = mongoose.connection.db.collection(modelName);
      const existingIndexes = await collection.indexes().catch(() => []);

      for (const index of indexes) {
        try {
          const indexName = Object.keys(index).join('_');

          // Check if index already exists
          const indexExists = existingIndexes.some(existing =>
            existing.name === indexName ||
            JSON.stringify(existing.key) === JSON.stringify(index)
          );

          if (!indexExists) {
            await collection.createIndex(index, {
              background: true,
              name: indexName
            });
            // console.log(`  ✓ Created index on ${modelName}: ${indexName}`);
          }
        } catch (indexError) {
          console.warn(`  ⚠️  Warning: Failed to create index on ${modelName}:`, indexError.message);
        }
      }

      this.indexedModels.add(modelName);

    } catch (error) {
      console.error(`Error indexing ${modelName}:`, error);
    }
  }

  async createTTLIndexes() {
    // console.log('🕒 Creating TTL indexes for automatic cleanup...');

    try {
      // Sessions - expire after 30 days of inactivity
      await mongoose.connection.db.collection('sessions').createIndex(
        { 'lastActivity': 1 },
        {
          expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
          background: true,
          name: 'session_ttl'
        }
      );

      // API Hit Logs - expire after 90 days
      await mongoose.connection.db.collection('api_hit_logs').createIndex(
        { 'timestamp': 1 },
        {
          expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
          background: true,
          name: 'apihitlog_ttl'
        }
      );

      // Notifications - expire read notifications after 6 months
      await mongoose.connection.db.collection('notifications').createIndex(
        { 'createdAt': 1 },
        {
          expireAfterSeconds: 180 * 24 * 60 * 60, // 180 days
          partialFilterExpression: { 'read': true },
          background: true,
          name: 'notification_read_ttl'
        }
      );

      // console.log('  ✓ TTL indexes created for automatic cleanup');

    } catch (error) {
      console.error('Error creating TTL indexes:', error);
    }
  }

  async analyzeQueryPerformance() {
    // console.log('📊 Analyzing query performance...');

    try {
      const collections = ['employees', 'tasks', 'attendances', 'leaves', 'notifications'];
      const analysis = {};

      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);

        // Get collection stats
        const stats = await collection.stats();

        // Get index usage stats
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();

        analysis[collectionName] = {
          documentCount: stats.count,
          avgDocumentSize: Math.round(stats.avgObjSize),
          totalIndexSize: Math.round(stats.totalIndexSize / 1024) + 'KB',
          indexes: indexStats.map(idx => ({
            name: idx.name,
            usageCount: idx.accesses?.ops || 0,
            lastUsed: idx.accesses?.since || 'Never'
          }))
        };
      }

      // console.log('Query Performance Analysis:', JSON.stringify(analysis, null, 2));
      return analysis;

    } catch (error) {
      console.error('Error analyzing query performance:', error);
      return {};
    }
  }

  async dropUnusedIndexes() {
    // console.log('🧹 Checking for unused indexes...');

    try {
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const collectionInfo of collections) {
        const collection = mongoose.connection.db.collection(collectionInfo.name);

        try {
          const indexStats = await collection.aggregate([
            { $indexStats: {} }
          ]).toArray();

          for (const indexStat of indexStats) {
            // Skip default _id index
            if (indexStat.name === '_id_') continue;

            // Check if index has been used
            const usageCount = indexStat.accesses?.ops || 0;

            if (usageCount === 0) {
              // console.log(`  ⚠️  Unused index found: ${collectionInfo.name}.${indexStat.name}`);
              // Uncomment to actually drop unused indexes
              // await collection.dropIndex(indexStat.name);
              // // console.log(`  🗑️  Dropped unused index: ${indexStat.name}`);
            }
          }
        } catch (error) {
          // Some collections might not support $indexStats
          continue;
        }
      }

    } catch (error) {
      console.error('Error checking unused indexes:', error);
    }
  }

  getIndexedModels() {
    return Array.from(this.indexedModels);
  }
}

export default new DatabaseIndexer();