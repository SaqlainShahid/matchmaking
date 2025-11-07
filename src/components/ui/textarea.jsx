import React from 'react';

export const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`border rounded-md p-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

export default Textarea;