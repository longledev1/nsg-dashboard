import React, { useState } from 'react';
import { X, FolderOutput, Check } from 'lucide-react';
import { sortSubFoldersWithGeneralFirst, sortCategoriesWithGeneralFirst } from '../../services/documentService';

export default function MoveDocumentsModal({
  selectedCount,
  categories,
  subFolders,
  onConfirmMove,
  onClose
}) {
  const sortedCategories = sortCategoriesWithGeneralFirst(categories);
  const [selectedCategory, setSelectedCategory] = useState(sortedCategories[0]?.id || '');
  const [selectedSubFolder, setSelectedSubFolder] = useState('');

  const availableSubFolders = sortSubFoldersWithGeneralFirst(
    subFolders.filter(sf => sf.categoryId === selectedCategory)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const targetSubId = selectedCategory === 'cat-general' ? null : (selectedSubFolder || null);
    onConfirmMove(selectedCategory, targetSubId);
    onClose();
  };

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
              <h3 className="font-semibold text-sm text-white">
                {selectedCount > 1 ? 'Di chuyển Hàng loạt File' : 'Di chuyển File'}
              </h3>
              <p className="text-[11px] text-zinc-300">
                Đang di chuyển {selectedCount} file được chọn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Chọn Danh mục Đích (*):</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubFolder('');
              }}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#d0aa61] text-zinc-900"
            >
              {sortedCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Chọn Folder Dự án Đích:</label>
            <select
              value={selectedSubFolder}
              onChange={(e) => setSelectedSubFolder(e.target.value)}
              disabled={availableSubFolders.length === 0}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#d0aa61] text-zinc-900 disabled:opacity-50"
            >
              <option value="">
                {availableSubFolders.length === 0 
                  ? '(Không có - Lưu trực tiếp vào Danh mục chính)' 
                  : '-- Chọn Folder Đích (Không bắt buộc) --'}
              </option>
              {availableSubFolders.map(sf => (
                <option key={sf.id} value={sf.id}>{sf.name}</option>
              ))}
            </select>
          </div>

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
              className="px-5 py-2 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận Di chuyển File</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
