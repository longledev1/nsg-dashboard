import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import SidebarNav from '../components/SidebarNav';
import DocumentGrid from '../components/DocumentGrid';
import PdfViewerModal from '../components/PdfViewerModal';
import ChatWidget from '../components/ChatWidget';
import CategoryManagerModal from '../components/admin/CategoryManagerModal';
import UserManagerModal from '../components/admin/UserManagerModal';
import UploadModal from '../components/admin/UploadModal';
import EditCategoryModal from '../components/admin/EditCategoryModal';
import EditSubFolderModal from '../components/admin/EditSubFolderModal';
import AddSubFolderModal from '../components/admin/AddSubFolderModal';
import EditDocumentModal from '../components/admin/EditDocumentModal';
import MoveDocumentsModal from '../components/admin/MoveDocumentsModal';
import MoveSubFolderModal from '../components/admin/MoveSubFolderModal';
import ConfirmDeleteModal from '../components/admin/ConfirmDeleteModal';
import Toast from '../components/Toast';

import { 
  loadCategories, 
  loadSubFolders, 
  loadDocuments,
  addCategoryToDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
  addSubFolderToDb,
  updateSubFolderInDb,
  moveSubFolderInDb,
  deleteSubFolderFromDb,
  addDocumentToDb,
  updateDocumentInDb,
  deleteDocumentFromDb,
  bulkDeleteDocumentsFromDb,
  bulkMoveDocumentsInDb
} from '../services/documentService';

