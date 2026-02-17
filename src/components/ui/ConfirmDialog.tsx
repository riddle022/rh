import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
}

interface ConfirmDialogProps extends ConfirmOptions {
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog = ({
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'primary',
    onConfirm,
    onCancel
}: ConfirmDialogProps) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onCancel}
            />

            <div className="relative w-full max-w-md bg-[#0F1629] border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-500/20 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-100">{title}</h3>
                        </div>
                    </div>

                    <p className="text-gray-400 mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3 rounded-xl transition-all font-bold shadow-lg ${variant === 'danger'
                                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                                : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-cyan-500/20'
                                } text-white`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
