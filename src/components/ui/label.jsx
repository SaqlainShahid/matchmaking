import React from 'react';

export const Label = ({ className = '', children, ...props }) => (
  <label className={`text-sm font-medium text-gray-700 ${className}`} {...props}>
    {children}
  </label>
);

export default Label;