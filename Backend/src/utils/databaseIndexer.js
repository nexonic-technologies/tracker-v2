/**
 * Multi-Tenant Database Indexer
 * Ensures all indexes defined in Mongoose schemas are synced cleanly on individual tenant databases.
 */
export async function ensureTenantIndexes(connection, models = {}) {
  if (!connection || !models) return { totalModels: 0, syncedModels: 0, errors: 0 };

  const modelEntries = Object.entries(models);
  let syncedModels = 0;
  let errors = 0;

  for (const [modelName, model] of modelEntries) {
    try {
      if (typeof model.syncIndexes === 'function') {
        await model.syncIndexes();
        syncedModels++;
      }
    } catch (err) {
      errors++;
      console.warn(`[databaseIndexer] Warning syncing index for '${modelName}' on tenant DB '${connection.name}':`, err.message);
    }
  }

  return {
    totalModels: modelEntries.length,
    syncedModels,
    errors
  };
}

export default ensureTenantIndexes;
