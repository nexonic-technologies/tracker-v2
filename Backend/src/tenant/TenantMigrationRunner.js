import mongoose from 'mongoose';

const MigrationSchema = new mongoose.Schema({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
});

// Registered Tenant Migrations Registry (Strictly Non-Destructive)
const MIGRATIONS = [
  {
    version: 1,
    name: '001_initial_tenant_schema',
    up: async (conn) => {
      // Non-destructive initial tenant schema setup
      return true;
    }
  },
  {
    version: 2,
    name: '002_backfill_attendance_default_status',
    up: async (conn) => {
      // Non-destructive field backfill example
      if (conn.collections['attendances']) {
        await conn.collections['attendances'].updateMany(
          { status: { $exists: false } },
          { $set: { status: 'Present' } }
        );
      }
      return true;
    }
  }
];

/**
 * Runs pending schema migrations idempotently on a tenant database connection.
 * @param {mongoose.Connection} connection - Active tenant Mongoose connection
 */
export async function runTenantMigrations(connection) {
  if (!connection) return { applied: 0, skipped: 0 };

  const MigrationModel = connection.models['_Migration'] || connection.model('_Migration', MigrationSchema, '_migrations');

  let appliedCount = 0;
  let skippedCount = 0;

  for (const migration of MIGRATIONS) {
    const existing = await MigrationModel.findOne({ version: migration.version }).lean();
    if (existing) {
      skippedCount++;
      continue;
    }

    // Execute non-destructive migration
    await migration.up(connection);

    // Record migration entry
    await MigrationModel.create({
      version: migration.version,
      name: migration.name,
      appliedAt: new Date()
    });

    appliedCount++;
  }

  return {
    applied: appliedCount,
    skipped: skippedCount,
    total: MIGRATIONS.length
  };
}

export default runTenantMigrations;
