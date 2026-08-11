import express from 'express';
import {
  createTenant,
  createTenantWithProgress,
  getProvisioningStatus,
  listTenants,
  listModules,
  createModule,
  updateModule,
  listModelDefinitions,
  createModelDefinition,
  updateModelDefinition,
  updateTenantStatus,
  updateTenantModules,
  updateTenantSubscription,
  impersonateTenant,
  getDbUtilizationMetrics,
  getUsageMetrics,
  getErrorLogs,
} from '../Controller/AdminControlController.js';

const router = express.Router();

// System Observability & Metrics
router.get('/metrics/db-utilization', getDbUtilizationMetrics);
router.get('/metrics/usage', getUsageMetrics);
router.get('/metrics/error-logs', getErrorLogs);

// Platform Modules Management
router.get('/modules', listModules);
router.post('/modules', createModule);
router.put('/modules/:id', updateModule);

// Dynamic Model Definitions Management (No-code Engine)
router.get('/models', listModelDefinitions);
router.post('/models', createModelDefinition);
router.put('/models/:id', updateModelDefinition);

// Tenant Control Plane
router.post('/tenants', createTenant);
router.post('/tenants/provision-stream', createTenantWithProgress);
router.get('/tenants/provisioning/:runId', getProvisioningStatus);
router.get('/tenants', listTenants);
router.put('/tenants/:id/status', updateTenantStatus);
router.put('/tenants/:id/modules', updateTenantModules);
router.put('/tenants/:id/subscription', updateTenantSubscription);
router.post('/tenants/:id/impersonate', impersonateTenant);

export default router;

