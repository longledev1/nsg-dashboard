import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_CATEGORIES, INITIAL_SUBFOLDERS, INITIAL_DOCUMENTS } from '../lib/constants';
import { deleteLocalFile } from './localFileStorage';

// Service xử lý Truy vấn & Lưu trữ Dữ liệu Kho Tài liệu Supabase PostgreSQL & Storage

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
    // Blob từ localhost hoặc máy khác -> coi như không khả dụng trên cloud
    return null;
  }

  // 3. Đường dẫn HTTP/HTTPS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Nếu là localhost nhưng đang chạy trên môi trường production (Netlify, v.v.)
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

    const uploadPromise = supabase.storage
      .from('nsg-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Thao tác Upload hết thời gian chờ (Timeout 25s)')), 25000)
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
// 2. TRUY VẤN DỮ LIỆU CƠ SỞ DỮ LIỆU (DATABASE QUERY)
// =========================================

export async function loadCategories() {
  let dbCategories = [];
  let isDbSuccess = false;
  const defaultIds = ['cat-profile', 'cat-fnb', 'cat-estate', 'cat-general'];

  if (isSupabaseConfigured && supabase) {
    try {
      // Chỉ đọc từ database, không tự động upsert gây lỗi 409 Conflict
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        isDbSuccess = true;
        if (data.length > 0) {
          dbCategories = data.map(c => {
            const isDef = defaultIds.includes(c.id);
            return {
              id: c.id,
              name: c.name,
              isDefault: isDef,
              color: c.color,
            };
          });
        }
      }
    } catch (err) {
      console.warn('Load categories from DB failed:', err);
    }
  }

  // Đọc thêm từ localStorage dự phòng
  let localCustomCats = [];
  try {
    const saved = localStorage.getItem('nsg_custom_categories');
    if (saved) localCustomCats = JSON.parse(saved);
  } catch (e) {
    console.error('Lỗi đọc localStorage categories:', e);
  }

  const combinedMap = new Map();
  DEFAULT_CATEGORIES.forEach(c => combinedMap.set(c.id, c));
  dbCategories.forEach(c => {
    combinedMap.set(c.id, { ...c, isDefault: defaultIds.includes(c.id) });
  });

  // Chỉ khi DB offline mới nạp từ localStorage
  if (!isDbSuccess) {
    localCustomCats.forEach(c => {
      combinedMap.set(c.id, { ...c, isDefault: defaultIds.includes(c.id) });
    });
  }

  const allCats = Array.from(combinedMap.values());
  if (isDbSuccess) {
    try {
      const customOnly = allCats.filter(c => !defaultIds.includes(c.id));
      localStorage.setItem('nsg_custom_categories', JSON.stringify(customOnly));
    } catch (e) {}
  }

  return allCats;
}

// Helper sắp xếp subfolders với General luôn đứng đầu danh sách
export function sortSubFoldersWithGeneralFirst(subfolders = []) {
  return [...subfolders].sort((a, b) => {
    const aGen = a.isDefault || a.name?.toLowerCase() === 'general' || a.id === 'sub-general' || a.id?.startsWith('sub-general-');
    const bGen = b.isDefault || b.name?.toLowerCase() === 'general' || b.id === 'sub-general' || b.id?.startsWith('sub-general-');
    if (aGen && !bGen) return -1;
    if (!aGen && bGen) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function loadSubFolders() {
  let dbSubFolders = [];
  let isDbSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      // Tải danh sách subfolders từ Database thuần túy
      const { data, error } = await supabase.from('subfolders').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        isDbSuccess = true;
        dbSubFolders = data.map(s => ({
          id: s.id,
          categoryId: s.category_id,
          name: s.name,
          description: s.description || '',
          isDefault: s.is_default || false,
        }));
      }
    } catch (err) {
      console.warn('Load subfolders from DB failed:', err);
    }
  }

  // Đọc thêm từ localStorage dự phòng
  let localCustomSubs = [];
  try {
    const saved = localStorage.getItem('nsg_custom_subfolders');
    if (saved) {
      const parsed = JSON.parse(saved);
      localCustomSubs = (Array.isArray(parsed) ? parsed : []).filter(s => 
        s.id !== 'sub-exocafe' && 
        s.id !== 'sub-exotel' && 
        s.id !== 'sub-general' &&
        !s.id?.startsWith('sub-general') &&
        s.name?.toLowerCase() !== 'general'
      );
    }
  } catch (e) {
    console.error('Lỗi đọc localStorage subfolders:', e);
  }

  const combinedMap = new Map();
  INITIAL_SUBFOLDERS.forEach(s => combinedMap.set(s.id, s));
  dbSubFolders.forEach(s => combinedMap.set(s.id, s));

  // Chỉ khi DB offline mới nạp từ localStorage
  if (!isDbSuccess) {
    localCustomSubs.forEach(s => {
      combinedMap.set(s.id, s);
    });
  }

  const allSubs = Array.from(combinedMap.values());
  if (isDbSuccess) {
    try {
      const customOnly = allSubs.filter(s => 
        s.id !== 'sub-exocafe' && 
        s.id !== 'sub-exotel' && 
        s.id !== 'sub-general' &&
        !s.id?.startsWith('sub-general') &&
        s.name?.toLowerCase() !== 'general'
      );
      localStorage.setItem('nsg_custom_subfolders', JSON.stringify(customOnly));
    } catch (e) {}
  }

  return sortSubFoldersWithGeneralFirst(allSubs);
}

