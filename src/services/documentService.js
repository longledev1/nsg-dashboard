import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_CATEGORIES, INITIAL_SUBFOLDERS, INITIAL_DOCUMENTS } from '../lib/constants';
import { deleteLocalFile } from './localFileStorage';

// Service xử lý Truy vấn & Lưu trữ Dữ liệu Kho Tài liệu Supabase PostgreSQL & Storage

// =========================================
// 1. TẢI TỆP LÊN SUPABASE STORAGE BUCKET ('nsg-documents')
// =========================================
export async function uploadPdfFileToStorage(file) {
  if (!isSupabaseConfigured || !supabase || !file) {
    console.warn('Supabase client chưa được cấu hình!');
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    console.log('Đang upload file lên Supabase Storage:', filePath);

    const uploadPromise = supabase.storage
      .from('nsg-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Thao tác Upload hết thời gian chờ (Timeout 8s)')), 8000)
    );

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      console.error('Lỗi Supabase Storage Upload:', error.message || error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('nsg-documents')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Lỗi ngoại lệ khi upload Storage:', err.message || err);
    return null;
  }
}

// =========================================
// 2. TRUY VẤN DỮ LIỆU CƠ SỞ DỮ LIỆU (DATABASE QUERY)
// =========================================

export async function loadCategories() {
  let dbCategories = [];
  const defaultIds = ['cat-profile', 'cat-fnb', 'cat-estate', 'cat-general'];

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Đảm bảo 4 danh mục mặc định luôn tồn tại trong DB
      await supabase.from('categories').upsert([
        { id: 'cat-profile', name: 'Hồ Sơ Năng Lực', slug: 'ho-so-nang-luc', is_default: true, color: '#9f7a35' },
        { id: 'cat-fnb', name: 'FNB', slug: 'fnb', is_default: true, color: '#059669' },
        { id: 'cat-estate', name: 'Estate', slug: 'estate', is_default: true, color: '#b45309' },
        { id: 'cat-general', name: 'General', slug: 'general', is_default: true, color: '#d0aa61' }
      ], { onConflict: 'id' });

      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
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
  localCustomCats.forEach(c => {
    combinedMap.set(c.id, { ...c, isDefault: defaultIds.includes(c.id) });
  });

  return Array.from(combinedMap.values());
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

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Đảm bảo danh mục mặc định tồn tại trong DB trước
      await supabase.from('categories').upsert([
        { id: 'cat-profile', name: 'Hồ Sơ Năng Lực', slug: 'ho-so-nang-luc', is_default: true, color: '#9f7a35' },
        { id: 'cat-fnb', name: 'FNB', slug: 'fnb', is_default: true, color: '#059669' },
        { id: 'cat-estate', name: 'Estate', slug: 'estate', is_default: true, color: '#b45309' },
        { id: 'cat-general', name: 'General', slug: 'general', is_default: true, color: '#d0aa61' }
      ], { onConflict: 'id' });

      // 2. Xóa triệt để ExoCafe, Exotel & các folder con General khỏi Supabase Database nếu còn tồn tại
      await supabase
        .from('subfolders')
        .delete()
        .or('id.eq.sub-exocafe,id.eq.sub-exotel,id.eq.sub-general,id.eq.sub-general-cat-fnb,id.eq.sub-general-cat-estate,name.ilike.%ExoCafe%,name.ilike.%Exotel%,name.ilike.general')
        .then(() => {})
        .catch(() => {});

      // 3. Tải danh sách subfolders từ Database
      const { data, error } = await supabase.from('subfolders').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        dbSubFolders = data
          .filter(s => 
            s.id !== 'sub-exocafe' && 
            s.id !== 'sub-exotel' && 
            s.id !== 'sub-general' &&
            !s.id?.startsWith('sub-general') &&
            s.name?.toLowerCase() !== 'general' &&
            !s.name?.toLowerCase().includes('exocafe') && 
            !s.name?.toLowerCase().includes('exotel')
          )
          .map(s => ({
            id: s.id,
            categoryId: s.category_id,
            name: s.name,
            description: s.description,
            isDefault: Boolean(s.is_default),
          }));
      }
    } catch (err) {
      console.warn('Load subfolders from DB failed:', err);
    }
  }

  // 4. Lấy dữ liệu từ localStorage làm tầng lưu trữ dự phòng siêu tốc
  let localCustomSubs = [];
  try {
    const saved = localStorage.getItem('nsg_custom_subfolders');
    if (saved) {
      const parsed = JSON.parse(saved);
      localCustomSubs = parsed.filter(s => 
        s.id !== 'sub-exocafe' && 
        s.id !== 'sub-exotel' && 
        s.id !== 'sub-general' &&
        !s.id?.startsWith('sub-general') &&
        s.name?.toLowerCase() !== 'general'
      );
      // Cập nhật lại localStorage để dọn sạch các subfolder General cũ
      localStorage.setItem('nsg_custom_subfolders', JSON.stringify(localCustomSubs));
    }
  } catch (e) {
    console.error('Lỗi đọc localStorage subfolders:', e);
  }

  const combinedMap = new Map();
  INITIAL_SUBFOLDERS.forEach(s => combinedMap.set(s.id, s));
  dbSubFolders.forEach(s => combinedMap.set(s.id, s));
  localCustomSubs.forEach(s => {
    combinedMap.set(s.id, s);
  });

  return sortSubFoldersWithGeneralFirst(Array.from(combinedMap.values()));
}

