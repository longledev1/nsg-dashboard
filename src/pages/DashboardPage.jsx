import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import Header from '../components/Header';
import SidebarNav from '../components/SidebarNav';
import DocumentGrid from '../components/DocumentGrid';
import ChatWidget from '../components/ChatWidget';
import MobileBottomNav from '../components/mobile/MobileBottomNav';
import Toast from '../components/Toast';

// Modals
import PdfViewerModal, { openDocumentInNewTab } from '../components/PdfViewerModal';
const CategoryManagerModal = lazy(() => import('../components/admin/CategoryManagerModal'));
const UserManagerModal = lazy(() => import('../components/admin/UserManagerModal'));
const UploadModal = lazy(() => import('../components/admin/UploadModal'));
const EditCategoryModal = lazy(() => import('../components/admin/EditCategoryModal'));
const EditSubFolderModal = lazy(() => import('../components/admin/EditSubFolderModal'));
const AddSubFolderModal = lazy(() => import('../components/admin/AddSubFolderModal'));
const EditDocumentModal = lazy(() => import('../components/admin/EditDocumentModal'));
const MoveDocumentsModal = lazy(() => import('../components/admin/MoveDocumentsModal'));
const MoveSubFolderModal = lazy(() => import('../components/admin/MoveSubFolderModal'));
const ConfirmDeleteModal = lazy(() => import('../components/admin/ConfirmDeleteModal'));
const AiSettingsModal = lazy(() => import('../components/admin/AiSettingsModal'));
const ShareDocumentModal = lazy(() => import('../components/admin/ShareDocumentModal'));

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
  bulkMoveDocumentsInDb,
  detectDocumentFileType,
  sanitizeFileUrl,
  isTouchDeviceOrIOS
} from '../services/documentService';
import {
  loadRestrictedFolders,
  saveRestrictedFolders
} from '../services/aiGuardrailService';

