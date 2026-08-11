import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileText, Image, Video, FileSpreadsheet, File as LucideFile, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import axiosInstance from '@api/axiosInstance';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const splitCSVRow = (row) => {
  const result = [];
  let insideQuote = false;
  let entry = '';
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === ',' && !insideQuote) {
      result.push(entry.trim());
      entry = '';
    } else {
      entry += char;
    }
  }
  result.push(entry.trim());
  return result;
};

const getFileIcon = (mimetype) => {
  if (mimetype?.startsWith('image/')) return <Image size={24} className="text-emerald-500" />;
  if (mimetype?.startsWith('video/')) return <Video size={24} className="text-rose-500" />;
  if (mimetype === 'application/pdf') return <FileText size={24} className="text-red-500" />;
  if (mimetype?.includes('sheet') || mimetype?.includes('excel') || mimetype === 'text/csv') return <FileSpreadsheet size={24} className="text-teal-500" />;
  return <LucideFile size={24} className="text-blue-500" />;
};

const FileViewerModal = ({ file, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // Parsed contents
  const [textContent, setTextContent] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [excelData, setExcelData] = useState([]);

  // Extract meta
  const isLocal = file instanceof File || file instanceof Blob;
  const name = isLocal ? file.name : (file?.originalName || 'file');
  const size = isLocal ? file.size : (file?.size || 0);
  const mimetype = isLocal ? file.type : (file?.mimetype || '');
  const extension = name.split('.').pop().toLowerCase();

  useEffect(() => {
    let active = true;
    let url = null;

    const parseSheetData = (wb, sheetName) => {
      try {
        const worksheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData(data);
      } catch (err) {
        console.error('Error parsing worksheet:', err);
      }
    };

    const parseContent = async (blob) => {
      try {
        if (extension === 'xlsx' || mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const buffer = await blob.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          if (!active) return;
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setCurrentSheetIdx(0);
          if (wb.SheetNames.length > 0) {
            parseSheetData(wb, wb.SheetNames[0]);
          }
        } else if (extension === 'csv' || mimetype === 'text/csv') {
          const text = await blob.text();
          if (!active) return;
          const rows = text.split(/\r?\n/).map(row => splitCSVRow(row)).filter(row => row.length > 0 && !(row.length === 1 && row[0] === ''));
          setCsvData(rows);
        } else if (extension === 'txt' || mimetype.startsWith('text/')) {
          const text = await blob.text();
          if (!active) return;
          setTextContent(text);
        }
      } catch (err) {
        console.error('Error parsing file preview contents:', err);
      }
    };

    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isLocal) {
          setFileBlob(file);
          url = URL.createObjectURL(file);
          setObjectUrl(url);
          await parseContent(file);
        } else if (file?.path) {
          const baseUrl = axiosInstance.defaults.baseURL.replace('/api', '');
          const fileUrl = `${baseUrl}/api/files/${file.path}`;

          const response = await axiosInstance.get(fileUrl, {
            responseType: 'blob'
          });

          if (!active) return;

          setFileBlob(response.data);
          url = URL.createObjectURL(response.data);
          setObjectUrl(url);
          await parseContent(response.data);
        } else {
          throw new Error('Unsupported or missing file source');
        }
      } catch (err) {
        console.error('Failed to download file preview:', err);
        if (active) {
          setError('Failed to fetch file content. You may not have access permission or the file was deleted.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadFile();

    // Escape listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  const handleSheetChange = (idx) => {
    if (!workbook) return;
    setCurrentSheetIdx(idx);
    const sheetName = workbook.SheetNames[idx];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    setExcelData(data);
  };

  const downloadFile = () => {
    if (!fileBlob) return;
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
          <Loader2 className="animate-spin text-[var(--module-ticket)]" size={36} />
          <p className="text-[13px] text-[var(--tracker-ink-subtle)] font-medium">Downloading file contents securely...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--tracker-danger-light)] flex items-center justify-center text-[var(--tracker-danger)]">
            <X size={32} />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-[var(--tracker-ink)]">Unable to Preview</h4>
            <p className="text-[13px] text-[var(--tracker-ink-subtle)] max-w-md mt-1">{error}</p>
          </div>
          {fileBlob && (
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--module-ticket)] text-white hover:bg-[var(--module-ticket-dark)] font-semibold text-[13.5px] transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              Download File
            </button>
          )}
        </div>
      );
    }

    const isImage = mimetype?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension);
    const isVideo = mimetype?.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(extension);
    const isPdf = mimetype === 'application/pdf' || extension === 'pdf';
    const isTxt = mimetype.startsWith('text/') && extension !== 'csv';
    const isCsv = mimetype === 'text/csv' || extension === 'csv';
    const isXlsx = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || extension === 'xlsx';

    if (isImage && objectUrl) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 bg-[var(--tracker-canvas-muted)] overflow-auto">
          <img src={objectUrl} alt={name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md bg-[var(--tracker-surface)]" />
        </div>
      );
    }

    if (isVideo && objectUrl) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-auto">
          <video src={objectUrl} controls className="max-w-full max-h-[70vh] rounded-lg shadow-md" />
        </div>
      );
    }

    if (isPdf && objectUrl) {
      return (
        <div className="flex-1 p-2 bg-[var(--tracker-canvas-muted)] flex flex-col">
          <iframe src={objectUrl} className="w-full h-full border-0 rounded-lg bg-white shadow-inner" title={name} />
        </div>
      );
    }

    if (isCsv && csvData.length > 0) {
      return (
        <div className="flex-1 p-4 bg-[var(--tracker-canvas-muted)] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto border border-[var(--tracker-border)] rounded-xl bg-[var(--tracker-surface)] shadow-inner">
            <table className="min-w-full divide-y divide-[var(--tracker-border)] text-left text-[12.5px]">
              <thead className="bg-[var(--tracker-surface-1)] sticky top-0 font-semibold text-[var(--tracker-ink-muted)]">
                <tr>
                  {csvData[0]?.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-[var(--tracker-border)] font-bold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tracker-border-soft)] text-[var(--tracker-ink)]">
                {csvData.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[var(--tracker-surface-1)] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (isXlsx && excelData.length > 0) {
      return (
        <div className="flex-1 p-4 bg-[var(--tracker-canvas-muted)] overflow-hidden flex flex-col">
          {sheetNames.length > 1 && (
            <div className="flex border-b border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] overflow-x-auto select-none shrink-0 mb-3 px-2 rounded-t-lg">
              {sheetNames.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(idx)}
                  className={`px-4 py-2 text-[12.5px] font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${currentSheetIdx === idx
                    ? 'border-[var(--module-ticket)] text-[var(--module-ticket)] bg-[var(--tracker-surface)]'
                    : 'border-transparent text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)]'
                    }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-auto border border-[var(--tracker-border)] rounded-xl bg-[var(--tracker-surface)] shadow-inner">
            <table className="min-w-full divide-y divide-[var(--tracker-border)] text-left text-[12.5px]">
              <thead className="bg-[var(--tracker-surface-1)] sticky top-0 font-semibold text-[var(--tracker-ink-muted)]">
                <tr>
                  {excelData[0]?.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-[var(--tracker-border)] font-bold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tracker-border-soft)] text-[var(--tracker-ink)]">
                {excelData.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[var(--tracker-surface-1)] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">{cell || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (isTxt && textContent) {
      return (
        <div className="flex-1 p-4 bg-[var(--tracker-canvas-muted)] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-4 bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-xl font-mono text-[13px] text-[var(--tracker-ink)] whitespace-pre-wrap leading-relaxed text-left shadow-inner">
            {textContent}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--tracker-canvas-muted)] overflow-auto">
        <div className="flex flex-col items-center justify-center p-10 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl gap-4 max-w-sm shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-[var(--tracker-surface-1)] flex items-center justify-center text-[var(--tracker-ink-subtle)]">
            {getFileIcon(mimetype)}
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[var(--tracker-ink)] truncate max-w-[250px]">{name}</h4>
            <p className="text-[12px] text-[var(--tracker-ink-subtle)] mt-1">{formatBytes(size)} • No viewer matches this format</p>
          </div>
          {fileBlob && (
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--module-ticket)] text-white hover:bg-[var(--module-ticket-dark)] font-semibold text-[13px] transition-all shadow-md active:scale-95 cursor-pointer mt-2"
            >
              <Download size={15} />
              Download File
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />
      {/* Content Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-5xl h-[80vh] bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--tracker-border)] bg-[var(--tracker-surface)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">{getFileIcon(mimetype)}</div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-[var(--tracker-ink)] truncate max-w-[300px] sm:max-w-[450px]" title={name}>
                {name}
              </h3>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] font-medium">
                {formatBytes(size)} • {mimetype || 'Unknown format'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fileBlob && (
              <button
                onClick={downloadFile}
                title="Download file"
                className="p-2 rounded-xl text-[var(--tracker-ink-muted)] hover:text-[var(--module-ticket)] hover:bg-[var(--tracker-surface-1)] transition-colors cursor-pointer"
              >
                <Download size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close preview"
              className="p-2 rounded-xl text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        {renderContent()}
      </motion.div>
    </div>
  );
};

export default FileViewerModal;
