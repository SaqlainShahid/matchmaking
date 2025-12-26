import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export function Modal({ open, onClose, title, icon, children, footer, containerClassName, contentClassName }) {
  if (typeof document === 'undefined') return null;
  if (!open) return null;

  const containerCls = containerClassName || 'relative z-10 w-full max-w-md mx-4';
  const contentCls = contentClassName || 'px-6 py-5 text-gray-700';

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      <motion.div
        className={containerCls}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {(title || icon) && (
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                {icon && <span className="inline-flex items-center">{icon}</span>}
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                )}
              </div>
            </div>
          )}
          <div className={contentCls}>
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;