// ==============================================================================
// SERVICE QUẢN LÝ BỘ NHỚ & CHỈ THỊ ĐỘNG CỦA AI (AI MEMORY SERVICE)
// Single Source of Truth: Supabase PostgreSQL `ai_memories`
// ==============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

// In-memory cache trong phiên hoạt động
let cachedMemories = null;

/**
 * 1. TẢI TOÀN BỘ BỘ NHỚ AI TỪ SUPABASE
 */
export async function loadAiMemories(forceRefresh = false) {
  if (cachedMemories && !forceRefresh) {
    return cachedMemories;
  }

  let dbMemories = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_memories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
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

  cachedMemories = dbMemories;
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

  // Cập nhật in-memory cache
  const current = await loadAiMemories();
  cachedMemories = [memoryObj, ...current.filter((m) => m.id !== memoryObj.id)];

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
  cachedMemories = current.map((m) =>
    m.id === id ? { ...m, isActive: newStatus } : m
  );

  return cachedMemories;
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
  cachedMemories = current.filter((m) => m.id !== id);

  return cachedMemories;
}
