import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import { 
  Plus, 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const OrderAcknowledgments = () => {
  const [oas, setOas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuOaId, setActiveMenuOaId] = useState(null);

  const fetchOAs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post('/populate/read/orderacknowledgments', {
        limit: 100,
        sort: { createdAt: -1 },
        populate: [
          { path: 'clientId', select: 'name email' }
        ]
      });
      setOas(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch Order Acknowledgments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (oa) => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-gen' });
      const response = await axiosInstance.get(`/export/oa/${oa._id}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `OA_${oa.oaNumber}.pdf`;
      link.click();
      toast.success('PDF Downloaded!', { id: 'pdf-gen' });
    } catch (err) {
      toast.error('Failed to download PDF', { id: 'pdf-gen' });
    }
  };

  const handleUpdateStatus = async (oaId, nextStatus) => {
    try {
      toast.loading('Updating status...', { id: 'status-update' });
      const res = await axiosInstance.post(`/populate/update/orderacknowledgments/${oaId}`, {
        status: nextStatus
      });
      if (res.data.success) {
        toast.success(`OA status updated to ${nextStatus}`, { id: 'status-update' });
        fetchOAs();
      } else {
        toast.error('Failed to update status', { id: 'status-update' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status', { id: 'status-update' });
    } finally {
      setActiveMenuOaId(null);
    }
  };

  useEffect(() => {
    fetchOAs();
  }, []);

  const getStatusChip = (status) => {
    const styles = {
      Approved: 'bg-tracker-success-light text-tracker-success border-tracker-success/20',
      Draft: 'bg-tracker-warning-light text-tracker-warning border-tracker-warning/20',
      Sent: 'bg-tracker-info-light text-tracker-info border-tracker-info/20',
      Cancelled: 'bg-tracker-danger-light text-tracker-danger border-tracker-danger/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-module="project">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-tracker-xl border border-hairline shadow-card">
        <div>
          <div className="lmx-page-eyebrow mb-1">CRM Workflow</div>
          <h1 className="text-2xl font-bold text-ink">Order Acknowledgments</h1>
          <p className="text-sm text-ink-muted">Manage committed contracts and frozen pricing.</p>
        </div>
        <button className="tracker-btn-brand flex items-center gap-2 w-fit">
          <Plus size={18} />
          <span>New Acknowledgment</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: '₹' + oas.reduce((acc, o) => acc + (o.committedPrice || 0), 0).toLocaleString(), icon: FileText, color: 'text-blue-600' },
          { label: 'Approved', value: oas.filter(o => o.status === 'Approved').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pending', value: oas.filter(o => o.status === 'Draft' || o.status === 'Sent').length, icon: Clock, color: 'text-amber-600' },
          { label: 'Drafts', value: oas.filter(o => o.status === 'Draft').length, icon: AlertCircle, color: 'text-gray-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface p-4 rounded-tracker-lg border border-hairline shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-tracker-md bg-canvas ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-ink">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="bg-surface rounded-tracker-xl border border-hairline shadow-card overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
            <input 
              type="text" 
              placeholder="Search OA number, client..." 
              className="lmx-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="tracker-btn-secondary flex items-center gap-2">
            <Filter size={16} />
            <span>Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-1 border-b border-hairline">
                <th className="px-6 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider">OA Number</th>
                <th className="px-6 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider">Committed Price</th>
                <th className="px-6 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : oas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-ink-muted">No Order Acknowledgments found.</td>
                </tr>
              ) : (
                oas.map(oa => (
                  <tr key={oa._id} className="hover:bg-surface-1/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-brand">{oa.oaNumber}</td>
                    <td className="px-6 py-4 text-sm font-medium text-ink">{oa.clientId?.name || oa.clientName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-ink">₹{oa.committedPrice?.toLocaleString()}</td>
                    <td className="px-6 py-4">{getStatusChip(oa.status)}</td>
                    <td className="px-6 py-4 text-xs text-ink-muted">{dayjs(oa.createdAt).format('DD MMM YYYY')}</td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDownloadPDF(oa)}
                          className="p-1.5 hover:bg-canvas rounded-tracker-sm text-ink-subtle hover:text-brand" 
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => setActiveMenuOaId(activeMenuOaId === oa._id ? null : oa._id)}
                          className="p-1.5 hover:bg-canvas rounded-tracker-sm text-ink-subtle hover:text-ink"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuOaId === oa._id && (
                          <div className="absolute right-6 mt-8 w-40 bg-surface border border-hairline rounded-tracker-md shadow-overlay z-20 py-1 text-left">
                            {oa.status !== 'Approved' && (
                              <button 
                                onClick={() => handleUpdateStatus(oa._id, 'Approved')}
                                className="w-full px-4 py-2 hover:bg-canvas text-xs font-semibold text-tracker-success flex items-center gap-2 cursor-pointer"
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                            )}
                            {oa.status !== 'Sent' && oa.status !== 'Approved' && (
                              <button 
                                onClick={() => handleUpdateStatus(oa._id, 'Sent')}
                                className="w-full px-4 py-2 hover:bg-canvas text-xs font-semibold text-tracker-info flex items-center gap-2 cursor-pointer"
                              >
                                <Clock size={14} /> Mark as Sent
                              </button>
                            )}
                            {oa.status !== 'Cancelled' && oa.status !== 'Approved' && (
                              <button 
                                onClick={() => handleUpdateStatus(oa._id, 'Cancelled')}
                                className="w-full px-4 py-2 hover:bg-canvas text-xs font-semibold text-tracker-danger flex items-center gap-2 cursor-pointer"
                              >
                                <AlertCircle size={14} /> Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderAcknowledgments;
