import express from 'express';
import { setCache } from '../utils/cache.js';
import models from '../models/Collection.js';
import { getAllowedModelKeys } from '../models/tenantRegistry.js';

const router = express.Router();

// Get list of all available models for dropdowns
// ?fields=true → also returns top-level schema field names per model
router.get('/models', (req, res) => {
    try {
        let modelNames = Object.keys(models).sort();

        const allowedModelKeys = getAllowedModelKeys(req.enabledModules);
        if (allowedModelKeys) {
            modelNames = modelNames.filter(name => allowedModelKeys.has(name.toLowerCase()));
        }

        if (req.query.fields === 'true') {
            const fieldMap = {};
            for (const name of modelNames) {
                try {
                    const model = models[name];
                    if (model && model.schema && model.schema.paths) {
                        // Extract top-level paths, exclude Mongoose internals
                        const paths = Object.keys(model.schema.paths).filter(
                            (p) => !p.startsWith('__') && p !== '_id' && !p.startsWith('$')
                        );
                        // Deduplicate nested (e.g. "professionalInfo.dept" → "professionalInfo")
                        const topLevel = [...new Set(paths.map((p) => p.split('.')[0]))];
                        fieldMap[name] = topLevel.sort();
                    } else {
                        fieldMap[name] = [];
                    }
                } catch (err) {
                    console.error(`[Config] Error reading fields for model ${name}:`, err);
                    fieldMap[name] = [];
                }
            }
            return res.json({ success: true, models: modelNames, fields: fieldMap });
        }

        res.json({ success: true, models: modelNames });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch models' });
    }
});

router.post('/refresh-policy', async (req, res) => {
    try {
        await setCache();
        res.json({
            success: true,
            message: 'Access Policy Cache Refreshed Successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Config] Policy refresh failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh cache',
            error: error.message
        });
    }
});

/**
 * POST /api/config/seed-model-policies
 * Body: { models: ['status_configss','status_mappings'], permissions: { read, create, update, delete } }
 *
 * Creates AccessPolicy records for ALL existing roles for each listed model,
 * then refreshes the policy cache. Safe to call multiple times (upsert).
 */
router.post('/seed-model-policies', async (req, res) => {
    try {
        const { models: modelNames = [], permissions = {} } = req.body;

        if (!modelNames.length) {
            return res.status(400).json({ success: false, message: 'Provide models array' });
        }

        const perms = {
            read: permissions.read ?? true,
            create: permissions.create ?? true,
            update: permissions.update ?? true,
            delete: permissions.delete ?? false,
        };

        const roles = await models.roles.find({}).lean();
        if (!roles.length) {
            return res.status(400).json({ success: false, message: 'No roles found in DB' });
        }

        const ops = [];
        for (const role of roles) {
            for (const modelName of modelNames) {
                ops.push({
                    updateOne: {
                        filter: { role: role._id, modelName },
                        update: {
                            $setOnInsert: {
                                role: role._id,
                                modelName,
                                permissions: perms,
                                forbiddenAccess: { read: [], create: [], update: [], delete: [] },
                                allowAccess: { read: [], create: [], update: [], delete: [] },
                                registry: [],
                                conditions: {},
                            },
                        },
                        upsert: true,
                    },
                });
            }
        }

        const result = await models.access_policies.bulkWrite(ops);

        // Refresh cache so new policies take effect immediately (no restart needed)
        await setCache();

        res.json({
            success: true,
            message: `Policies seeded for [${modelNames.join(', ')}] across ${roles.length} roles`,
            upserted: result.upsertedCount,
            matched: result.matchedCount,
        });
    } catch (error) {
        console.error('[Config] seed-model-policies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
