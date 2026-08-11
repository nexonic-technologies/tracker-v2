import React, { useState, useEffect } from 'react';
import { Boxes, Plus, RefreshCw, Layers } from 'lucide-react';
import axiosInstance from '@api/axiosInstance';
import toast from 'react-hot-toast';

export default function ModelDefinitionsPage() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/models');
      setModels(res.data.models || []);
    } catch (err) {
      console.error('Failed to fetch model definitions:', err);
      toast.error('Failed to load dynamic model definitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            No-Code Dynamic Model Definitions & Populate Engine Schemas
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Global Control Plane registry defining canonical model keys, field types, ABAC policies, and populate relationships.
          </p>
        </div>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Model Schemas
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-neutral-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          Loading Canonical Model Definitions...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-500 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
              No custom dynamic model schemas defined. All models operating on standard canonical schemas!
            </div>
          ) : (
            models.map((m) => (
              <div key={m._id || m.modelName} className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 font-mono">
                    {m.modelName}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">Module: {m.module || 'core'}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{m.displayName || m.modelName}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">{m.description || 'No description'}</p>
                <div className="pt-2 border-t dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span>Fields: {m.fields ? Object.keys(m.fields).length : 0}</span>
                  <span className="font-mono text-indigo-600">Populate Engine v2</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
