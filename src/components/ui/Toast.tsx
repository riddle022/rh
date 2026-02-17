import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
    const styles = {
        success: 'bg-green-500/10 border-green-500/50 text-green-400',
        error: 'bg-red-500/10 border-red-500/50 text-red-400',
        info: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400',
        warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
    };

    const Icons = {
        success: CheckCircle,
        error: XCircle,
        info: Info,
        warning: AlertCircle,
    };

    const Icon = Icons[type];

    return (
        <div className={`
      pointer-events-auto
      flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
      animate-in slide-in-from-right duration-300
      ${styles[type]}
    `}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-semibold pr-4">{message}</p>
            <button
                onClick={onClose}
                className="ml-auto p-1 hover:bg-black/10 rounded-lg transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
