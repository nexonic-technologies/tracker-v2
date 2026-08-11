import TenantConnectionManager from '../tenant/TenantConnectionManager.js';

async function getTenantModel() {
  const { Tenant } = await import('../models/global/index.js');
  return Tenant;
}

/**
 * Super Admin Controller — Tenant Control Plane & Licensing Management
 */
export async function getAllTenants(req, res) {
  try {
    const Tenant = await getTenantModel();
    const tenants = await Tenant.find({}).lean();
    return res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('[TenantAdminController] Error fetching tenants:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateTenantStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Suspended', 'Provisioning', 'Deleted', 'PAST_DUE', 'CANCELED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription status value' });
    }

    const Tenant = await getTenantModel();
    const tenant = await Tenant.findByIdAndUpdate(id, { status }, { new: true });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Invalidate connection & policy cache for target tenant
    TenantConnectionManager.invalidate(tenant.tenantId);
    TenantConnectionManager.invalidate(tenant.dbName);

    return res.json({ success: true, data: tenant });
  } catch (err) {
    console.error('[TenantAdminController] Error updating tenant status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateTenantModules(req, res) {
  try {
    const { id } = req.params;
    const { enabledModules, plan } = req.body;

    const Tenant = await getTenantModel();
    const updateFields = {};
    if (enabledModules) updateFields.enabledModules = enabledModules;
    if (plan) updateFields.plan = plan;

    const tenant = await Tenant.findByIdAndUpdate(id, updateFields, { new: true });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Invalidate connection & policy cache for target tenant
    TenantConnectionManager.invalidate(tenant.tenantId);
    TenantConnectionManager.invalidate(tenant.dbName);

    return res.json({ success: true, data: tenant });
  } catch (err) {
    console.error('[TenantAdminController] Error updating tenant modules:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
