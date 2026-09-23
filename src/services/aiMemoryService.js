// ==============================================================================
// SERVICE QUẢN LÝ BỘ NHỚ & CHỈ THỊ ĐỘNG CỦA AI (AI MEMORY SERVICE)
// Đồng bộ Supabase bảng `ai_memories` & lưu trữ dự phòng LocalStorage
// ==============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

const LOCAL_STORAGE_KEY = "nsg_ai_memories";

// In-memory cache
let cachedMemories = null;

/**
 * 1. TẢI TOÀN BỘ BỘ NHỚ AI TỪ SUPABASE (KÈM DỰ PHÒNG LOCALSTORAGE)
 */
export async function loadAiMemories(forceRefresh = false) {
  if (cachedMemories && !forceRefresh) {
    return cachedMemories;
  }

  let dbMemories = [];
  let isDbSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_memories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        isDbSuccess = true;
        dbMemories = data.map((item) => ({
          id: item.id,
          content: item.content,
          type: item.type || "remember", // 'remember' hoặc 'forget'
          isActive: item.is_active !== false,
          createdAt: item.created_at,
        }));
      } else if (error) {
        console.warn("Lỗi đọc ai_memories từ Supabase:", error.message || error);
      }
    } catch (err) {
      console.warn("Ngoại lệ khi truy vấn ai_memories:", err.message || err);
    }
  }

  // Đọc dự phòng từ LocalStorage
  let localMemories = [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      localMemories = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Lỗi đọc localStorage ai_memories:", e);
  }

  const finalMap = new Map();
  if (isDbSuccess) {
    dbMemories.forEach((m) => finalMap.set(m.id, m));
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbMemories));
    } catch (e) {}
  } else {
    localMemories.forEach((m) => finalMap.set(m.id, m));
  }

  cachedMemories = Array.from(finalMap.values());
  return cachedMemories;
}

/**
 * 2. THÊM GHI NHỚ MỚI (TYPE: 'remember' | 'forget')
 */
export async function addAiMemory(content, type = "remember") {
  const cleanContent = content.trim();
  if (!cleanContent) return { data: null, error: "Nội dung không được để trống" };

  const newId = crypto.randomUUID ? crypto.randomUUID() : `mem-${Date.now()}`;
  const memoryObj = {
    id: newId,
    content: cleanContent,
    type,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_memories")
        .insert([
          {
            id: newId,
            content: cleanContent,
            type,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        memoryObj.id = data.id;
        memoryObj.createdAt = data.created_at;
      } else if (error) {
        console.warn("Lỗi thêm memory vào Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Ngoại lệ insert ai_memories:", err);
    }
  }

  // Cập nhật cache & LocalStorage
  const current = await loadAiMemories();
  const updated = [memoryObj, ...current.filter((m) => m.id !== memoryObj.id)];
  cachedMemories = updated;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  return { data: memoryObj, error: null };
}

/**
 * 3. BẬT / TẮT HIỆU LỰC GHI NHỚ
 */
export async function toggleAiMemory(id, newStatus) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("ai_memories")
        .update({ is_active: newStatus })
        .eq("id", id);
    } catch (e) {
      console.warn("Lỗi update ai_memories trên Supabase:", e);
    }
  }

  const current = await loadAiMemories();
  const updated = current.map((m) =>
    m.id === id ? { ...m, isActive: newStatus } : m
  );
  cachedMemories = updated;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  return updated;
}

/**
 * 4. XÓA BỘ NHỚ AI KHỎI HỆ THỐNG
 */
export async function deleteAiMemory(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("ai_memories").delete().eq("id", id);
    } catch (e) {
      console.warn("Lỗi xóa ai_memories trên Supabase:", e);
    }
  }

  const current = await loadAiMemories();
  const updated = current.filter((m) => m.id !== id);
  cachedMemories = updated;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  return updated;
}