export async function loadDocuments(subFolders = []) {
  let dbDocs = [];
  let isDbSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        isDbSuccess = true;
        dbDocs = data.map(d => ({
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
          createdAt: d.created_at ? d.created_at.split('T')[0] : 'Vừa xong',
        }));
      } else if (error) {
        console.warn('Lỗi đọc documents từ Supabase:', error.message || error);
      }
    } catch (err) {
      console.warn('Load documents from DB failed:', err);
    }
  }

  // Lấy dữ liệu từ LocalStorage dự phòng
  let localDocs = [];
  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    if (saved) {
      const parsed = JSON.parse(saved);
      localDocs = (Array.isArray(parsed) ? parsed : []).map(d => ({
        ...d,
        fileType: detectDocumentFileType(d),
        fileUrl: sanitizeFileUrl(d.fileUrl || d.file_url)
      }));
    }
  } catch (e) {
    console.error('Lỗi đọc localStorage documents:', e);
  }

  const combinedMap = new Map();
  // 1. Nạp tài liệu hệ thống mặc định
  INITIAL_DOCUMENTS.forEach(d => combinedMap.set(d.id, { ...d, isProtected: true, isDefault: true }));

  // 2. Nạp từ Supabase DB (Database ghi đè categoryId, subFolderId, content, tags đã lưu)
  dbDocs.forEach(d => {
    if (combinedMap.has(d.id)) {
      const existing = combinedMap.get(d.id);
      const isWord = existing.fileType === 'word' || d.fileType === 'word' || d.id === 'doc-nsg-history-profile' || detectDocumentFileType(d) === 'word';
      combinedMap.set(d.id, {
        ...existing,
        ...d,
        fileType: isWord ? 'word' : (d.fileType || existing.fileType || 'pdf'),
        fileUrl: d.fileUrl || existing.fileUrl,
        content: d.content || existing.content,
        isProtected: existing.isProtected || d.id === 'doc-nsg-history-profile',
        isDefault: existing.isDefault || d.id === 'doc-nsg-history-profile',
      });
    } else {
      const isProt = d.id === 'doc-nsg-history-profile';
      combinedMap.set(d.id, { 
        ...d, 
        fileType: detectDocumentFileType(d),
        isProtected: isProt, 
        isDefault: isProt 
      });
    }
  });

  // 3. Xử lý LocalStorage:
  if (isDbSuccess) {
    // Nếu kết nối DB thành công: Database là NGUỒN SỰ THẬT DUY NHẤT.
    // CHỈ bổ sung fileUrl/content nếu DB chưa có nhưng local có (ví dụ vừa upload tạm).
    // TUYỆT ĐỐI KHÔNG thêm tài liệu không có trong DB vì tài liệu đó đã bị xóa trên tab/thiết bị khác!
    localDocs.forEach(d => {
      if (combinedMap.has(d.id)) {
        const existing = combinedMap.get(d.id);
        if (!existing.fileUrl && d.fileUrl) {
          combinedMap.set(d.id, {
            ...existing,
            fileUrl: d.fileUrl,
          });
        }
      }
    });
  } else {
    // CHỈ KHI DATABASE MẤT KẾT NỐI (Offline fallback) mới nạp toàn bộ từ localStorage:
    localDocs.forEach(d => {
      if (combinedMap.has(d.id)) {
        const existing = combinedMap.get(d.id);
        combinedMap.set(d.id, {
          ...existing,
          ...d,
          fileUrl: d.fileUrl || existing.fileUrl,
          categoryId: d.categoryId || existing.categoryId,
          subFolderId: d.subFolderId !== undefined ? d.subFolderId : existing.subFolderId,
          content: d.content || existing.content,
          isProtected: existing.isProtected || d.id === 'doc-nsg-history-profile',
          isDefault: existing.isDefault || d.id === 'doc-nsg-history-profile',
        });
      } else {
        const isProt = d.id === 'doc-nsg-history-profile';
        combinedMap.set(d.id, { ...d, isProtected: isProt, isDefault: isProt });
      }
    });
  }

  const allDocs = Array.from(combinedMap.values());

  // Lưu lại danh sách chuẩn xác vào localStorage (đồng bộ xóa các file đã bị xóa trên DB khỏi localStorage)
  if (isDbSuccess) {
    try {
      localStorage.setItem('nsg_custom_documents', JSON.stringify(allDocs));
    } catch (e) {}
  }

  return allDocs;
}

