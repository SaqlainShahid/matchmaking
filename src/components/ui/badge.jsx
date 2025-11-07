import React from 'react';

export const Badge = ({ variant = 'default', className = '', children, ...props }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1 ${
      variant === 'outline'
        ? 'bg-white text-gray-700 border border-gray-300'
        : 'bg-[var(--secondary-blue)] text-[var(--text-dark)]'
    } ${className}`}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
