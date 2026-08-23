import Employee from '../../models/Employee.js';
import { defaultConversationContextTracker } from './ConversationContextTracker.js';

export class ContextManager {
  async enrich(ctx) {
    if (ctx.sessionId) {
      try {
        ctx.discourse = await defaultConversationContextTracker.getContext(ctx.sessionId, ctx.userId);
      } catch {}
    }

    if (ctx.employeeId && !ctx.role) {
      try {
        const emp = await Employee.findById(ctx.employeeId).populate('roleId departmentId').lean();
        if (emp) {
          ctx.role = emp.roleId?.name || ctx.role;
          ctx.department = emp.departmentId?.name || ctx.department;
          ctx.designation = emp.designation || ctx.designation;
          ctx.employeeName = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim();
        }
      } catch (err) {}
    }
    ctx.log('ContextManager', 'Enriched user working context', {
      employeeId: ctx.employeeId,
      role: ctx.role,
      department: ctx.department,
      hasDiscourse: Boolean(ctx.discourse?.focalEntities?.length),
    });
    return ctx;
  }
}

export default ContextManager;
