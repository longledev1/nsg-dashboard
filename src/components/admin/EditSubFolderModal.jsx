import React, { useState } from 'react';
import { X, Edit2, Check } from 'lucide-react';

export default function EditSubFolderModal({ subFolder, onSave, onClose }) {
  const [name, setName] = useState(subFolder?.name || '');

  if (!subFolder) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(subFolder.id, name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-4 py-3 bg-[#504b44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-[#d0aa61]" />
            <h3 className="font-semibold text-xs text-white">Đổi tên Folder Dự án</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-300 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Tên Folder Mới (*):</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu thay đổi
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
