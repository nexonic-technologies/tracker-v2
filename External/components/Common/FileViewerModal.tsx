'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Image as ImageIcon, Video, FileSpreadsheet, File as LucideFile, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const splitCSVRow = (row: string) => {
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

const getFileIcon = (mimetype: string) => {
  if (mimetype?.startsWith('image/')) return <ImageIcon size={24} className="text-emerald-500" />;
  if (mimetype?.startsWith('video/')) return <Video size={24} className="text-rose-500" />;
  if (mimetype === 'application/pdf') return <FileText size={24} className="text-red-500" />;
  if (mimetype?.includes('sheet') || mimetype?.includes('excel') || mimetype === 'text/csv') return <FileSpreadsheet size={24} className="text-teal-500" />;
  return <LucideFile size={24} className="text-blue-500" />;
};

export default function FileViewerModal({ file, onClose }: { file: any, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Parsed contents
  const [textContent, setTextContent] = useState('');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [excelData, setExcelData] = useState<any[]>([]);

  // Extract meta
  const isLocal = file instanceof File || file instanceof Blob;
  const isFile = file instanceof File;
  const name = isFile ? file.name : (file?.originalName || file?.filename || 'file');
  const size = isLocal ? file.size : (file?.size || 0);
  const mimetype = isLocal ? file.type : (file?.mimetype || '');
  const extension = name.split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    const parseSheetData = (wb: any, sheetName: string) => {
      try {
        const worksheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData(data as any[]);
      } catch (err) {
        console.error('Error parsing worksheet:', err);
      }
    };

    const parseContent = async (blob: Blob) => {
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
        } else if (file?.path || file?.filename) {
          // If the path is not provided, we construct the likely backend path for a document
          // If path is provided, we map it to the external API route
          const backendPath = file.path || `uploads/documents/${file.filename}`;
          // Make sure we remove 'uploads/' prefix because proxy maps directly
          const cleanPath = backendPath.replace(/^uploads\//, '');
          const fileUrl = `/api/files/serve/${cleanPath}`;

          const token = localStorage.getItem('agentToken') || '';

          const response = await fetch(fileUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!active) return;

          if (!response.ok) throw new Error('Failed to fetch file');

          const blob = await response.blob();
          setFileBlob(blob);
          url = URL.createObjectURL(blob);
          setObjectUrl(url);
          await parseContent(blob);
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

    const handleKeyDown = (e: KeyboardEvent) => {
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

  const handleSheetChange = (idx: number) => {
    if (!workbook) return;
    setCurrentSheetIdx(idx);
    const sheetName = workbook.SheetNames[idx];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    setExcelData(data as any[]);
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
          <Loader2 className="animate-spin text-[var(--lmx-accent)]" size={36} />
          <p className="text-[13px] text-ink-subtle font-medium">Downloading file contents securely...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500">
            <X size={32} />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-ink">Unable to Preview</h4>
            <p className="text-[13px] text-ink-subtle max-w-md mt-1">{error}</p>
          </div>
          {fileBlob && (
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--lmx-accent)] text-white font-semibold text-[13.5px] transition-all shadow-md hover:opacity-90"
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
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto">
          <img src={objectUrl} alt={name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md bg-white" />
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
        <div className="flex-1 p-2 bg-gray-50 flex flex-col">
          <iframe src={objectUrl} className="w-full h-full border-0 rounded-lg bg-white shadow-inner" title={name} />
        </div>
      );
    }

    if (isCsv && csvData.length > 0) {
      return (
        <div className="flex-1 p-4 bg-gray-50 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white shadow-inner">
            <table className="min-w-full divide-y divide-gray-200 text-left text-[12.5px]">
              <thead className="bg-gray-50 sticky top-0 font-semibold text-gray-500">
                <tr>
                  {csvData[0]?.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-gray-200 font-bold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {csvData.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
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
        <div className="flex-1 p-4 bg-gray-50 overflow-hidden flex flex-col">
          {sheetNames.length > 1 && (
            <div className="flex border-b border-gray-200 bg-white overflow-x-auto select-none shrink-0 mb-3 px-2 rounded-t-lg">
              {sheetNames.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(idx)}
                  className={`px-4 py-2 text-[12.5px] font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    currentSheetIdx === idx
                      ? 'border-[var(--lmx-accent)] text-[var(--lmx-accent)] bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white shadow-inner">
            <table className="min-w-full divide-y divide-gray-200 text-left text-[12.5px]">
              <thead className="bg-gray-50 sticky top-0 font-semibold text-gray-500">
                <tr>
                  {excelData[0]?.map((col: any, idx: number) => (
                    <th key={idx} className="px-4 py-3 border-b border-gray-200 font-bold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {excelData.slice(1).map((row: any, rowIdx: number) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell: any, cellIdx: number) => (
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
        <div className="flex-1 p-4 bg-gray-50 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-4 bg-white border border-gray-200 rounded-xl font-mono text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed text-left shadow-inner">
            {textContent}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 overflow-auto">
        <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-2xl gap-4 max-w-sm shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
            {getFileIcon(mimetype)}
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-gray-800 truncate max-w-[250px]">{name}</h4>
            <p className="text-[12px] text-gray-500 mt-1">{formatBytes(size)} • No viewer matches this format</p>
          </div>
          {fileBlob && (
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--lmx-accent)] text-white font-semibold text-[13px] transition-all shadow-md hover:opacity-90 mt-2"
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-5xl h-[80vh] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">{getFileIcon(mimetype)}</div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-gray-800 truncate max-w-[300px] sm:max-w-[450px]" title={name}>
                {name}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {formatBytes(size)} • {mimetype || 'Unknown format'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fileBlob && (
              <button
                onClick={downloadFile}
                title="Download file"
                className="p-2 rounded-xl text-gray-500 hover:text-[var(--lmx-accent)] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Download size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close preview"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {renderContent()}
      </motion.div>
    </div>
  );
}
