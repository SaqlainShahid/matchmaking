import { useCallback } from 'react';

export function useToast() {
  const toast = useCallback(({ title, description, variant }) => {
    const header = title ? String(title) : '';
    const body = description ? String(description) : '';
    const prefix = variant === 'destructive' ? '[Error] ' : '';
    const message = [prefix + header, body].filter(Boolean).join('\n');
    // Non-blocking: log to console and rely on any UI popups/toast components present.
    // ...existing code...
  }, []);

  return { toast };
}

export default useToast;