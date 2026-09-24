import React, { useState } from 'react';
import { X, FolderOutput, Check, ArrowRight, Folder } from 'lucide-react';
import { sortCategoriesWithGeneralFirst } from '../../services/documentService';

export default function MoveSubFolderModal({
  subFolder,
  categories,
  onConfirmMove,
  onClose
}) {
  const currentCategory = categories.find(c => c.id === subFolder?.categoryId);
  // Default to the first category that is not current, or current if none
  const defaultTarget = categories.find(c => c.id !== subFolder?.categoryId)?.id || subFolder?.categoryId || '';
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultTarget);

  if (!subFolder) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategoryId || selectedCategoryId === subFolder.categoryId) {
      onClose();
      return;
    }
    onConfirmMove(subFolder.id, selectedCategoryId);
    onClose();
  };

  const targetCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#504b44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d0aa61]/20 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <FolderOutput className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Di chuyển Folder</h3>
              <p className="text-[11px] text-zinc-300">Thay đổi Danh mục Cha cho folder "{subFolder.name}"</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Current vs Target Preview */}
          <div className="bg-[#faf6ed] p-3.5 rounded-xl border border-[#d0aa61]/30 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Danh mục hiện tại:</span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-zinc-800 truncate">
                <Folder className="w-3.5 h-3.5 text-[#d0aa61] shrink-0" />
                <span className="truncate">{currentCategory?.name || 'General'}</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[#d0aa61] shrink-0" />

            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Danh mục đích:</span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-[#9f7a35] truncate">
                <Folder className="w-3.5 h-3.5 text-[#d0aa61] shrink-0" />
                <span className="truncate">{targetCategory?.name || 'Chưa chọn'}</span>
              </div>
            </div>
          </div>

          {/* Target Category Select */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1.5">
              Chọn Danh mục Cha mới (*):
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#d0aa61] text-zinc-900 font-medium cursor-pointer"
            >
              {sortCategoriesWithGeneralFirst(categories).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === subFolder.categoryId ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Info Note */}
          <p className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
            💡 <strong>Lưu ý:</strong> Khi di chuyển folder <strong>"{subFolder.name}"</strong>, toàn bộ các tài liệu đang nằm bên trong folder này cũng sẽ tự động chuyển sang danh mục mới.
          </p>

          {/* Buttons */}
          <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={selectedCategoryId === subFolder.categoryId}
              className="px-5 py-2 bg-[#d0aa61] hover:bg-[#b89149] disabled:opacity-50 text-[#504b44] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Xác nhận di chuyển
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
