import React from 'react';
import { tokens } from '@styles/tokens';

export const BaseStatusBadge = ({ status, className = '' }) => {
  const normalizedStatus = String(status || '').toLowerCase().replace(/\s+/g, '_');
  
  let category = 'backlogs';
  if (['backlogs', 'pending', 'draft', 'open'].includes(normalizedStatus)) category = 'backlogs';
  else if (['assigned', 'processing'].includes(normalizedStatus)) category = 'assigned';
  else if (['in_progress', 'working', 'doing'].includes(normalizedStatus)) category = 'in_progress';
  else if (['review', 'ready_for_review', 'testing'].includes(normalizedStatus)) category = 'review';
  else if (['done', 'completed', 'resolved', 'paid', 'approved'].includes(normalizedStatus)) category = 'done';
  else if (['failed', 'rejected', 'cancelled'].includes(normalizedStatus)) category = 'failed';

  const styleObj = (tokens && tokens.statusColors && tokens.statusColors[category]) || { bg: '#f1f5f9', text: '#475569' };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{
        backgroundColor: styleObj.bg,
        color: styleObj.text
      }}
    >
      {status || 'Unknown'}
    </span>
  );
};

export default BaseStatusBadge;
