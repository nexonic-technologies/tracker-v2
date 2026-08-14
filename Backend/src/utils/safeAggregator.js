import mongoose from "mongoose";

/**
 * 🧩 Safe Aggregation Utility
 * - Enforces pipeline stage safety limits ($lookup, $unwind, $match)
 * - Prohibits destructive stages ($out, $merge)
 * - Fails closed with structured errors when thresholds are exceeded or aggregation fails
 */

const safeAggregate = async (model, pipeline = [], options = {}) => {
  console.log("Safe aggregate statred.... ")
  if (!model) {
    throw new Error('[safeAggregate] Target Mongoose model is required');
  }


  console.log("Passed Model verificaiton...")

  // Safety fallback: Ensure pipeline is never empty
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    pipeline = [{ $match: {} }];
    console.log("Passed pipeline validation in if condition", pipeline)
  }

  console.log("Passed pipeline validation")

  const hasIllegalStage = pipeline.some(stage => stage && (stage.$out || stage.$merge));
  console.log("hasIllegalStage", hasIllegalStage)
  if (hasIllegalStage) {
    throw new Error('[SecurityViolation] Aggregation pipeline contains forbidden stages ($out, $merge)');
  }

  console.log("Passed illegal stage validation")

  const lookupCount = pipeline.filter(stage => stage && stage.$lookup).length;
  const unwindCount = pipeline.filter(stage => stage && stage.$unwind).length;
  const matchCount = pipeline.filter(stage => stage && stage.$match).length;
  const totalStages = pipeline.length;
  console.log("lookupCount", lookupCount)
  console.log("unwindCount", unwindCount)
  console.log("matchCount", matchCount)
  console.log("totalStages", totalStages)

  // Define safe limits
  const MAX_LOOKUPS = 9;
  const MAX_UNWINDS = 9;
  const MAX_MATCHES = 10;
  const MAX_TOTAL_STAGES = 25;

  // Check against limits
  if (lookupCount > MAX_LOOKUPS ||
    unwindCount > MAX_UNWINDS ||
    matchCount > MAX_MATCHES ||
    totalStages > MAX_TOTAL_STAGES) {
    const errorMsg = `[safeAggregate] Aggregation aborted for ${model.modelName || 'Model'}: stage limits exceeded (Lookups=${lookupCount}, Unwinds=${unwindCount}, Matches=${matchCount}, Total=${totalStages})`;
    console.warn(`⚠️ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log("Passed limit checks")

  try {
    console.log("Passed limit checks")
    // Log aggregation pipeline execution details
    console.log(`📊 [safeAggregate] Executing pipeline for model "${model?.modelName || 'Unknown'}":`, JSON.stringify(pipeline, null, 2));

    // Execute aggregation with disk use enabled
    const results = await model.aggregate(pipeline, { allowDiskUse: true, ...options });
    return results;
  } catch (error) {
    console.error(`❌ Aggregation execution error for ${model?.modelName || 'Model'}:`, error.message);
    throw new Error(`[safeAggregate] Aggregation execution failed: ${error.message}`);
  }
};

export default safeAggregate;