export async function loadDocuments(subFolders = []) {
  let dbDocs = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        dbDocs = data.map(d => ({
          id: d.id,
          categoryId: d.category_id,
          subFolderId: d.subfolder_id,
          title: d.title,
          description: d.description,
          content: d.content || d.description || '',
          fileUrl: d.file_url,
          fileSize: d.file_size,
          fileType: d.title.endsWith('.docx') || d.title.endsWith('.doc') ? 'word' : 'pdf',
          tags: d.tags || [],
          createdAt: d.created_at ? d.created_at.split('T')[0] : 'Vừa xong',
        }));
      }
    } catch (err) {
      console.warn('Load documents from DB failed:', err);
    }
  }

  // Lấy dữ liệu từ LocalStorage dự phòng
  let localDocs = [];
  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    if (saved) localDocs = JSON.parse(saved);
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
      combinedMap.set(d.id, {
        ...existing,
        ...d,
        content: d.content || existing.content,
        isProtected: existing.isProtected || d.id === 'doc-nsg-history-profile',
        isDefault: existing.isDefault || d.id === 'doc-nsg-history-profile',
      });
    } else {
      const isProt = d.id === 'doc-nsg-history-profile';
      combinedMap.set(d.id, { ...d, isProtected: isProt, isDefault: isProt });
    }
  });

  // 3. Nạp từ LocalStorage (giữ nguyên vị trí categoryId & subFolderId đã được người dùng chỉnh sửa)
  localDocs.forEach(d => {
    if (combinedMap.has(d.id)) {
      const existing = combinedMap.get(d.id);
      combinedMap.set(d.id, {
        ...existing,
        ...d,
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

  const allDocs = Array.from(combinedMap.values());

  try {
    localStorage.setItem('nsg_custom_documents', JSON.stringify(allDocs));
  } catch (e) {}

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
        subfolder_id: doc.subFolderId,
        title: doc.title,
        description: doc.description,
        file_url: doc.fileUrl,
        file_size: doc.fileSize,
        tags: doc.tags,
      };

      if (doc.content) {
        payload.content = doc.content;
      }

      let { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });

      if (error && error.message?.includes('content')) {
        // Nếu DB chưa có cột content, thử lại không có cột content
        delete payload.content;
        const res = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
        error = res.error;
      }

      if (error) {
        console.error('Lỗi chèn documents DB:', error.message);
      } else {
        console.log('Đã lưu tài liệu thành công vào Supabase DB:', doc.title);
      }
    } catch (err) {
      console.error('Add document DB error:', err);
    }
  }
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

  // 2. Đồng bộ lên Supabase DB (dùng upsert để nếu tài liệu hệ thống chưa có trong bảng documents thì tự insert vào DB)
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('documents').upsert({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        content: doc.content || '',
        category_id: doc.categoryId,
        subfolder_id: doc.subFolderId || null,
        file_url: doc.fileUrl,
        file_size: doc.fileSize,
        file_type: doc.fileType,
        tags: doc.tags,
      }, { onConflict: 'id' });
    } catch (err) {
      console.error('Update document DB error:', err);
    }
  }
}

export async function deleteDocumentFromDb(docId) {
  // Không cho phép xóa tài liệu hệ thống cốt lõi
  if (docId === 'doc-nsg-history-profile') {
    console.warn('Không thể xóa tài liệu cốt lõi hệ thống:', docId);
    return;
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
      await supabase.from('documents').delete().eq('id', docId);
    } catch (err) {
      console.error('Delete document DB error:', err);
    }
  }
}

// Thao tác hàng loạt (Bulk Operations)
export async function bulkDeleteDocumentsFromDb(docIds) {
  const safeDocIds = (docIds || []).filter(id => id !== 'doc-nsg-history-profile');
  if (safeDocIds.length === 0) return;

  try {
    const saved = localStorage.getItem('nsg_custom_documents');
    if (saved) {
      const existing = JSON.parse(saved);
      const updated = existing.filter(d => !safeDocIds.includes(d.id));
      localStorage.setItem('nsg_custom_documents', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Lỗi xóa hàng loạt khỏi localStorage:', e);
  }

  if (isSupabaseConfigured && supabase && safeDocIds.length > 0) {
    try {
      await supabase.from('documents').delete().in('id', safeDocIds);
    } catch (err) {
      console.error('Bulk delete documents error:', err);
    }
  }
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
        if (initDoc) {
          await supabase.from('documents').upsert({
            id: initDoc.id,
            title: initDoc.title,
            description: initDoc.description,
            content: initDoc.content || '',
            category_id: targetCategoryId,
            subfolder_id: targetSubFolderId || null,
            file_url: initDoc.fileUrl,
            file_size: initDoc.fileSize,
            file_type: initDoc.fileType,
            tags: initDoc.tags,
          }, { onConflict: 'id' });
        }
      }
    } catch (err) {
      console.error('Bulk move documents error:', err);
    }
  }
}
