// src/scripts/seedNotificationRules.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from "dns";

// Force Node.js to use reliable public DNS for MongoDB SRV lookups
// Local router DNS often refuses querySrv from Node.js
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);


// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

async function seed() {
  console.log('Connecting to database:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  try {
    const { default: models } = await import('../models/Collection.js');
    const NotificationRule = models.notificationrules;
    const general_settings = models.general_settings;

    if (!NotificationRule) {
      throw new Error('NotificationRule model not registered in Collection.js');
    }

    console.log('Clearing old notification rules...');
    await NotificationRule.deleteMany({});

    const rules = [
      {
        name: "Attendance Request Notifications",
        modelName: "attendances",
        trigger: "create",
        enabled: true,
        priority: 10,
        conditionGroups: {
          operator: "AND",
          conditions: []
        },
        recipients: {
          fields: ["managerId"]
        },
        template: {
          title: "New Attendance Request",
          message: "{{new.employeeName}} has submitted a check-in request.",
          type: "system",
          path: "/attendance"
        }
      },
      {
        name: "Task Comment Updates",
        modelName: "comments_threads",
        trigger: "create",
        enabled: true,
        priority: 10,
        conditionGroups: {
          operator: "AND",
          conditions: [
            { field: "taskId", operator: "exists" }
          ]
        },
        recipients: {
          customResolvers: ["tasks.threadParticipants"]
        },
        template: {
          title: "New Task Comment",
          message: "{{actor.basicInfo.firstName}} commented: {{new.message}}",
          type: "comment",
          path: "/tasks/{{new.taskId}}"
        }
      },
      {
        name: "Task Comment Mentions",
        modelName: "comments_threads",
        trigger: "create",
        enabled: true,
        priority: 20, // Run mentions before comments to avoid notification collisions if needed
        stopProcessing: false,
        conditionGroups: {
          operator: "AND",
          conditions: [
            { field: "mentions", operator: "exists" }
          ]
        },
        recipients: {
          fields: ["mentions"]
        },
        template: {
          title: "New Task Mention",
          message: "{{actor.basicInfo.firstName}} mentioned you in a comment.",
          type: "mention",
          path: "/tasks/{{new.taskId}}"
        }
      },
      {
        name: "Ticket Conversion Notifications",
        modelName: "tickets",
        trigger: "update",
        enabled: true,
        priority: 10,
        conditionGroups: {
          operator: "AND",
          conditions: [
            { field: "status", operator: "changed" },
            { field: "status", operator: "equals", value: "Converted" }
          ]
        },
        recipients: {
          fields: ["createdBy"]
        },
        template: {
          title: "Ticket Converted to Task",
          message: "Your ticket {{new.title}} has been converted to a development task.",
          type: "ticket",
          path: "/tickets"
        }
      },
      {
        name: "Feed Group Post Alerts",
        modelName: "feed_posts",
        trigger: "create",
        enabled: true,
        priority: 10,
        conditionGroups: {
          operator: "AND",
          conditions: [
            { field: "group", operator: "exists" }
          ]
        },
        recipients: {
          customResolvers: ["feed_posts.groupMembers"]
        },
        template: {
          title: "New Post in Group",
          message: "{{actor.basicInfo.firstName}} posted in the group.",
          type: "post",
          path: "/feed"
        }
      },
      {
        name: "Feed Channel Post Alerts",
        modelName: "feed_posts",
        trigger: "create",
        enabled: true,
        priority: 10,
        conditionGroups: {
          operator: "AND",
          conditions: [
            { field: "channel", operator: "exists" }
          ]
        },
        recipients: {
          customResolvers: ["feed_posts.channelMembers"]
        },
        template: {
          title: "New Post in Channel",
          message: "{{actor.basicInfo.firstName}} posted in the channel.",
          type: "post",
          path: "/feed"
        }
      }
    ];

    console.log('Inserting seed notification rules...');
    await NotificationRule.insertMany(rules);

    console.log('Enabling dynamic notifications flag in general_settings...');
    const settingsCount = await general_settings.countDocuments();
    if (settingsCount > 0) {
      await general_settings.updateOne({}, {
        $set: {
          'notification.useDynamicNotifications': true,
          'notification.enabled': true
        }
      });
    } else {
      await general_settings.create({
        version: 1,
        notification: {
          enabled: true,
          useDynamicNotifications: true,
          defaultProviders: ['socket']
        }
      });
    }

    console.log('✅ Seeding notification rules completed successfully.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.stack || err.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

seed();
