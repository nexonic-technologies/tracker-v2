/**
 * ticketLifecycle.test.js
 * End-to-end verification script for the Ticket Lifecycle.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

export async function runTicketLifecycle() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Register models
  console.log('📦 Registering Mongoose models...');
  await import('../../models/Collection.js');

  const { setCache } = await import('../../utils/cache.js');
  await setCache();
  console.log('✅ Policy cache initialized');

  const { buildQuery } = await import('../../utils/policy/policyEngine.js');

  const Client = mongoose.model('clients');
  const Ticket = mongoose.model('Ticket');
  const TicketComment = mongoose.model('ticket_comments');
  const TicketCommentRead = mongoose.model('ticket_comment_reads');
  const TicketParticipant = mongoose.model('ticket_participants');
  const TicketStatusHistory = mongoose.model('ticket_status_history');
  const Employee = mongoose.model('employees');
  const Role = mongoose.model('roles');
  const TaskType = mongoose.model('task_types');

  const uniqueSuffix = Date.now();
  const clientName = `Client E2E Tickets ${uniqueSuffix}`;
  const ticketTitle = `Ticket E2E issue ${uniqueSuffix}`;

  let createdDocs = {
    clientId: null,
    ticketId: null,
    commentId: null
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up ticket E2E test data...');
    try {
      if (createdDocs.ticketId) {
        await Ticket.deleteMany({ _id: createdDocs.ticketId });
        await TicketComment.deleteMany({ ticketId: createdDocs.ticketId });
        await TicketCommentRead.deleteMany({ commentId: createdDocs.commentId });
        await TicketParticipant.deleteMany({ ticketId: createdDocs.ticketId });
        await TicketStatusHistory.deleteMany({ ticketId: createdDocs.ticketId });
      }
      if (createdDocs.clientId) await Client.deleteMany({ _id: createdDocs.clientId });
      console.log('🧹 Cleanup completed.');
    } catch (e) {
      console.error('⚠️ Cleanup error:', e.message);
    }
  };

  try {
    // Resolve admin actor and roles
    let superAdminRole = await Role.findOne({ capabilities: 'manage:agents', isActive: true }).lean();
    if (!superAdminRole) {
      superAdminRole = await Role.findOne({ name: /super admin|superadmin|admin/i, isActive: true }).lean();
    }
    if (!superAdminRole) {
      throw new Error('No appropriate Admin or Super Admin role found.');
    }

    const adminEmp = await Employee.findOne({ status: 'Active' }).lean();
    if (!adminEmp) {
      throw new Error('No active employee found.');
    }
    console.log(`👤 Actor employee: ${adminEmp.basicInfo.firstName} (${adminEmp._id})`);

    // --- STEP 1: CREATE CLIENT ---
    console.log('\n--- STEP 1: Creating Client for Ticketing ---');
    const client = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'clients',
      body: {
        name: clientName,
        email: `ticket_client_${uniqueSuffix}@e2e.com`,
        phone: '9777666555',
        Status: 'Active'
      }
    });
    createdDocs.clientId = client._id;
    console.log(`✅ Client created: ${client.name}`);

    // --- STEP 2: CREATE TICKET ---
    console.log('\n--- STEP 2: Creating Support Ticket ---');
    const defaultTaskType = await TaskType.findOne({ isActive: true }).lean();
    if (!defaultTaskType) {
      throw new Error('No active task type found to associate with ticket.');
    }

    const ticket = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'tickets',
      body: {
        title: ticketTitle,
        description: 'Screen is flickering after recent ERP v2 build deployment',
        clientId: client._id.toString(),
        type: defaultTaskType._id.toString(),
        priority: 'High',
        status: 'Open'
      }
    });
    createdDocs.ticketId = ticket._id;
    console.log(`✅ Ticket created: ${ticket.ticketId} - "${ticket.title}" (status: "${ticket.status}")`);

    // Verify creator participant auto-creation
    const participants = await TicketParticipant.find({ ticketId: ticket._id }).lean();
    console.log(`   Found ${participants.length} ticket participants.`);
    if (participants.length === 0) {
      throw new Error('Ticket creator was not automatically registered as a participant!');
    }
    console.log('✅ Verified: Ticket creator successfully registered in ticket_participants.');

    // --- STEP 3: ASSIGN AGENT ---
    console.log('\n--- STEP 3: Assigning Agent to Ticket ---');
    const updatedTicket = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'tickets',
      docId: ticket._id.toString(),
      body: {
        assignedTo: [adminEmp._id.toString()]
      }
    });
    console.log(`✅ Agent assigned to ticket. Total assignees: ${updatedTicket.assignedTo.length}`);

    // --- STEP 4: ADD PUBLIC COMMENT ---
    console.log('\n--- STEP 4: Adding Public Comment ---');
    const comment = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'ticket_comments',
      body: {
        ticketId: ticket._id.toString(),
        message: 'Hello, we are investigating the flickering issue. Please send console logs.',
        isPublic: true
      }
    });
    createdDocs.commentId = comment._id;
    console.log(`✅ Comment added: "${comment.message}"`);

    // Verify ticket status transitioned to "Waiting For Client" automatically
    const ticketAfterComment = await Ticket.findById(ticket._id).lean();
    console.log(`   Ticket status after public comment: "${ticketAfterComment.status}"`);
    if (ticketAfterComment.status !== 'Waiting For Client') {
      throw new Error(`Expected ticket status to change to "Waiting For Client", found: ${ticketAfterComment.status}`);
    }
    console.log('✅ Verified: Ticket status transitioned to "Waiting For Client".');

    // Verify status history record is logged
    const statusHistory = await TicketStatusHistory.findOne({ ticketId: ticket._id, toStatus: 'Waiting For Client' }).lean();
    if (!statusHistory) {
      throw new Error('No status history record found for the transition to Waiting For Client!');
    }
    console.log(`✅ Verified: Status transition logged in history: "${statusHistory.fromStatus}" ➔ "${statusHistory.toStatus}"`);

    // --- STEP 5: RESOLVE TICKET ---
    console.log('\n--- STEP 5: Resolving Ticket ---');

    // Transition to In Progress first
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'tickets',
      docId: ticket._id.toString(),
      body: {
        status: 'In Progress'
      }
    });
    console.log('   Ticket status set to "In Progress"');

    // Transition to Resolved
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'tickets',
      docId: ticket._id.toString(),
      body: {
        status: 'Resolved',
        resolution: 'Fixed by clearing React state lifecycle timers'
      }
    });

    // Re-fetch from DB — resolvedAt is set in afterUpdate hook, not in the returned snapshot
    const resolvedTicket = await Ticket.findById(ticket._id).lean();
    console.log(`✅ Ticket status updated to: "${resolvedTicket.status}"`);

    if (!resolvedTicket.resolvedAt) {
      throw new Error('resolvedAt timestamp was not set on resolution!');
    }
    console.log(`✅ Verified: SLA resolution timestamp logged: ${resolvedTicket.resolvedAt.toISOString()}`);

    // --- STEP 6: CLOSE TICKET ---
    console.log('\n--- STEP 6: Closing Ticket ---');
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'tickets',
      docId: ticket._id.toString(),
      body: {
        status: 'Closed'
      }
    });

    // Re-fetch from DB — closedAt is set in afterUpdate hook, not in the returned snapshot
    const closedTicket = await Ticket.findById(ticket._id).lean();
    console.log(`✅ Ticket status updated to: "${closedTicket.status}"`);

    if (!closedTicket.closedAt) {
      throw new Error('closedAt timestamp was not set on closure!');
    }
    console.log(`✅ Verified: SLA closure timestamp logged: ${closedTicket.closedAt.toISOString()}`);

    // Cleanup
    await cleanup();
    console.log('🎉 Ticket Lifecycle: PASS');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Ticket Lifecycle failed:', err);
    await cleanup();
    await mongoose.disconnect();
    throw err;
  }
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTicketLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