export default function DashboardPage({ user, onLogout }) {
  // Application Data State
  const [categories, setCategories] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Navigation Filter State
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubFolder, setActiveSubFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select Document State
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Mobile & iPad Sidebar Drawer State
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Active Viewing PDF Document Modal
  const [selectedPdf, setSelectedPdf] = useState(null);

  // Admin Modals State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPreSelection, setUploadPreSelection] = useState({ categoryId: '', subFolderId: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [editingSubFolder, setEditingSubFolder] = useState(null);
  const [movingSubFolder, setMovingSubFolder] = useState(null);
  const [deletingSubFolder, setDeletingSubFolder] = useState(null);
  const [quickAddCategory, setQuickAddCategory] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Initial Data Load from Supabase DB via documentService
  useEffect(() => {
    async function fetchData() {
      setLoadingData(true);
      try {
        const [cats, subs, docs] = await Promise.all([
          loadCategories(),
          loadSubFolders(),
          loadDocuments(),
        ]);
        setCategories(cats);
        setSubFolders(subs);
        setDocuments(docs);
      } catch (err) {
        console.error('Error fetching data from documentService:', err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Multi-select Document Handlers
  const handleToggleSelectDoc = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = (docIds) => {
    setSelectedDocIds(docIds);
  };

  const handleClearDocSelection = () => {
    setSelectedDocIds([]);
  };

  // Handlers for Category & Data Persistence
  const handleAddCategory = async (newCat) => {
    setCategories(prev => [...prev, newCat]);
    await addCategoryToDb(newCat);
    showToast(`Đã thêm danh mục mới "${newCat.name}".`, 'success');
  };

  const handleSaveCategory = async (catId, newName) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền đổi tên danh mục!', 'error');
      return;
    }
    const id = typeof catId === 'object' ? catId.id : catId;
    const name = typeof catId === 'object' ? catId.name : newName;

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: name } : c));
    await updateCategoryInDb(id, name);
    showToast(`Đã đổi tên danh mục thành "${name}".`, 'success');
  };

  const handleDeleteCategory = (cat) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa danh mục!', 'error');
      return;
    }
    const catObj = typeof cat === 'object' ? cat : categories.find(c => c.id === cat);
    if (catObj?.isDefault) {
      showToast('Không thể xóa danh mục mặc định bảo vệ!', 'error');
      return;
    }
    setDeletingCategory(catObj);
  };

  const handleConfirmDeleteCategory = async (cat) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa danh mục!', 'error');
      return;
    }
    if (cat?.isDefault) {
      showToast('Không thể xóa danh mục mặc định bảo vệ!', 'error');
      return;
    }
    const targetCategoryId = 'cat-general';
    const updatedDocs = documents.map(doc => {
      if (doc.categoryId === cat.id) {
        return { ...doc, categoryId: targetCategoryId, subFolderId: null };
      }
      return doc;
    });

    setDocuments(updatedDocs);
    setCategories(prev => prev.filter(c => c.id !== cat.id));
    setSubFolders(prev => prev.filter(s => s.categoryId !== cat.id));
    setDeletingCategory(null);

    if (activeCategory === cat.id) {
      setActiveCategory(targetCategoryId);
      setActiveSubFolder(null);
    }

    await deleteCategoryFromDb(cat.id, targetCategoryId, updatedDocs);
    showToast(`Đã xóa danh mục "${cat.name}" và chuyển tất cả tài liệu về danh mục General.`, 'info');
  };

  const handleAddSubFolder = async (newSub) => {
    setSubFolders(prev => [...prev, newSub]);
    await addSubFolderToDb(newSub);
    showToast(`Đã tạo folder "${newSub.name}" thành công!`, 'success');
  };

  const handleQuickAddSubFolder = (targetCat) => {
    setQuickAddCategory(targetCat);
  };

  const handleConfirmQuickAdd = async (newSub) => {
    setSubFolders(prev => [...prev, newSub]);
    await addSubFolderToDb(newSub);
    showToast(`Đã tạo folder "${newSub.name}" trong danh mục "${quickAddCategory?.name}"!`, 'success');
    setQuickAddCategory(null);
  };

  const handleSaveSubFolder = async (subFolderId, newName) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền đổi tên folder!', 'error');
      return;
    }
    const id = typeof subFolderId === 'object' ? subFolderId.id : subFolderId;
    const name = typeof subFolderId === 'object' ? subFolderId.name : newName;

    setSubFolders(prev => prev.map(s => s.id === id ? { ...s, name: name } : s));
    await updateSubFolderInDb(id, name);
    showToast(`Đã đổi tên folder thành "${name}".`, 'success');
  };
  const handleRenameSubFolder = handleSaveSubFolder;

  const handleConfirmMoveSubFolder = async (subFolderId, newCategoryId) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền di chuyển folder!', 'error');
      return;
    }
    const sub = subFolders.find(s => s.id === subFolderId);
    const targetCat = categories.find(c => c.id === newCategoryId);

    // 1. Cập nhật state subFolders
    setSubFolders(prev => prev.map(s => s.id === subFolderId ? { ...s, categoryId: newCategoryId } : s));

    // 2. Cập nhật state documents thuộc subfolder này
    setDocuments(prev => prev.map(d => d.subFolderId === subFolderId ? { ...d, categoryId: newCategoryId } : d));

    // 3. Nếu đang active ở folder này hoặc category cũ, chuyển view sang category mới
    if (activeSubFolder === subFolderId) {
      setActiveCategory(newCategoryId);
    }

    // 4. Lưu DB & localStorage
    await moveSubFolderInDb(subFolderId, newCategoryId);

    showToast(`Đã chuyển folder "${sub?.name}" sang danh mục "${targetCat?.name || 'mới'}"!`, 'success');
    setMovingSubFolder(null);
  };

  // Quick Upload to specific subfolder handler
  const handleQuickUploadToSubFolder = (catId, subId) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền upload tài liệu!', 'error');
      return;
    }
    setUploadPreSelection({ categoryId: catId, subFolderId: subId });
    setIsUploadModalOpen(true);
  };

  const handleDeleteSubFolder = (subFolder) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa folder!', 'error');
      return;
    }
    if (subFolder?.isDefault) {
      showToast('Không thể xóa folder mặc định bảo vệ!', 'error');
      return;
    }
    setDeletingSubFolder(subFolder);
  };
  const handleRequestDeleteSubFolder = handleDeleteSubFolder;

  const handleConfirmDeleteSubFolder = async (subFolder) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa folder!', 'error');
      return;
    }
    if (subFolder?.isDefault) {
      showToast('Không thể xóa folder mặc định bảo vệ!', 'error');
      return;
    }
    // 1. Chuyển tất cả tài liệu thuộc subfolder bị xóa sang Danh mục cha General ('cat-general')
    const targetCategoryId = 'cat-general';
    const targetSubFolderId = null;

    const updatedDocs = documents.map(doc => {
      if (doc.subFolderId === subFolder.id) {
        return { ...doc, categoryId: targetCategoryId, subFolderId: targetSubFolderId };
      }
      return doc;
    });

    setDocuments(updatedDocs);

    // 2. Xóa subFolder khỏi danh sách & đóng modal
    setSubFolders(prev => prev.filter(s => s.id !== subFolder.id));
    setDeletingSubFolder(null);

    // 3. Tự động chuyển view sang Danh mục cha General nếu đang đứng ở folder bị xóa
    if (activeSubFolder === subFolder.id) {
      setActiveCategory(targetCategoryId);
      setActiveSubFolder(null);
    }

    // 4. Cập nhật đồng bộ vào DB và localStorage
    await deleteSubFolderFromDb(subFolder.id, targetSubFolderId, targetCategoryId, updatedDocs);

    // 5. Báo Toast thông báo kết quả
    showToast(`Đã xóa folder "${subFolder.name}" và chuyển tất cả tài liệu về danh mục cha General.`, 'info');
  };

  // Single Document Edit & Delete Handlers
  const handleSaveDocument = async (updatedDoc) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền chỉnh sửa tài liệu!', 'error');
      return;
    }
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    await updateDocumentInDb(updatedDoc);
    showToast(`Đã cập nhật thông tin tài liệu "${updatedDoc.title}".`, 'success');
  };

  const handleConfirmDeleteDocument = async (doc) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa tài liệu!', 'error');
      return;
    }
    if (doc?.isProtected || doc?.isDefault || doc?.id === 'doc-nsg-history-profile') {
      showToast(`Tài liệu "${doc.title}" là tài liệu cốt lõi hệ thống được bảo vệ và không thể xóa!`, 'error');
      setDeletingDocument(null);
      return;
    }
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
    setDeletingDocument(null);
    await deleteDocumentFromDb(doc.id);
    showToast(`Đã xóa tài liệu "${doc.title}" khỏi kho.`, 'info');
  };

  const handleMoveSingleDocument = (doc) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền di chuyển tài liệu!', 'error');
      return;
    }
    setSelectedDocIds([doc.id]);
    setIsMoveModalOpen(true);
  };

  // Bulk Operations Handlers
  const handleConfirmBulkDelete = async () => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền xóa hàng loạt tài liệu!', 'error');
      return;
    }
    const safeSelectedIds = selectedDocIds.filter(id => {
      const doc = documents.find(d => d.id === id);
      return !doc?.isProtected && !doc?.isDefault && id !== 'doc-nsg-history-profile';
    });

    if (safeSelectedIds.length === 0) {
      showToast('Các tài liệu được chọn thuộc hệ thống bảo vệ và không thể xóa!', 'error');
      return;
    }

    const count = safeSelectedIds.length;
    setDocuments(prev => prev.filter(d => !safeSelectedIds.includes(d.id)));
    await bulkDeleteDocumentsFromDb(safeSelectedIds);
    setSelectedDocIds([]);
    showToast(`Đã xóa ${count} tài liệu được chọn khỏi kho (đã bảo vệ các tài liệu hệ thống).`, 'info');
  };

  const handleConfirmBulkMove = async (targetCategoryId, targetSubFolderId) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền di chuyển tài liệu!', 'error');
      return;
    }
    const count = selectedDocIds.length;
    const targetSub = subFolders.find(s => s.id === targetSubFolderId);

    setDocuments(prev => prev.map(d => {
      if (selectedDocIds.includes(d.id)) {
        return { ...d, categoryId: targetCategoryId, subFolderId: targetSubFolderId };
      }
      return d;
    }));

    await bulkMoveDocumentsInDb(selectedDocIds, targetCategoryId, targetSubFolderId);
    setSelectedDocIds([]);
    showToast(`Đã di chuyển ${count} tài liệu sang folder "${targetSub?.name || 'mới'}".`, 'success');
  };

  const handleUploadDocument = async (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    await addDocumentToDb(newDoc);
    showToast(`Đã tải tài liệu "${newDoc.title}" lên kho thành công!`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] flex flex-col font-sans">
      
      {/* Toast Notification Component */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Top Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
        onOpenUserManager={() => setIsUserManagerOpen(true)}
        onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
      />

      {/* Main Body Layout with Wider Container */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative">
        
        {/* Left Sidebar Category Tree */}
        <SidebarNav
          categories={categories}
          subFolders={subFolders}
          documents={documents}
          activeCategory={activeCategory}
          activeSubFolder={activeSubFolder}
          onSelectCategory={setActiveCategory}
          onSelectSubFolder={setActiveSubFolder}
          onOpenUploadModal={(catId = '', subId = '') => {
            setUploadPreSelection({ categoryId: catId, subFolderId: subId });
            setIsUploadModalOpen(true);
          }}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          onQuickAddSubFolder={(cat) => setQuickAddCategory(cat)}
          onQuickUploadToSubFolder={handleQuickUploadToSubFolder}
          onEditSubFolder={(sub) => setEditingSubFolder(sub)}
          onMoveSubFolder={(sub) => setMovingSubFolder(sub)}
          onDeleteSubFolder={handleRequestDeleteSubFolder}
          onEditCategory={(cat) => setEditingCategory(cat)}
          onDeleteCategory={handleDeleteCategory}
          userRole={user.role}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />

        {/* Right Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto min-w-0">
          {loadingData ? (
            <div className="flex items-center justify-center py-20 text-xs text-zinc-500 gap-2">
              <div className="w-5 h-5 border-2 border-[#d0aa61] border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải kho tài liệu từ Supabase Database...</span>
            </div>
          ) : (
            <DocumentGrid
              documents={documents}
              categories={categories}
              subFolders={subFolders}
              activeCategory={activeCategory}
              activeSubFolder={activeSubFolder}
              onSelectCategory={setActiveCategory}
              onSelectSubFolder={setActiveSubFolder}
              onQuickAddSubFolder={(cat) => setQuickAddCategory(cat)}
              onEditSubFolder={(sub) => setEditingSubFolder(sub)}
              onMoveSubFolder={(sub) => setMovingSubFolder(sub)}
              onDeleteSubFolder={handleRequestDeleteSubFolder}
              searchQuery={searchQuery}
              selectedDocIds={selectedDocIds}
              onToggleSelectDoc={handleToggleSelectDoc}
              onSelectAllDocs={handleSelectAllDocs}
              onClearDocSelection={handleClearDocSelection}
              onBulkMove={() => setIsMoveModalOpen(true)}
              onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
              onViewPdf={(doc) => setSelectedPdf(doc)}
              onEditDocument={(doc) => setEditingDocument(doc)}
              onMoveDocument={handleMoveSingleDocument}
              onDeleteDocument={(doc) => setDeletingDocument(doc)}
              userRole={user.role}
            />
          )}
        </main>

      </div>

      {/* AI Assistant Modal (Near Full-screen with large typography) */}
      <ChatWidget
        user={user}
        documents={documents}
        categories={categories}
        subFolders={subFolders}
        onViewPdf={(doc) => setSelectedPdf(doc)}
      />

      {/* PDF Viewer Modal (Rendered after ChatWidget with higher z-index) */}
      {selectedPdf && (
        <PdfViewerModal
          document={selectedPdf}
          onUpdateDocument={(updated) => {
            setSelectedPdf(updated);
            setDocuments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
          }}
          onClose={() => setSelectedPdf(null)}
        />
      )}

      {/* Admin Modals */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          categories={categories}
          subFolders={subFolders}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubFolder={handleAddSubFolder}
          onEditSubFolder={(sub) => handleSaveSubFolder(sub.id, sub.name)}
          onMoveSubFolder={(sub) => {
            setIsCategoryModalOpen(false);
            setMovingSubFolder(sub);
          }}
          onDeleteSubFolder={handleRequestDeleteSubFolder}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {deletingCategory && (
        <ConfirmDeleteModal
          title="Xác nhận xóa Danh mục"
          message={`Bạn có chắc chắn muốn xóa danh mục "${deletingCategory.name}" không? Tất cả tài liệu trong danh mục này sẽ tự động được chuyển sang danh mục General.`}
          onConfirm={() => handleConfirmDeleteCategory(deletingCategory)}
          onClose={() => setDeletingCategory(null)}
        />
      )}

      {isUploadModalOpen && (
        <UploadModal
          categories={categories}
          subFolders={subFolders}
          preSelectedCategory={uploadPreSelection.categoryId}
          preSelectedSubFolder={uploadPreSelection.subFolderId}
          onUploadDocument={handleUploadDocument}
          onShowToast={showToast}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadPreSelection({ categoryId: '', subFolderId: '' });
          }}
        />
      )}

      {quickAddCategory && (
        <AddSubFolderModal
          category={quickAddCategory}
          onSave={handleAddSubFolder}
          onClose={() => setQuickAddCategory(null)}
        />
      )}

      {editingSubFolder && (
        <EditSubFolderModal
          subFolder={editingSubFolder}
          onSave={handleSaveSubFolder}
          onClose={() => setEditingSubFolder(null)}
        />
      )}

      {movingSubFolder && (
        <MoveSubFolderModal
          subFolder={movingSubFolder}
          categories={categories}
          onConfirmMove={handleConfirmMoveSubFolder}
          onClose={() => setMovingSubFolder(null)}
        />
      )}

      {deletingSubFolder && (
        <ConfirmDeleteModal
          title="Xác nhận xóa Folder Dự án"
          message={`Bạn có chắc chắn muốn xóa folder "${deletingSubFolder.name}" không? Tất cả tài liệu trong folder này sẽ tự động được chuyển sang folder General.`}
          onConfirm={() => handleConfirmDeleteSubFolder(deletingSubFolder)}
          onClose={() => setDeletingSubFolder(null)}
        />
      )}

      {editingDocument && (
        <EditDocumentModal
          document={editingDocument}
          categories={categories}
          subFolders={subFolders}
          onSave={handleSaveDocument}
          onClose={() => setEditingDocument(null)}
        />
      )}

      {deletingDocument && (
        <ConfirmDeleteModal
          title="Xác nhận xóa tài liệu"
          message={`Bạn có chắc chắn muốn xóa tài liệu "${deletingDocument.title}" khỏi kho không? Hành động này sẽ không thể hoàn tác.`}
          onConfirm={() => handleConfirmDeleteDocument(deletingDocument)}
          onClose={() => setDeletingDocument(null)}
        />
      )}

      {isMoveModalOpen && (
        <MoveDocumentsModal
          selectedCount={selectedDocIds.length}
          categories={categories}
          subFolders={subFolders}
          onConfirmMove={handleConfirmBulkMove}
          onClose={() => setIsMoveModalOpen(false)}
        />
      )}

      {isBulkDeleteModalOpen && (
        <ConfirmDeleteModal
          title="Xác nhận xóa hàng loạt tài liệu"
          message={`Bạn có chắc chắn muốn xóa ${selectedDocIds.length} tài liệu được chọn khỏi kho không? Hành động này sẽ không thể hoàn tác.`}
          onConfirm={handleConfirmBulkDelete}
          onClose={() => setIsBulkDeleteModalOpen(false)}
        />
      )}

      {/* Admin User Accounts Management Modal */}
      {isUserManagerOpen && (
        <UserManagerModal
          isOpen={isUserManagerOpen}
          onClose={() => setIsUserManagerOpen(false)}
          currentUser={user}
          showToast={showToast}
        />
      )}

    </div>
  );
}
