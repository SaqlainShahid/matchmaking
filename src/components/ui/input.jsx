import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input
    className={`border border-[var(--border-gray)] rounded-md p-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] ${className}`}
    {...props}
  />
);

export default Input;
