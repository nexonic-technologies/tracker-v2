import axiosInstance from '@api/axiosInstance';
import { AuthApi } from '@api/auth.api';
import { PopulateApi } from '@api/populate.api';

export class AuthService {
  static async login(credentials) {
    const response = await axiosInstance.post(AuthApi.LOGIN, credentials);
    return response.data;
  }
  static async logout(headerConfig = {}) {
    const response = await axiosInstance.post(AuthApi.LOGOUT, {}, headerConfig);
    return response.data;
  }
  static async getContext() {
    const response = await axiosInstance.get(AuthApi.CONTEXT);
    return response.data;
  }
}

export class EmployeeService {
  static async getEmployees(options = {}) {
    const req = PopulateApi.READ('employees', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
}

export class PayrollService {
  static async getRuns(options = {}) {
    const req = PopulateApi.READ('payroll_runs', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createRun(data) {
    const req = PopulateApi.CREATE('payroll_runs', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateRun(id, data) {
    const req = PopulateApi.UPDATE('payroll_runs', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async getStructures(options = {}) {
    const req = PopulateApi.READ('salary_structures', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createStructure(data) {
    const req = PopulateApi.CREATE('salary_structures', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getPayrolls(options = {}) {
    const req = PopulateApi.READ('payrolls', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getperiod_closures(options = {}) {
    const req = PopulateApi.READ('period_closures', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createPeriodClosure(data) {
    const req = PopulateApi.CREATE('period_closures', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updatePeriodClosure(id, data) {
    const req = PopulateApi.UPDATE('period_closures', id, data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async emailPayslip(payrollId, targetEmail = null) {
    const response = await axiosInstance.post(`/config/payroll/email-payslip/${payrollId}`, { targetEmail });
    return response.data;
  }
}

export class TaskService {
  static async getTasks(options = {}) {
    const req = PopulateApi.READ('tasks', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getTaskById(id) {
    const req = PopulateApi.READ('tasks', id);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createTask(data) {
    const req = PopulateApi.CREATE('tasks', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateTask(id, data) {
    const req = PopulateApi.UPDATE('tasks', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async deleteTask(id) {
    const req = PopulateApi.DELETE('tasks', id);
    const response = await axiosInstance.delete(req.url);
    return response.data;
  }
}

export class TicketService {
  static async getTickets(options = {}) {
    const req = PopulateApi.READ('tickets', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getTicketById(id) {
    const req = PopulateApi.READ('tickets', id);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createTicket(data) {
    const req = PopulateApi.CREATE('tickets', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateTicket(id, data) {
    const req = PopulateApi.UPDATE('tickets', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
}

export class MasterDataService {
  static async executePopulate(action, model, data = {}, id = null, options = {}) {
    if (action === 'read') {
      const req = PopulateApi.READ(model, id, { ...options, ...data });
      const response = await axiosInstance.post(req.url, req.payload);
      return response.data;
    } else if (action === 'create') {
      const req = PopulateApi.CREATE(model, data);
      const response = await axiosInstance.post(req.url, req.payload);
      return response.data;
    } else if (action === 'update') {
      const req = PopulateApi.UPDATE(model, id, data);
      const response = await axiosInstance.put(req.url, req.payload);
      return response.data;
    } else if (action === 'delete') {
      const req = PopulateApi.DELETE(model, id);
      const response = await axiosInstance.delete(req.url);
      return response.data;
    }
  }
}

export class AttendanceService {
  static async getAttendances(options = {}) {
    const req = PopulateApi.READ('attendances', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getAttendanceById(id, options = {}) {
    const req = PopulateApi.READ('attendances', id, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createAttendance(data) {
    const req = PopulateApi.CREATE('attendances', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateAttendance(id, data) {
    const req = PopulateApi.UPDATE('attendances', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
}

export class LeaveService {
  static async getLeaves(options = {}) {
    const req = PopulateApi.READ('leaves', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getLeaveById(id, options = {}) {
    const req = PopulateApi.READ('leaves', id, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createLeave(data) {
    const req = PopulateApi.CREATE('leaves', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateLeave(id, data) {
    const req = PopulateApi.UPDATE('leaves', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async deleteLeave(id) {
    const req = PopulateApi.DELETE('leaves', id);
    const response = await axiosInstance.delete(req.url);
    return response.data;
  }
  static async getRegularizations(options = {}) {
    const req = PopulateApi.READ('leaveregularizations', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createRegularization(data) {
    const req = PopulateApi.CREATE('leaveregularizations', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateRegularization(id, data) {
    const req = PopulateApi.UPDATE('leaveregularizations', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
}

export class CRMService {
  static async getQuotations(options = {}) {
    const req = PopulateApi.READ('quotations', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getQuotationById(id, options = {}) {
    const req = PopulateApi.READ('quotations', id, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createQuotation(data) {
    const req = PopulateApi.CREATE('quotations', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateQuotation(id, data) {
    const req = PopulateApi.UPDATE('quotations', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async getOrders(options = {}) {
    const req = PopulateApi.READ('order_acknowledgements', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getPayments(options = {}) {
    const req = PopulateApi.READ('payments', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getContacts(options = {}) {
    const req = PopulateApi.READ('contacts', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getOpportunities(options = {}) {
    const req = PopulateApi.READ('opportunities', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createOpportunity(data) {
    const req = PopulateApi.CREATE('opportunities', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateOpportunity(id, data) {
    const req = PopulateApi.UPDATE('opportunities', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async getInvoices(options = {}) {
    const req = PopulateApi.READ('invoices', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createInvoice(data) {
    const req = PopulateApi.CREATE('invoices', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateInvoice(id, data) {
    const req = PopulateApi.UPDATE('invoices', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
}



