import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Bell, Check, Info, ShieldAlert } from 'lucide-react';

type Tone = 'ok' | 'warn' | 'info' | 'reminder';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(tone: Tone, text: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const ICON: Record<Tone, ReactNode> = {
  ok: <Check size={17} />,
  warn: <ShieldAlert size={17} />,
  reminder: <Bell size={17} />,
  info: <Info size={17} />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, text: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
            <span className="t-ico">{ICON[t.tone]}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
