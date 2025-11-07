import React from 'react';

export const ScrollArea = ({ className = '', style = {}, children }) => (
  <div className={`overflow-auto ${className}`} style={style}>
    {children}
  </div>
);

export const ScrollBar = ({ orientation = 'vertical' }) => (
  <div aria-hidden className={orientation === 'horizontal' ? 'h-2 w-full' : 'w-2 h-full'} />
);

export default ScrollArea;