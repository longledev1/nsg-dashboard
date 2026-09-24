import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_SUBFOLDERS } from '../lib/constants';

// =========================================
// SUBFOLDER SERVICE (QUẢN LÝ FOLDER DỰ ÁN)
// Single Source of Truth: Supabase PostgreSQL
// =========================================

/**
 * Helper sắp xếp subfolders với General luôn đứng đầu danh sách
 */
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('subfolders')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(s => ({
          id: s.id,
          categoryId: s.category_id,
          name: s.name,
          description: s.description || '',
          isDefault: s.is_default || false,
        }));
        return sortSubFoldersWithGeneralFirst(mapped);
      }
    } catch (err) {
      console.warn('Load subfolders from DB failed:', err);
    }
  }

  // Dự phòng danh mục mặc định ban đầu nếu DB chưa có bản ghi
  return sortSubFoldersWithGeneralFirst(INITIAL_SUBFOLDERS);
}

export async function addSubFolderToDb(subFolder) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // 1. Đảm bảo các danh mục mặc định sẵn sàng
    await supabase.from('categories').upsert([
      { id: 'cat-fnb', name: 'FNB', slug: 'fnb', is_default: true, color: '#059669' },
      { id: 'cat-estate', name: 'Estate', slug: 'estate', is_default: true, color: '#b45309' },
      { id: 'cat-general', name: 'General', slug: 'general', is_default: true, color: '#d0aa61' }
    ], { onConflict: 'id' });

    // 2. Chèn vào bảng subfolders
    const subPayload = {
      id: subFolder.id,
      category_id: subFolder.categoryId,
      name: subFolder.name,
      description: subFolder.description || '',
    };

    const { error } = await supabase
      .from('subfolders')
      .upsert(subPayload, { onConflict: 'id' });

    if (error) {
      console.error('LỖI GHI SUBFOLDER VÀO SUPABASE DB:', error.message || error);
    }
  } catch (err) {
    console.error('Add subfolder exception:', err);
  }
}

export async function updateSubFolderInDb(subFolderId, newName) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('subfolders').update({ name: newName }).eq('id', subFolderId);
  } catch (err) {
    console.error('Update subfolder error:', err);
  }
}

export async function moveSubFolderInDb(subFolderId, newCategoryId) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // 1. Cập nhật category_id của subfolder
    await supabase
      .from('subfolders')
      .update({ category_id: newCategoryId })
      .eq('id', subFolderId);

    // 2. Cập nhật category_id của tất cả documents thuộc subfolder này
    await supabase
      .from('documents')
      .update({ category_id: newCategoryId })
      .eq('subfolder_id', subFolderId);
  } catch (err) {
    console.error('Move subfolder DB error:', err);
  }
}

export async function deleteSubFolderFromDb(
  subFolderId,
  targetSubFolderId = null,
  targetCategoryId = 'cat-general'
) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // 1. Chuyển các tài liệu sang danh mục cha General
    await supabase
      .from('documents')
      .update({ subfolder_id: null, category_id: targetCategoryId })
      .eq('subfolder_id', subFolderId);

    // 2. Xóa subfolder khỏi database
    await supabase.from('subfolders').delete().eq('id', subFolderId);
  } catch (err) {
    console.error('Delete subfolder error:', err);
  }
}