// =========================================
// 3. MUTATIONS LƯU CƠ SỞ DỮ LIỆU
// =========================================

export async function addCategoryToDb(category) {
  // 1. Lưu vào LocalStorage dự phòng
  try {
    const saved = localStorage.getItem('nsg_custom_categories');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [...existing.filter(c => c.id !== category.id), category];
    localStorage.setItem('nsg_custom_categories', JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi lưu category vào localStorage:', e);
  }

  // 2. Đồng bộ lên Supabase DB
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('categories').upsert({
        id: category.id,
        name: category.name,
        slug: category.name.toLowerCase().replace(/\s+/g, '-'),
        is_default: category.isDefault || false,
        color: category.color || '#d0aa61',
      }, { onConflict: 'id' });

      if (error) {
        console.error('Lỗi khi lưu category vào Supabase DB:', error.message || error);
      }
    } catch (err) {
      console.error('Add category error:', err);
    }
  }
}

export async function updateCategoryInDb(catId, newName) {
  // 1. Cập nhật LocalStorage dự phòng
  try {
    const saved = localStorage.getItem('nsg_custom_categories');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.map(c => c.id === catId ? { ...c, name: newName } : c);
      localStorage.setItem('nsg_custom_categories', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi cập nhật category trong localStorage:', e);
  }

  // 2. Cập nhật Supabase DB
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').update({
        name: newName,
        slug: newName.toLowerCase().replace(/\s+/g, '-'),
      }).eq('id', catId);
    } catch (err) {
      console.error('Update category error:', err);
    }
  }
}

export async function deleteCategoryFromDb(catId, targetCategoryId = 'cat-general', updatedDocs = null) {
  const defaultIds = ['cat-profile', 'cat-fnb', 'cat-estate', 'cat-general'];
  if (defaultIds.includes(catId)) {
    console.warn('Không thể xóa danh mục hệ thống mặc định:', catId);
    return;
  }

  // 1. Xóa khỏi LocalStorage dự phòng
  try {
    if (updatedDocs) {
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updatedDocs));
    }
    const saved = localStorage.getItem('nsg_custom_categories');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.filter(c => c.id !== catId);
      localStorage.setItem('nsg_custom_categories', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi xóa category khỏi localStorage:', e);
  }

  // 2. Xóa khỏi Supabase DB & chuyển tài liệu về General
  if (isSupabaseConfigured && supabase) {
    try {
      // Chuyển tài liệu về General
      await supabase.from('documents').update({
        category_id: targetCategoryId,
        subfolder_id: null,
      }).eq('category_id', catId);

      // Xóa các subfolder thuộc category này
      await supabase.from('subfolders').delete().eq('category_id', catId);

      // Xóa category
      await supabase.from('categories').delete().eq('id', catId);
    } catch (err) {
      console.error('Delete category error:', err);
    }
  }
}

