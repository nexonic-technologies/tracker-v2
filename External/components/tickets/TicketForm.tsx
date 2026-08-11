'use client';

import { useState, useRef, useEffect } from 'react';
import FileViewerModal from '../Common/FileViewerModal';

export default function TicketForm({ ticket, onSuccess, onCancel }: any) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [viewerFile, setViewerFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clientProducts, setClientProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    product: ticket?.product || '',
    priority: ticket?.priority || 'Medium',
    type: ticket?.type || 'Bug',
    dueDate: ticket?.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '',
    attachments: [] as any[]
  });

  useEffect(() => {
    const clientId = localStorage.getItem('clientId');
    const token = localStorage.getItem('agentToken');
    if (!clientId) return;

    setLoadingProducts(true);
    fetch(`/api/clients/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.proposedProducts)) {
          const products = data.proposedProducts.map((p: any) => p.name || p);
          setClientProducts(products);
        }
      })
      .catch(err => {
        console.error('Error fetching client products:', err);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const file = new File([blob], `pasted-image-${timestamp}.png`, { type: blob.type });
            addFiles([file]);
            setShowAttachmentModal(false);
            return;
          }
        }
      }
      alert('No image found in clipboard');
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('Failed to paste from clipboard. Please try browsing files instead.');
    }
  };

  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    setShowAttachmentModal(false);
    e.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['image/', 'audio/mp3', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
      const isValidType = validTypes.some(type => file.type.startsWith(type));
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return isValidType && isValidSize;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let item of Array.from(items)) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      const agentId = localStorage.getItem('agentId') || 'temp-agent-id';
      const clientId = localStorage.getItem('clientId') || '';

      formDataToSend.append('agentId', agentId);
      formDataToSend.append('createdBy', agentId);
      formDataToSend.append('clientId', clientId);

      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, (formData as any)[key]);
      });

      attachments.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const url = ticket ? `/api/tickets/${ticket._id}` : '/api/tickets';
      const method = ticket ? 'PUT' : 'POST';

      const response = await fetch(url, { method, body: formDataToSend });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lmx-section-card">
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 mb-5" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-ink">{ticket ? 'Edit Ticket' : 'Create New Ticket'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="form-title" className="lmx-label">Title</label>
          <input
            id="form-title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="lmx-input"
            placeholder="Brief summary of the issue"
          />
        </div>

        <div>
          <label htmlFor="form-description" className="lmx-label">Description</label>
          <textarea
            id="form-description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            onPaste={handlePaste}
            required
            rows={4}
            className="lmx-textarea"
            placeholder="Describe the issue or request. You can paste images directly here."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="form-product" className="lmx-label">Product</label>
            {loadingProducts ? (
              <div className="lmx-input opacity-60">Loading products…</div>
            ) : clientProducts.length > 0 ? (
              <select
                id="form-product"
                name="product"
                value={formData.product}
                onChange={handleInputChange}
                disabled={!!ticket}
                className={`lmx-select ${ticket ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
              >
                <option value="">Select a product</option>
                {clientProducts.map((product, index) => (
                  <option key={index} value={product}>{product}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="product"
                value={formData.product}
                onChange={handleInputChange}
                disabled={!!ticket}
                placeholder="Enter product name"
                className={`lmx-input ${ticket ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
              />
            )}
          </div>

          <div>
            <label htmlFor="form-priority" className="lmx-label">Priority</label>
            <select
              id="form-priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              disabled={!!ticket}
              className={`lmx-select ${ticket ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="form-type" className="lmx-label">Type</label>
            <select
              id="form-type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              disabled={!!ticket}
              className={`lmx-select ${ticket ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
            >
              <option value="Bug">Bug</option>
              <option value="Feature">Feature</option>
              <option value="Enhancement">Enhancement</option>
              <option value="Support">Support</option>
            </select>
          </div>

          <div>
            <label htmlFor="form-duedate" className="lmx-label">Due Date</label>
            <input
              id="form-duedate"
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              disabled={!!ticket}
              className={`lmx-input ${ticket ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
            />
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="lmx-label">Attachments</label>
          <button
            type="button"
            onClick={() => setShowAttachmentModal(true)}
            className="w-full py-3 px-4 rounded-lg text-ink-muted text-[14px] transition-colors"
            style={{
              border: '2px dashed var(--lmx-border)',
              background: 'var(--lmx-surface-1)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--lmx-accent-mid)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--lmx-border)')}
          >
            + Add Attachment
          </button>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--lmx-surface-1)' }}>
                  <button 
                    type="button"
                    onClick={() => setViewerFile(file)}
                    className="text-[13px] text-ink truncate text-left hover:underline cursor-pointer flex-1"
                  >
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-[12px] shrink-0 ml-2"
                    style={{ color: 'var(--lmx-error)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--lmx-border)' }}>
          <button type="submit" disabled={loading} className="lmx-btn-accent">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {ticket ? 'Updating…' : 'Creating…'}
              </span>
            ) : (ticket ? 'Update Ticket' : 'Create Ticket')}
          </button>
          <button type="button" onClick={onCancel} className="lmx-btn-secondary">
            Cancel
          </button>
        </div>
      </form>

      {/* Attachment Modal */}
      {showAttachmentModal && (
        <div className="lmx-overlay" onClick={(e) => e.target === e.currentTarget && setShowAttachmentModal(false)}>
          <div className="lmx-modal max-w-sm">
            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border)' }}>
              <h3 className="text-[18px] font-semibold text-ink">Add Attachment</h3>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--lmx-ink-muted)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleClipboardPaste}
                className="w-full py-3 px-4 rounded-lg text-[14px] transition-colors"
                style={{
                  background: 'var(--lmx-accent-light)',
                  border: '2px dashed var(--lmx-accent-mid)',
                  color: 'var(--lmx-accent)',
                }}
              >
                📋 Paste from Clipboard
              </button>

              <div className="text-center text-ink-subtle text-[12px] py-1">or</div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleModalFileSelect}
                  multiple
                  accept="image/*,audio/mp3,video/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-lg text-[14px] transition-colors"
                  style={{
                    background: 'var(--lmx-surface-1)',
                    border: '2px dashed var(--lmx-border)',
                    color: 'var(--lmx-ink-muted)',
                  }}
                >
                  📁 Browse Files
                </button>
              </div>
            </div>

            <p className="text-[11px] text-ink-subtle mt-4">
              Supported: Images, MP3, Videos, PDF, Word documents (Max 10MB each)
            </p>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewerFile && (
        <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </div>
  );
}