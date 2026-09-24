import React, { useState } from 'react';
import { X, FolderPlus, Plus, Lock, Trash2, Folder, Layers, Edit2, Check, FolderOutput } from 'lucide-react';
import { sortCategoriesWithGeneralFirst } from '../../services/documentService';

export default function CategoryManagerModal({
  categories,
  subFolders,
  onAddCategory,
  onDeleteCategory,
  onAddSubFolder,
  onEditSubFolder,
  onMoveSubFolder,
  onDeleteSubFolder,
  onClose
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCatForSub, setSelectedCatForSub] = useState(categories[0]?.id || '');
  const [newSubFolderName, setNewSubFolderName] = useState('');
  const [activeTab, setActiveTab] = useState('subfolders'); // 'categories' | 'subfolders'

  // State cho đổi tên nhanh subfolder trong modal
  const [editingSubFolderId, setEditingSubFolderId] = useState(null);
  const [editingSubFolderName, setEditingSubFolderName] = useState('');

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    onAddCategory({
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      isDefault: false,
      color: '#d0aa61',
    });

    setNewCategoryName('');
  };

  const handleCreateSubFolder = (e) => {
    e.preventDefault();
    if (!newSubFolderName.trim()) return;

    onAddSubFolder({
      id: `sub-${Date.now()}`,
      categoryId: selectedCatForSub,
      name: newSubFolderName.trim(),
      description: '',
    });

    setNewSubFolderName('');
  };

  const handleStartEditSubFolder = (sf) => {
    setEditingSubFolderId(sf.id);
    setEditingSubFolderName(sf.name);
  };

  const handleSaveSubFolderRename = (sfId) => {
    if (!editingSubFolderName.trim()) return;
    onEditSubFolder({ id: sfId, name: editingSubFolderName.trim() });
    setEditingSubFolderId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#504b44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d0aa61]/20 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Quản lý Cấu trúc Thư mục</h3>
              <p className="text-[11px] text-zinc-300">Tạo mới, đổi tên hoặc phân loại các danh mục & folder</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 pt-3">
          <button
            onClick={() => setActiveTab('subfolders')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'subfolders'
                ? 'border-[#d0aa61] text-[#9f7a35] bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Folder Dự án / Phân loại ({subFolders.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'border-[#d0aa61] text-[#9f7a35] bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Danh mục Chính (FNB, Estate, General...)
          </button>
        </div>

        {/* Tab Content 1: Sub-folders */}
        {activeTab === 'subfolders' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[65vh]">
            {/* Create Sub-folder Form */}
            <form onSubmit={handleCreateSubFolder} className="space-y-3 bg-[#faf6ed]/60 p-3.5 rounded-xl border border-[#d0aa61]/30">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Chọn Danh mục Cha (*):
                </label>
                <select
                  value={selectedCatForSub}
                  onChange={(e) => setSelectedCatForSub(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61]"
                >
                  {sortCategoriesWithGeneralFirst(categories).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isDefault ? '(Mặc định)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tên Folder con mới (VD: History, Bến Thuyền...)"
                  value={newSubFolderName}
                  onChange={(e) => setNewSubFolderName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61]"
                />
                <button
                  type="submit"
                  disabled={!newSubFolderName.trim()}
                  className="px-3 py-2 bg-[#d0aa61] hover:bg-[#b89149] disabled:opacity-50 text-[#504b44] font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Folder
                </button>
              </div>
            </form>

            {/* Existing Sub-folders List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Danh sách Folder Hiện có ({subFolders.length})
              </span>

              {subFolders.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  Chưa có folder con nào. Hãy tạo folder mới ở trên!
                </div>
              ) : (
                subFolders.map((sf) => {
                  const parentCat = categories.find(c => c.id === sf.categoryId);
                  const isEditing = editingSubFolderId === sf.id;

                  return (
                    <div
                      key={sf.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        <FolderPlus className="w-4 h-4 text-[#d0aa61] shrink-0" />
                        
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingSubFolderName}
                              onChange={(e) => setEditingSubFolderName(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs bg-white border border-[#d0aa61] rounded focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSubFolderRename(sf.id);
                                if (e.key === 'Escape') setEditingSubFolderId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSubFolderRename(sf.id)}
                              className="p-1 bg-[#d0aa61] text-[#504b44] rounded hover:bg-[#b89149] cursor-pointer"
                              title="Lưu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubFolderId(null)}
                              className="p-1 bg-zinc-200 text-zinc-600 rounded hover:bg-zinc-300 cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-zinc-900 block truncate">{sf.name}</span>
                            <span className="text-[10px] text-zinc-500">
                              Thuộc danh mục: <strong className="text-[#9f7a35]">{parentCat?.name || 'General'}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Nút Đổi tên */}
                          <button
                            type="button"
                            onClick={() => handleStartEditSubFolder(sf)}
                            className="p-1.5 text-zinc-400 hover:text-[#9f7a35] hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                            title={`Đổi tên folder ${sf.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Di chuyển Folder */}
                          <button
                            type="button"
                            onClick={() => onMoveSubFolder && onMoveSubFolder(sf)}
                            className="p-1.5 text-zinc-400 hover:text-[#9f7a35] hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                            title={`Di chuyển folder ${sf.name} sang danh mục cha khác`}
                          >
                            <FolderOutput className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa */}
                          {!sf.isDefault ? (
                            <button
                              type="button"
                              onClick={() => onDeleteSubFolder && onDeleteSubFolder(sf)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title={`Xóa folder ${sf.name} (Tài liệu sẽ chuyển về General)`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span 
                              className="p-1.5 text-zinc-300 cursor-not-allowed" 
                              title="Folder mặc định bảo vệ - Không thể xóa"
                            >
                              <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Categories */}
        {activeTab === 'categories' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[65vh]">
            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Tên danh mục mới (VD: Marketing, Nhân sự...)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61]"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-3 py-2 bg-[#d0aa61] hover:bg-[#b89149] disabled:opacity-50 text-[#504b44] font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm Danh mục
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Danh sách Danh mục Hiện có ({categories.length})
              </span>

              {sortCategoriesWithGeneralFirst(categories).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${cat.isDefault ? 'text-[#d0aa61]' : 'text-zinc-500'}`} />
                    <span className="font-medium text-zinc-900">{cat.name}</span>
                    {cat.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#faf6ed] text-[#9f7a35] border border-[#d0aa61]/30 flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3 text-[#d0aa61]" /> Mặc định
                      </span>
                    )}
                  </div>

                  {!cat.isDefault ? (
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>

    </div>
  );
}