export async function addSubFolderToDb(subFolder) {
  // 1. Lập tức lưu vào LocalStorage dự phòng (Đảm bảo F5 100% không mất)
  try {
    const saved = localStorage.getItem('nsg_custom_subfolders');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [...existing.filter(s => s.id !== subFolder.id), subFolder];
    localStorage.setItem('nsg_custom_subfolders', JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi lưu subfolder vào localStorage:', e);
  }

  // 2. Đồng bộ lên Supabase Database Online
  if (isSupabaseConfigured && supabase) {
    try {
      // 2a. Đảm bảo 3 danh mục mặc định luôn sẵn sàng trong bảng `categories`
      await supabase.from('categories').upsert([
        { id: 'cat-fnb', name: 'FNB', slug: 'fnb', is_default: true, color: '#059669' },
        { id: 'cat-estate', name: 'Estate', slug: 'estate', is_default: true, color: '#b45309' },
        { id: 'cat-general', name: 'General', slug: 'general', is_default: true, color: '#d0aa61' }
      ], { onConflict: 'id' });

      // 2b. Nếu categoryId là custom category, đảm bảo chèn trước vào `categories`
      if (subFolder.categoryId && !['cat-fnb', 'cat-estate', 'cat-general'].includes(subFolder.categoryId)) {
        await supabase.from('categories').upsert({
          id: subFolder.categoryId,
          name: subFolder.categoryId,
          slug: subFolder.categoryId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          is_default: false,
          color: '#d0aa61',
        }, { onConflict: 'id' });
      }

      // 2c. Gửi payload chuẩn (id, category_id, name, description) vào bảng `subfolders`
      const subPayload = {
        id: subFolder.id,
        category_id: subFolder.categoryId,
        name: subFolder.name,
        description: subFolder.description || '',
      };

      const { data, error } = await supabase
        .from('subfolders')
        .upsert(subPayload, { onConflict: 'id' });

      if (error) {
        console.error('LỖI GHI SUBFOLDER VÀO SUPABASE DB:', error.message || error);
      } else {
        console.log('✅ ĐÃ GHI THÀNH CÔNG SUBFOLDER VÀO SUPABASE DB:', subFolder.name, data);
      }
    } catch (err) {
      console.error('Add subfolder exception:', err);
    }
  }
}

export async function updateSubFolderInDb(subFolderId, newName) {
  // 1. Cập nhật LocalStorage dự phòng
  try {
    const saved = localStorage.getItem('nsg_custom_subfolders');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.map(s => s.id === subFolderId ? { ...s, name: newName } : s);
      localStorage.setItem('nsg_custom_subfolders', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi cập nhật subfolder trong localStorage:', e);
  }

  // 2. Cập nhật Supabase Database
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('subfolders').update({ name: newName }).eq('id', subFolderId);
    } catch (err) {
      console.error('Update subfolder error:', err);
    }
  }
}

export async function moveSubFolderInDb(subFolderId, newCategoryId) {
  // 1. Cập nhật LocalStorage subfolders
  try {
    const savedSubs = localStorage.getItem('nsg_custom_subfolders');
    if (savedSubs) {
      const existing = JSON.parse(savedSubs);
      const updated = existing.map(s => s.id === subFolderId ? { ...s, categoryId: newCategoryId } : s);
      localStorage.setItem('nsg_custom_subfolders', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi cập nhật subfolder categoryId trong localStorage:', e);
  }

  // 2. Cập nhật LocalStorage documents thuộc subfolder này
  try {
    const savedDocs = localStorage.getItem('nsg_custom_documents');
    if (savedDocs) {
      const docs = JSON.parse(savedDocs);
      const updated = docs.map(d => d.subFolderId === subFolderId ? { ...d, categoryId: newCategoryId } : d);
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi cập nhật documents categoryId trong localStorage khi chuyển subfolder:', e);
  }

  // 3. Cập nhật Supabase DB
  if (isSupabaseConfigured && supabase) {
    try {
      // 3a. Cập nhật category_id của subfolder
      await supabase
        .from('subfolders')
        .update({ category_id: newCategoryId })
        .eq('id', subFolderId);

      // 3b. Cập nhật category_id của tất cả documents thuộc subfolder này
      await supabase
        .from('documents')
        .update({ category_id: newCategoryId })
        .eq('subfolder_id', subFolderId);
    } catch (err) {
      console.error('Move subfolder DB error:', err);
    }
  }
}

export async function deleteSubFolderFromDb(
  subFolderId,
  targetSubFolderId = null,
  targetCategoryId = 'cat-general',
  updatedDocuments = null
) {
  // 1. Cập nhật localStorage documents để chuyển ngay các tài liệu sang danh mục cha General
  try {
    if (updatedDocuments) {
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updatedDocuments));
    } else {
      const savedDocs = localStorage.getItem('nsg_custom_documents');
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        const updated = docs.map(d => 
          d.subFolderId === subFolderId 
            ? { ...d, subFolderId: null, categoryId: 'cat-general' } 
            : d
        );
        localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
      }
    }
  } catch (e) {
    console.error('Lỗi cập nhật documents trong localStorage khi xóa subfolder:', e);
  }

  // 2. Xóa khỏi LocalStorage subfolders
  try {
    const saved = localStorage.getItem('nsg_custom_subfolders');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.filter(s => s.id !== subFolderId);
      localStorage.setItem('nsg_custom_subfolders', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi xóa subfolder khỏi localStorage:', e);
  }

  // 3. Xóa khỏi Supabase Database & Cập nhật các tài liệu sang danh mục cha General
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('documents')
        .update({ subfolder_id: null, category_id: 'cat-general' })
        .eq('subfolder_id', subFolderId);

      await supabase.from('subfolders').delete().eq('id', subFolderId);
    } catch (err) {
      console.error('Delete subfolder error:', err);
    }
  }
}

