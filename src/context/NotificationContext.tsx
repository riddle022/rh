import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from '../components/ui/Toast.tsx';
import { ConfirmDialog, ConfirmOptions } from '../components/ui/ConfirmDialog.tsx';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface NotificationContextType {
    showToast: (message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmDialog({ ...options, resolve });
        });
    }, []);

    const handleConfirmClose = (value: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    />
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    {...confirmDialog}
                    onConfirm={() => handleConfirmClose(true)}
                    onCancel={() => handleConfirmClose(false)}
                />
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
