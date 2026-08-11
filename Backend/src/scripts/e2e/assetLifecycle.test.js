/**
 * assetLifecycle.test.js
 * End-to-end verification script for the Asset Lifecycle.
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

export async function runAssetLifecycle() {
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

  const AssetVendor = mongoose.model('assets_vendors');
  const AssetPurchase = mongoose.model('assets_purchases');
  const Asset = mongoose.model('assets');
  const AssetStockLedger = mongoose.model('assets_stock_ledgers');
  const AssetAllocation = mongoose.model('assets_allocations');
  const AssetRepair = mongoose.model('assets_repairs');
  const AssetCategory = mongoose.model('assets_categories');
  const Employee = mongoose.model('employees');
  const Role = mongoose.model('roles');

  const uniqueSuffix = Date.now();
  const vendorName = `TEST_VENDOR_E2E_${uniqueSuffix}`;
  const poNumber = `TEST_PO_E2E_${uniqueSuffix}`;
  const categoryName = `TEST_CAT_E2E_${uniqueSuffix}`;

  let createdDocs = {
    categoryId: null,
    vendorId: null,
    poId: null,
    assetIds: [],
    allocationId: null,
    repairId: null
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up asset E2E test data...');
    try {
      if (createdDocs.allocationId) await AssetAllocation.deleteMany({ _id: createdDocs.allocationId });
      if (createdDocs.repairId) await AssetRepair.deleteMany({ _id: createdDocs.repairId });
      if (createdDocs.assetIds.length > 0) {
        await Asset.deleteMany({ _id: { $in: createdDocs.assetIds } });
        await AssetStockLedger.deleteMany({ assetId: { $in: createdDocs.assetIds } });
      }
      if (createdDocs.poId) await AssetPurchase.deleteMany({ _id: createdDocs.poId });
      if (createdDocs.vendorId) await AssetVendor.deleteMany({ _id: createdDocs.vendorId });
      if (createdDocs.categoryId) await AssetCategory.deleteMany({ _id: createdDocs.categoryId });
      console.log('🧹 Cleanup completed.');
    } catch (e) {
      console.error('⚠️ Cleanup error:', e.message);
    }
  };

  try {
    // Resolve super admin role
    let superAdminRole = await Role.findOne({ capabilities: 'manage:assets', isActive: true }).lean();
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

    // --- SETUP CATEGORY ---
    const activeCategory = await AssetCategory.create({
      name: categoryName,
      code: `E2ECAT-${uniqueSuffix.toString().slice(-4)}`,
      description: 'Asset E2E test category',
      isActive: true,
      createdBy: adminEmp._id
    });
    createdDocs.categoryId = activeCategory._id;

    // --- STEP 1: CREATE VENDOR ---
    console.log('\n--- STEP 1: Creating Asset Vendor ---');
    const vendor = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_vendors',
      body: {
        name: vendorName,
        contactPerson: 'E2E Vendor Contact',
        email: 'e2e_vendor@test.com',
        phone: '9998887770',
        gstIN: '33TESTG1234F1Z1',
        address: 'E2E Warehouse, Bangalore',
        status: 'Active'
      }
    });
    createdDocs.vendorId = vendor._id;
    console.log(`✅ Vendor created: ${vendor.name}`);

    // --- STEP 2: CREATE PO (DRAFT) ---
    console.log('\n--- STEP 2: Creating PO in Draft status ---');
    const po = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_purchases',
      body: {
        vendorId: vendor._id,
        poNumber: poNumber,
        purchaseDate: new Date(),
        status: 'Draft',
        items: [
          {
            categoryId: activeCategory._id,
            name: 'Dell Laptop E2E Test',
            model: 'Dell-E2E-X',
            serialNumberPrefix: 'SN-ASSET-E2E-',
            quantity: 2,
            unitPrice: 50000,
            taxRate: 18
          }
        ],
        totalAmount: 118000,
        paymentStatus: 'Unpaid'
      }
    });
    createdDocs.poId = po._id;
    console.log(`✅ PO created: ${po.poNumber} (status: "${po.status}")`);

    // --- STEP 3: TRANSITION STATUS TO RECEIVED (GRN Hook) ---
    console.log('\n--- STEP 3: Transitioning PO status sequentially ---');

    console.log('Transition: Draft -> Pending Approval');
    let updatedPo = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_purchases',
      docId: po._id.toString(),
      body: { status: 'Pending Approval' }
    });

    console.log('Transition: Pending Approval -> Approved');
    updatedPo = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_purchases',
      docId: po._id.toString(),
      body: { status: 'Approved' }
    });

    console.log('Transition: Approved -> Received (GRN Hook - Auto assets & IN ledger)');
    updatedPo = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_purchases',
      docId: po._id.toString(),
      body: { status: 'Received' }
    });
    console.log(`✅ PO status updated to: "${updatedPo.status}"`);

    // Verify assets & IN ledger
    const createdAssets = await Asset.find({ purchaseId: po._id }).lean();
    console.log(`   Found ${createdAssets.length} created assets:`);
    for (const asset of createdAssets) {
      createdDocs.assetIds.push(asset._id);
      console.log(`     - Asset ID: ${asset.assetId}, Name: ${asset.name}, Status: ${asset.status}`);
      const ledgerEntries = await AssetStockLedger.find({ assetId: asset._id }).lean();
      if (ledgerEntries.length === 0 || ledgerEntries[0].transactionType !== 'IN') {
        throw new Error(`Expected IN stock ledger entry, found: ${JSON.stringify(ledgerEntries)}`);
      }
    }
    if (createdAssets.length !== 2) {
      throw new Error(`Expected 2 assets, found ${createdAssets.length}`);
    }
    console.log('✅ Verified: Assets and IN Stock Ledger entries created successfully.');

    // --- STEP 4: ALLOCATION (CHECKOUT & RETURN) ---
    const targetAsset = createdAssets[0];
    console.log(`\n--- STEP 4: Allocating Asset: ${targetAsset.assetId} ---`);

    // NOTE: assets_allocations service always forces status = 'Pending Approval' on create.
    // Asset goes to 'Reserved'. We must activate to reach 'Allocated'.
    const allocation = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_allocations',
      body: {
        employeeId: adminEmp._id.toString(),
        assetId: targetAsset._id.toString(),
        allocationType: 'Temporary',
        allocationDate: new Date(),
        reason: 'E2E testing allocation'
      }
    });
    createdDocs.allocationId = allocation._id;
    console.log(`✅ Allocation request created: ${allocation._id} (status: "${allocation.status}")`);

    let assetCheck = await Asset.findById(targetAsset._id).lean();
    console.log(`   Asset status after create: "${assetCheck.status}" (expected "Reserved")`);
    if (assetCheck.status !== 'Reserved') {
      throw new Error(`Expected Reserved status after create, found: ${assetCheck.status}`);
    }

    // Activate: Pending Approval → Active (triggers OUT ledger, asset → Allocated)
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_allocations',
      docId: allocation._id.toString(),
      body: { status: 'Active' }
    });
    console.log('✅ Allocation activated (Pending Approval → Active).');

    assetCheck = await Asset.findById(targetAsset._id).lean();
    console.log(`   Asset status: "${assetCheck.status}"`);
    if (assetCheck.status !== 'Allocated') {
      throw new Error(`Expected Allocated status, found: ${assetCheck.status}`);
    }

    const allocationLedger = await AssetStockLedger.findOne({ assetId: targetAsset._id, triggerType: 'Employee_Allocation' }).lean();
    if (!allocationLedger || allocationLedger.transactionType !== 'OUT') {
      throw new Error('Expected OUT stock ledger for Allocation.');
    }
    console.log('✅ Verified: Allocation logged OUT ledger entry and asset status is "Allocated".');

    console.log('Returning asset back to inventory (triggers IN ledger)...');
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_allocations',
      docId: allocation._id.toString(),
      body: {
        status: 'Returned',
        returnedCondition: 'Good',
        returnNotes: 'Good condition return'
      }
    });

    assetCheck = await Asset.findById(targetAsset._id).lean();
    console.log(`   Asset status (Returned): "${assetCheck.status}"`);
    if (assetCheck.status !== 'Available') {
      throw new Error(`Expected Available status after return, found: ${assetCheck.status}`);
    }

    const returnLedger = await AssetStockLedger.findOne({ assetId: targetAsset._id, triggerType: 'Employee_Return' }).lean();
    if (!returnLedger || returnLedger.transactionType !== 'IN') {
      throw new Error('Expected IN stock ledger for return.');
    }
    console.log('✅ Verified: Asset returned, status changed to "Available", and logged IN ledger.');

    // --- STEP 5: REPAIR FLOW ---
    console.log(`\n--- STEP 5: Repair Flow for ${targetAsset.assetId} ---`);
    const repair = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_repairs',
      body: {
        assetId: targetAsset._id.toString(),
        issueDescription: 'E2E screen issue',
        status: 'Sent for Repair',
        repairCost: 3000
      }
    });
    createdDocs.repairId = repair._id;
    console.log(`✅ Repair record created (status: "${repair.status}")`);

    assetCheck = await Asset.findById(targetAsset._id).lean();
    if (assetCheck.status !== 'Under Repair') {
      throw new Error(`Expected Under Repair status, found: ${assetCheck.status}`);
    }

    const repairOutLedger = await AssetStockLedger.findOne({ assetId: targetAsset._id, triggerType: 'Send_To_Repair' }).lean();
    if (!repairOutLedger || repairOutLedger.transactionType !== 'OUT') {
      throw new Error('Expected OUT stock ledger for repair outward.');
    }
    console.log('✅ Verified: Asset transitioned to "Under Repair" and logged OUT ledger.');

    console.log('Completing repair as Repaired (triggers IN ledger)...');
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_repairs',
      docId: repair._id.toString(),
      body: {
        status: 'Repaired',
        repairCondition: 'Good'
      }
    });

    assetCheck = await Asset.findById(targetAsset._id).lean();
    if (assetCheck.status !== 'Available') {
      throw new Error(`Expected Available status after repair, found: ${assetCheck.status}`);
    }

    const repairReturnLedger = await AssetStockLedger.findOne({ assetId: targetAsset._id, triggerType: 'Repair_Return' }).lean();
    if (!repairReturnLedger || repairReturnLedger.transactionType !== 'IN') {
      throw new Error('Expected IN stock ledger for repair return.');
    }
    console.log('✅ Verified: Repair completed, status changed to "Available", and logged IN ledger.');

    // --- STEP 6: DISPOSAL FLOW ---
    console.log(`\n--- STEP 6: Disposal Flow for ${targetAsset.assetId} ---`);
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets',
      docId: targetAsset._id.toString(),
      body: {
        status: 'Disposed',
        condition: 'Damaged'
      }
    });
    console.log('✅ Asset status updated to "Disposed".');

    assetCheck = await Asset.findById(targetAsset._id).lean();
    if (assetCheck.status !== 'Disposed') {
      throw new Error(`Expected Disposed status, found: ${assetCheck.status}`);
    }

    const disposalLedger = await AssetStockLedger.findOne({ assetId: targetAsset._id, triggerType: 'Write_Off_Disposal' }).lean();
    if (!disposalLedger || disposalLedger.transactionType !== 'OUT') {
      throw new Error('Expected OUT stock ledger for Write_Off_Disposal.');
    }
    console.log('✅ Verified: Asset status set to "Disposed" and logged OUT ledger entry.');

    // Cleanup
    await cleanup();
    console.log('🎉 Asset Lifecycle: PASS');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Asset Lifecycle failed:', err);
    await cleanup();
    await mongoose.disconnect();
    throw err;
  }
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAssetLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
