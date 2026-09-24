import React from 'react';
import DocumentCard from './DocumentCard';
import { 
  FileQuestion, 
  FolderOpen, 
  CheckSquare, 
  Square, 
  FolderOutput, 
  Trash2, 
  X,
  Folder,
  Plus,
  Lock,
  ChevronRight,
  Layers,
  ArrowRight,
  FileText,
  Edit2
} from 'lucide-react';
import { sortCategoriesWithGeneralFirst, sortSubFoldersWithGeneralFirst } from '../services/documentService';

export default function DocumentGrid({
  documents,
  categories,
  subFolders,
  activeCategory,
  activeSubFolder,
  onSelectCategory,
  onSelectSubFolder,
  onQuickAddSubFolder,
  onEditSubFolder,
  onMoveSubFolder,
  onDeleteSubFolder,
  searchQuery,
  selectedDocIds = [],
  onToggleSelectDoc,
  onSelectAllDocs,
  onClearDocSelection,
  onBulkMove,
  onBulkDelete,
  onViewPdf,
  onEditDocument,
  onMoveDocument,
  onDeleteDocument,
  onShareDocument,
  userRole
}) {
  const categoryMap = React.useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});
  }, [categories]);

  const subFolderMap = React.useMemo(() => {
    return subFolders.reduce((acc, sf) => {
      acc[sf.id] = sf.name;
      return acc;
    }, {});
  }, [subFolders]);

  const currentCategory = React.useMemo(() => {
    return categories.find((c) => c.id === activeCategory);
  }, [categories, activeCategory]);

  // Danh sách các sub-folder thuộc Category đang chọn
  const currentCategorySubFolders = React.useMemo(() => {
    if (!activeCategory) return [];
    return subFolders.filter((sf) => sf.categoryId === activeCategory);
  }, [subFolders, activeCategory]);

  // Kiểm tra các cấp độ hiển thị:
  // 1. Cấp gốc "Tất cả tài liệu" (chưa chọn category, chưa chọn subfolder, không tìm kiếm)
  const isAtRootAllDocs = Boolean(!activeCategory && !activeSubFolder && !searchQuery);

  // 2. Cấp Danh mục cha có folder con (ví dụ FNB, Estate khi có subfolders):
  const isAtCategoryLevel = Boolean(
    activeCategory && 
    activeCategory !== 'cat-general' && 
    currentCategorySubFolders.length > 0 && 
    !activeSubFolder && 
    !searchQuery
  );

  // 3. Hiển thị documents khi:
  // - Đang ở trong SubFolder
  // - Hoặc đang tìm kiếm
  // - Hoặc đang ở danh mục General ('cat-general')
  // - Hoặc danh mục hiện tại không có subfolder nào
  const shouldShowDocuments = Boolean(
    activeSubFolder || 
    searchQuery || 
    activeCategory === 'cat-general' || 
    (activeCategory && currentCategorySubFolders.length === 0)
  );

  const filteredDocuments = React.useMemo(() => {
    if (!shouldShowDocuments) return [];

    return documents.filter((doc) => {
      // Tìm kiếm từ khóa
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title && doc.title.toLowerCase().includes(q);
        const matchDesc = doc.description && doc.description.toLowerCase().includes(q);
        const matchTags = doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }

      // Lọc theo Category
      if (activeCategory && doc.categoryId !== activeCategory) {
        return false;
      }

      // Lọc theo SubFolder (nếu có chọn subfolder cụ thể)
      if (activeSubFolder && doc.subFolderId !== activeSubFolder) {
        return false;
      }

      return true;
    });
  }, [documents, searchQuery, activeCategory, activeSubFolder, shouldShowDocuments]);

  const isAllSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((d) => selectedDocIds.includes(d.id));

  // ========================================================
  // TRƯỜNG HỢP 1: CẤP GỐC "TẤT CẢ TÀI LIỆU"
  // KHÔNG đổ document ra màn hình, hiển thị các Danh mục chính để người dùng chọn
  // ========================================================
  if (isAtRootAllDocs) {
    return (
      <div className="space-y-4">
        {/* Header Tất cả danh mục */}
        <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#faf6ed] border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#504b44]">
                Kho tài liệu nội bộ Tập đoàn NSG
              </h2>
              <p className="text-[11px] text-zinc-400">
                Chọn một danh mục bên dưới để truy cập các thư mục dự án
              </p>
            </div>
          </div>

          <span className="text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
            {categories.length} Danh mục chính
          </span>
        </div>

        {/* Lưới các Danh mục chính (Categories Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
          {sortCategoriesWithGeneralFirst(categories).map((cat) => {
            const catSubFolders = subFolders.filter((sf) => sf.categoryId === cat.id);
            const catDocCount = documents.filter((d) => d.categoryId === cat.id).length;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                className="group bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 hover:border-[#d0aa61] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[155px] shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6ed] group-hover:bg-[#d0aa61] text-[#d0aa61] group-hover:text-[#504b44] flex items-center justify-center transition-all shadow-xs shrink-0">
                    <Folder className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 group-hover:bg-[#d0aa61]/25 text-zinc-600 group-hover:text-[#9f7a35] transition-colors shrink-0">
                    {catDocCount} tài liệu
                  </span>
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-zinc-900 group-hover:text-[#9f7a35] truncate transition-colors flex items-center gap-2">
                      {cat.name}
                      {cat.isDefault && (
                        <Lock className="w-4 h-4 text-zinc-400 shrink-0" title="Danh mục mặc định" />
                      )}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-[#d0aa61] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-1">
                    {cat.id === 'cat-general'
                      ? 'Danh mục chung tiếp nhận tài liệu'
                      : `Gồm ${catSubFolders.length} thư mục dự án bên trong`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Thông báo hướng dẫn nhẹ */}
        <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs text-zinc-500 flex items-center gap-2">
          <span className="text-[#9f7a35] font-bold">💡 Gợi ý:</span>
          <span>Chọn một Danh mục (FNB, Estate, General...) để mở các thư mục dự án tương ứng.</span>
        </div>
      </div>
    );
  }

  // ========================================================
  // TRƯỜNG HỢP 2: NGƯỜI DÙNG BẤM VÀO DANH MỤC CHA (FNB, Estate, Hồ Sơ Năng Lực...)
  // Hiển thị lưới các Folder dự án con VÀ danh sách tài liệu trực tiếp cấp danh mục cha
  // ========================================================
  if (isAtCategoryLevel) {
    const rootCategoryDocs = documents.filter(
      (d) =>
        d.categoryId === activeCategory &&
        (!d.subFolderId || !currentCategorySubFolders.some((sf) => sf.id === d.subFolderId)),
    );

    return (
      <div className="space-y-4">
        {/* Category Header with breadcrumb back */}
        <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#faf6ed] border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#504b44] flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(null)}
                  className="text-zinc-400 hover:text-[#9f7a35] hover:underline cursor-pointer"
                  title="Quay lại Tất cả danh mục"
                >
                  Tất cả danh mục
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                <span>{categoryMap[activeCategory] || 'Danh mục'}</span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Gồm {currentCategorySubFolders.length} thư mục con {rootCategoryDocs.length > 0 ? `và ${rootCategoryDocs.length} tài liệu trực tiếp` : ''}
              </p>
            </div>
          </div>

          <span className="text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
            {currentCategorySubFolders.length} Thư mục con
          </span>
        </div>

        {/* Floating Batch Actions Bar (Khi có tài liệu được chọn) */}
        {selectedDocIds.length > 0 && userRole === 'admin' && (
          <div className="bg-[#504b44] text-white p-3 sm:px-5 sm:py-3.5 rounded-xl border border-[#625d55] shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#d0aa61] text-[#504b44] font-bold flex items-center justify-center text-xs">
                {selectedDocIds.length}
              </span>
              <span className="text-xs font-semibold text-zinc-200">
                Đã chọn {selectedDocIds.length} tài liệu
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onBulkMove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Di chuyển file sang folder khác"
              >
                <FolderOutput className="w-3.5 h-3.5" />
                <span>Di chuyển file ({selectedDocIds.length})</span>
              </button>

              <button
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Xóa hàng loạt"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ({selectedDocIds.length})</span>
              </button>

              <button
                onClick={onClearDocSelection}
                className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors cursor-pointer"
                title="Bỏ chọn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Lưới các Thư mục Dự án con (Folder Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {currentCategorySubFolders.map((sf) => {
            const docCount = documents.filter(
              (d) => d.categoryId === sf.categoryId && d.subFolderId === sf.id
            ).length;

            const isProtected = Boolean(sf.isDefault || sf.isProtected);

            return (
              <div
                key={sf.id}
                onClick={() => onSelectSubFolder && onSelectSubFolder(sf.id)}
                className="group bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 hover:border-[#d0aa61] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[155px] shadow-xs active:scale-[0.99] relative"
              >
                {/* Top Row: Folder Icon + Doc Count + Admin Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6ed] group-hover:bg-[#d0aa61] text-[#d0aa61] group-hover:text-[#504b44] flex items-center justify-center transition-all shadow-xs shrink-0">
                    <FolderOpen className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-100 group-hover:bg-[#d0aa61]/25 text-zinc-600 group-hover:text-[#9f7a35] transition-colors">
                      {docCount} tài liệu
                    </span>

                    {/* Admin Actions Group on Card */}
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-0.5 bg-white/95 p-0.5 rounded-xl border border-zinc-200 shadow-xs">
                        {/* Nút ✏️ Sửa / Đổi tên folder */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSubFolder && onEditSubFolder(sf);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-[#9f7a35] hover:bg-[#faf6ed] transition-colors cursor-pointer"
                          title={`Đổi tên folder ${sf.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Nút 📤 Di chuyển folder */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveSubFolder && onMoveSubFolder(sf);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-[#9f7a35] hover:bg-[#faf6ed] transition-colors cursor-pointer"
                          title={`Di chuyển folder ${sf.name} sang danh mục cha khác`}
                        >
                          <FolderOutput className="w-3.5 h-3.5" />
                        </button>

                        {/* Nút 🗑️ Xóa folder */}
                        {!isProtected ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSubFolder && onDeleteSubFolder(sf);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title={`Xóa folder ${sf.name}`}
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
                </div>

                {/* Bottom Row: Name & Info */}
                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-zinc-900 group-hover:text-[#9f7a35] truncate transition-colors flex items-center gap-1.5">
                      {sf.name}
                      {isProtected && (
                        <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" title="Folder mặc định bảo vệ" />
                      )}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-[#d0aa61] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-1">
                    {sf.description || `Thư mục con của ${categoryMap[activeCategory] || 'NSG'}`}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Nút Tạo Folder Dự án mới cho Admin */}
          {userRole === 'admin' && (
            <div
              onClick={() => onQuickAddSubFolder && onQuickAddSubFolder(currentCategory)}
              className="bg-zinc-50/70 hover:bg-[#faf6ed]/60 p-5 sm:p-6 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-[#d0aa61] transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[155px] group shadow-2xs"
            >
              <div className="w-11 h-11 rounded-2xl bg-white border border-zinc-200 group-hover:border-[#d0aa61] flex items-center justify-center text-[#d0aa61] mb-2 shadow-xs transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-zinc-700 group-hover:text-[#9f7a35] transition-colors">
                + Thêm Thư mục mới
              </span>
              <span className="text-xs text-zinc-400 mt-0.5">
                Tạo folder con vào {currentCategory?.name || 'danh mục'}
              </span>
            </div>
          )}
        </div>

        {/* Phần hiển thị tài liệu trực tiếp nằm trong Danh mục cha */}
        {rootCategoryDocs.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#9f7a35]" />
                <h3 className="font-bold text-xs sm:text-sm text-[#504b44] uppercase tracking-wider">
                  Tài liệu trong danh mục {categoryMap[activeCategory] || ''} ({rootCategoryDocs.length})
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                {userRole === 'admin' && (
                  <button
                    onClick={() => {
                      const allRootIds = rootCategoryDocs.map((d) => d.id);
                      const isAllRootSelected = allRootIds.every((id) => selectedDocIds.includes(id));
                      if (isAllRootSelected) {
                        onSelectAllDocs(selectedDocIds.filter((id) => !allRootIds.includes(id)));
                      } else {
                        onSelectAllDocs(Array.from(new Set([...selectedDocIds, ...allRootIds])));
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer bg-white shadow-2xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#d0aa61]" />
                    <span>Chọn tất cả file trong mục này</span>
                  </button>
                )}
                <span className="text-[11px] text-zinc-400 italic">
                  (Tài liệu cấp danh mục cha - chưa phân vào folder con)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {rootCategoryDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  categoryName={categoryMap[doc.categoryId]}
                  subFolderName={subFolderMap[doc.subFolderId]}
                  isSelected={selectedDocIds.includes(doc.id)}
                  onToggleSelect={() => onToggleSelectDoc && onToggleSelectDoc(doc.id)}
                  onViewPdf={() => onViewPdf && onViewPdf(doc)}
                  onEditDocument={onEditDocument}
                  onMoveDocument={onMoveDocument}
                  onDeleteDocument={onDeleteDocument}
                  onShareDocument={onShareDocument}
                  userRole={userRole}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // TRƯỜNG HỢP 3: ĐANG Ở TRONG MỘT THƯ MỤC DỰ ÁN CON HOẶC ĐANG TÌM KIẾM
  // Hiển thị danh sách tài liệu cụ thể của thư mục đó
  // ========================================================
  return (
    <div className="space-y-4">
      {/* Grid Title & Breadcrumbs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-zinc-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#d0aa61]" />
          <h2 className="font-semibold text-sm text-[#504b44] flex items-center gap-1.5">
            {activeSubFolder ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectSubFolder && onSelectSubFolder(null)}
                  className="hover:underline text-zinc-500 hover:text-[#9f7a35] cursor-pointer"
                  title="Quay lại danh mục cha"
                >
                  {categoryMap[activeCategory] || 'Danh mục'}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-bold text-zinc-900">
                  {subFolderMap[activeSubFolder] || 'Thư mục dự án'}
                </span>
              </>
            ) : activeCategory ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(null)}
                  className="hover:underline text-zinc-500 hover:text-[#9f7a35] cursor-pointer"
                  title="Quay lại Tất cả danh mục"
                >
                  Tất cả danh mục
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-bold text-zinc-900">
                  {categoryMap[activeCategory] || 'Danh mục'}
                </span>
              </>
            ) : searchQuery ? (
              <span>Kết quả tìm kiếm: "{searchQuery}"</span>
            ) : (
              'Tất cả tài liệu nội bộ'
            )}
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Admin Select All Controls */}
          {userRole === 'admin' && filteredDocuments.length > 0 && (
            <button
              onClick={() =>
                isAllSelected
                  ? onClearDocSelection()
                  : onSelectAllDocs(filteredDocuments.map((d) => d.id))
              }
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#d0aa61]" />
              ) : (
                <Square className="w-4 h-4 text-zinc-400" />
              )}
              <span>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
            </button>
          )}

          <span className="text-xs text-zinc-500 font-medium bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            Hiển thị {filteredDocuments.length} tài liệu
          </span>
        </div>
      </div>

      {/* Floating Batch Actions Bar (When 1 or more documents are selected) */}
      {selectedDocIds.length > 0 && userRole === 'admin' && (
        <div className="bg-[#504b44] text-white p-3 sm:px-5 sm:py-3.5 rounded-xl border border-[#625d55] shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#d0aa61] text-[#504b44] font-bold flex items-center justify-center text-xs">
              {selectedDocIds.length}
            </span>
            <span className="text-xs font-semibold text-zinc-200">
              Đã chọn {selectedDocIds.length} tài liệu
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Move Button */}
            <button
              onClick={onBulkMove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <FolderOutput className="w-3.5 h-3.5" />
              <span>Di chuyển file đến...</span>
            </button>

            {/* Batch Delete Button */}
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa đã chọn</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={onClearDocSelection}
              className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-[#625d55] transition-colors"
              title="Bỏ chọn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid List */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              categoryName={categoryMap[doc.categoryId]}
              subFolderName={subFolderMap[doc.subFolderId]}
              isSelected={selectedDocIds.includes(doc.id)}
              onToggleSelect={onToggleSelectDoc}
              onViewPdf={onViewPdf}
              onEditDocument={onEditDocument}
              onMoveDocument={onMoveDocument}
              onDeleteDocument={onDeleteDocument}
              onShareDocument={onShareDocument}
              userRole={userRole}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-zinc-200/80 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#faf6ed] text-[#d0aa61] flex items-center justify-center border border-[#d0aa61]/30">
            <FileQuestion className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-zinc-800 text-sm">Chưa có tài liệu nào trong thư mục này</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            {searchQuery
              ? `Không tìm thấy tài liệu phù hợp với từ khóa "${searchQuery}". Vui lòng thử từ khóa khác.`
              : 'Hiện chưa có file tài liệu nào được upload vào thư mục này.'}
          </p>
        </div>
      )}
    </div>
  );
}
