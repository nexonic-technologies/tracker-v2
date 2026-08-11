export const buildPopulatePayload = (options = {}) => {
  const {
    filter,
    fields,
    populateFields,
    sort,
    page = 1,
    limit = 10,
    type,
    stages,
    search,
    ...rest
  } = options;

  const payload = { ...rest };
  if (page !== undefined) payload.page = page;
  if (limit !== undefined) payload.limit = limit;
  if (filter !== undefined) payload.filter = filter;
  if (fields !== undefined) payload.fields = Array.isArray(fields) ? fields.join(',') : fields;
  if (populateFields !== undefined) payload.populateFields = populateFields;
  if (sort !== undefined) payload.sort = sort;
  if (type !== undefined) payload.type = type;
  if (stages !== undefined) payload.stages = stages;
  if (search !== undefined) payload.search = search;

  return payload;
};

export const PopulateApi = {
  READ: (model, id = null, options = {}) => ({
    url: id ? `/populate/read/${model}/${id}` : `/populate/read/${model}`,
    payload: buildPopulatePayload(options),
  }),
  CREATE: (model, data = {}) => ({
    url: `/populate/create/${model}`,
    payload: data,
  }),
  UPDATE: (model, id, data = {}) => ({
    url: `/populate/update/${model}/${id}`,
    payload: data,
  }),
  DELETE: (model, id) => ({
    url: `/populate/delete/${model}/${id}`,
  }),
  BULK_CREATE: (model, dataArray = []) => ({
    url: `/populate/bulk-create/${model}`,
    payload: { data: dataArray },
  }),
  BULK_UPDATE: (model, updates = []) => ({
    url: `/populate/bulk-update/${model}`,
    payload: { updates },
  }),
  BULK_DELETE: (model, ids = []) => ({
    url: `/populate/bulk-delete/${model}`,
    payload: { ids },
  }),
  REPORT: (model, options = {}) => ({
    url: `/populate/report/${model}`,
    payload: buildPopulatePayload(options),
  }),
};

export default PopulateApi;
