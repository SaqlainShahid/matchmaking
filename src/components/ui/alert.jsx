import React from 'react';

export const Alert = ({ className = '', children }) => (
  <div className={`rounded-lg border p-4 bg-white ${className}`}>
    {children}
  </div>
);

export const AlertTitle = ({ className = '', children }) => (
  <div className={`font-medium text-gray-900 mb-1 ${className}`}>{children}</div>
);

export const AlertDescription = ({ className = '', children }) => (
  <div className={`text-sm text-gray-600 ${className}`}>{children}</div>
);

export default Alert;