import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'success' | 'error' | 'info' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Alert({ children, variant = 'info', dismissible = false, onDismiss }: AlertProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${styles[variant]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
      <div className="flex-1">{children}</div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
