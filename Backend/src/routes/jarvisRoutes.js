import express from 'express';
import defaultJarvis from '../jarvis/index.js';
import { defaultTokenEngine } from '../jarvis/tokens/TokenEngine.js';
import { defaultMongoBrainMemoryStore } from '../jarvis/providers/MongoBrainMemoryStore.js';
import { defaultToolRegistry } from '../jarvis/tools/ToolRegistry.js';

const router = express.Router();

/**
 * Interactive Conversational & HR Query Endpoint
 */
router.post('/chat', async (req, res) => {
  try {
    const { utterance, sessionId, conversationHistory } = req.body;
    const user = req.user || {};
    const employeeId = req.user?.employeeId || req.user?.id || req.body.employeeId;
    const tenantSlug = req.headers['x-tenant-slug'] || req.user?.tenantSlug || 'admin';

    const ctx = await defaultJarvis.handle({
      userId: req.user?.id || 'anonymous',
      employeeId,
      tenantSlug,
      role: req.user?.role?.name || req.user?.roleName || req.user?.role,
      department: req.user?.department?.name || req.user?.department,
      utterance: utterance || '',
      sessionId,
    });

    if (Array.isArray(conversationHistory)) {
      ctx.conversationHistory = conversationHistory;
    }

    res.json({
      success: true,
      traceId: ctx.traceId,
      response: ctx.response,
      actionPayload: ctx.actionPayload,
      intent: ctx.intent,
      offlineResolved: ctx.offlineResolved,
      verified: ctx.verified,
    });
  } catch (err) {
    console.error('[JarvisRoute] Chat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Confirmed Transactional Execution Endpoint
 */
router.post('/execute', async (req, res) => {
  try {
    const { tool, params } = req.body;
    const employeeId = req.user?.employeeId || req.user?.id;
    const tenantSlug = req.headers['x-tenant-slug'] || req.user?.tenantSlug || 'admin';

    const registeredTool = defaultToolRegistry.getTool(tool);
    if (!registeredTool) {
      return res.status(400).json({ success: false, error: `Tool "${tool}" not found` });
    }

    const output = await registeredTool.handler(
      { ...params, employeeId, tenantSlug },
      { employeeId, user: req.user, tenantSlug, confirmed: true }
    );

    res.json({
      success: true,
      tool,
      data: output,
    });
  } catch (err) {
    console.error('[JarvisRoute] Execute error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * AI Notification Digest & Action Item Extraction
 */
router.post('/notifications/digest', async (req, res) => {
  try {
    const employeeId = req.user?.employeeId || req.user?.id || req.body.employeeId;
    const tool = defaultToolRegistry.getTool('notifications.getDigest');

    const result = await tool.handler({ employeeId }, { employeeId, user: req.user, tenantContext: req.tenantContext });
    const { defaultNeuralResponseRealizer } = await import('../jarvis/neural/NeuralResponseRealizer.js');
    const summaryHeadline = await defaultNeuralResponseRealizer.realizeDigest(result, { employeeName: req.user?.name });

    res.json({
      success: true,
      data: {
        ...result,
        summaryHeadline,
      },
    });
  } catch (err) {
    console.error('[JarvisRoute] Notification digest error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Daily Standup / Work Summarization Endpoint
 */
router.post('/summarize', async (req, res) => {
  try {
    const tool = defaultToolRegistry.getTool('summarizer.generateDailySummary');
    const result = await tool.handler(req.body);
    res.json(result);
  } catch (err) {
    console.error('[JarvisRoute] Summarize error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Ticket Creation AI Assist
 */
router.post('/ticket-assist', async (req, res) => {
  try {
    const tool = defaultToolRegistry.getTool('tickets.draftAssist');
    const result = await tool.handler(req.body);
    res.json(result);
  } catch (err) {
    console.error('[JarvisRoute] Ticket assist error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Team Message & Group Chat AI Summarize / Catch-Up
 */
router.post('/messages/summarize', async (req, res) => {
  try {
    const tool = defaultToolRegistry.getTool('messages.summarizeUnread');
    const result = await tool.handler(req.body, { employeeId: req.user?.employeeId || req.user?.id });
    res.json(result);
  } catch (err) {
    console.error('[JarvisRoute] Message summarize error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

import { defaultDatasetDistiller } from '../jarvis/neural/DatasetDistiller.js';
import { defaultJarvisNeuralCore } from '../jarvis/neural/JarvisNeuralCore.js';
import { defaultCapacityGovernor } from '../jarvis/neural/CapacityGovernor.js';
import { defaultJarvisTokenizer } from '../jarvis/neural/JarvisTokenizer.js';
import { MODULE_DEFINITIONS, MODULE_METADATA } from '../models/tenantRegistry.js';

/**
 * Telemetry & Cognitive Brain Stats Endpoint
 */
router.get('/stats', async (req, res) => {
  try {
    const registry = defaultJarvis.stages?.intentClassifier?.tokenRegistry || defaultTokenEngine.registry;
    const graph = defaultJarvis.stages?.intentClassifier?.graph;
    const allTokens = registry ? (typeof registry.getAllTokens === 'function' ? registry.getAllTokens() : (typeof registry.getAll === 'function' ? registry.getAll() : Array.from(registry.tokensById?.values() || []))) : [];
    const activeTokens = allTokens.filter((t) => t.status === 'active');
    const candidateTokens = allTokens.filter((t) => t.status === 'candidate');

    const byType = {};
    for (const t of allTokens) {
      byType[t.type] = (byType[t.type] || 0) + 1;
    }

    const paramCount = defaultJarvisNeuralCore.weights
      ? Object.values(defaultJarvisNeuralCore.weights).reduce((acc, w) => acc + (w?.length || 0), 0)
      : 0;

    res.json({
      success: true,
      tokens: {
        totalRegistered: allTokens.length,
        activeCount: activeTokens.length,
        candidateCount: candidateTokens.length,
        byType,
      },
      graph: {
        totalEdges: graph ? graph.totalEdges || graph.getAllRelationships?.().length || 0 : 0,
        totalNodes: graph ? graph.totalNodes || 0 : 0,
      },
      brainMemory: {
        totalFacts: defaultMongoBrainMemoryStore.facts.length,
      },
      neural: {
        parameterCount: paramCount,
        trainingStep: defaultJarvisNeuralCore.t || 0,
        vocabSize: defaultJarvisNeuralCore.vocabSize,
        dModel: defaultJarvisNeuralCore.dModel,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1-Click ERP System Schema Training Endpoint
 * Ingests all Workhub ERP Modules, Collections, and Domain Relationships into Cognitive Brain
 */
router.post('/train-system', async (req, res) => {
  try {
    const tokenRegistry = defaultJarvis.stages?.intentClassifier?.tokenRegistry;
    const graph = defaultJarvis.stages?.intentClassifier?.graph;
    const relationRegistry = defaultJarvis.stages?.intentClassifier?.relationRegistry;

    if (!tokenRegistry || !graph) {
      return res.status(500).json({ success: false, error: 'Knowledge Graph / Token Registry not initialized' });
    }

    let modulesCount = 0;
    let collectionsCount = 0;
    let triplesCount = 0;

    // 1. Ingest Core Enterprise Identity
    const sysToken = tokenRegistry.lookup('Workhub ERP Tracker') || tokenRegistry.register({ canonical: 'Workhub ERP Tracker', type: 'entity' });
    const aiToken = tokenRegistry.lookup('J.A.R.V.I.S.') || tokenRegistry.register({ canonical: 'J.A.R.V.I.S.', type: 'entity' });
    graph.addRelationship(aiToken.id, 'powers', sysToken.id, 1.0);
    graph.addRelationship(sysToken.id, 'powered_by', aiToken.id, 1.0);
    triplesCount += 2;

    // 2. Ingest All Modules & Metadata
    for (const [modId, collections] of Object.entries(MODULE_DEFINITIONS)) {
      const meta = MODULE_METADATA[modId] || { name: modId.toUpperCase(), description: `Module ${modId}` };
      const modName = `${meta.name} Module`;
      const modToken = tokenRegistry.lookup(modName) || tokenRegistry.register({ canonical: modName, type: 'concept' });
      modulesCount++;

      // Link Module to System
      graph.addRelationship(sysToken.id, 'includes_module', modToken.id, 1.0);
      graph.addRelationship(modToken.id, 'part_of', sysToken.id, 1.0);
      triplesCount += 2;

      // Link Collections to Module
      for (const col of collections) {
        const colName = col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ');
        const colToken = tokenRegistry.lookup(colName) || tokenRegistry.register({ canonical: colName, type: 'entity' });
        collectionsCount++;

        graph.addRelationship(modToken.id, 'manages_collection', colToken.id, 1.0);
        graph.addRelationship(colToken.id, 'managed_by', modToken.id, 1.0);
        triplesCount += 2;
      }
    }

    // 3. Ingest Key Domain Capabilities & Procedural Relations
    const domainRules = [
      { sub: 'Employees', rel: 'can_apply', obj: 'Leave Request' },
      { sub: 'Leave Request', rel: 'processed_by', obj: 'HRMS Module' },
      { sub: 'Managers', rel: 'can_approve', obj: 'Leave Request' },
      { sub: 'Attendance', rel: 'tracked_by', obj: 'HRMS Module' },
      { sub: 'Payroll', rel: 'calculated_by', obj: 'Payroll Module' },
      { sub: 'Tasks', rel: 'organized_under', obj: 'Projects Module' },
      { sub: 'Tickets', rel: 'resolved_under', obj: 'Tickets Module' },
      { sub: 'Assets', rel: 'allocated_by', obj: 'Assets Module' },
      { sub: 'Policies', rel: 'governed_by', obj: 'Policy Engine' },
    ];

    for (const r of domainRules) {
      const sTok = tokenRegistry.lookup(r.sub) || tokenRegistry.register({ canonical: r.sub, type: 'concept' });
      const oTok = tokenRegistry.lookup(r.obj) || tokenRegistry.register({ canonical: r.obj, type: 'concept' });
      graph.addRelationship(sTok.id, r.rel, oTok.id, 1.0);
      triplesCount++;
    }

    res.json({
      success: true,
      message: 'ERP System Schema successfully ingested into J.A.R.V.I.S. Cognitive Brain',
      stats: {
        modulesCount,
        collectionsCount,
        triplesCount,
        totalTokens: tokenRegistry.size,
      },
    });
  } catch (err) {
    console.error('[JarvisRoute] Train system error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Trigger Delta-Only Neural Gradient Distillation & AdamW Training Step (`train`)
 * Eliminates redundant backpropagation passes over static knowledge and protects CPU/GPU resources.
 */
router.post('/train', async (req, res) => {
  try {
    const isFullRetrain = req.body?.full === true;
    const dataset = isFullRetrain
      ? defaultDatasetDistiller.distill()
      : defaultDatasetDistiller.distillDelta();

    if (!dataset.trainSet || dataset.trainSet.length === 0) {
      return res.json({
        success: true,
        message: 'Neural weights are already fully synchronized with all active facts. 0 delta gradient steps required (0% CPU load).',
        trainPairs: 0,
        initialLoss: 0,
        finalLoss: 0,
        delta: 0,
        step: defaultJarvisNeuralCore.t,
      });
    }

    const trainBatch = dataset.trainSet.map((ex) => {
      const fullText = `${ex.prompt} ${ex.target}`;
      const tokens = defaultJarvisTokenizer.encode(fullText);
      const targets = Array.from(tokens.slice(1));
      targets.push(defaultJarvisTokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    const initialLoss = defaultCapacityGovernor.evaluateLoss(defaultJarvisNeuralCore, trainBatch);

    // Delta micro-training: 5 fast AdamW gradient steps strictly on newly acquired facts (<5ms)
    const epochs = isFullRetrain ? 10 : 5;
    for (let ep = 1; ep <= epochs; ep++) {
      for (const b of trainBatch) {
        const { grads } = defaultJarvisNeuralCore.lossAndGrad(b.input, b.target);
        defaultJarvisNeuralCore.step(grads);
      }
    }

    const finalLoss = defaultCapacityGovernor.evaluateLoss(defaultJarvisNeuralCore, trainBatch);
    const checkpointSaved = await defaultJarvisNeuralCore.saveCheckpoint();

    res.json({
      success: true,
      trainPairs: dataset.trainSet.length,
      initialLoss: Number(initialLoss.toFixed(4)),
      finalLoss: Number(finalLoss.toFixed(4)),
      delta: Number((finalLoss - initialLoss).toFixed(4)),
      checkpointSaved,
      step: defaultJarvisNeuralCore.t,
      mode: isFullRetrain ? 'full_consolidation' : 'delta_distillation',
    });
  } catch (err) {
    console.error('[JarvisRoute] Training error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Teach Custom Fact / Relationship Endpoint
 */
router.post('/teach', async (req, res) => {
  try {
    const { utterance, subject, relation, object } = req.body;
    const learningAnalyst = defaultJarvis.stages?.learningAnalyst;
    const tokenRegistry = defaultJarvis.stages?.intentClassifier?.tokenRegistry;
    const graph = defaultJarvis.stages?.intentClassifier?.graph;

    if (subject && relation && object && tokenRegistry && graph) {
      const sTok = tokenRegistry.lookup(subject) || tokenRegistry.register({ canonical: subject, type: 'entity' });
      const oTok = tokenRegistry.lookup(object) || tokenRegistry.register({ canonical: object, type: 'entity' });
      const relNorm = relation.toLowerCase().replace(/\s+/g, '_');
      graph.addRelationship(sTok.id, relNorm, oTok.id, 1.0);

      return res.json({
        success: true,
        message: `Direct fact ingested: (${sTok.canonical}) ──[${relNorm}]──► (${oTok.canonical})`,
        fact: { subject: sTok.canonical, relation: relNorm, object: oTok.canonical },
      });
    }

    if (utterance) {
      const ctx = await defaultJarvis.handle({
        userId: req.user?.id || 'anonymous',
        utterance: `Remember: ${utterance.replace(/^remember:?\s*/i, '')}`,
      });

      return res.json({
        success: true,
        response: ctx.response,
        offlineResolved: ctx.offlineResolved,
      });
    }

    res.status(400).json({ success: false, error: 'Provide either utterance or (subject, relation, object)' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get All Registered Tokens in Knowledge Brain
 */
router.get('/tokens', async (req, res) => {
  try {
    const registry = defaultJarvis.stages?.intentClassifier?.tokenRegistry || defaultTokenEngine.registry;
    const tokens = registry ? (typeof registry.getAllTokens === 'function' ? registry.getAllTokens() : (typeof registry.getAll === 'function' ? registry.getAll() : Array.from(registry.tokensById?.values() || []))) : [];
    res.json({
      success: true,
      count: tokens.length,
      tokens,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get All Active Relational Edges in Knowledge Graph
 */
router.get('/graph', async (req, res) => {
  try {
    const graph = defaultJarvis.stages?.intentClassifier?.graph;
    const registry = defaultJarvis.stages?.intentClassifier?.tokenRegistry || defaultTokenEngine.registry;

    if (!graph || !registry) {
      return res.json({ success: true, count: 0, edges: [] });
    }

    const edges = [];
    const raw = typeof graph.getAllRelationships === 'function'
      ? graph.getAllRelationships()
      : (typeof graph.getAllEdges === 'function' ? graph.getAllEdges() : (graph.edges || []));

    for (const r of raw) {
      const fromId = r.source !== undefined ? r.source : r.from;
      const toId = r.target !== undefined ? r.target : r.to;
      const sTok = registry.getById ? registry.getById(fromId) : registry.lookup?.(fromId);
      const tTok = registry.getById ? registry.getById(toId) : registry.lookup?.(toId);

      const relStr = typeof r.relation === 'string'
        ? r.relation
        : (r.relation?.name || r.relation?.relation || r.relation?.label || 'related_to');

      const weightVal = typeof r.weight === 'number'
        ? r.weight
        : (typeof r.confidence === 'number' ? r.confidence : (typeof r.weight === 'object' ? r.weight?.confidence || 1.0 : 1.0));

      edges.push({
        sourceId: fromId,
        source: sTok ? sTok.canonical : `Token #${fromId}`,
        relation: relStr,
        targetId: toId,
        target: tTok ? tTok.canonical : `Token #${toId}`,
        weight: weightVal,
      });
    }

    res.json({
      success: true,
      count: edges.length,
      edges,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
