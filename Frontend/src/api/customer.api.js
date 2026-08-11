export const CustomerApi = {
  LIST: '/customers',
  GET_BY_ID: (id) => `/customers/${id}`,
  CREATE: '/customers',
  UPDATE: (id) => `/customers/${id}`,
  DELETE: (id) => `/customers/${id}`,
};
