import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastContextValue {
  toast: (tone: ToastTone, title: string, body?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, ring: 'border-red-200', iconColor: 'text-red-600' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200', iconColor: 'text-amber-600' },
  info: { icon: Info, ring: 'border-sky-200', iconColor: 'text-sky-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (tone: ToastTone, title: string, body?: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { id, tone, title, body }]);
      setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = TONE_STYLES[t.tone];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border ${style.ring} bg-white/95 p-3.5 shadow-lift backdrop-blur`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
