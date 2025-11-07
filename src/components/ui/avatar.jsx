import React from 'react';

export const Avatar = ({ className = '', children }) => {
  return (
    <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export const AvatarImage = ({ src, alt = 'avatar', className = '' }) => {
  if (!src) return null;
  return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} />;
};

export const AvatarFallback = ({ children, className = '' }) => {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
};

export default Avatar;