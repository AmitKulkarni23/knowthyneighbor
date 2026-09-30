'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';

type Toast = { key: number; message: string; severity: AlertColor };

type ToastContextValue = {
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// App-wide toasts for failures that have no inline spot on the page
// (background loads, sign-out, realtime drops). Newer toasts replace older ones.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((message: string, severity: AlertColor) => {
    setToast({ key: Date.now(), message, severity });
    setOpen(true);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showError: (message) => show(message, 'error'),
    showWarning: (message) => show(message, 'warning'),
    showSuccess: (message) => show(message, 'success'),
  }), [show]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? 'info'}
          variant="filled"
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.15rem',
            boxShadow: 'var(--shadow-card-lift)',
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
