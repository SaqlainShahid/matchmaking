import React from 'react';

export const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold rounded-md px-4 py-2 transition-colors';
  const styles = variant === 'outline'
    ? 'og-btn-outline'
    : 'og-btn-primary';
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