export async function addDocumentToDb(doc) {
  // 1. Lưu vào LocalStorage dự phòng
  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [doc, ...existing.filter(d => d.id !== doc.id)];
    localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi lưu document vào localStorage:', e);
  }

  // 2. Đồng bộ lên Supabase Database bằng upsert
  if (isSupabaseConfigured && supabase) {
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
        // Nếu DB chưa có cột content, thử lại không có cột content
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
  return { success: true };
}

export async function updateDocumentInDb(doc) {
  // 1. Cập nhật LocalStorage dự phòng
  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = existing.some(d => d.id === doc.id)
      ? existing.map(d => d.id === doc.id ? { ...d, ...doc } : d)
      : [...existing, doc];
    localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi cập nhật document trong localStorage:', e);
  }

  // 2. Đồng bộ lên Supabase DB
  if (isSupabaseConfigured && supabase) {
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
        // Nếu DB chưa có cột content, thử lại không có cột content
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

  return { success: true };
}

export async function deleteDocumentFromDb(docId, fileUrl = null) {
  // Không cho phép xóa tài liệu hệ thống cốt lõi
  if (docId === 'doc-nsg-history-profile') {
    console.warn('Không thể xóa tài liệu cốt lõi hệ thống:', docId);
    return { success: false, error: 'Protected document' };
  }

  // 1. Xóa khỏi LocalStorage dự phòng & IndexedDB
  try {
    deleteLocalFile(docId);
    const saved = localStorage.getItem('nsg_custom_documents');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.filter(d => d.id !== docId);
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi xóa document khỏi localStorage:', e);
  }

  // 2. Xóa khỏi Supabase DB
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

    // 3. Xóa tệp tương ứng trong Supabase Storage bucket nsg-documents
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

  // 1. Xóa khỏi LocalStorage dự phòng & IndexedDB
  try {
    safeDocIds.forEach(id => deleteLocalFile(id));
    const saved = localStorage.getItem('nsg_custom_documents');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.filter(d => !safeDocIds.includes(d.id));
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi xóa hàng loạt khỏi localStorage:', e);
  }

  // 2. Xóa khỏi Supabase DB
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

    // 3. Xóa các tệp trên Supabase Storage
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
  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = existing.map(d => 
      docIds.includes(d.id) 
        ? { ...d, categoryId: targetCategoryId, subFolderId: targetSubFolderId || null } 
        : d
    );

    // Đảm bảo tất cả docIds được lưu vào localDocs
    docIds.forEach(id => {
      if (!updated.some(d => d.id === id)) {
        const initDoc = INITIAL_DOCUMENTS.find(d => d.id === id);
        if (initDoc) {
          updated.push({
            ...initDoc,
            categoryId: targetCategoryId,
            subFolderId: targetSubFolderId || null,
          });
        }
      }
    });

    localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi di chuyển hàng loạt trong localStorage:', e);
  }

  if (isSupabaseConfigured && supabase && docIds.length > 0) {
    try {
      // 1. Cập nhật các tài liệu đã có trong DB
      await supabase.from('documents').update({
        category_id: targetCategoryId,
        subfolder_id: targetSubFolderId || null,
      }).in('id', docIds);

      // 2. Với tài liệu hệ thống (như doc-nsg-history-profile), nếu chưa có trong DB thì upsert vào
      for (const id of docIds) {
        const initDoc = INITIAL_DOCUMENTS.find(d => d.id === id);
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
    } catch (err) {
      console.error('Bulk move documents error:', err);
    }
  }
}
