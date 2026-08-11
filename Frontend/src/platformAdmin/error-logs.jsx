import React, { useState, useEffect } from 'react';
import { AlertOctagon, ShieldAlert, Bug, RefreshCw, Search, ChevronRight, Terminal } from 'lucide-react';
import axiosInstance from '@api/axiosInstance';

export default function ErrorLogsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/admin/metrics/error-logs', {
        params: { search, limit: 100 }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load system error logs:', err);
      setError(err.response?.data?.message || err.message || 'Failed to connect to Global Control Plane');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            System Error & Security Incident Monitor
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Global Control Plane error audit log monitoring 500 crashes, 403 policy rejections, and request Trace IDs for platform verification.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Total System Errors Logged</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">{data?.summary?.totalLogs ?? 0}</p>
            <p className="text-xs text-neutral-400 mt-1">Recorded in ErrorLog Collection</p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-xl">
            <Bug className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Security 403 Policy Rejections</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{data?.summary?.policyRejections403 ?? 0}</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Strict Mode Security Blocks</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">500 Unhandled Server Errors</p>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">{data?.summary?.serverErrors500 ?? 0}</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">Unhandled Pipeline Exceptions</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-xl">
            <AlertOctagon className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Filter by error message, route, or Request Trace ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-medium text-neutral-900 dark:text-white"
        />
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Recent System Error Traps</h2>
          <span className="text-xs text-neutral-500">Trace ID & Stack Verification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b dark:border-neutral-800">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Trace Request ID</th>
                <th className="px-6 py-3">HTTP Method / Route</th>
                <th className="px-6 py-3">Error Message</th>
                <th className="px-6 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading system error logs...</td></tr>
              ) : data?.logs?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No error logs recorded. System operating cleanly!</td></tr>
              ) : (
                data?.logs?.map((l) => {
                  return (
                    <tr key={l._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition cursor-pointer" onClick={() => setSelectedLog(l)}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500">
                        {new Date(l.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {l.requestId || '-'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-bold mr-2">{l.method || 'GET'}</span>
                        {l.route || '/'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-neutral-900 dark:text-white truncate max-w-md block">{l.message}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-neutral-400 inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  System Error Inspection Drawer
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">Trace ID: {selectedLog.requestId || 'N/A'}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-xs font-bold rounded-lg">
                Close
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 text-sm">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <span className="text-xs font-medium text-neutral-400 block">HTTP Target Route</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedLog.method} {selectedLog.route}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Error Message</span>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-rose-700 dark:text-rose-300 font-mono text-xs">
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.stack && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Full Server Stack Trace</span>
                  <pre className="p-4 bg-neutral-950 text-neutral-200 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
