import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_CATEGORIES } from '../lib/constants';

// =========================================
// CATEGORY SERVICE (QUẢN LÝ DANH MỤC)
// Single Source of Truth: Supabase PostgreSQL
// =========================================

/**
 * Helper sắp xếp Danh mục với General (cha) luôn đứng đầu danh sách
 */
export function sortCategoriesWithGeneralFirst(categories = []) {
  return [...categories].sort((a, b) => {
    const aGen = a.id === 'cat-general' || a.name?.trim().toLowerCase() === 'general';
    const bGen = b.id === 'cat-general' || b.name?.trim().toLowerCase() === 'general';
    if (aGen && !bGen) return -1;
    if (!aGen && bGen) return 1;
    return 0;
  });
}

export async function loadCategories() {
  const defaultIds = ['cat-profile', 'cat-fnb', 'cat-estate', 'cat-general'];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(c => ({
          id: c.id,
          name: c.name,
          isDefault: defaultIds.includes(c.id),
          color: c.color,
        }));
        return sortCategoriesWithGeneralFirst(mapped);
      }
    } catch (err) {
      console.warn('Load categories from DB failed:', err);
    }
  }

  // Dự phòng danh mục mặc định ban đầu nếu DB chưa có bản ghi
  return sortCategoriesWithGeneralFirst(DEFAULT_CATEGORIES);
}

export async function addCategoryToDb(category) {
  if (!isSupabaseConfigured || !supabase) return;

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

export async function updateCategoryInDb(catId, newName) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('categories').update({
      name: newName,
      slug: newName.toLowerCase().replace(/\s+/g, '-'),
    }).eq('id', catId);
  } catch (err) {
    console.error('Update category error:', err);
  }
}

export async function deleteCategoryFromDb(catId, targetCategoryId = 'cat-general') {
  const defaultIds = ['cat-profile', 'cat-fnb', 'cat-estate', 'cat-general'];
  if (defaultIds.includes(catId)) {
    console.warn('Không thể xóa danh mục hệ thống mặc định:', catId);
    return;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Chuyển tài liệu về General
      await supabase.from('documents').update({
        category_id: targetCategoryId,
        subfolder_id: null,
      }).eq('category_id', catId);

      // 2. Xóa các subfolder thuộc category này
      await supabase.from('subfolders').delete().eq('category_id', catId);

      // 3. Xóa category
      await supabase.from('categories').delete().eq('id', catId);
    } catch (err) {
      console.error('Delete category error:', err);
    }
  }
}