export default function DashboardPage({ user, onLogout }) {
  // Application Data State
  const [categories, setCategories] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [restrictedFolders, setRestrictedFolders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // =========================================================================
  // PHÂN QUYỀN HỆ THỐNG: Nhân viên không nhìn thấy Thư mục & File "Chỉ Admin"
  // =========================================================================
  const isUserAdmin = user?.role === 'admin';

  // 1. Danh sách Danh mục hiển thị theo quyền
  const visibleCategories = React.useMemo(() => {
    if (isUserAdmin) return categories;
    return categories.filter(c => !restrictedFolders.includes(c.id) && c.minRole !== 'admin');
  }, [categories, isUserAdmin, restrictedFolders]);

  // 2. Danh sách SubFolder hiển thị theo quyền
  const visibleSubFolders = React.useMemo(() => {
    if (isUserAdmin) return subFolders;
    const hiddenCatIds = new Set(
      categories.filter(c => restrictedFolders.includes(c.id) || c.minRole === 'admin').map(c => c.id)
    );
    return subFolders.filter(sf => 
      !hiddenCatIds.has(sf.categoryId) && 
      !restrictedFolders.includes(sf.id) && 
      sf.minRole !== 'admin'
    );
  }, [subFolders, categories, isUserAdmin, restrictedFolders]);

  // 3. Danh sách Tài liệu hiển thị theo quyền
  const visibleDocuments = React.useMemo(() => {
    if (isUserAdmin) return documents;
    const hiddenCatIds = new Set(
      categories.filter(c => restrictedFolders.includes(c.id) || c.minRole === 'admin').map(c => c.id)
    );
    const hiddenSubIds = new Set(
      subFolders.filter(sf => restrictedFolders.includes(sf.id) || sf.minRole === 'admin').map(sf => sf.id)
    );
    return documents.filter(d => {
      if (d.categoryId && (hiddenCatIds.has(d.categoryId) || restrictedFolders.includes(d.categoryId))) return false;
      if (d.subFolderId && (hiddenSubIds.has(d.subFolderId) || restrictedFolders.includes(d.subFolderId))) return false;
      if (Array.isArray(d.tags)) {
        const lowerTags = d.tags.map(t => String(t).toLowerCase());
        if (lowerTags.includes('bảo mật') || lowerTags.includes('admin only') || lowerTags.includes('nhạy cảm')) {
          return false;
        }
      }
      return true;
    });
  }, [documents, categories, subFolders, isUserAdmin, restrictedFolders]);

  // Navigation Filter State (Đồng bộ trực tiếp với Browser History & URL Query Params)
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('cat') || null;
    }
    return null;
  });
  const [activeSubFolder, setActiveSubFolder] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('folder') || null;
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Ref theo dõi modal nào đang mở để xử lý khi người dùng vuốt Back trên điện thoại
  const activeModalRef = useRef(null);

  // Multi-select Document State
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Mobile & iPad Sidebar Drawer State
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Active Viewing PDF Document Modal
  const [selectedPdf, setSelectedPdf] = useState(null);

  // Admin Modals State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
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
  const [sharingDocument, setSharingDocument] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Initial Data Load & Cross-tab Auto-Sync from Supabase DB
  useEffect(() => {
    async function fetchData(silent = false) {
      if (!silent) setLoadingData(true);
      try {
        const [cats, subs, docs, folders] = await Promise.all([
          loadCategories(),
          loadSubFolders(),
          loadDocuments(),
          loadRestrictedFolders(),
        ]);
        setCategories(cats);
        setSubFolders(subs);
        setDocuments(docs);
        setRestrictedFolders(folders || []);

        // Kiểm tra Deep-link ?docId=... để tự động mở tài liệu được chia sẻ
        if (!silent && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const targetDocId = params.get('docId');
          if (targetDocId && docs.length > 0) {
            const foundDoc = docs.find(d => d.id === targetDocId);
            if (foundDoc) {
              setSelectedPdf(foundDoc);
              window.history.replaceState({}, '', window.location.pathname);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data from documentService:', err);
      } finally {
        if (!silent) setLoadingData(false);
      }
    }

    fetchData();

    // Tự động đồng bộ ngầm khi người dùng quay lại tab (switch tab)
    const handleWindowFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleWindowFocus);
    const handleVisibilityChange = () => {
      if (window.document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    window.document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Multi-select Document Handlers
  const handleToggleSelectDoc = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleClearDocSelection = () => {
    setSelectedDocIds([]);
  };

  // =========================================================================
  // BROWSER HISTORY & NAVIGATION API (Cho phép vuốt Back trên mobile mà không văng app)
  // =========================================================================
  const navigateTo = (rawCatId, rawSubId = null, replace = false) => {
    let catId = rawCatId;
    let subId = rawSubId;

    // Chặn người dùng thường tự gõ URL để vào folder bảo mật
    if (!isUserAdmin) {
      if (restrictedFolders.includes(catId) || categories.find(c => c.id === catId)?.minRole === 'admin') {
        catId = null;
        subId = null;
      }
      if (restrictedFolders.includes(subId) || subFolders.find(s => s.id === subId)?.minRole === 'admin') {
        subId = null;
      }
    }

    setActiveCategory(catId);
    setActiveSubFolder(subId);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (catId) {
        url.searchParams.set('cat', catId);
      } else {
        url.searchParams.delete('cat');
      }
      if (subId) {
        url.searchParams.set('folder', subId);
      } else {
        url.searchParams.delete('folder');
      }

      const stateObj = { cat: catId, sub: subId };
      const currentParams = new URLSearchParams(window.location.search);
      const isSame = (currentParams.get('cat') || null) === (catId || null) && 
                     (currentParams.get('folder') || null) === (subId || null);

      if (!isSame) {
        const newUrl = url.pathname + (url.search || '') + (url.hash || '');
        if (replace) {
          window.history.replaceState(stateObj, '', newUrl);
        } else {
          window.history.pushState(stateObj, '', newUrl);
        }
      }
    }
  };

  const handleSelectCategory = (catId) => {
    navigateTo(catId, null);
  };

  const handleSelectSubFolder = (subId, explicitCatId = null) => {
    const targetCat = explicitCatId !== null ? explicitCatId : activeCategory;
    navigateTo(targetCat, subId);
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds([]);
    navigateTo(null, null);
  };

  // Quản lý Modal có đẩy History State: khi vuốt Back sẽ tự đóng modal
  const handleOpenAiModal = (open) => {
    if (open) {
      setIsAiModalOpen(true);
      if (typeof window !== 'undefined') {
        window.history.pushState({ modal: 'ai', cat: activeCategory, sub: activeSubFolder }, '', window.location.href);
        activeModalRef.current = 'ai';
      }
    } else {
      if (activeModalRef.current === 'ai') {
        activeModalRef.current = null;
        window.history.back();
      } else {
        setIsAiModalOpen(false);
      }
    }
  };

  const handleOpenUploadModal = (preSelect = { categoryId: '', subFolderId: '' }) => {
    setUploadPreSelection(preSelect);
    setIsUploadModalOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'upload', cat: activeCategory, sub: activeSubFolder }, '', window.location.href);
      activeModalRef.current = 'upload';
    }
  };

  const handleCloseUploadModal = () => {
    if (activeModalRef.current === 'upload') {
      activeModalRef.current = null;
      window.history.back();
    } else {
      setIsUploadModalOpen(false);
      setUploadPreSelection({ categoryId: '', subFolderId: '' });
    }
  };

  const handleToggleSidebarMobile = (open) => {
    const nextState = typeof open === 'boolean' ? open : !isSidebarOpenMobile;
    setIsSidebarOpenMobile(nextState);
  };

  // Lắng nghe sự kiện vuốt Back trên điện thoại (PopState Event)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      window.history.replaceState({ cat: params.get('cat') || null, sub: params.get('folder') || null }, '', window.location.href);
    }

    const handlePopState = () => {
      // 1. Nếu đang mở Sidebar trên mobile, vuốt Back sẽ đóng Sidebar
      if (isSidebarOpenMobile) {
        setIsSidebarOpenMobile(false);
        return;
      }

      // 2. Ưu tiên đóng Modal nếu có modal đang mở
      if (activeModalRef.current) {
        const modalType = activeModalRef.current;
        activeModalRef.current = null;
        if (modalType === 'pdf') setSelectedPdf(null);
        if (modalType === 'ai') setIsAiModalOpen(false);
        if (modalType === 'upload') {
          setIsUploadModalOpen(false);
          setUploadPreSelection({ categoryId: '', subFolderId: '' });
        }
        return;
      }

      if (selectedPdf) {
        setSelectedPdf(null);
        return;
      }
      if (isAiModalOpen) {
        setIsAiModalOpen(false);
        return;
      }
      if (isUploadModalOpen) {
        setIsUploadModalOpen(false);
        return;
      }

      // 2. Không có modal -> Đồng bộ lùi Folder / Category theo URL
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('cat') || null;
        const sub = params.get('folder') || null;

        setActiveCategory(cat);
        setActiveSubFolder(sub);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedPdf, isAiModalOpen, isUploadModalOpen, isSidebarOpenMobile]);

  // 1-Click Toggle Visibility for Category or Subfolder
  const handleToggleFolderVisibility = async (folderId, isCurrentlyRestricted) => {
    if (!isUserAdmin) return;
    let nextRestricted;
    if (isCurrentlyRestricted) {
      nextRestricted = restrictedFolders.filter(id => id !== folderId);
      setCategories(prev => prev.map(c => c.id === folderId ? { ...c, minRole: null } : c));
      setSubFolders(prev => prev.map(s => s.id === folderId ? { ...s, minRole: null } : s));
      showToast('Đã chuyển thư mục sang chế độ CÔNG KHAI (Nhân viên có thể xem).', 'success');
    } else {
      nextRestricted = [...restrictedFolders, folderId];
      setCategories(prev => prev.map(c => c.id === folderId ? { ...c, minRole: 'admin' } : c));
      setSubFolders(prev => prev.map(s => s.id === folderId ? { ...s, minRole: 'admin' } : s));
      showToast('Đã ẨN thư mục đối với tài khoản Nhân viên (Chỉ Admin).', 'info');
    }
    setRestrictedFolders(nextRestricted);
    await saveRestrictedFolders(nextRestricted);
  };

  // Handlers for Category & Data Persistence
  const handleAddCategory = async (newCat) => {
    setCategories(prev => [...prev, newCat]);
    if (newCat.isRestricted || newCat.minRole === 'admin') {
      const next = [...restrictedFolders, newCat.id];
      setRestrictedFolders(next);
      await saveRestrictedFolders(next);
    }
    await addCategoryToDb(newCat);
    showToast(`Đã thêm danh mục mới "${newCat.name}".`, 'success');
  };

  const handleSaveCategory = async (catId, newName, isAdminOnly = false) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền chỉnh sửa danh mục!', 'error');
      return;
    }
    const id = typeof catId === 'object' ? catId.id : catId;
    const name = typeof catId === 'object' ? catId.name : newName;

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: name, minRole: isAdminOnly ? 'admin' : null } : c));

    let nextRestricted = [...restrictedFolders];
    if (isAdminOnly && !nextRestricted.includes(id)) {
      nextRestricted.push(id);
    } else if (!isAdminOnly && nextRestricted.includes(id)) {
      nextRestricted = nextRestricted.filter(fId => fId !== id);
    }
    setRestrictedFolders(nextRestricted);
    await saveRestrictedFolders(nextRestricted);

    await updateCategoryInDb(id, name);
    showToast(`Đã cập nhật danh mục "${name}".`, 'success');
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
    if (newSub.isRestricted || newSub.minRole === 'admin') {
      const next = [...restrictedFolders, newSub.id];
      setRestrictedFolders(next);
      await saveRestrictedFolders(next);
    }
    await addSubFolderToDb(newSub);
    showToast(`Đã tạo folder "${newSub.name}" thành công!`, 'success');
  };

  const handleQuickAddSubFolder = (targetCat) => {
    setQuickAddCategory(targetCat);
  };

  const handleConfirmQuickAdd = async (newSub) => {
    setSubFolders(prev => [...prev, newSub]);
    if (newSub.isRestricted || newSub.minRole === 'admin') {
      const next = [...restrictedFolders, newSub.id];
      setRestrictedFolders(next);
      await saveRestrictedFolders(next);
    }
    await addSubFolderToDb(newSub);
    showToast(`Đã tạo folder "${newSub.name}" trong danh mục "${quickAddCategory?.name}"!`, 'success');
    setQuickAddCategory(null);
  };

  const handleSaveSubFolder = async (subFolderId, newName, isAdminOnly = false) => {
    if (user?.role !== 'admin') {
      showToast('Bạn không có quyền chỉnh sửa folder!', 'error');
      return;
    }
    const id = typeof subFolderId === 'object' ? subFolderId.id : subFolderId;
    const name = typeof subFolderId === 'object' ? subFolderId.name : newName;

    setSubFolders(prev => prev.map(s => s.id === id ? { ...s, name: name, minRole: isAdminOnly ? 'admin' : null } : s));

    let nextRestricted = [...restrictedFolders];
    if (isAdminOnly && !nextRestricted.includes(id)) {
      nextRestricted.push(id);
    } else if (!isAdminOnly && nextRestricted.includes(id)) {
      nextRestricted = nextRestricted.filter(fId => fId !== id);
    }
    setRestrictedFolders(nextRestricted);
    await saveRestrictedFolders(nextRestricted);

    await updateSubFolderInDb(id, name);
    showToast(`Đã cập nhật folder "${name}".`, 'success');
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

    // 4. Lưu Supabase DB
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

    // 4. Cập nhật đồng bộ vào Supabase DB
    await deleteSubFolderFromDb(subFolder.id, targetSubFolderId, targetCategoryId);

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
    const result = await deleteDocumentFromDb(doc.id, doc.fileUrl);
    if (result && !result.success) {
      showToast(`Đã xóa trên máy này, nhưng Supabase báo lỗi: "${result.error}". Vui lòng cấp quyền DELETE trên Supabase!`, 'warning');
    } else {
      showToast(`Đã xóa vĩnh viễn tài liệu "${doc.title}".`, 'info');
    }
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
    const safeSelectedDocs = documents.filter(d => 
      selectedDocIds.includes(d.id) && !d?.isProtected && !d?.isDefault && d.id !== 'doc-nsg-history-profile'
    );
    const safeSelectedIds = safeSelectedDocs.map(d => d.id);

    if (safeSelectedIds.length === 0) {
      showToast('Các tài liệu được chọn thuộc hệ thống bảo vệ và không thể xóa!', 'error');
      return;
    }

    const count = safeSelectedIds.length;
    setDocuments(prev => prev.filter(d => !safeSelectedIds.includes(d.id)));
    setSelectedDocIds([]);
    const result = await bulkDeleteDocumentsFromDb(safeSelectedDocs);
    if (result && !result.success) {
      showToast(`Đã xóa trên máy này, nhưng Supabase báo lỗi: "${result.error}". Vui lòng cấp quyền DELETE trên Supabase!`, 'warning');
    } else {
      showToast(`Đã xóa vĩnh viễn ${count} tài liệu được chọn khỏi hệ thống.`, 'info');
    }
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

  // Mở tài liệu thông minh (Smart Document Viewer)
  // Mở tài liệu trực tiếp trong App (Fullscreen trên Mobile, Modal trên Desktop)
  // Đảm bảo Watermark bảo mật 100% không bị dịch vụ ngoài can thiệp
  const handleViewDocument = (doc) => {
    if (!doc) return;
    setSelectedPdf(doc);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'pdf', cat: activeCategory, sub: activeSubFolder }, '', window.location.href);
      activeModalRef.current = 'pdf';
    }
  };

  const handleClosePdf = () => {
    if (activeModalRef.current === 'pdf') {
      activeModalRef.current = null;
      window.history.back();
    } else {
      setSelectedPdf(null);
    }
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
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onToggleSidebar={() => handleToggleSidebarMobile(!isSidebarOpenMobile)}
        showToast={showToast}
      />

      {/* Main Body Layout with Wider Container */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative">
        
        {/* Left Sidebar Category Tree */}
        <SidebarNav
          categories={visibleCategories}
          subFolders={visibleSubFolders}
          documents={visibleDocuments}
          restrictedFolders={restrictedFolders}
          onToggleFolderVisibility={handleToggleFolderVisibility}
          activeCategory={activeCategory}
          activeSubFolder={activeSubFolder}
          onSelectCategory={handleSelectCategory}
          onSelectSubFolder={handleSelectSubFolder}
          onOpenUploadModal={(catId = '', subId = '') => handleOpenUploadModal({ categoryId: catId, subFolderId: subId })}
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
          onCloseMobile={() => handleToggleSidebarMobile(false)}
        />

        {/* Right Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-24 lg:pb-6 overflow-y-auto min-w-0">
          {loadingData ? (
            <div className="flex items-center justify-center py-20 text-xs text-zinc-500 gap-2">
              <div className="w-5 h-5 border-2 border-[#d0aa61] border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải kho tài liệu từ Supabase Database...</span>
            </div>
          ) : (
            <DocumentGrid
              documents={visibleDocuments}
              categories={visibleCategories}
              subFolders={visibleSubFolders}
              restrictedFolders={restrictedFolders}
              onToggleFolderVisibility={handleToggleFolderVisibility}
              activeCategory={activeCategory}
              activeSubFolder={activeSubFolder}
              onSelectCategory={handleSelectCategory}
              onSelectSubFolder={handleSelectSubFolder}
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
              onViewPdf={handleViewDocument}
              onEditDocument={(doc) => setEditingDocument(doc)}
              onMoveDocument={handleMoveSingleDocument}
              onDeleteDocument={(doc) => setDeletingDocument(doc)}
              onShareDocument={(doc) => setSharingDocument(doc)}
              userRole={user.role}
            />
          )}
        </main>

      </div>

      {/* AI Assistant Modal (Near Full-screen with large typography) */}
      <ChatWidget
        user={user}
        documents={visibleDocuments}
        categories={visibleCategories}
        subFolders={visibleSubFolders}
        onViewPdf={handleViewDocument}
        isOpen={isAiModalOpen}
        onOpenChange={handleOpenAiModal}
      />

      {/* Mobile Native App Bottom Navigation Bar (Chỉ hiện trên Mobile/Tablet < 1024px) */}
      <MobileBottomNav
        user={user}
        activeCategory={activeCategory}
        activeSubFolder={activeSubFolder}
        onSelectAllDocs={handleSelectAllDocs}
        onToggleSidebar={() => handleToggleSidebarMobile(!isSidebarOpenMobile)}
        onOpenUploadModal={() => handleOpenUploadModal({ categoryId: '', subFolderId: '' })}
        onOpenAi={() => handleOpenAiModal(true)}
        onOpenUserManager={() => setIsUserManagerOpen(true)}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onLogout={onLogout}
        showToast={showToast}
      />

      {/* Lazy-loaded Modals (PDF Viewer & Admin Modals) */}
      <Suspense fallback={null}>
        {selectedPdf && (
          <PdfViewerModal
            document={selectedPdf}
            currentUser={user}
            onUpdateDocument={(updated) => {
              setSelectedPdf(updated);
              setDocuments(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
            }}
            onClose={handleClosePdf}
          />
        )}

        {isCategoryModalOpen && (
          <CategoryManagerModal
            categories={categories}
            subFolders={subFolders}
            restrictedFolders={restrictedFolders}
            onToggleFolderVisibility={handleToggleFolderVisibility}
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
            isRestricted={restrictedFolders.includes(editingCategory.id) || editingCategory.minRole === 'admin'}
            onSave={handleSaveCategory}
            onClose={() => setEditingCategory(null)}
          />
        )}

        {deletingCategory && (
          <ConfirmDeleteModal
            title="Xác nhận xóa Danh mục"
            message={`Bạn có chắc chắn muốn xóa danh mục "${deletingCategory.name}" không? Tất cả tài liệu trong danh mục này sẽ tự động được chuyển sang danh mục General.`}
            onConfirm={() => handleConfirmDeleteCategory(deletingCategory)}
            onClose={() => setEditingCategory(null)}
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
            onClose={handleCloseUploadModal}
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
            isRestricted={restrictedFolders.includes(editingSubFolder.id) || editingSubFolder.minRole === 'admin'}
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

        {/* Admin AI Settings & Directives Management Modal */}
        {isAiSettingsOpen && (
          <AiSettingsModal
            isOpen={isAiSettingsOpen}
            onClose={() => {
              setIsAiSettingsOpen(false);
              loadRestrictedFolders().then(f => setRestrictedFolders(f || []));
            }}
            currentUser={user}
            showToast={showToast}
            categories={categories}
            subFolders={subFolders}
          />
        )}

        {/* Admin Share Document Modal */}
        {sharingDocument && (
          <ShareDocumentModal
            document={sharingDocument}
            currentUser={user}
            onClose={() => setSharingDocument(null)}
            showToast={showToast}
          />
        )}
      </Suspense>

    </div>
  );
}
