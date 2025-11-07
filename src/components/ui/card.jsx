import React from 'react';

export const Card = ({ className = '', children, ...props }) => (
  <div className={`og-card ${className}`} {...props}>{children}</div>
);

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`og-card-header ${className}`} {...props}>{children}</div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={`og-stat-title ${className}`} {...props}>{children}</h3>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={`og-card-content ${className}`} {...props}>{children}</div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={`og-card-content ${className}`} {...props}>{children}</div>
);

export default Card;
