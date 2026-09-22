import React, { useState } from 'react';
import { X, Edit2, Check } from 'lucide-react';

export default function EditDocumentModal({
  document,
  categories,
  subFolders,
  onSave,
  onClose
}) {
  const [title, setTitle] = useState(document?.title || '');
  const [description, setDescription] = useState(document?.description || '');
  const [selectedCategory, setSelectedCategory] = useState(document?.categoryId || categories[0]?.id || '');
  const [selectedSubFolder, setSelectedSubFolder] = useState(document?.subFolderId || '');
  const [tagsInput, setTagsInput] = useState(document?.tags ? document.tags.join(', ') : '');

  if (!document) return null;

  const availableSubFolders = subFolders.filter(sf => sf.categoryId === selectedCategory);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const updatedDoc = {
      ...document,
      title: title.trim(),
      description: description.trim(),
      categoryId: selectedCategory,
      subFolderId: selectedCategory === 'cat-general' ? null : (selectedSubFolder || null),
      tags: tagsArray,
    };

    onSave(updatedDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#504b44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d0aa61]/20 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <Edit2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Chỉnh sửa Thông tin Tài liệu</h3>
              <p className="text-[11px] text-zinc-300">Cập nhật tiêu đề, mô tả, danh mục và thẻ</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Title */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Tiêu đề Tài liệu (*):</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900"
              required
            />
          </div>

          {/* Category & Subfolder Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Danh mục Chính (*):</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubFolder('');
                }}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Folder Dự án:</label>
              <select
                value={selectedSubFolder}
                onChange={(e) => setSelectedSubFolder(e.target.value)}
                disabled={availableSubFolders.length === 0}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] disabled:opacity-50"
              >
                <option value="">
                  {availableSubFolders.length === 0 
                    ? '(Không có - Thuộc Danh mục chính)' 
                    : '-- Chọn Folder (Không bắt buộc) --'}
                </option>
                {availableSubFolders.map(sf => (
                  <option key={sf.id} value={sf.id}>{sf.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Mô tả ngắn gọn:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Gắn Thẻ (Tags):</label>
            <input
              type="text"
              placeholder="Nhập các thẻ cách nhau bằng dấu phẩy"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lưu chỉnh sửa</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
