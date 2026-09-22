import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDeleteModal({ title, message, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-4 py-3 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-xs text-white">{title || 'Xác nhận xóa tài liệu'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-red-200 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs text-zinc-700">
          <p className="font-medium leading-relaxed">
            {message || 'Bạn có chắc chắn muốn xóa tài liệu này khỏi kho không? Hành động này không thể hoàn tác.'}
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xác nhận Xóa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
