import { useState, useEffect, useRef } from 'react';
import {
  X, Download, FileText, Image as ImageIcon, Video, FileSpreadsheet,
  File as LucideFile, Loader2, ZoomIn, ZoomOut, RotateCw, Maximize2,
  Minimize2, Copy, Check, Search, FileCode, Presentation, Music,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import axiosInstance from '@api/axiosInstance';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
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

const getFileMeta = (mimetype = '', extension = '') => {
  const ext = extension.toLowerCase();
  const mt = mimetype.toLowerCase();

  if (mt.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext)) {
    return { type: 'image', label: 'Image', icon: <ImageIcon size={18} className="text-pink-500" />, color: 'text-pink-500' };
  }
  if (mt.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) {
    return { type: 'video', label: 'Video', icon: <Video size={18} className="text-rose-500" />, color: 'text-rose-500' };
  }
  if (mt.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) {
    return { type: 'audio', label: 'Audio', icon: <Music size={18} className="text-purple-500" />, color: 'text-purple-500' };
  }
  if (mt === 'application/pdf' || ext === 'pdf') {
    return { type: 'pdf', label: 'PDF Document', icon: <FileText size={18} className="text-red-500" />, color: 'text-red-500' };
  }
  if (['xlsx', 'xls'].includes(ext) || mt.includes('spreadsheet') || mt.includes('excel')) {
    return { type: 'excel', label: 'Excel Spreadsheet', icon: <FileSpreadsheet size={18} className="text-emerald-500" />, color: 'text-emerald-500' };
  }
  if (ext === 'csv' || mt === 'text/csv' || ext === 'tsv') {
    return { type: 'csv', label: 'CSV Spreadsheet', icon: <FileSpreadsheet size={18} className="text-teal-500" />, color: 'text-teal-500' };
  }
  if (['docx', 'doc'].includes(ext) || mt.includes('word') || mt.includes('officedocument.wordprocessingml')) {
    return { type: 'word', label: 'Word Document', icon: <FileText size={18} className="text-blue-500" />, color: 'text-blue-500' };
  }
  if (['pptx', 'ppt'].includes(ext) || mt.includes('presentation') || mt.includes('officedocument.presentationml')) {
    return { type: 'ppt', label: 'PowerPoint Slide', icon: <Presentation size={18} className="text-orange-500" />, color: 'text-orange-500' };
  }
  if (['json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'sql', 'sh', 'xml', 'md', 'yaml', 'yml', 'env'].includes(ext)) {
    return { type: 'code', label: 'Source Code', icon: <FileCode size={18} className="text-amber-500" />, color: 'text-amber-500' };
  }
  if (mt.startsWith('text/') || ext === 'txt' || ext === 'log') {
    return { type: 'text', label: 'Text Document', icon: <FileText size={18} className="text-blue-400" />, color: 'text-blue-400' };
  }
  return { type: 'other', label: ext.toUpperCase() || 'File', icon: <LucideFile size={18} className="text-indigo-400" />, color: 'text-indigo-400' };
};

const FileViewerModal = ({ file, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [fileHttpUrl, setFileHttpUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Zoom & Pan for Images
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imgContainerRef = useRef(null);

  // Parsed Contents
  const [textContent, setTextContent] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [excelData, setExcelData] = useState([]);
  const [excelSearch, setExcelSearch] = useState('');

  // Extract metadata
  const isLocal = file instanceof File || file instanceof Blob;
  const name = isLocal ? file.name : (file?.originalName || file?.filename || 'file');
  const size = isLocal ? file.size : (file?.size || 0);
  const mimetype = isLocal ? file.type : (file?.mimetype || '');
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const fileMeta = getFileMeta(mimetype, extension);

  // Zoom helpers
  const handleZoomIn = () => setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 5));
  const handleZoomOut = () => setZoom(z => Math.max(Number((z - 0.25).toFixed(2)), 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  // Mouse wheel zoom on image
  const handleImageWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Image Drag/Pan handlers
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Load and parse file
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
        if (['xlsx', 'xls'].includes(extension) || mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
          const buffer = await blob.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          if (!active) return;
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setCurrentSheetIdx(0);
          if (wb.SheetNames.length > 0) {
            parseSheetData(wb, wb.SheetNames[0]);
          }
        } else if (['csv', 'tsv'].includes(extension) || mimetype === 'text/csv') {
          const text = await blob.text();
          if (!active) return;
          const rows = text
            .split(/\r?\n/)
            .map(row => splitCSVRow(row))
            .filter(row => row.length > 0 && !(row.length === 1 && row[0] === ''));
          setCsvData(rows);
        } else if (fileMeta.type === 'code' || fileMeta.type === 'text') {
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
        handleResetZoom();

        if (isLocal) {
          setFileBlob(file);
          url = URL.createObjectURL(file);
          setObjectUrl(url);
          await parseContent(file);
        } else if (file?.path || file?.url || file?.filePath) {
          const rawPath = file.path || file.url || file.filePath;
          let cleanPath = String(rawPath).trim();

          let fileEndpoint;
          if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            fileEndpoint = cleanPath;
            setFileHttpUrl(cleanPath);
          } else {
            cleanPath = cleanPath
              .replace(/^\/?api\/files\/?/, '')
              .replace(/^\/?files\/?/, '')
              .replace(/^\/?api\/?/, '')
              .replace(/^\/+/, '');

            if (!cleanPath.startsWith('serve/') && !cleanPath.startsWith('render/')) {
              cleanPath = `serve/${cleanPath}`;
            }

            fileEndpoint = `/files/${cleanPath}`;
            const fullBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
            setFileHttpUrl(`${fullBaseUrl}/api${fileEndpoint}`);
          }

          const response = await axiosInstance.get(fileEndpoint, {
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

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || (e.ctrlKey && e.key === '=')) { e.preventDefault(); handleZoomIn(); }
      if (e.key === '-' || (e.ctrlKey && e.key === '-')) { e.preventDefault(); handleZoomOut(); }
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleResetZoom(); }
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) { handleRotate(); }
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) { setIsFullscreen(fs => !fs); }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, onClose, extension, fileMeta.type, isLocal, mimetype]);

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

  const copyCode = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filter Excel data based on search term
  const filteredExcelData = excelData.filter(row => {
    if (!excelSearch.trim()) return true;
    return (row || []).some(cell => String(cell || '').toLowerCase().includes(excelSearch.toLowerCase()));
  });

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3 bg-[var(--tracker-surface)]">
          <Loader2 className="animate-spin text-[var(--module-ticket)]" size={40} />
          <p className="text-[13px] text-[var(--tracker-ink-muted)] font-semibold">Loading full resolution preview…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-4 bg-[var(--tracker-surface)]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <X size={32} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[var(--tracker-ink)]">Unable to Preview Document</h4>
            <p className="text-[13px] text-[var(--tracker-ink-muted)] max-w-md mt-1">{error}</p>
          </div>
          {fileBlob && (
            <button
              onClick={downloadFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--module-ticket)] text-white hover:opacity-90 font-semibold text-[13px] transition-all shadow-md cursor-pointer"
            >
              <Download size={15} />
              Download File
            </button>
          )}
        </div>
      );
    }

    // ── 1. IMAGE VIEWER WITH ZOOM & PAN ──────────────────────────────────────────
    if (fileMeta.type === 'image' && objectUrl) {
      return (
        <div
          ref={imgContainerRef}
          onWheel={handleImageWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 relative flex items-center justify-center overflow-hidden bg-[hsl(220,13%,10%)] select-none ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
            }`}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="flex items-center justify-center max-w-full max-h-full"
          >
            <img
              src={objectUrl}
              alt={name}
              draggable={false}
              className="max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-none"
            />
          </div>

          {/* Floating Image Control Bar */}
          <div className="absolute bottom-6 inset-x-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl text-white pointer-events-auto">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
                title="Zoom Out (-)"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <ZoomOut size={16} />
              </button>

              <button
                onClick={handleResetZoom}
                title="Reset Zoom (0)"
                className="px-2.5 py-1 rounded-xl hover:bg-white/10 text-[12px] font-bold text-white/90 min-w-[54px] text-center transition-all cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                title="Zoom In (+)"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <ZoomIn size={16} />
              </button>

              <div className="w-[1px] h-4 bg-white/20 mx-1" />

              <button
                onClick={handleRotate}
                title="Rotate 90° (R)"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <RotateCw size={16} />
              </button>

              <button
                onClick={handleResetZoom}
                title="Fit to Screen"
                className="px-2 py-1 rounded-xl hover:bg-white/10 text-[11px] font-semibold text-white/70 hover:text-white transition-all cursor-pointer"
              >
                Fit
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── 2. PDF VIEWER ────────────────────────────────────────────────────────────
    if (fileMeta.type === 'pdf' && objectUrl) {
      return (
        <div className="flex-1 w-full h-full bg-[hsl(220,13%,18%)] flex flex-col">
          <iframe
            src={`${objectUrl}#toolbar=1&navpanes=1&statusbar=1&view=FitH`}
            className="w-full flex-1 border-0 bg-white"
            title={name}
          />
        </div>
      );
    }

    // ── 3. EXCEL / SPREADSHEET VIEWER ────────────────────────────────────────────
    if ((fileMeta.type === 'excel' || fileMeta.type === 'csv') && (excelData.length > 0 || csvData.length > 0)) {
      const activeData = fileMeta.type === 'excel' ? filteredExcelData : csvData;
      const headers = (fileMeta.type === 'excel' ? excelData : csvData)[0] || [];

      return (
        <div className="flex-1 w-full h-full flex flex-col bg-[var(--tracker-surface)] overflow-hidden">
          {/* Sub-toolbar: Sheets & Search */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] gap-3">
            {/* Sheet Tabs */}
            {sheetNames.length > 1 ? (
              <div className="flex items-center gap-1 overflow-x-auto max-w-xl scrollbar-none">
                {sheetNames.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSheetChange(idx)}
                    className={`px-3 py-1 text-[12px] font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${currentSheetIdx === idx
                      ? 'bg-[var(--module-ticket)] text-white shadow-xs'
                      : 'text-[var(--tracker-ink-muted)] hover:bg-[var(--tracker-surface-2)]'
                      }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[12px] font-semibold text-[var(--tracker-ink-muted)]">
                {sheetNames[0] || 'Sheet 1'} • {activeData.length} rows
              </span>
            )}

            {/* In-Grid Search */}
            <div className="relative w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tracker-ink-subtle)]" />
              <input
                value={excelSearch}
                onChange={e => setExcelSearch(e.target.value)}
                placeholder="Search spreadsheet…"
                className="w-full pl-7 pr-3 py-1 text-[12px] rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] outline-none focus:border-[var(--module-ticket)]"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-auto bg-[var(--tracker-surface)]">
            <table className="min-w-full divide-y divide-[var(--tracker-border)] text-left text-[12.5px] border-collapse">
              <thead className="bg-[var(--tracker-surface-2)] sticky top-0 font-bold text-[var(--tracker-ink-muted)] z-10 shadow-xs">
                <tr>
                  <th className="px-3 py-2 text-center text-[10.5px] text-[var(--tracker-ink-subtle)] border-r border-[var(--tracker-border)] w-12 select-none">
                    #
                  </th>
                  {headers.map((col, idx) => (
                    <th key={idx} className="px-4 py-2 border-r border-[var(--tracker-border)] whitespace-nowrap">
                      {String(col ?? `Col ${idx + 1}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tracker-border-soft)] text-[var(--tracker-ink)]">
                {activeData.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[var(--tracker-surface-1)] transition-colors">
                    <td className="px-3 py-1.5 text-center text-[10.5px] text-[var(--tracker-ink-subtle)] bg-[var(--tracker-surface-1)] border-r border-[var(--tracker-border)] select-none font-mono">
                      {rowIdx + 1}
                    </td>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-4 py-1.5 border-r border-[var(--tracker-border-soft)] whitespace-nowrap truncate max-w-xs font-mono text-[12px]">
                        {String(row[colIdx] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── 4. CODE & TEXT VIEWER ──────────────────────────────────────────────────
    if ((fileMeta.type === 'code' || fileMeta.type === 'text') && textContent) {
      const lines = textContent.split('\n');
      return (
        <div className="flex-1 w-full h-full flex flex-col bg-[hsl(220,13%,10%)] text-[hsl(220,15%,85%)] overflow-hidden font-mono text-[12.5px]">
          <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220,13%,14%)] border-b border-white/10">
            <span className="text-[11px] text-white/60 font-semibold">{lines.length} lines • {formatBytes(size)}</span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all cursor-pointer"
            >
              {copiedText ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copiedText ? 'Copied' : 'Copy Content'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 flex">
            {/* Line Numbers */}
            <div className="select-none pr-4 text-right text-white/25 border-r border-white/10 font-mono text-[12px]">
              {lines.map((_, idx) => (
                <div key={idx} className="leading-6">{idx + 1}</div>
              ))}
            </div>
            {/* Content */}
            <pre className="pl-4 flex-1 leading-6 whitespace-pre font-mono text-[12.5px] overflow-x-auto text-[hsl(220,20%,90%)]">
              {textContent}
            </pre>
          </div>
        </div>
      );
    }

    // ── 5. VIDEO VIEWER ──────────────────────────────────────────────────────────
    if (fileMeta.type === 'video' && objectUrl) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-black overflow-auto">
          <video src={objectUrl} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />
        </div>
      );
    }

    // ── 6. AUDIO VIEWER ──────────────────────────────────────────────────────────
    if (fileMeta.type === 'audio' && objectUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[var(--tracker-surface)] gap-6">
          <div className="w-24 h-24 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-md">
            <Music size={48} />
          </div>
          <div className="text-center">
            <h4 className="text-[16px] font-bold text-[var(--tracker-ink)]">{name}</h4>
            <p className="text-[12px] text-[var(--tracker-ink-muted)] mt-1">{formatBytes(size)} • Audio Track</p>
          </div>
          <audio src={objectUrl} controls className="w-full max-w-md mt-2 shadow-md rounded-xl" />
        </div>
      );
    }

    // ── 7. WORD & POWERPOINT PRESENTATION OR OTHER DOCUMENTS ────────────────────
    if (fileMeta.type === 'word' || fileMeta.type === 'ppt' || fileMeta.type === 'other') {
      const officeViewerUrl = fileHttpUrl && (fileHttpUrl.startsWith('http://') || fileHttpUrl.startsWith('https://'))
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileHttpUrl)}`
        : null;

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[var(--tracker-surface)] text-center overflow-auto">
          {officeViewerUrl && !isLocal ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={officeViewerUrl}
                className="w-full flex-1 border-0 rounded-xl bg-white shadow-md"
                title={name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center p-10 bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-3xl max-w-md gap-4 shadow-xl">
              <div className="w-20 h-20 rounded-2xl bg-[var(--tracker-surface-2)] flex items-center justify-center shadow-inner">
                {fileMeta.icon}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--tracker-surface-2)] text-[10.5px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-2">
                  {fileMeta.label}
                </span>
                <h4 className="text-[15px] font-bold text-[var(--tracker-ink)] truncate max-w-xs" title={name}>
                  {name}
                </h4>
                <p className="text-[12px] text-[var(--tracker-ink-muted)] mt-1">{formatBytes(size)}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 w-full">
                {fileBlob && (
                  <button
                    onClick={downloadFile}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--module-ticket)] text-white hover:opacity-90 font-bold text-[13px] transition-all shadow-md cursor-pointer"
                  >
                    <Download size={15} />
                    Download
                  </button>
                )}
                {objectUrl && (
                  <a
                    href={objectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] font-semibold text-[13px] transition-all cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    Open Tab
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Darkened Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
      />

      {/* Full Window Modal Card */}
      <div
        className={`relative bg-[var(--tracker-surface)] border border-[var(--tracker-border)] shadow-2xl flex flex-col overflow-hidden z-10 transition-all duration-150 ${isFullscreen
          ? 'w-full h-full rounded-none'
          : 'w-[92vw] max-w-6xl h-[88vh] rounded-2xl'
          }`}
      >
        {/* Top Header Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--tracker-border)] bg-[var(--tracker-surface)] shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[var(--tracker-surface-2)] shrink-0">
              {fileMeta.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)] truncate max-w-sm sm:max-w-lg" title={name}>
                  {name}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] uppercase">
                  {extension || fileMeta.type}
                </span>
              </div>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] font-medium">
                {formatBytes(size)} {mimetype ? `• ${mimetype}` : ''}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            {fileBlob && (
              <button
                onClick={downloadFile}
                title="Download file"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tracker-surface-2)] hover:bg-[var(--module-ticket)] hover:text-white text-[12px] font-semibold text-[var(--tracker-ink)] transition-all cursor-pointer"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(fs => !fs)}
              title={isFullscreen ? 'Restore Window (F)' : 'Full Window (F)'}
              className="p-2 rounded-xl text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-2 rounded-xl text-[var(--tracker-ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Multi-format Content Body */}
        {renderContent()}
      </div>
    </div>
  );
};

export default FileViewerModal;
