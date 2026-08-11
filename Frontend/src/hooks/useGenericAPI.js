import { useState, useCallback } from 'react';
import axiosInstance from '@api/axiosInstance';
import toast from 'react-hot-toast';

export const useGenericAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequest = useCallback(async (requestFn, successMessage, errorMessage) => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestFn();

      if (response.data.success) {
        if (successMessage) {
          toast.success(successMessage);
        }
        return response.data;
      } else {
        throw new Error(response.data.message || 'Operation failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.traceId || err.message || errorMessage || 'Operation failed';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const read = useCallback((model, options = {}) => {
    const {
      filter,
      fields,
      populateFields,
      id,
      page = 1,
      limit = 10,
      sort,
      type,
      stages
    } = options;

    let url = `/populate/read/${model}`;
    if (id) url += `/${id}`;

    const payload = {};
    if (!id) {
      payload.page = page;
      payload.limit = limit;
    }
    if (filter) payload.filter = filter;
    if (fields) payload.fields = Array.isArray(fields) ? fields.join(',') : fields;
    if (populateFields) payload.populateFields = populateFields;
    if (sort) payload.sort = sort;
    if (type) payload.type = type;
    if (stages) payload.stages = stages;

    return handleRequest(
      () => axiosInstance.post(url, payload),
      null,
      `Failed to fetch ${model}`
    );
  }, [handleRequest]);

  const readSummary = useCallback((model, options = {}) => {
    return read(model, { ...options, type: 1 });
  }, [read]);

  const readDetailed = useCallback((model, options = {}) => {
    return read(model, { ...options, type: 2 });
  }, [read]);

  const readStatistics = useCallback((model, options = {}) => {
    return read(model, { ...options, type: 3 });
  }, [read]);

  const readPaginated = useCallback((model, page = 1, limit = 10, options = {}) => {
    return read(model, { ...options, page, limit, type: 1 });
  }, [read]);

  const readAggregate = useCallback((model, stages, options = {}) => {
    return read(model, { ...options, stages });
  }, [read]);

  const create = useCallback((model, data, successMessage, options = {}) => {
    const { isFormData = false } = options;

    return handleRequest(
      () => {
        const config = isFormData ? {
          headers: { 'Content-Type': 'multipart/form-data' }
        } : {};
        return axiosInstance.post(`/populate/create/${model}`, data, config);
      },
      successMessage,
      `Failed to create ${model}`
    );
  }, [handleRequest]);

  const update = useCallback((model, id, data, successMessage, options = {}) => {
    const { isFormData = false } = options;

    return handleRequest(
      () => {
        const config = isFormData ? {
          headers: { 'Content-Type': 'multipart/form-data' }
        } : {};
        return axiosInstance.put(`/populate/update/${model}/${id}`, data, config);
      },
      successMessage,
      `Failed to update ${model}`
    );
  }, [handleRequest]);

  const remove = useCallback((model, id, successMessage) => {
    return handleRequest(
      () => axiosInstance.delete(`/populate/delete/${model}/${id}`),
      successMessage,
      `Failed to delete ${model}`
    );
  }, [handleRequest]);

  const bulkCreate = useCallback((model, dataArray, successMessage) => {
    return handleRequest(
      () => axiosInstance.post(`/populate/bulk-create/${model}`, { data: dataArray }),
      successMessage,
      `Failed to bulk create ${model}`
    );
  }, [handleRequest]);

  const bulkUpdate = useCallback((model, updates, successMessage) => {
    return handleRequest(
      () => axiosInstance.put(`/populate/bulk-update/${model}`, { updates }),
      successMessage,
      `Failed to bulk update ${model}`
    );
  }, [handleRequest]);

  const bulkDelete = useCallback((model, ids, successMessage) => {
    return handleRequest(
      () => axiosInstance.delete(`/populate/bulk-delete/${model}`, { data: { ids } }),
      successMessage,
      `Failed to bulk delete ${model}`
    );
  }, [handleRequest]);

  return {
    loading,
    error,
    create,
    read,
    update,
    remove,
    readSummary,
    readDetailed,
    readStatistics,
    readPaginated,
    readAggregate,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
    clearError: () => setError(null)
  };
};

export default useGenericAPI;
