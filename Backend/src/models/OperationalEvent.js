import { Schema, model } from "mongoose";

const operational_eventsSchema = new Schema({
  type: {
    type: String,
    enum: ['SLA_DELAY', 'CAPACITY_RESTORED'],
    required: true,
    index: true
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'tasks',
    index: true
  },
  ticketId: {
    type: Schema.Types.ObjectId,
    ref: 'tickets',
    index: true
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'WARNING',
    index: true
  },
  delayReason: {
    type: String,
    enum: ['CAPACITY_DELAY', 'SLA_BREACH', 'SCHEDULE_SHIFT'],
    index: true
  },
  rootCause: {
    type: String,
    enum: ['EMPLOYEE_ABSENCE', 'PLANNED_LEAVE', 'DEPENDENCY_BLOCKED'],
    index: true
  },
  occurredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: {
    type: Date,
    index: true
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees'
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, { timestamps: true });

// Compound index to quickly fetch open delays for an employee
operational_eventsSchema.index({ employeeId: 1, type: 1, resolvedAt: 1 });

export default model('operational_events', operational_eventsSchema);
