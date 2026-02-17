import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#0F1629] border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-500/10 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0F1629] border-b border-cyan-500/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cyan-400">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors text-gray-400 hover:text-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
