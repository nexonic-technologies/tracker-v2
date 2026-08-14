import { buildQuery } from "../utils/policy/policyEngine.js";
import { getRoleMeta } from "../utils/cache.js";
import { parseFilter } from "../utils/filterParser.js";
import queryOptimizer from "../utils/queryOptimizer.js";
import { DEFAULT_POPULATE_FIELDS } from "../Config/defaultPopulateFields.js";
import { raceConditionHandler } from "../utils/raceConditionHandler.js";
import { getFingerprint } from "../utils/deviceFingerprint.js";
import { cachedImport } from "../utils/importCache.js";
import { sanitizeErrorResponse } from "../utils/errorSanitizer.js";
import buildReportQuery from "../crud/buildReportQuery.js";

// Unified context helper with backward compatibility getters
function makeCtx({ action, modelName, docId, fields, filter, populateFields, body, user, tenantContext }) {
  const ctx = {
    action,
    modelName,
    docId,
    fields,
    filter,
    populateFields,
    body,
    user,
    tenantContext,
    get userId() { return this.user?.id; },
    get role() { return this.user?.role; }
  };

  Object.defineProperty(ctx, 'data', {
    get() { return this._data; },
    set(val) { this._data = val; }
  });
  Object.defineProperty(ctx, 'beforeDoc', {
    get() { return this._beforeDoc; },
    set(val) { this._beforeDoc = val; }
  });
  Object.defineProperty(ctx, 'existingDoc', {
    get() { return this._existingDoc; },
    set(val) { this._existingDoc = val; }
  });
  Object.defineProperty(ctx, 'deletedDoc', {
    get() { return this._deletedDoc; },
    set(val) { this._deletedDoc = val; }
  });

  return ctx;
}

