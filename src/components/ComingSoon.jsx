import React from 'react';

const ComingSoon = ({ title = 'Coming Soon', description = 'We’re building this feature. Stay tuned!', onNotify, onLearnMore }) => {
  return (
    <div className="card relative overflow-hidden">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm">Beta</span>
        </div>
      </div>
      <div className="card-content">
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={onNotify}>
            Notify me
          </button>
          <button className="btn-secondary" onClick={onLearnMore}>
            Learn more
          </button>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <div className="gradient-primary w-64 h-64 rounded-full blur-3xl absolute -top-10 -right-10"></div>
      </div>
    </div>
  );
};

export default ComingSoon;