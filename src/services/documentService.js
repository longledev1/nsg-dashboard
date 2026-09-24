import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_DOCUMENTS } from '../lib/constants';
import { deleteLocalFile } from './localFileStorage';

// Service xử lý Truy vấn & Lưu trữ Dữ liệu Kho Tài liệu Supabase PostgreSQL & Storage
// Single Source of Truth: Supabase PostgreSQL & Supabase Storage

// Helper kiểm tra và chuẩn hóa đường dẫn tệp an toàn
export function detectDocumentFileType(doc) {
  if (!doc) return 'pdf';
  if (doc.id === 'doc-nsg-history-profile') return 'word';
  if (doc.fileType === 'word' || doc.file_type === 'word') return 'word';
  const str = `${doc.title || ''} ${doc.fileUrl || ''} ${doc.file_url || ''}`.toLowerCase();
  if (/\.docx?(\)|$|\?|\s)/i.test(str) || str.includes('.docx') || str.includes('.doc')) {
    return 'word';
  }
  return 'pdf';
}

export function sanitizeFileUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Tệp tĩnh nội bộ (bắt đầu bằng / hoặc ./)
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  // 2. Blob URL: Chỉ hợp lệ nếu cùng Origin của phiên trình duyệt hiện tại
  if (trimmed.startsWith('blob:')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      if (trimmed.startsWith(`blob:${window.location.origin}`)) {
        return trimmed;
      }
    }
    return null;
  }

  // 3. Đường dẫn HTTP/HTTPS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('localhost:') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      return null;
    }
    return trimmed;
  }

  return null;
}

/**
 * Kiểm tra xem thiết bị hiện tại có phải iPad, iPhone hoặc thiết bị di động hay không
 * (Trình duyệt WebKit trên iOS/iPadOS chặn PDF trong iframe)
 */
export function isTouchDeviceOrIOS() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileOrTablet = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return Boolean(isMobileOrTablet);
}

// =========================================
// 1. TẢI TỆP LÊN SUPABASE STORAGE BUCKET ('nsg-documents')
// =========================================
export async function uploadPdfFileToStorage(file) {
  if (!isSupabaseConfigured || !supabase || !file) {
    console.warn('Supabase client chưa được cấu hình hoặc tệp không hợp lệ!');
    return { url: null, error: 'Chưa cấu hình biến môi trường Supabase URL/ANON KEY' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'pdf';
    // Xóa dấu tiếng Việt và ký tự đặc biệt để tên file trên Storage luôn an toàn
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);

    const fileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    console.log('Đang tải tệp lên Supabase Storage bucket nsg-documents:', filePath);

    // Tính toán thời gian chờ linh hoạt: tối thiểu 3 phút (180s) và tăng thêm theo kích thước tệp (25s/MB)
    const fileSizeMb = (file.size || 0) / (1024 * 1024);
    const timeoutMs = Math.max(180000, Math.ceil(fileSizeMb * 25000));
    const timeoutSeconds = Math.round(timeoutMs / 1000);

    const uploadPromise = supabase.storage
      .from('nsg-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Thao tác Upload hết thời gian chờ (Timeout ${timeoutSeconds}s)`)), timeoutMs)
    );

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      console.warn('Lỗi Storage Upload:', error.message || error);
      return { url: null, error: error.message || String(error) };
    }

    const { data: publicUrlData } = supabase.storage
      .from('nsg-documents')
      .getPublicUrl(filePath);

    return { url: publicUrlData?.publicUrl || null, error: null };
  } catch (err) {
    console.warn('Ngoại lệ khi tải tệp lên Supabase Storage:', err.message || err);
    return { url: null, error: err.message || String(err) };
  }
}

// =========================================
// RE-EXPORT CATEGORY & SUBFOLDER SERVICES
// =========================================
export {
  loadCategories,
  addCategoryToDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
} from './categoryService';

export {
  sortSubFoldersWithGeneralFirst,
  loadSubFolders,
  addSubFolderToDb,
  updateSubFolderInDb,
  moveSubFolderInDb,
  deleteSubFolderFromDb,
} from './subFolderService';

// =========================================
// 2. TRUY VẤN DỮ LIỆU TÀI LIỆU (DOCUMENTS QUERY)
// =========================================

