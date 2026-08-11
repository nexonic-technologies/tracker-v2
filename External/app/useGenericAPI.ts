'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useGenericAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body: any = null,
    successMessage?: string,
    errorMessage?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('agentToken');
      const headers: Record<string, string> = {
        'x-source': 'external'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        if (body instanceof FormData) {
          options.body = body;
        } else {
          headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(body);
        }
      }

      // Prepend NEXT_PUBLIC_BACKEND_URL (http://localhost:3000) for API requests
      const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      let targetUrl = url;
      if (!url.startsWith('http')) {
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        const pathWithApi = cleanPath.startsWith('/api/') ? cleanPath : `/api${cleanPath}`;
        targetUrl = `${backendBaseUrl}${pathWithApi}`;
      }

      const response = await fetch(targetUrl, options);
      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        if (successMessage) {
          toast.success(successMessage);
        }
        return data;
      } else {
        throw new Error(data.message || data.error || errorMessage || 'Operation failed');
      }
    } catch (err: any) {
      const msg = err.message || errorMessage || 'Operation failed';
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const read = useCallback((model: string, options: any = {}) => {
    const { id, filter, page, limit, sort } = options;
    let url = `populate/read/${model}`;
    if (id) url += `/${id}`;
    
    // We send options as the body in POST to standard populate read route
    return request(url, 'POST', { filter, page, limit, sort });
  }, [request]);

  const create = useCallback((model: string, data: any, successMessage?: string) => {
    return request(`populate/create/${model}`, 'POST', data, successMessage);
  }, [request]);

  const update = useCallback((model: string, id: string, data: any, successMessage?: string) => {
    return request(`populate/update/${model}/${id}`, 'PUT', data, successMessage);
  }, [request]);

  const remove = useCallback((model: string, id: string, successMessage?: string) => {
    return request(`populate/delete/${model}/${id}`, 'DELETE', null, successMessage);
  }, [request]);

  return {
    loading,
    error,
    request,
    read,
    create,
    update,
    remove,
    clearError: () => setError(null)
  };
};

export default useGenericAPI;
