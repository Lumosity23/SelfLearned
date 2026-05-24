import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Sparkles, Bell } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'error';
  courseId?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode; onNavigateToCourse?: (courseId: string) => void }> = ({ 
  children,
  onNavigateToCourse
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 6000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Bell;
          let borderClass = 'border-dark-900';
          let iconClass = 'text-brand-400';
          
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            borderClass = 'border-emerald-500/30';
            iconClass = 'text-emerald-400';
          } else if (toast.type === 'error') {
            Icon = AlertTriangle;
            borderClass = 'border-rose-500/30';
            iconClass = 'text-rose-400';
          } else if (toast.type === 'info') {
            Icon = Sparkles;
            borderClass = 'border-blue-500/30';
            iconClass = 'text-blue-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-dark-900/80 backdrop-blur-md p-4 shadow-2xl transition-all duration-300 animate-slideIn ${borderClass} relative overflow-hidden`}
            >
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-brand-500/5 pointer-events-none" />
              
              <div className={`rounded-lg p-1.5 bg-dark-950 shrink-0 ${iconClass}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-white leading-tight">{toast.title}</h4>
                <p className="text-[11px] text-dark-300 leading-normal">{toast.description}</p>
                {toast.courseId && onNavigateToCourse && (
                  <button
                    onClick={() => {
                      onNavigateToCourse(toast.courseId!);
                      removeToast(toast.id);
                    }}
                    className="mt-2 text-[10px] font-bold text-brand-400 hover:text-white transition-colors flex items-center gap-1 font-mono tracking-wider uppercase bg-dark-950/60 hover:bg-dark-800 border border-dark-900 rounded px-2.5 py-1"
                  >
                    Étudier maintenant &rarr;
                  </button>
                )}
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-dark-500 hover:text-white p-0.5 rounded transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