export async function loadDocumentById(docId) {
  if (!docId) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          categoryId: data.category_id,
          subFolderId: data.subfolder_id,
          title: data.title,
          description: data.description,
          content: data.content || data.description || '',
          fileUrl: sanitizeFileUrl(data.file_url),
          fileSize: data.file_size,
          fileType: detectDocumentFileType(data),
          tags: data.tags || [],
          isProtected: data.id === 'doc-nsg-history-profile',
          isDefault: data.id === 'doc-nsg-history-profile',
          createdAt: data.created_at ? data.created_at.split('T')[0] : 'Vừa xong',
        };
      }
    } catch (err) {
      console.warn('Lỗi đọc tài liệu theo ID từ Supabase:', err);
    }
  }

  // Dự phòng tìm trong INITIAL_DOCUMENTS
  const initDoc = INITIAL_DOCUMENTS.find(d => d.id === docId);
  if (initDoc) {
    return {
      ...initDoc,
      isProtected: true,
      isDefault: true,
    };
  }

  return null;
}

export async function loadDocuments(subFolders = []) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          categoryId: d.category_id,
          subFolderId: d.subfolder_id,
          title: d.title,
          description: d.description,
          content: d.content || d.description || '',
          fileUrl: sanitizeFileUrl(d.file_url),
          fileSize: d.file_size,
          fileType: detectDocumentFileType(d),
          tags: d.tags || [],
          isProtected: d.id === 'doc-nsg-history-profile',
          isDefault: d.id === 'doc-nsg-history-profile',
          createdAt: d.created_at ? d.created_at.split('T')[0] : 'Vừa xong',
        }));
      } else if (error) {
        console.warn('Lỗi đọc documents từ Supabase:', error.message || error);
      }
    } catch (err) {
      console.warn('Load documents from DB failed:', err);
    }
  }

  // Dự phòng nếu chưa có tài liệu trong DB hoặc DB chưa kết nối
  return INITIAL_DOCUMENTS.map(d => ({
    ...d,
    isProtected: true,
    isDefault: true,
  }));
}

// =========================================
// 3. THAO TÁC TÀI LIỆU (DOCUMENT MUTATIONS)
// =========================================

export async function addDocumentToDb(doc) {
  if (!isSupabaseConfigured || !supabase) return { success: true };

  try {
    const payload = {
      id: doc.id,
      category_id: doc.categoryId,
      subfolder_id: doc.subFolderId || null,
      title: doc.title,
      description: doc.description || '',
      file_url: doc.fileUrl,
      file_size: doc.fileSize,
      tags: doc.tags || [],
    };

    if (doc.content) {
      payload.content = doc.content;
    }

    let { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });

    if (error && (error.message?.includes('content') || error.code === 'PGRST204')) {
      delete payload.content;
      const res = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.error('Lỗi chèn documents DB:', error.message);
      return { success: false, error: error.message };
    } else {
      console.log('Đã lưu tài liệu thành công vào Supabase DB:', doc.title);
      return { success: true };
    }
  } catch (err) {
    console.error('Add document DB error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateDocumentInDb(doc) {
  if (!isSupabaseConfigured || !supabase) return { success: true };

  try {
    const payload = {
      id: doc.id,
      title: doc.title,
      description: doc.description || '',
      category_id: doc.categoryId,
      subfolder_id: doc.subFolderId || null,
      file_url: doc.fileUrl,
      file_size: doc.fileSize,
      tags: doc.tags || [],
    };

    if (doc.content) {
      payload.content = doc.content;
    }

    let { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });

    if (error && (error.message?.includes('content') || error.code === 'PGRST204')) {
      delete payload.content;
      const res = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.error('LỖI CẬP NHẬT TÀI LIỆU VÀO SUPABASE DB:', error.message || error);
      return { success: false, error: error.message };
    }

    console.log('✅ Đã cập nhật tài liệu vào Supabase DB thành công:', doc.title);
    return { success: true };
  } catch (err) {
    console.error('Update document DB error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteDocumentFromDb(docId, fileUrl = null) {
  // Không cho phép xóa tài liệu hệ thống cốt lõi
  if (docId === 'doc-nsg-history-profile') {
    console.warn('Không thể xóa tài liệu cốt lõi hệ thống:', docId);
    return { success: false, error: 'Protected document' };
  }

  // Dọn dẹp cache IndexedDB nếu có
  try {
    deleteLocalFile(docId);
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('documents').delete().eq('id', docId).select();
      if (error) {
        console.error('LỖI KHI XÓA TÀI LIỆU TRÊN SUPABASE DB:', error.message || error);
        return { success: false, error: error.message };
      }
      console.log('✅ Đã xóa tài liệu khỏi Supabase DB thành công:', docId, data);
    } catch (err) {
      console.error('Delete document DB error:', err);
      return { success: false, error: err.message };
    }

    // Xóa tệp tương ứng trong Supabase Storage bucket nsg-documents
    if (fileUrl && fileUrl.includes('nsg-documents')) {
      try {
        const parts = fileUrl.split('nsg-documents/');
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1].split('?')[0]);
          await supabase.storage.from('nsg-documents').remove([filePath]);
          console.log('✅ Đã dọn dẹp tệp trên Supabase Storage:', filePath);
        }
      } catch (stErr) {
        console.warn('Lỗi khi xóa tệp trên Supabase Storage:', stErr);
      }
    }
  }

  return { success: true };
}

