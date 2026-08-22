import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'default', duration = 3000) => {
    setToast({ message, type, duration, key: Date.now() });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
