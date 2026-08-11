import { PopulateApi } from './populate.api';

export const TaskApi = {
  READ: (id) => PopulateApi.READ('tasks', id),
  CREATE: PopulateApi.CREATE('tasks'),
  UPDATE: (id) => PopulateApi.UPDATE('tasks', id),
  DELETE: (id) => PopulateApi.DELETE('tasks', id),
};

export const TicketApi = {
  READ: (id) => PopulateApi.READ('tickets', id),
  CREATE: PopulateApi.CREATE('tickets'),
  UPDATE: (id) => PopulateApi.UPDATE('tickets', id),
  DELETE: (id) => PopulateApi.DELETE('tickets', id),
  RECALCULATE_ETA: (id) => `/tickets/${id}/recalculate-eta`,
};

export const PayrollApi = {
  RUNS: PopulateApi.READ('payroll_runs'),
  PAYSLIPS: PopulateApi.READ('payslips'),
  STRUCTURES: PopulateApi.READ('salary_structures'),
};

export const EmployeeApi = {
  READ: (id) => PopulateApi.READ('employees', id),
  CREATE: PopulateApi.CREATE('employees'),
  UPDATE: (id) => PopulateApi.UPDATE('employees', id),
};
