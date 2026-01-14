import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createId } from "../../utils/id";
import "./toasts.css";

const ToastsContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * Toast provider for lightweight notifications.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ type = "info", title, message, durationMs = 2600 }) => {
      const id = createId();
      const toast = { id, type, title, message };
      setToasts((t) => [toast, ...t].slice(0, 4));
      window.setTimeout(() => removeToast(id), durationMs);
      return id;
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toasts, pushToast, removeToast }), [toasts, pushToast, removeToast]);

  return (
    <ToastsContext.Provider value={value}>
      {children}
      <div className="toastViewport" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status" aria-live="polite">
            <div className="toastTitleRow">
              <div className="toastTitle">{t.title || "Notification"}</div>
              <button className="toastClose" onClick={() => removeToast(t.id)} aria-label="Dismiss notification">
                ×
              </button>
            </div>
            {t.message ? <div className="toastMessage">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastsContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * Hook to access toast actions.
 */
export function useToasts() {
  const ctx = useContext(ToastsContext);
  if (!ctx) throw new Error("useToasts must be used within ToastProvider");
  return ctx;
}
