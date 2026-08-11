/**
 * verifyAssetProcurement.js
 * End-to-end verification script for Asset Procurement, GRN Hooks, and Stock Ledger.
 * Run: node src/scripts/verifyAssetProcurement.js
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

async function verify() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Register models
  console.log('📦 Registering Mongoose models...');
  await import('../models/Collection.js');

  const { setCache } = await import('../utils/cache.js');
  await setCache();
  console.log('✅ Policy cache initialized');

  const { buildQuery } = await import('../utils/policy/policyEngine.js');

  const AssetVendor = mongoose.model('assets_vendors');
  const AssetPurchase = mongoose.model('assets_purchases');
  const Asset = mongoose.model('assets');
  const AssetStockLedger = mongoose.model('assets_stock_ledgers');
  const AssetAllocation = mongoose.model('assets_allocations');
  const AssetRepair = mongoose.model('assets_repairs');
  const AssetCategory = mongoose.model('assets_categories');
  const Employee = mongoose.model('employees');
  const Role = mongoose.model('roles');

  const vendorName = 'TEST_VENDOR_Workhub_ERP';
  const poNumber = 'TEST_PO_9999';

  // --- CLEANUP ---
  console.log('\n🧹 Cleaning up any existing test data...');
  const testVendor = await AssetVendor.findOne({ name: vendorName });
  if (testVendor) {
    await AssetPurchase.deleteMany({ vendorId: testVendor._id });
    await AssetVendor.deleteOne({ _id: testVendor._id });
  }

  const cleanTestAssets = await Asset.find({ invoiceNumber: poNumber }).select('_id').lean();
  const cleanTestAssetIds = cleanTestAssets.map(a => a._id);
  if (cleanTestAssetIds.length > 0) {
    await AssetStockLedger.deleteMany({ assetId: { $in: cleanTestAssetIds } });
    await AssetAllocation.deleteMany({ assetId: { $in: cleanTestAssetIds } });
    await AssetRepair.deleteMany({ assetId: { $in: cleanTestAssetIds } });
    await Asset.deleteMany({ _id: { $in: cleanTestAssetIds } });
    console.log(`Cleaned up ${cleanTestAssetIds.length} assets and their relations.`);
  }

  // --- SETUP ---
  const activeCategory = await AssetCategory.findOne({ isActive: true }).lean();
  if (!activeCategory) {
    throw new Error('No active asset category found to run tests. Please seed asset categories first.');
  }
  console.log(`📋 Found active category: ${activeCategory.name} (${activeCategory._id})`);

  // Try to find a role with capability 'manage:assets', falling back to 'super admin' name
  let superAdminRole = await Role.findOne({ capabilities: 'manage:assets', isActive: true }).lean();
  if (!superAdminRole) {
    superAdminRole = await Role.findOne({ name: /super admin|superadmin|admin/i, isActive: true }).lean();
  }
  if (!superAdminRole) {
    const allRoles = await Role.find({}).lean();
    console.log('Available roles in database:', allRoles);
    throw new Error('No appropriate Admin or Super Admin role found in database.');
  }

  const adminEmp = await Employee.findOne({ status: 'Active' }).lean();
  if (!adminEmp) {
    throw new Error('No active employee found.');
  }
  console.log(`👤 Actor employee: ${adminEmp.name} (${adminEmp._id}) with role: ${superAdminRole.name}`);

  // --- STEP 1: CREATE VENDOR ---
  console.log('\n--- STEP 1: Creating Asset Vendor ---');
  const vendor = await buildQuery({
    role: superAdminRole._id.toString(),
    userId: adminEmp._id.toString(),
    action: 'create',
    modelName: 'assets_vendors',
    body: {
      name: vendorName,
      contactPerson: 'Workhub Lead Inspector',
      email: 'Workhub@test.com',
      phone: '9998887776',
      gstIN: '33TESTG1234F1Z1',
      address: 'ERP Hub, Coimbatore',
      status: 'Active'
    }
  });
  console.log(`✅ Vendor created: ${vendor.name} (${vendor._id})`);

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
          name: 'Dell Test Laptop LMX',
          model: 'LMX-9900',
          serialNumberPrefix: 'SN-TEST-LMX-',
          quantity: 2,
          unitPrice: 50000,
          taxRate: 18
        }
      ],
      totalAmount: 118000, // (50000 * 2) * 1.18
      paymentStatus: 'Unpaid'
    }
  });
  console.log(`✅ PO created: ${po.poNumber} in status "${po.status}"`);

  // --- STEP 3: TRANSITION STATUS TO RECEIVED ---
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
  console.log(`   PO Status is: "${updatedPo.status}"`);

  console.log('Transition: Pending Approval -> Approved');
  updatedPo = await buildQuery({
    role: superAdminRole._id.toString(),
    userId: adminEmp._id.toString(),
    action: 'update',
    modelName: 'assets_purchases',
    docId: po._id.toString(),
    body: { status: 'Approved' }
  });
  console.log(`   PO Status is: "${updatedPo.status}"`);

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

  // --- VERIFY ASSETS & IN LEDGER ---
  console.log('\n--- VERIFYING GRN: Assets & Stock Ledgers ---');
  const createdAssets = await Asset.find({ purchaseId: po._id }).lean();
  console.log(`Found ${createdAssets.length} created assets:`);
  for (const asset of createdAssets) {
    console.log(`  - Asset ID: ${asset.assetId}, Name: ${asset.name}, Cost: ${asset.purchaseCost}, Serial: ${asset.serialNumber}, Status: ${asset.status}`);

    const ledgerEntries = await AssetStockLedger.find({ assetId: asset._id }).lean();
    console.log(`    Ledger Entries (${ledgerEntries.length}):`);
    for (const entry of ledgerEntries) {
      console.log(`      * [${entry.transactionType}] Trigger: ${entry.triggerType}, Prev: ${entry.previousState}, New: ${entry.newState}`);
    }
  }

  if (createdAssets.length !== 2) {
    throw new Error(`Expected 2 assets, found ${createdAssets.length}`);
  }

  // --- STEP 4: ALLOCATION (CHECKOUT & RETURN) ---
  const targetAsset = createdAssets[0];
  console.log(`\n--- STEP 4: Allocating Asset: ${targetAsset.assetId} ---`);

  console.log('Creating allocation request (Pending Approval)...');
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
      reason: 'E2E testing allocation',
      status: 'Pending Approval'
    }
  });
  console.log(`✅ Allocation created: ${allocation._id} (status: "${allocation.status}")`);

  // Verify reserved state
  let assetCheck = await Asset.findById(targetAsset._id).lean();
  console.log(`Asset state (Should be Reserved): "${assetCheck.status}"`);

  console.log('Approving allocation (transitioning to Active - triggers OUT ledger)...');
  const approvedAllocation = await buildQuery({
    role: superAdminRole._id.toString(),
    userId: adminEmp._id.toString(),
    action: 'update',
    modelName: 'assets_allocations',
    docId: allocation._id.toString(),
    body: { status: 'Active' }
  });
  console.log(`✅ Allocation status: "${approvedAllocation.status}"`);

  assetCheck = await Asset.findById(targetAsset._id).lean();
  console.log(`Asset state (Should be Allocated): "${assetCheck.status}"`);

  console.log('Returning asset back to inventory (triggers IN ledger)...');
  const returnedAllocation = await buildQuery({
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
  console.log(`✅ Allocation status: "${returnedAllocation.status}"`);

  assetCheck = await Asset.findById(targetAsset._id).lean();
  console.log(`Asset state (Should be Available): "${assetCheck.status}"`);

  // --- STEP 5: REPAIR FLOW ---
  console.log(`\n--- STEP 5: Simulating Repair flow for ${targetAsset.assetId} ---`);

  console.log('Sending asset for repair (triggers OUT ledger)...');
  const repair = await buildQuery({
    role: superAdminRole._id.toString(),
    userId: adminEmp._id.toString(),
    action: 'create',
    modelName: 'assets_repairs',
    body: {
      assetId: targetAsset._id.toString(),
      issueDescription: 'E2E test screen flicker',
      status: 'Sent for Repair',
      repairCost: 2000
    }
  });
  console.log(`✅ Repair record created: ${repair._id} (status: "${repair.status}")`);

  assetCheck = await Asset.findById(targetAsset._id).lean();
  console.log(`Asset state (Should be Under Repair): "${assetCheck.status}"`);

  console.log('Completing repair as Repaired (triggers IN ledger)...');
  const completedRepair = await buildQuery({
    role: superAdminRole._id.toString(),
    userId: adminEmp._id.toString(),
    action: 'update',
    modelName: 'assets_repairs',
    docId: repair._id.toString(),
    body: {
      status: 'Repaired',
      repairCondition: 'Excellent'
    }
  });
  console.log(`✅ Repair record status: "${completedRepair.status}"`);

  assetCheck = await Asset.findById(targetAsset._id).lean();
  console.log(`Asset state (Should be Available): "${assetCheck.status}", condition: "${assetCheck.condition}"`);

  // --- STEP 6: STOCK BALANCE REPORTS VERIFICATION ---
  console.log('\n--- STEP 6: Running Retroactive Stock Balance Report calculations ---');

  const rangeStart = new Date(Date.now() - 1000 * 60); // 1 minute ago
  const rangeEnd = new Date(Date.now() + 1000 * 60);   // 1 minute in future

  const calculateReport = async (filterObj, start, end) => {
    // 1. Calculate opening balance (all transactions before start)
    const openingTx = await AssetStockLedger.find({
      ...filterObj,
      transactionDate: { $lt: start }
    }).lean();

    let openingBalance = 0;
    for (const tx of openingTx) {
      if (tx.transactionType === 'IN') openingBalance += tx.quantity;
      if (tx.transactionType === 'OUT') openingBalance -= tx.quantity;
    }

    // 2. Count movements inside range
    const rangeTx = await AssetStockLedger.find({
      ...filterObj,
      transactionDate: { $gte: start, $lte: end }
    }).lean();

    let totalIn = 0;
    let totalOut = 0;
    for (const tx of rangeTx) {
      if (tx.transactionType === 'IN') totalIn += tx.quantity;
      if (tx.transactionType === 'OUT') totalOut += tx.quantity;
    }

    const closingBalance = openingBalance + totalIn - totalOut;

    return { openingBalance, totalIn, totalOut, closingBalance, count: rangeTx.length };
  };

  // Report 1: Current range (should capture all 5 logged transactions for this asset: IN(GRN), OUT(Alloc), IN(Return), OUT(Repair), IN(RepairReturn))
  const reportCurrent = await calculateReport({ assetId: targetAsset._id }, rangeStart, rangeEnd);
  console.log(`📊 Retroactive balance report for asset ${targetAsset.assetId} in current range:`);
  console.log(`   * Opening Stock: ${reportCurrent.openingBalance}`);
  console.log(`   * Total IN:      ${reportCurrent.totalIn}`);
  console.log(`   * Total OUT:     ${reportCurrent.totalOut}`);
  console.log(`   * Closing Stock: ${reportCurrent.closingBalance}`);
  console.log(`   * Movements:     ${reportCurrent.count}`);

  // Report 2: Future range (opening balance should equal final closing state, which is 1 since asset is currently Available, movements = 0)
  const futureStart = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes in future
  const futureEnd = new Date(Date.now() + 1000 * 60 * 20);   // 20 minutes in future
  const reportFuture = await calculateReport({ assetId: targetAsset._id }, futureStart, futureEnd);
  console.log(`\n📊 Retroactive balance report for asset ${targetAsset.assetId} in FUTURE range:`);
  console.log(`   * Opening Stock: ${reportFuture.openingBalance}`);
  console.log(`   * Total IN:      ${reportFuture.totalIn}`);
  console.log(`   * Total OUT:     ${reportFuture.totalOut}`);
  console.log(`   * Closing Stock: ${reportFuture.closingBalance}`);
  console.log(`   * Movements:     ${reportFuture.count}`);

  // Assertions
  if (reportCurrent.closingBalance !== 1) {
    throw new Error(`Expected closing balance of 1 for asset, got ${reportCurrent.closingBalance}`);
  }
  if (reportFuture.openingBalance !== 1) {
    throw new Error(`Expected opening balance of 1 in future range, got ${reportFuture.openingBalance}`);
  }

  console.log('\n🎉 ALL E2E VERIFICATIONS SUCCESSFUL!');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

verify().catch(err => {
  console.error('❌ E2E Verification failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
