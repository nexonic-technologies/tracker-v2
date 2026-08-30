import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';

/**
 * DeliveryStageBadge — Shows and allows editing of task delivery stage.
 * Fetches delivery stage config from status_configs for color/label rendering.
 * 
 * @param {string} stage - Current delivery stage key (e.g., "Development", "QAT")
 * @param {function} onChange - Called with new stage key when user selects one
 * @param {boolean} editable - Whether the badge is clickable to change stage
 */

const STAGE_FALLBACK_COLORS = {
  Development: '#3B82F6',
  QAT: '#8B5CF6',
  Review: '#F59E0B',
  Deployment: '#EF4444',
  Delivery: '#10B981',
  Meeting: '#F59E0B',
  Training: '#EC4899',
  Support: '#EF4444',
  Research: '#6366F1'
};

export default function DeliveryStageBadge({ stage, onChange, editable = false }) {
  const [stages, setStages] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await axiosInstance.post('/populate/read/status_configs', {
          filter: { modelName: 'tasks_delivery_stage' },
          limit: 1
        });
        const config = res.data?.data?.[0];
        if (config?.workflowStatuses) {
          setStages(config.workflowStatuses);
        }
      } catch (err) {
        console.error('[DeliveryStageBadge] Error fetching stages:', err);
      }
    };
    fetchStages();
  }, []);

  if (!stage) {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => editable && setShowDropdown(!showDropdown)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-400 bg-gray-100 border border-slate-200 ${editable ? 'cursor-pointer hover:bg-gray-200 hover:text-gray-600 transition-colors' : 'cursor-default'}`}
        >
          No stage {editable && <span className="text-gray-400 text-[10px]">▾</span>}
        </button>
        {showDropdown && editable && (
          <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl min-w-[180px] overflow-hidden">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50">Pipeline</div>
            {stages.filter(s => s.isSequential !== false).sort((a, b) => a.order - b.order).map(s => (
              <button
                key={s.key}
                onClick={() => { onChange?.(s.key); setShowDropdown(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
            {stages.some(s => s.isSequential === false) && (
              <>
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50 border-t">Independent</div>
                {stages.filter(s => s.isSequential === false).sort((a, b) => a.order - b.order).map(s => (
                  <button
                    key={s.key}
                    onClick={() => { onChange?.(s.key); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: s.color }} />
                    {s.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const stageConfig = stages.find(s => s.key === stage);
  const color = stageConfig?.color || STAGE_FALLBACK_COLORS[stage] || '#6B7280';
  const label = stageConfig?.label || stage;
  const isSequential = stageConfig?.isSequential !== false;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => editable && setShowDropdown(!showDropdown)}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white transition-all
          ${editable ? 'cursor-pointer hover:opacity-90 hover:shadow-sm' : 'cursor-default'}
        `}
        style={{ backgroundColor: color }}
        title={isSequential ? `Sequential stage: ${label}` : `Independent stage: ${label}`}
      >
        {!isSequential && <span className="opacity-75">○</span>}
        {label}
      </button>

      {/* Stage Selector Dropdown */}
      {showDropdown && editable && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-xl min-w-[180px] overflow-hidden">
          {/* Sequential stages */}
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50">Pipeline</div>
          {stages.filter(s => s.isSequential !== false).sort((a, b) => a.order - b.order).map(s => (
            <button
              key={s.key}
              onClick={() => { onChange?.(s.key); setShowDropdown(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2 ${stage === s.key ? 'bg-blue-50 font-medium' : ''}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          ))}
          {/* Independent stages */}
          {stages.some(s => s.isSequential === false) && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50 border-t">Independent</div>
              {stages.filter(s => s.isSequential === false).sort((a, b) => a.order - b.order).map(s => (
                <button
                  key={s.key}
                  onClick={() => { onChange?.(s.key); setShowDropdown(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2 ${stage === s.key ? 'bg-blue-50 font-medium' : ''}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
