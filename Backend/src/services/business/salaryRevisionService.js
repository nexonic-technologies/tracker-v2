import { getTenantModel } from '../../tenant/tenantContext.js';
import lifecycleHistoryService from './lifecycleHistoryService.js';


class SalaryRevisionService {
  /**
   * Create or revise salary structure for an employee.
   * Manages versioning, effective date windows, updating Employee pointer, and logging history.
   */
  async createOrReviseStructure({
    employeeId,
    ctc,
    basicSalary = null,
    earnings = [],
    deductions = [],
    pfEmployeePercent = 12,
    pfCeiling = 15000,
    esiApplicable = true,
    overtimeRate = 0,
    effectiveFrom = new Date(),
    createdBy = null,
    reason = 'Salary Revision',
    changeType = 'SalaryRevision',
    session = null
  }) {
    if (!employeeId || ctc == null) {
      throw new Error('[SalaryRevisionService] employeeId and ctc are required.');
    }

    const SalaryStructure = getTenantModel('SalaryStructure');
    const Employee = getTenantModel('Employee');

    const effectiveFromDate = new Date(effectiveFrom);
    const options = session ? { session } : {};

    // 1. Find existing active structure for this employee
    const activeStruct = await SalaryStructure.findOne({
      employeeId,
      effectiveFrom: { $lte: effectiveFromDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveFromDate } }]
    }).sort({ version: -1 }).session(session);

    let newVersion = 1;
    let previousValue = null;

    if (activeStruct) {
      newVersion = activeStruct.version + 1;
      previousValue = {
        ctc: activeStruct.ctc,
        version: activeStruct.version,
        effectiveFrom: activeStruct.effectiveFrom
      };

      // Close previous structure validity window (1 ms prior to new effectiveFrom)
      const dayBefore = new Date(effectiveFromDate.getTime() - 1);
      await SalaryStructure.findByIdAndUpdate(
        activeStruct._id,
        { effectiveTo: dayBefore },
        options
      );
    }

    // 2. Default basic salary calculation if earnings array is empty
    let finalEarnings = [...earnings];
    const calculatedBasic = basicSalary || Math.round(ctc * 0.5);

    if (finalEarnings.length === 0) {
      finalEarnings.push({
        name: 'Basic Salary',
        type: 'fixed',
        amount: calculatedBasic,
        taxable: true,
        isProratable: true
      });

      const HRA = Math.round(calculatedBasic * 0.4);
      const SpecialAllowance = Math.max(ctc - (calculatedBasic + HRA), 0);

      finalEarnings.push({ name: 'HRA', type: 'fixed', amount: HRA, taxable: true, isProratable: true });
      if (SpecialAllowance > 0) {
        finalEarnings.push({ name: 'Special Allowance', type: 'fixed', amount: SpecialAllowance, taxable: true, isProratable: true });
      }
    }

    // 3. Create new SalaryStructure document
    const createdArray = await SalaryStructure.create([{
      employeeId,
      version: newVersion,
      effectiveFrom: effectiveFromDate,
      effectiveTo: null,
      ctc,
      earnings: finalEarnings,
      deductions,
      pfEmployeePercent,
      pfCeiling,
      esiApplicable,
      overtimeRate,
      createdBy
    }], options);

    const newStruct = createdArray[0];

    // 4. Update Employee.salaryStructure pointer
    await Employee.findByIdAndUpdate(
      employeeId,
      { salaryStructure: newStruct._id },
      options
    );

    // 5. Log lifecycle history event
    try {
      await lifecycleHistoryService.logEvent({
        employeeId,
        changeType,
        effectiveDate: effectiveFromDate,
        previousValue,
        newValue: {
          salaryStructureId: newStruct._id,
          version: newVersion,
          ctc,
          effectiveFrom: effectiveFromDate
        },
        changedBy: createdBy,
        reason,
        session
      });
    } catch (hErr) {
      console.warn('[SalaryRevisionService] Failed to log lifecycle history:', hErr.message);
    }

    return newStruct;
  }
}

export default new SalaryRevisionService();
