import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Lock,
  Layers,
  Upload,
  FileText,
  Trash2,
  FolderPlus,
  Edit2,
  Plus,
  HardDrive,
  FolderOutput,
  X,
} from "lucide-react";
import {
  sortCategoriesWithGeneralFirst,
  sortSubFoldersWithGeneralFirst,
} from "../services/documentService";

export default function SidebarNav({
  categories,
  subFolders,
  documents = [],
  activeCategory,
  activeSubFolder,
  onSelectCategory,
  onSelectSubFolder,
  onOpenUploadModal,
  onOpenCategoryModal,
  onQuickAddSubFolder,
  onQuickUploadToSubFolder,
  onEditSubFolder,
  onMoveSubFolder,
  onDeleteSubFolder,
  onEditCategory,
  onDeleteCategory,
  userRole,
  isOpenMobile,
  onCloseMobile,
}) {
  const [expandedCategories, setExpandedCategories] = useState({
    "cat-fnb": true,
    "cat-estate": true,
    "cat-general": true,
  });

  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSelectAllDocs = () => {
    onSelectCategory(null);
    if (onCloseMobile) onCloseMobile();
  };

  const handleCategoryClick = (catId) => {
    toggleCategory(catId);
    onSelectCategory(catId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSubFolderClick = (catId, subId) => {
    if (onSelectSubFolder) {
      onSelectSubFolder(subId, catId);
    } else {
      onSelectCategory(catId);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile & iPad Backdrop Overlay */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 ${
          isOpenMobile
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Drawer Container */}
      <aside
        className={`bg-white border-r border-zinc-200 flex flex-col select-none transition-transform duration-300 ease-in-out
          fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] h-full shadow-2xl lg:static lg:h-[calc(100vh-4rem)] lg:w-64 lg:sticky lg:top-16 lg:z-10 lg:shadow-none lg:translate-x-0
          ${isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile & iPad Drawer Header with Close Button */}
        <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between lg:hidden bg-[#504b44] text-white">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#d0aa61]" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">
              Danh mục tài liệu
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-[#3f3b35] transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Action Buttons for Admin */}
        {userRole === "admin" && (
          <div className="p-3 border-b border-zinc-100 flex flex-col gap-2 bg-[#faf6ed]/50">
            <button
              onClick={() => {
                onOpenUploadModal();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer active:scale-98"
            >
              <Upload className="w-4 h-4" />
              Upload File Mới
            </button>

            <button
              onClick={() => {
                onOpenCategoryModal();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg transition-colors cursor-pointer active:scale-98"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#d0aa61]" />
              Quản lý Danh mục &amp; Folder
            </button>
          </div>
        )}

        {/* Navigation Header for Desktop */}
        <div className="px-4 py-3 border-b border-zinc-100 hidden lg:flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#d0aa61]" />
            DANH MỤC TÀI LIỆU
          </span>
        </div>

        {/* Categories & Subfolders Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Option: View All */}
          <button
            onClick={handleSelectAllDocs}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeCategory === null && activeSubFolder === null
                ? "bg-[#d0aa61]/15 text-[#9f7a35] font-semibold"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#d0aa61]" />
              <span>Tất cả tài liệu</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeCategory === null && activeSubFolder === null
                  ? "bg-[#d0aa61]/25 text-[#9f7a35]"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {documents.length}
            </span>
          </button>

          <div className="my-2 border-t border-zinc-100"></div>

          {/* Dynamic Category List */}
          {sortCategoriesWithGeneralFirst(categories).map((category) => {
            const categorySubFolders = sortSubFoldersWithGeneralFirst(
              subFolders.filter((sf) => sf.categoryId === category.id),
            );
            const isExpanded = expandedCategories[category.id];
            const isCatActive =
              activeCategory === category.id && !activeSubFolder;

            // Đếm số tài liệu trong Danh mục này
            const categoryDocCount = (documents || []).filter(
              (d) => d.categoryId === category.id,
            ).length;

            return (
              <div key={category.id} className="space-y-0.5 group/cat">
                {/* Category Item (Smooth fixed height & layout - NO JITTER) */}
                <div
                  className={`flex items-center justify-between px-2.5 min-h-[36px] py-1 rounded-lg text-xs font-medium transition-colors ${
                    isCatActive
                      ? "bg-[#d0aa61]/15 text-[#9f7a35] font-semibold"
                      : "text-zinc-700 hover:bg-zinc-100/70"
                  }`}
                >
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    {categorySubFolders.length > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category.id);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-600 shrink-0 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}

                    <Folder
                      className={`w-4 h-4 shrink-0 ${category.isDefault ? "text-[#d0aa61]" : "text-amber-600"}`}
                    />

                    <span className="truncate">{category.name}</span>

                    {category.isDefault && (
                      <span
                        title="Danh mục mặc định bảo vệ"
                        className="ml-1 text-[10px] text-zinc-400 shrink-0"
                      >
                        <Lock className="w-3 h-3 inline text-zinc-400" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Badge số lượng tài liệu trong Category */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                        isCatActive
                          ? "bg-[#d0aa61]/30 text-[#9f7a35]"
                          : "bg-zinc-100 text-zinc-400 group-hover/cat:bg-zinc-200"
                      }`}
                      title={`${categoryDocCount} tài liệu trong danh mục`}
                    >
                      {categoryDocCount}
                    </span>

                    {/* Admin Action Buttons (Visible on iPad touch, smooth hover on desktop) */}
                    {userRole === "admin" && (
                      <div className="opacity-90 lg:opacity-0 lg:group-hover/cat:opacity-100 hover:!opacity-100 transition-opacity duration-150 flex items-center gap-0.5 ml-0.5">
                        {/* Nút + Tạo folder con mới */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAddSubFolder(category);
                            if (onCloseMobile) onCloseMobile();
                          }}
                          className="p-1.5 rounded-md hover:bg-[#d0aa61] text-[#9f7a35] hover:text-[#504b44] shrink-0 cursor-pointer active:scale-95"
                          title={`Tạo folder con mới cho danh mục ${category.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Nút ✏️ Đổi tên Danh mục cha (cho danh mục tùy chỉnh như History) */}
                        {!category.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCategory && onEditCategory(category);
                            }}
                            className="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 shrink-0 cursor-pointer active:scale-95"
                            title={`Đổi tên danh mục ${category.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Nút 🗑️ Xóa Danh mục cha (cho danh mục tùy chỉnh như History) */}
                        {!category.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory && onDeleteCategory(category);
                            }}
                            className="p-1.5 rounded-md hover:bg-red-100 text-zinc-400 hover:text-red-600 shrink-0 cursor-pointer active:scale-95"
                            title={`Xóa danh mục ${category.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-folders List (When Expanded) */}
                {isExpanded && categorySubFolders.length > 0 && (
                  <div className="ml-4 pl-2 border-l border-zinc-200 space-y-0.5 my-1">
                    {categorySubFolders.map((subFolder) => {
                      const isSubActive = activeSubFolder === subFolder.id;

                      // Đếm số lượng tài liệu có trong sub-folder này
                      const subFolderDocCount = (documents || []).filter(
                        (d) =>
                          d.categoryId === category.id &&
                          d.subFolderId === subFolder.id,
                      ).length;

                      return (
                        <div
                          key={subFolder.id}
                          className={`group/sub flex items-center justify-between px-2 min-h-[32px] py-1 rounded-md text-xs transition-all ${
                            isSubActive
                              ? "bg-[#d0aa61] text-[#504b44] font-bold shadow-xs"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleSubFolderClick(category.id, subFolder.id)
                            }
                            className="flex items-center gap-2 flex-1 min-w-0 text-left truncate cursor-pointer py-0.5"
                          >
                            <FolderOpen
                              className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? "text-[#504b44]" : "text-zinc-400"}`}
                            />
                            <span className="truncate">{subFolder.name}</span>
                          </button>

                          {/* Badge đếm số lượng tài liệu trong Sub-Folder */}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 transition-colors ${
                              isSubActive
                                ? "bg-white/35 text-[#504b44]"
                                : "bg-zinc-100 text-zinc-500 group-hover/sub:bg-zinc-200"
                            }`}
                            title={`${subFolderDocCount} tài liệu trong folder này`}
                          >
                            {subFolderDocCount}
                          </span>

                          {/* Admin Action Buttons for SubFolder (Visible on iPad touch, hover on desktop) */}
                          {userRole === "admin" && (
                            <div className="opacity-90 lg:opacity-0 lg:group-hover/sub:opacity-100 hover:!opacity-100 transition-opacity duration-150 flex items-center gap-0.5 shrink-0 ml-1">
                              {/* Nút + Upload File vào ngay SubFolder này */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickUploadToSubFolder(
                                    category.id,
                                    subFolder.id,
                                  );
                                  if (onCloseMobile) onCloseMobile();
                                }}
                                className={`p-1.5 rounded-md transition-colors active:scale-95 ${
                                  isSubActive
                                    ? "text-[#504b44] hover:bg-white/40"
                                    : "text-zinc-600 hover:text-[#504b44] hover:bg-zinc-200"
                                }`}
                                title={`Upload tài liệu trực tiếp vào folder ${subFolder.name}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              {/* Nút Edit đổi tên */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSubFolder(subFolder);
                                }}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                                  isSubActive
                                    ? "text-[#504b44] hover:bg-white/40"
                                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                }`}
                                title="Đổi tên folder"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Nút Di chuyển Folder sang Danh mục khác */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveSubFolder && onMoveSubFolder(subFolder);
                                }}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                                  isSubActive
                                    ? "text-[#504b44] hover:bg-white/40"
                                    : "text-zinc-500 hover:text-[#9f7a35] hover:bg-zinc-200"
                                }`}
                                title="Di chuyển folder sang danh mục cha khác"
                              >
                                <FolderOutput className="w-3 h-3" />
                              </button>

                              {/* Nút Delete xóa folder */}
                              {!subFolder.isDefault && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSubFolder(subFolder);
                                  }}
                                  className={`p-1.5 rounded-md transition-colors active:scale-95 ${
                                    isSubActive
                                      ? "text-red-950 hover:bg-red-200"
                                      : "text-zinc-400 hover:text-red-600 hover:bg-red-100"
                                  }`}
                                  title="Xóa folder (Chuyển tất cả tài liệu sang danh mục cha General)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Storage Quota Tracker Widget */}
        {(() => {
          const totalStorageMB = (documents || []).reduce((acc, doc) => {
            if (!doc.fileSize) return acc;
            const str = doc.fileSize.toString().toUpperCase().trim();
            const val = parseFloat(str) || 0;
            if (str.includes("GB")) return acc + val * 1024;
            if (str.includes("KB")) return acc + val / 1024;
            return acc + val;
          }, 0);

          const storageLimitMB = 1024; // 1 GB hạn mức
          const storagePercent = Math.min(
            Math.round((totalStorageMB / storageLimitMB) * 100),
            100,
          );

          return (
            <div className="p-3 border-t border-zinc-200 bg-[#faf6ed]/70">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
                  <HardDrive className="w-3.5 h-3.5 text-[#9f7a35]" />
                  <span>Dung lượng lưu trữ</span>
                </div>
                <span className="font-bold text-[11px] text-[#9f7a35]">
                  {totalStorageMB < 1
                    ? `${(totalStorageMB * 1024).toFixed(0)} KB`
                    : `${totalStorageMB.toFixed(1)} MB`}{" "}
                  / 1 GB
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden shadow-inner mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    storagePercent > 90
                      ? "bg-red-500"
                      : storagePercent > 75
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-[#d0aa61] to-[#9f7a35]"
                  }`}
                  style={{ width: `${Math.max(storagePercent, 2)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                <span>{documents.length} tài liệu</span>
                <span>{storagePercent}% đã dùng</span>
              </div>
            </div>
          );
        })()}

        {/* Footer Info */}
        <div className="py-2 px-3 border-t border-zinc-100 text-[10px] text-zinc-400 text-center bg-zinc-50/50">
          NS Group &copy; 2026 Portal
        </div>
      </aside>
    </>
  );
}
