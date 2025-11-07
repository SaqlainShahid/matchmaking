import React from 'react';

export const Progress = ({ value = 0, className = '' }) => {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div className={`w-full ${className}`} style={{ background: '#E8E8E8', borderRadius: 3, height: 6 }}>
      <div style={{ background: '#00B050', height: 6, borderRadius: 3, width: `${pct}%` }} />
    </div>
  );
};

export default Progress;