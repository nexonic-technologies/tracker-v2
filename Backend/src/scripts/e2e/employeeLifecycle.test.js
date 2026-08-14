/**
 * employeeLifecycle.test.js
 * End-to-end verification script for the Employee Lifecycle.
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

export async function runEmployeeLifecycle() {
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

  const Role = mongoose.model('roles');
  const Employee = mongoose.model('employees');
  const Shift = mongoose.model('Shift');
  const ShiftAssignment = mongoose.model('ShiftAssignment');
  const Attendance = mongoose.model('attendances');
  const LeaveType = mongoose.model('leave_types');
  const LeavePolicy = mongoose.model('leave_policies');
  const Department = mongoose.model('departments');
  const Leave = mongoose.model('leaves');
  const SalaryStructure = mongoose.model('salary_structures');
  const PayrollRun = mongoose.model('payroll_runs');
  const Payroll = mongoose.model('payrolls');
  const AssetCategory = mongoose.model('assets_categories');
  const AssetVendor = mongoose.model('assets_vendors');
  const AssetPurchase = mongoose.model('assets_purchases');
  const Asset = mongoose.model('assets');
  const AssetAllocation = mongoose.model('assets_allocations');

  // actor resolve
  let superAdminRole = await Role.findOne({ capabilities: 'manage:employees', isActive: true }).lean();
  if (!superAdminRole) {
    superAdminRole = await Role.findOne({ name: /super admin|superadmin|admin/i, isActive: true }).lean();
  }
  if (!superAdminRole) {
    throw new Error('No appropriate Admin or Super Admin role found in database.');
  }

  const adminEmp = await Employee.findOne({ status: 'Active' }).lean();
  if (!adminEmp) {
    throw new Error('No active employee found to act as test executor.');
  }
  console.log(`👤 Actor employee: ${adminEmp.basicInfo.firstName} (${adminEmp._id}) with role: ${superAdminRole.name}`);

  const uniqueSuffix = Date.now();
  const empEmail = `e2e_employee_${uniqueSuffix}@Workhub.com`;
  const empId = `EMP-E2E-${uniqueSuffix.toString().slice(-6)}`;
  const leaveTypeName = `Casual E2E ${uniqueSuffix}`;
  const leavePolicyName = `Policy E2E ${uniqueSuffix}`;
  const deptName = `Dept E2E ${uniqueSuffix}`;
  const shiftName = `Shift E2E ${uniqueSuffix}`;
  const vendorName = `Vendor E2E ${uniqueSuffix}`;
  const poNumber = `PO-E2E-${uniqueSuffix}`;
  const assetCategoryName = `Cat E2E ${uniqueSuffix}`;

  // Track created documents for teardown cleanup
  let createdDocs = {
    employeeId: null,
    shiftId: null,
    shiftAssignmentId: null,
    leaveTypeId: null,
    leavePolicyId: null,
    departmentId: null,
    leaveId: null,
    salaryStructureId: null,
    payrollRunId: null,
    payrollId: null,
    assetCategoryId: null,
    vendorId: null,
    poId: null,
    assetIds: [],
    allocationId: null
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up E2E test data...');
    try {
      if (createdDocs.allocationId) await AssetAllocation.deleteMany({ _id: createdDocs.allocationId });
      if (createdDocs.assetIds.length > 0) {
        await Asset.deleteMany({ _id: { $in: createdDocs.assetIds } });
        const { default: AssetStockLedger } = await import('../../models/AssetStockLedger.js');
        await AssetStockLedger.deleteMany({ assetId: { $in: createdDocs.assetIds } });
      }
      if (createdDocs.poId) await AssetPurchase.deleteMany({ _id: createdDocs.poId });
      if (createdDocs.vendorId) await AssetVendor.deleteMany({ _id: createdDocs.vendorId });
      if (createdDocs.assetCategoryId) await AssetCategory.deleteMany({ _id: createdDocs.assetCategoryId });
      if (createdDocs.payrollId) await Payroll.deleteMany({ _id: createdDocs.payrollId });
      if (createdDocs.payrollRunId) await PayrollRun.deleteMany({ _id: createdDocs.payrollRunId });
      if (createdDocs.salaryStructureId) await SalaryStructure.deleteMany({ _id: createdDocs.salaryStructureId });
      if (createdDocs.leaveId) {
        await Leave.deleteMany({ _id: createdDocs.leaveId });
        const { default: LeaveTransaction } = await import('../../models/LeaveTransaction.js');
        await LeaveTransaction.deleteMany({ employeeId: createdDocs.employeeId });
      }
      if (createdDocs.employeeId) {
        await Employee.deleteMany({ _id: createdDocs.employeeId });
        await Attendance.deleteMany({ employee: createdDocs.employeeId });
      }
      if (createdDocs.departmentId) await Department.deleteMany({ _id: createdDocs.departmentId });
      if (createdDocs.leavePolicyId) await LeavePolicy.deleteMany({ _id: createdDocs.leavePolicyId });
      if (createdDocs.leaveTypeId) await LeaveType.deleteMany({ _id: createdDocs.leaveTypeId });
      if (createdDocs.shiftAssignmentId) await ShiftAssignment.deleteMany({ _id: createdDocs.shiftAssignmentId });
      if (createdDocs.shiftId) await Shift.deleteMany({ _id: createdDocs.shiftId });
      console.log('🧹 Cleanup completed successfully.');
    } catch (e) {
      console.error('⚠️ Cleanup encountered an error:', e.message);
    }
  };

  try {
    // --- STEP 1: CREATE PREREQUISITES ---
    console.log('\n--- Setup: Creating Leave Type, Policy, Dept, and Shift ---');

    const leaveType = await LeaveType.create({
      name: leaveTypeName,
      description: 'E2E Testing',
      maxDaysPerMonth: 2,
      maxDaysPerYear: 12,
      carryForward: false,
      requiresApproval: true,
      isActive: true
    });
    createdDocs.leaveTypeId = leaveType._id;
    console.log(`✅ Leave Type created: ${leaveType.name}`);

    const leavePolicy = await LeavePolicy.create({
      name: leavePolicyName,
      isActive: true,
      leaves: [{
        leaveType: leaveType._id,
        maxDaysPerMonth: 2,
        maxDaysPerYear: 12,
        carryForward: false
      }],
      description: 'E2E testing policy'
    });
    createdDocs.leavePolicyId = leavePolicy._id;
    console.log(`✅ Leave Policy created: ${leavePolicy.name}`);

    const dept = await Department.create({
      name: deptName,
      shortCode: `E2E${uniqueSuffix.toString().slice(-4)}`,
      description: 'E2E Testing Dept',
      leavePolicy: leavePolicy._id
    });
    createdDocs.departmentId = dept._id;
    console.log(`✅ Department created: ${dept.name}`);

    const shift = await Shift.create({
      name: shiftName,
      startTime: '09:00',
      endTime: '18:00',
      workingHours: 9,
      isActive: true,
      allowedLateness: 15,
      overtimeThreshold: 480,
      weeklyOff: ['Sunday'],
      createdBy: adminEmp._id
    });
    createdDocs.shiftId = shift._id;
    console.log(`✅ Shift created: ${shift.name}`);

    // --- STEP 2: CREATE EMPLOYEE ---
    console.log('\n--- STEP 2: Creating Employee ---');
    const employee = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'employees',
      body: {
        basicInfo: {
          firstName: 'E2E_Emp_First',
          lastName: 'E2E_Emp_Last',
          email: empEmail,
          phone: '9876543210',
          gender: 'male',
          maritalStatus: 'Single'
        },
        professionalInfo: {
          empId: empId,
          department: dept._id.toString(),
          reportingManager: adminEmp._id.toString(),
          role: superAdminRole._id.toString(),
          level: 'L1',
          doj: new Date()
        },
        authInfo: {
          workEmail: empEmail,
          password: 'Password@123'
        },
        status: 'Active',
        isActive: true
      }
    });
    createdDocs.employeeId = employee._id;
    console.log(`✅ Employee created: ${employee.professionalInfo.empId} (${employee._id})`);

    // Verify initial leave balance is set up from department policy
    if (!employee.leaveStatus || employee.leaveStatus.length === 0) {
      throw new Error('Employee leaveStatus was not initialized from department policy!');
    }
    console.log(`✅ Verified: Employee leave balance initialized (${employee.leaveStatus[0].available} available days).`);

    // --- STEP 3: ASSIGN SHIFT ---
    console.log('\n--- STEP 3: Assigning Shift ---');
    const shiftAssignment = await ShiftAssignment.create({
      employeeId: employee._id,
      shiftId: shift._id,
      startDate: new Date(),
      isActive: true,
      assignedBy: adminEmp._id
    });
    createdDocs.shiftAssignmentId = shiftAssignment._id;
    console.log(`✅ Shift Assignment created: ${shiftAssignment._id}`);

    // --- STEP 4: MARK ATTENDANCE ---
    console.log('\n--- STEP 4: Marking Attendance ---');
    // Using buildQuery to test validation and check-in hooks
    const checkInTime = new Date();
    checkInTime.setHours(9, 5, 0); // 9:05 AM (Present)
    const checkOutTime = new Date();
    checkOutTime.setHours(20, 5, 0); // 8:05 PM (Normal check-out, no early checkout request triggered)

    // Simulate check-in
    const attendance = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: employee._id.toString(), // Check-in done by employee
      action: 'create',
      modelName: 'attendances',
      body: {
        employee: employee._id.toString(),
        employeeName: `${employee.basicInfo.firstName} ${employee.basicInfo.lastName}`,
        managerId: adminEmp._id.toString(),
        date: new Date(),
        checkIn: checkInTime,
        workType: 'fixed',
        status: 'Present'
      }
    });
    console.log(`✅ Attendance Check-In logged: status is "${attendance.status}"`);

    // Simulate check-out
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: employee._id.toString(),
      action: 'update',
      modelName: 'attendances',
      docId: attendance._id.toString(),
      body: {
        checkOut: checkOutTime,
        managerId: adminEmp._id.toString(),
        status: 'Check-Out'
      }
    });
    console.log('✅ Attendance Check-Out logged.');

    const attendanceCheck = await Attendance.findById(attendance._id).lean();
    if (!attendanceCheck || !['Present', 'Check-Out'].includes(attendanceCheck.status)) {
      throw new Error(`Expected attendance status "Present" or "Check-Out", found: ${attendanceCheck?.status}`);
    }
    console.log('✅ Verified: Attendance document successfully recorded.');

    // --- STEP 5: APPLY LEAVE ---
    console.log('\n--- STEP 5: Applying Leave (Starts as Pending) ---');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2); // 2 days in future
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // 2-day leave

    const leave = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: employee._id.toString(),
      action: 'create',
      modelName: 'leaves',
      body: {
        employeeId: employee._id.toString(),
        employeeName: `${employee.basicInfo.firstName} ${employee.basicInfo.lastName}`,
        departmentId: dept._id.toString(),
        leaveTypeId: leaveType._id.toString(),
        startDate: startDate,
        endDate: endDate,
        reason: 'E2E test emergency leave request',
        status: 'Pending'
      }
    });
    createdDocs.leaveId = leave._id;
    console.log(`✅ Leave request applied: ${leave._id} (status: "${leave.status}", days: ${leave.totalDays})`);

    // --- STEP 6: APPROVE LEAVE & VERIFY BALANCE UPDATED ---
    console.log('\n--- STEP 6: Approving Leave ---');
    // The approver should be the reporting manager (adminEmp)
    const approvedLeave = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'leaves',
      docId: leave._id.toString(),
      body: {
        status: 'Approved',
        managerComments: 'Approved by E2E test coordinator'
      }
    });
    console.log(`✅ Leave status updated: ${approvedLeave.status}`);

    // Verify balance updated
    const updatedEmployee = await Employee.findById(employee._id).lean();
    const balance = updatedEmployee.leaveStatus.find(l => l.leaveType.toString() === leaveType._id.toString());
    console.log(`   Leave balance check - Used: ${balance.usedThisMonth}, Available: ${balance.available}`);
    if (balance.usedThisMonth !== 2 || balance.available !== 10) {
      throw new Error(`Expected leave balance used to be 2 and available to be 10. Found used: ${balance.usedThisMonth}, available: ${balance.available}`);
    }
    console.log('✅ Verified: Employee leave balance decremented by 2 days.');

    // Verify attendance records created for leave days
    const leaveAttendances = await Attendance.find({ employee: employee._id, status: 'Leave' }).lean();
    console.log(`   Found ${leaveAttendances.length} attendance records marked as Leave.`);
    if (leaveAttendances.length !== 2) {
      throw new Error(`Expected 2 leave attendance documents, found ${leaveAttendances.length}`);
    }
    console.log('✅ Verified: Attendance records created automatically for leave duration.');

    // --- STEP 7: RUN PAYROLL ---
    console.log('\n--- STEP 7: Creating Salary Structure & Running Payroll ---');

    // Create salary structure
    const salaryStructure = await SalaryStructure.create({
      employeeId: employee._id,
      version: 1,
      effectiveFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // start of current month
      ctc: 600000,
      earnings: [
        { name: 'Basic', type: 'fixed', amount: 25000, taxable: true, isProratable: true },
        { name: 'HRA', type: 'fixed', amount: 12500, taxable: true, isProratable: true }
      ],
      deductions: [
        { name: 'Professional Tax', type: 'fixed', amount: 200 }
      ],
      pfEmployeePercent: 12,
      pfCeiling: 15000,
      esiApplicable: false,
      createdBy: adminEmp._id
    });
    createdDocs.salaryStructureId = salaryStructure._id;
    console.log(`✅ Salary Structure created (CTC: ${salaryStructure.ctc})`);

    // Create payroll run
    const payrollRun = await PayrollRun.create({
      month: new Date().getMonth() + 1, // 1-based month
      year: new Date().getFullYear(),
      status: 'Draft',
      employeeIds: [employee._id],
      initiatedBy: adminEmp._id
    });
    createdDocs.payrollRunId = payrollRun._id;
    console.log(`✅ Payroll Run initiated: ${payrollRun._id} for month ${payrollRun.month}/${payrollRun.year}`);

    // Call service calculator synchronously to bypass Bull queue
    const { runPayrollForEmployee } = await import('../../services/business/payrollEngine.js');
    const payrollResult = await runPayrollForEmployee(
      employee._id,
      payrollRun.month,
      payrollRun.year,
      adminEmp._id,
      payrollRun._id
    );
    createdDocs.payrollId = payrollResult.payrollId;
    console.log(`✅ Payroll calculated synchronously: gross: ${payrollResult.grossSalary}, net: ${payrollResult.netSalary}`);

    // Update payroll run status to Computed
    await PayrollRun.findByIdAndUpdate(payrollRun._id, {
      $set: { status: 'Computed', payrollIds: [payrollResult.payrollId], processedCount: 1 }
    });
    console.log('✅ Payroll Run finalized to "Computed" status.');

    // Verify Payroll document exists
    const payrollDoc = await Payroll.findById(payrollResult.payrollId).lean();
    if (!payrollDoc || payrollDoc.status !== 'Processed') {
      throw new Error(`Expected payroll document status "Processed", found: ${payrollDoc?.status}`);
    }
    console.log(`✅ Verified: Payroll record created with Gross: ${payrollDoc.grossSalary}, Net: ${payrollDoc.netSalary}`);

    // --- STEP 8: ALLOCATE ASSET ---
    console.log('\n--- STEP 8: Allocating Asset to Employee ---');

    // Create Asset category
    const assetCategory = await AssetCategory.create({
      name: assetCategoryName,
      code: `E2ECAT-${uniqueSuffix.toString().slice(-4)}`,
      description: 'E2E Testing Category',
      isActive: true,
      createdBy: adminEmp._id
    });
    createdDocs.assetCategoryId = assetCategory._id;

    // Create Vendor
    const vendor = await AssetVendor.create({
      name: vendorName,
      contactPerson: 'E2E Contact',
      email: 'e2e@vendor.com',
      phone: '9998887771',
      status: 'Active'
    });
    createdDocs.vendorId = vendor._id;

    // Create PO and receive assets to populate inventory
    const po = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_purchases',
      body: {
        vendorId: vendor._id,
        poNumber: poNumber,
        purchaseDate: new Date(),
        status: 'Approved',
        items: [
          {
            categoryId: assetCategory._id,
            name: 'Dell Laptop E2E',
            model: 'Dell-E2E',
            serialNumberPrefix: 'SN-E2E-',
            quantity: 1,
            unitPrice: 40000,
            taxRate: 18
          }
        ],
        totalAmount: 47200,
        paymentStatus: 'Unpaid'
      }
    });
    createdDocs.poId = po._id;

    // Transition to Received to trigger GRN hooks and auto-create asset
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_purchases',
      docId: po._id.toString(),
      body: { status: 'Received' }
    });

    const receivedAsset = await Asset.findOne({ purchaseId: po._id }).lean();
    if (!receivedAsset) {
      throw new Error('Asset was not auto-created after PO transitioned to Received!');
    }
    createdDocs.assetIds.push(receivedAsset._id);
    console.log(`✅ Asset created: ${receivedAsset.assetId} (Status: "${receivedAsset.status}")`);

    // Allocate asset to our E2E employee
    // NOTE: assets_allocations service always forces status = 'Pending Approval' on create.
    // We must explicitly activate the allocation afterwards to reach 'Allocated' asset state.
    const allocation = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'assets_allocations',
      body: {
        employeeId: employee._id.toString(),
        assetId: receivedAsset._id.toString(),
        allocationType: 'Allocation', // Valid enum: 'Allocation' | 'Transfer' | 'Temporary'
        allocationDate: new Date(),
        reason: 'Onboarding allocation'
      }
    });
    createdDocs.allocationId = allocation._id;
    console.log(`✅ Allocation request created (status: "${allocation.status}", asset: "Reserved")`);

    // Activate the allocation: Pending Approval → Active (triggers OUT ledger, asset → Allocated)
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_allocations',
      docId: allocation._id.toString(),
      body: { status: 'Active' }
    });
    console.log('✅ Allocation activated (Pending Approval → Active).');

    // Verify asset status changes to Allocated
    const allocatedAsset = await Asset.findById(receivedAsset._id).lean();
    if (allocatedAsset.status !== 'Allocated') {
      throw new Error(`Expected asset status to be "Allocated", found: ${allocatedAsset.status}`);
    }
    console.log('✅ Verified: Asset status updated to "Allocated".');

    // --- STEP 9: EXIT CLEARANCE BLOCKED ---
    console.log('\n--- STEP 9: Exit Clearance (Should fail because employee holds active asset) ---');
    try {
      await buildQuery({
        role: superAdminRole._id.toString(),
        userId: adminEmp._id.toString(),
        action: 'update',
        modelName: 'employees',
        docId: employee._id.toString(),
        body: { status: 'Terminated' }
      });
      throw new Error('Exit Clearance succeeded but should have failed due to active asset!');
    } catch (e) {
      console.log(`✅ Exit Clearance successfully BLOCKED. Error message: "${e.message}"`);
      if (!e.message.includes('Cannot update employee status') && !e.message.includes('active asset allocation')) {
        throw new Error(`Unexpected block error message: ${e.message}`);
      }
    }

    // --- STEP 10: RETURN ASSET & EXIT CLEARANCE SUCCEEDS ---
    console.log('\n--- STEP 10: Returning Asset & Terminating Employee ---');

    // Return asset
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'assets_allocations',
      docId: allocation._id.toString(),
      body: {
        status: 'Returned',
        returnedCondition: 'Good',
        returnNotes: 'Returned at resignation'
      }
    });
    console.log('✅ Asset returned.');

    const returnedAsset = await Asset.findById(receivedAsset._id).lean();
    if (returnedAsset.status !== 'Available') {
      throw new Error(`Expected asset status to be "Available", found: ${returnedAsset.status}`);
    }
    console.log('✅ Verified: Asset status is back to "Available".');

    // Now update status to Terminated
    const terminatedEmployee = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'employees',
      docId: employee._id.toString(),
      body: { status: 'Terminated' }
    });
    console.log(`✅ Exit Clearance succeeded! Employee status is now: "${terminatedEmployee.status}"`);

    // Clean up
    await cleanup();
    console.log('🎉 Employee Lifecycle: PASS');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Employee Lifecycle failed:', err);
    await cleanup();
    await mongoose.disconnect();
    throw err;
  }
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEmployeeLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
