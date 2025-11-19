import React, { createContext, useState, useCallback, useEffect } from "react";

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ message, type = "info", duration = 3500 }) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [toast.duration]);

  const bgColor = {
    success: "bg-emerald-50 border-emerald-300 text-emerald-800",
    error: "bg-red-50 border-red-300 text-red-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
  };

  const progressColor = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  const icon = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ⓘ",
  };

  return (
    <div
      className={`border-l-4 rounded-lg overflow-hidden shadow-lg animate-slide-in ${
        bgColor[toast.type] || bgColor.info
      }`}
      role="alert"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">{icon[toast.type]}</span>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-lg font-bold opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
        >
          ×
        </button>
      </div>
      {/* Progress Bar */}
      <div className="h-1 bg-opacity-20" style={{ backgroundColor: 'currentColor' }}>
        <div
          className={`h-full ${progressColor[toast.type] || progressColor.info} transition-all duration-100`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Hook to use toast
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