// Thao tác hàng loạt (Bulk Operations)
export async function bulkDeleteDocumentsFromDb(docsOrIds) {
  const items = (docsOrIds || []).map(item => 
    typeof item === 'string' ? { id: item, fileUrl: null } : item
  );
  const safeItems = items.filter(d => d.id !== 'doc-nsg-history-profile');
  const safeDocIds = safeItems.map(d => d.id);
  if (safeDocIds.length === 0) return { success: true };

  // Dọn dẹp cache IndexedDB
  try {
    safeDocIds.forEach(id => deleteLocalFile(id));
  } catch (e) {}

  if (isSupabaseConfigured && supabase && safeDocIds.length > 0) {
    try {
      const { data, error } = await supabase.from('documents').delete().in('id', safeDocIds).select();
      if (error) {
        console.error('LỖI KHI XÓA HÀNG LOẠT TRÊN SUPABASE DB:', error.message || error);
        return { success: false, error: error.message };
      }
      console.log('✅ Đã xóa hàng loạt tài liệu khỏi Supabase DB thành công:', safeDocIds, data);
    } catch (err) {
      console.error('Bulk delete documents error:', err);
      return { success: false, error: err.message };
    }

    // Xóa các tệp trên Supabase Storage
    try {
      const filePathsToRemove = [];
      safeItems.forEach(item => {
        if (item.fileUrl && item.fileUrl.includes('nsg-documents')) {
          const parts = item.fileUrl.split('nsg-documents/');
          if (parts.length > 1) {
            filePathsToRemove.push(decodeURIComponent(parts[1].split('?')[0]));
          }
        }
      });
      if (filePathsToRemove.length > 0) {
        await supabase.storage.from('nsg-documents').remove(filePathsToRemove);
        console.log('✅ Đã dọn dẹp các tệp trên Supabase Storage:', filePathsToRemove);
      }
    } catch (stErr) {
      console.warn('Lỗi dọn dẹp hàng loạt trên Storage:', stErr);
    }
  }

  return { success: true };
}

export async function bulkMoveDocumentsInDb(docIds, targetCategoryId, targetSubFolderId) {
  if (!isSupabaseConfigured || !supabase || !docIds || docIds.length === 0) {
    return { success: true };
  }

  try {
    // 1. Cập nhật các tài liệu đã có trong DB
    await supabase.from('documents').update({
      category_id: targetCategoryId,
      subfolder_id: targetSubFolderId || null,
    }).in('id', docIds);

    // 2. Với tài liệu hệ thống (như doc-nsg-history-profile), nếu chưa có trong DB thì upsert vào
    for (const id of docIds) {
      const initDoc = INITIAL_DOCUMENTS.find(d => d.id === id);
      if (initDoc) {
        const payload = {
          id: initDoc.id,
          title: initDoc.title,
          description: initDoc.description,
          category_id: targetCategoryId,
          subfolder_id: targetSubFolderId || null,
          file_url: initDoc.fileUrl,
          file_size: initDoc.fileSize,
          tags: initDoc.tags || [],
        };
        if (initDoc.content) payload.content = initDoc.content;
        let { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
        if (error && (error.message?.includes('content') || error.code === 'PGRST204')) {
          delete payload.content;
          await supabase.from('documents').upsert(payload, { onConflict: 'id' });
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Bulk move documents error:', err);
    return { success: false, error: err.message };
  }
}