export async function populateHelper(req, res, next) {
  try {
    const { action, model, id } = req.params;
    const user = req.user;

    // Guest / External portal bypass for candidates and job openings
    const isPublicExternal = !req.user?.role && (
      req.headers['x-source'] === 'external' ||
      model === 'candidates' ||
      model === 'job_openings'
    );

    if (isPublicExternal) {
      req.user = { id: 'guest-candidate', role: 'guest', isGuest: true };
    } else if (!req.user?.role) {
      try {
        const { default: Employee } = await cachedImport('../models/Employee.js');
        const { default: Role } = await cachedImport('../models/Role.js');
        const emp = await Employee.findById(req.user?.id).select('professionalInfo.role').lean();
        if (emp?.professionalInfo?.role) {
          req.user.role = emp.professionalInfo.role;
        } else {
          return res.status(403).json({ success: false, message: 'User has no role assigned' });
        }
      } catch {
        return res.status(500).json({ success: false, message: 'Failed to resolve user role' });
      }
    }

    // For read actions, parameters are sent in the JSON payload (req.body). For others, they might still be in req.query.
    const isReadAction = ['read', 'statistics'].includes(action) || !['create', 'update', 'bulk-upsert', 'bulk-create', 'bulk-update', 'delete', 'bulk-delete'].includes(action);
    const optionsSource = isReadAction ? { ...req.query, ...req.body } : req.query;

    const { type, page = 1, limit = 20, useCache = 'true' } = optionsSource;
    let { fields, filter, populateFields: rawPopulateFields, sort, ...params } = optionsSource;
    if (!rawPopulateFields && optionsSource.populate) {
      rawPopulateFields = optionsSource.populate;
    }



    // Clear cache if requested
    if (useCache === 'false') {
      queryOptimizer.clearCache(model);
    }

    // ------------------------ SPECIAL AGENT ENDPOINTS ------------------------
    if (action === 'read' && model === 'agents' && id && req.query.clientProducts === 'true') {
      return await handleAgentClientProducts(req, res, id);
    }

    // ------------------------ REPORT PIPELINE ------------------------
    if (action === 'report') {
      const ctx = makeCtx({
        action,
        modelName: model,
        fields,
        filter: optionsSource.filter || filter || {},
        populateFields: rawPopulateFields,
        body: req.body,
        user: req.user,
        tenantContext: req.tenantContext
      });

      const data = await buildReportQuery(ctx);

      if (optionsSource.format === 'csv') {
        const reportService = (await cachedImport('../services/business/reportService.js')).default;
        const csv = reportService.toCSV(Array.isArray(data) ? data : [data]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${model}_report.csv"`);
        return res.status(200).send(csv);
      }

      return res.status(200).json({ success: true, count: Array.isArray(data) ? data.length : 1, data });
    }

    // ------------------------ BULK UPSERT (ACCESS POLICIES) ------------------------
    if (action === 'bulk-upsert') {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ success: false, message: "Body must be an array for bulk-upsert" });
      }

      const results = [];
      const errors = [];
      const fingerprint = getFingerprint(req).fingerprint;

      // Process sequentially with race condition handling
      for (const item of req.body) {
        try {
          // Item structure: { filter: {...}, body: {...} }
          // 1. Try to find existing doc
          // We use standard buildQuery with 'list' (read with filter) to check existence
          // BUT easier pattern: Try Update. If throws "not found", Try Create.

          // Note: We must ensure we don't accidentally update ALL records if filter is empty.
          if (!item.filter || Object.keys(item.filter).length === 0) {
            throw new Error("Filter required for bulk item");
          }

          // Check existence first to decide Action
          const existing = await buildQuery(makeCtx({
            action: 'read',
            modelName: model,
            filter: item.filter,
            fields: ['_id', '__v'], // fetch __v for correct version tracking
            user: { id: user.id, role: user.role }
          }));

          let opResult;
          if (existing && Array.isArray(existing) && existing.length > 0) {
            // UPDATE - Use race condition handling
            const docId = existing[0]._id;
            const currentVersion = existing[0].__v || 0;

            // Explicitly acquire lock to prevent race conditions during bulk upsert
            const lockResult = await raceConditionHandler.acquireLock(docId, fingerprint);
            if (!lockResult.success) {
              errors.push({
                filter: item.filter,
                error: 'Document locked by another process'
              });
              continue;
            }

            try {
              // Check version conflict
              const versionCheck = raceConditionHandler.checkVersionConflict(docId, currentVersion);

              if (versionCheck.conflict) {
                errors.push({
                  filter: item.filter,
                  error: 'Version conflict - document was modified',
                  expectedVersion: versionCheck.expectedVersion
                });
                continue;
              }

              opResult = await buildQuery(makeCtx({
                action: 'update',
                modelName: model,
                docId: docId,
                body: item.body,
                user: { id: user.id, role: user.role }
              }));

              // Increment version on successful update
              raceConditionHandler.incrementVersion(docId);
            } finally {
              raceConditionHandler.releaseLock(docId, lockResult.lockId, fingerprint);
            }
          } else {
            // CREATE
            // Merge filter into body for creation if needed (e.g. role, modelName)
            // usually item.body should have everything needed for creation
            opResult = await buildQuery(makeCtx({
              action: 'create',
              modelName: model,
              body: { ...item.filter, ...item.body }, // ensure keys from filter are in body
              user: { id: user.id, role: user.role }
            }));

            // Track new document version
            if (opResult && opResult._id) {
              raceConditionHandler.incrementVersion(opResult._id);
            }
          }
          results.push(opResult);
        } catch (err) {
          console.error(`Bulk item failed:`, err.message);
          errors.push({ filter: item.filter, error: err.message });
        }
      }

      return res.json({
        success: true,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined,
        rateLimit: req.rateLimit?.status,
        deviceFingerprint: fingerprint.substring(0, 16) // Only expose part of fingerprint
      });
    }

    // ------------------------ PAGINATION SETUP ------------------------
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page

    // ------------------------ TYPE-BASED FIELD SELECTION ------------------------
    if (type) {
      const typeNum = parseInt(type);
      if (typeNum === 1) {
        // Summary: minimal fields for performance
        fields = getSummaryFields(model);
        rawPopulateFields = getSummaryPopulate(model);
      } else if (typeNum === 2) {
        // Detailed: optimized full fields
        fields = getDetailedFields(model);
        rawPopulateFields = getDetailedPopulate(model);
      } else if (typeNum === 3) {
        // Statistics: aggregation for counts/summaries
        return await handleStatistics(req, res, next, model, user, finalFilter || {});
      }
    }

    // ------------------------ FIELDS NORMALIZATION ------------------------
    if (typeof fields === "string") {
      fields = fields
        .split(",")
        .map(f => f.trim())
        .filter(Boolean);
    }

    // ------------------------ SORT OPTIMIZATION ------------------------
    let sortObj = { createdAt: -1 }; // Default sort
    if (sort) {
      try {
        sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
      } catch {
        // Keep default sort if parsing fails
      }
    }

    // ------------------------ AGGREGATE MODE ------------------------
    const isAggregate = params.aggregate === "true" || params.aggregate === true;

    let stages;
    if (params.stages) {
      try {
        stages =
          typeof params.stages === "string"
            ? JSON.parse(params.stages)
            : params.stages;
      } catch {
        stages = undefined;
      }
    }

    // ------------------------ FILTER NORMALIZATION ------------------------
    let finalFilter = null;

    if (typeof filter === "string") {
      let parsed = null;

      // ---------- 1) JSON Mode ----------
      try {
        parsed = JSON.parse(filter);
      } catch { }

      // ---------- 2) Simple Key=Value Mode ----------
      const isSimple =
        !filter.includes(" ") &&
        !filter.includes("&&") &&
        !filter.includes("||") &&
        !filter.includes("(") &&
        !filter.includes(")");

      if (!parsed && isSimple && filter.includes("=")) {
        const [k, v] = filter.split("=");
        parsed = { [k.trim()]: v.trim() };
      }

      // ---------- 3) Expression Mode ----------
      if (parsed && typeof parsed === "object") {
        finalFilter = parsed;
      } else {
        finalFilter = parseFilter(filter);
      }
    } else if (filter && typeof filter === "object") {
      finalFilter = filter;
    }

    if (!finalFilter || typeof finalFilter !== "object") {
      finalFilter = {};
    }

    if (finalFilter.ticketId === "all-tickets" || id === "all-tickets") {
      return res.json({
        success: true,
        data: isReadAction ? (id ? null : []) : null
      });
    }

    // ------------------------ EXECUTE OPTIMIZED QUERY ------------------------
    let queryFilter = finalFilter;

    // For aggregate queries, structure the filter properly
    if (isAggregate && stages) {
      queryFilter = {
        aggregate: true,
        stages: stages
      };
    }

    // Handle file upload for create/update actions
    let requestBody = req.body;
    if (requestBody && requestBody.payload && typeof requestBody.payload === 'object') {
      requestBody = requestBody.payload;
    }
    if ((action === 'create' || action === 'update') && (req.file || req.files)) {
      // Import getDatePath dynamically or ensure it is available (since we can't easily add top-level imports dynamically, we'll just format the date here)
      const today = new Date();
      const datePath = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;

      const singleFile = req.file || (req.files && req.files.file && req.files.file[0]) || (req.files && req.files.profileImage && req.files.profileImage[0]) || (req.files && req.files.logo && req.files.logo[0]) || (req.files && req.files.logoUrl && req.files.logoUrl[0]);
      const folder = req.route.path.includes('profile') || (singleFile && singleFile.fieldname === 'profileImage') || (singleFile && singleFile.fieldname === 'file' && req.params?.model === 'employees') ? 'profile' : 'documents';

      if (singleFile) {
        const filePath = `/api/files/serve/${folder}/${datePath}/${singleFile.filename}`;

        if (req.params?.model === 'company' || singleFile.fieldname === 'logo' || singleFile.fieldname === 'logoUrl') {
          requestBody = {
            ...req.body,
            logoUrl: filePath
          };
        } else if (singleFile.fieldname === 'profileImage' || (singleFile.fieldname === 'file' && req.params?.model === 'employees')) {
          requestBody = {
            ...req.body,
            'basicInfo.profileImage': filePath
          };
        } else {
          requestBody = {
            ...req.body,
            filePath: filePath
          };
        }
      }

      // Handle multiple attachments
      if (req.files && req.files.attachments) {
        const attachmentPaths = req.files.attachments.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: `serve/documents/${datePath}/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        }));

        requestBody = {
          ...requestBody,
          attachments: attachmentPaths
        };
      }
    }

    // ------------------------ QUERY EXECUTION ------------------------
    let data;

    // 1. Determine base populate options (start with server defaults)
    let finalPopulate = { ...(DEFAULT_POPULATE_FIELDS[model] || {}) };

    // 2. Parse User Overrides
    if (rawPopulateFields) {

      let userPopulate = {};
      try {
        // Attempt to parse if it's a JSON string
        const parsed = typeof rawPopulateFields === 'string' && (rawPopulateFields.startsWith('{') || rawPopulateFields.startsWith('['))
          ? JSON.parse(rawPopulateFields)
          : rawPopulateFields;



        if (Array.isArray(parsed)) {
          // Case: ["path1", "path2"] or [{ path: "path1", select: "fields" }]
          parsed.forEach(item => {
            if (typeof item === 'object' && item !== null && item.path) {
              userPopulate[item.path] = item.select || DEFAULT_POPULATE_FIELDS[model]?.[item.path] || 'name';
            } else if (typeof item === 'string') {
              userPopulate[item] = DEFAULT_POPULATE_FIELDS[model]?.[item] || 'name';
            }
          });
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Case: {"path1": "fields", "path2": true}
          Object.entries(parsed).forEach(([path, fields]) => {
            if (fields === true || fields === "" || fields === null) {
              userPopulate[path] = DEFAULT_POPULATE_FIELDS[model]?.[path] || 'name';
            } else {
              userPopulate[path] = fields;
            }
          });
        } else if (typeof parsed === 'string') {
          // Case: "path1:fields,path2"
          parsed.split(',').forEach(path => {
            const cleanPath = path.trim();
            if (cleanPath) {
              if (cleanPath.includes(':')) {
                const [p, f] = cleanPath.split(':');
                userPopulate[p.trim()] = f.trim();
              } else {
                userPopulate[cleanPath] = DEFAULT_POPULATE_FIELDS[model]?.[cleanPath] || 'name';
              }
            }
          });
        }

        // Merge user preferences (this might add new paths or change fields for existing ones)
        finalPopulate = { ...finalPopulate, ...userPopulate };

      } catch (e) {
        console.warn("Error parsing populateFields:", rawPopulateFields, e.message);
      }
    }


    // Use regular buildQuery for all operations
    data = await buildQuery(makeCtx({
      action,
      modelName: model,
      docId: id,
      fields,
      filter: queryFilter,
      populateFields: finalPopulate, // Pass the merged object
      body: requestBody,
      user: {
        id: user.id,
        role: user.role,
        userType: user.userType,
        client: user.client,
        isSuperAdmin: !!user.isSuperAdmin
      },
      tenantContext: req.tenantContext
    }));

    const statusCode = action === "create" ? 201 : 200;

    // Invalidate cache on successful mutations
    const isMutation = ['create', 'update', 'delete', 'bulk-upsert', 'bulk-create', 'bulk-update', 'bulk-delete'].includes(action);
    if (isMutation) {
      queryOptimizer.clearCache(model);
      try {
        const { processGenericVersionInvalidation } = await import('../utils/permissionInvalidator.js');
        await processGenericVersionInvalidation({
          modelName: model,
          action,
          data,
          tenantContext: req.tenantContext
        });
      } catch (_) { }
    }

    // Build response with rate limit and lock info
    const response = {
      success: true,
      count: Array.isArray(data) ? data.length : undefined,
      data,
      type: type ? (parseInt(type) === 1 ? 'summary' : parseInt(type) === 2 ? 'detailed' : 'statistics') : undefined
    };

    // Add rate limit information if available
    if (req.rateLimit?.status) {
      response.rateLimit = {
        allowed: req.rateLimit.status.allowed,
        remaining: req.rateLimit.status.remaining,
        resetAt: req.rateLimit.status.resetAt
      };
    }

    // Add lock information for mutations
    if ((action === 'update' || action === 'create') && req.lock) {
      response.lock = {
        docId: req.lock.docId,
        version: req.lock.version
      };
    }

    return res.status(statusCode).json(response);
  } catch (error) {
    const { statusCode, payload } = sanitizeErrorResponse(error, req);
    return res.status(statusCode).json(payload);
  }
}

// Optimized field selection functions
function getSummaryFields(model) {
  const summaryFields = {
    tasks: ['title', 'status', 'priorityLevel', 'startDate', 'endDate', 'assignedTo', 'clientId', 'createdAt'],
    employees: ['basicInfo.firstName', 'basicInfo.lastName', 'basicInfo.profileImage', 'professionalInfo.designation', 'professionalInfo.department', 'professionalInfo.empId'],
    leaves: ['employeeName', 'leaveName', 'startDate', 'endDate', 'status', 'totalDays', 'createdAt'],
    attendances: ['employee', 'date', 'status', 'checkIn', 'checkOut', 'workHours', 'punches'],
    clients: ['name', 'email', 'contactPerson', 'status', 'createdAt'],
    notifications: ['message', 'read', 'createdAt', 'sender', 'type'],
    todos: ['text', 'completed', 'createdAt', 'priority'],
    daily_activities: ['employee', 'date', 'activities', 'totalHours', 'createdAt'],
    payrolls: ['employeeId', 'month', 'year', 'netSalary', 'status', 'processedAt'],
    tickets: ['ticketId', 'title', 'category', 'priority', 'status', 'createdBy', 'createdAt'],
    shifts: ['name', 'startTime', 'endTime', 'workingHours', 'isActive'],
    hrpolicies: ['title', 'category', 'status', 'effectiveDate', 'version', 'createdAt'],
    regularizations: ['employeeName', 'requestType', 'requestDate', 'status', 'createdAt']
  };
  return summaryFields[model] || null;
}

function getDetailedFields(model) {
  // For detailed view, we still want to exclude very large fields
  const excludeFields = {
    employees: ['-documents', '-auditLog'],
    tasks: ['-attachments.data'],
    notifications: ['-metadata'],
    clients: ['-documents.data']
  };
  return excludeFields[model] || null;
}

function getSummaryPopulate(model) {
  const summaryPopulate = {
    tasks: [
      { path: 'assignedTo', select: 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage professionalInfo.empId' },
      { path: 'clientId', select: 'name email' }
    ],
    employees: [
      { path: 'professionalInfo.designation', select: 'name' },
      { path: 'professionalInfo.department', select: 'name' }
    ],
    leaves: [
      { path: 'employeeId', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' }
    ],
    attendances: [
      { path: 'employee', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' }
    ],
    notifications: [
      { path: 'sender', select: 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage' }
    ],
    todos: [
      { path: 'employee', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    daily_activities: [
      { path: 'employee', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' }
    ],
    payrolls: [
      { path: 'employeeId', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' },
      { path: 'processedBy', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    tickets: [
      { path: 'createdBy', select: 'basicInfo.firstName basicInfo.lastName' },
      { path: 'assignedTo', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    hrpolicies: [
      { path: 'createdBy', select: 'basicInfo.firstName basicInfo.lastName' },
      { path: 'approvedBy', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    wfh_requests: [
      { path: 'employeeId', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' },
      { path: 'departmentId', select: 'name' }
    ],
    regularizations: [
      { path: 'employeeId', select: 'basicInfo.firstName basicInfo.lastName professionalInfo.empId' },
      { path: 'departmentId', select: 'name' }
    ]
  };
  return JSON.stringify(summaryPopulate[model] || []);
}

function getDetailedPopulate(model) {
  const detailedPopulate = {
    tasks: [
      { path: 'assignedTo', select: '-documents -auditLog' },
      { path: 'createdBy', select: 'basicInfo professionalInfo.designation' },
      { path: 'clientId', select: '-documents' }
    ],
    employees: [
      { path: 'professionalInfo.designation' },
      { path: 'professionalInfo.department' },
      { path: 'professionalInfo.role' },
      { path: 'professionalInfo.reportingManager', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    leaves: [
      { path: 'employeeId', select: 'basicInfo professionalInfo.designation professionalInfo.department' },
      { path: 'approvedBy', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    attendances: [
      { path: 'employee', select: 'basicInfo professionalInfo.designation professionalInfo.department' },
      { path: 'managerId', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    notifications: [
      { path: 'sender', select: 'basicInfo professionalInfo' },
      { path: 'recipient', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    daily_activities: [
      { path: 'employee', select: 'basicInfo professionalInfo.designation professionalInfo.department' }
    ],
    payrolls: [
      { path: 'employeeId', select: 'basicInfo professionalInfo' },
      { path: 'processedBy', select: 'basicInfo.firstName basicInfo.lastName' },
      { path: 'approvedBy', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    tickets: [
      { path: 'createdBy', select: 'basicInfo professionalInfo' },
      { path: 'assignedTo', select: 'basicInfo professionalInfo' },
      { path: 'linkedTaskId', select: 'title status priority' }
    ],
    hrpolicies: [
      { path: 'createdBy', select: 'basicInfo professionalInfo' },
      { path: 'approvedBy', select: 'basicInfo professionalInfo' },
      { path: 'department', select: 'name' }
    ],
    wfh_requests: [
      { path: 'employeeId', select: 'basicInfo professionalInfo.designation professionalInfo.department professionalInfo.empId' },
      { path: 'departmentId', select: 'name' },
      { path: 'managerId', select: 'basicInfo.firstName basicInfo.lastName' }
    ],
    regularizations: [
      { path: 'employeeId', select: 'basicInfo professionalInfo.designation professionalInfo.department professionalInfo.empId' },
      { path: 'departmentId', select: 'name' },
      { path: 'managerId', select: 'basicInfo.firstName basicInfo.lastName' }
    ]
  };
  return JSON.stringify(detailedPopulate[model] || []);
}

export default populateHelper;

// Handle agent client products request
async function handleAgentClientProducts(req, res, agentId) {
  try {
    const { buildQuery } = await cachedImport("../utils/policy/policyEngine.js");

    // Get agent with populated client
    const agent = await buildQuery(makeCtx({
      action: 'read',
      modelName: 'agents',
      docId: agentId,
      populateFields: [{ path: 'client', select: 'name proposedProducts' }],
      user: { id: req.user?.id, isSuperAdmin: true }
    }));

    if (!agent || !agent.client) {
      return res.status(404).json({
        success: false,
        message: 'Agent or client not found'
      });
    }

    const products = agent.client.proposedProducts || [];

    return res.json({
      success: true,
      products,
      clientName: agent.client.name
    });
  } catch (error) {
    next(error);
  }
}

// Handle statistics aggregation for models
async function handleStatistics(req, res, next, modelName, user, filter) {
  try {
    const { buildQuery } = await cachedImport("../utils/policy/policyEngine.js");
    const { default: models } = await cachedImport("../models/Collection.js");

    // First ensure the user has access by using the policy engine to get a scoped filter
    const scopedFilter = await buildQuery(makeCtx({
      action: 'read',
      modelName: modelName,
      filter: filter,
      returnFilter: true, // Return just the filter
      user: { id: user.id, role: user.role }
    })) || filter;

    let stats = {};

    if (modelName === 'expenses') {
      const Model = models.expenses;
      if (Model) {
        const result = await Model.aggregate([
          { $match: scopedFilter },
          {
            $group: {
              _id: null,
              pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
              approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
              totalAmount: { $sum: "$dayTotal" }
            }
          }
        ]);

        stats = result.length > 0 ? result[0] : { pending: 0, approved: 0, rejected: 0, totalAmount: 0 };
        delete stats._id;
      }
    } else {
      // Fallback for other models: basic count
      const Model = models[modelName];
      if (Model) {
        stats.totalCount = await Model.countDocuments(scopedFilter);
      }
    }

    return res.json({
      success: true,
      stats,
      type: 'statistics'
    });
  } catch (error) {
    const { statusCode, payload } = sanitizeErrorResponse(error, req);
    return res.status(statusCode).json(payload);
  }
}