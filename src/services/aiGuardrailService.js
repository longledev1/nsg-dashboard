// ==============================================================================
// SERVICE BẢO MẬT & PHÂN QUYỀN TRẢ LỜI CỦA AI (AI GUARDRAILS SERVICE)
// Chức năng: Kiểm soát từ khóa nhạy cảm (doanh thu, tài chính...) và lọc tài liệu
// theo vai trò người dùng (Admin vs Nhân viên).
// ==============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

// 1. CÁC TỪ KHÓA BẢO MẬT MẶC ĐỊNH CHO NHÂN VIÊN
export const DEFAULT_RESTRICTED_TOPICS = [
  "doanh thu",
  "lợi nhuận",
  "chi phí",
  "lương",
  "thưởng",
  "báo cáo tài chính",
  "ngân sách",
  "thu nhập",
  "kế toán",
  "lãi lỗ",
  "giá vốn",
  "dòng tiền"
];

// 2. CÁC DANH MỤC / FOLDER MẶC ĐỊNH ĐƯỢC BẢO VỆ (AI KHÔNG ĐỌC CHO NHÂN VIÊN)
export const DEFAULT_RESTRICTED_FOLDERS = [
  "cat-phap-ly" // Thư mục Pháp Lý bảo vệ mặc định
];

const LOCAL_STORAGE_KEY_TOPICS = "nsg_guardrail_topics";
const LOCAL_STORAGE_KEY_FOLDERS = "nsg_guardrail_folders";
const LOCAL_STORAGE_KEY_ACTIVE = "nsg_guardrail_active";

// Biến lưu tạm trong bộ nhớ (In-memory cache)
let cachedTopics = null;
let cachedFolders = null;
let cachedIsActive = null;

/**
 * Tải trạng thái công tắc tổng (Bật/Tắt bảo mật câu hỏi nhạy cảm)
 */
export function getGuardrailActiveStatus() {
  if (cachedIsActive !== null) return cachedIsActive;
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE);
    cachedIsActive = val !== null ? val === "true" : true; // Mặc định là BẬT
  } catch (e) {
    cachedIsActive = true;
  }
  return cachedIsActive;
}

/**
 * Cập nhật trạng thái công tắc tổng
 */
export function setGuardrailActiveStatus(isActive) {
  cachedIsActive = Boolean(isActive);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE, String(cachedIsActive));
  } catch (e) {}
  return cachedIsActive;
}

/**
 * Tải danh sách các từ khóa nhạy cảm đang được bảo vệ
 */
export async function loadRestrictedTopics(forceRefresh = false) {
  if (cachedTopics && !forceRefresh) return cachedTopics;

  let topics = [...DEFAULT_RESTRICTED_TOPICS];

  // Đọc từ Supabase (nếu có kết nối)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_memories")
        .select("*")
        .eq("type", "restricted_topic")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        topics = data.map((d) => d.content.toLowerCase().trim());
      }
    } catch (e) {
      console.warn("Lỗi đọc restricted_topic từ Supabase:", e);
    }
  }

  // Đọc dự phòng từ LocalStorage nếu chưa có trên DB
  if (topics.length === DEFAULT_RESTRICTED_TOPICS.length) {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY_TOPICS);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          topics = parsed;
        }
      }
    } catch (e) {}
  }

  cachedTopics = Array.from(new Set(topics));
  return cachedTopics;
}

/**
 * Lưu danh sách từ khóa nhạy cảm (Cập nhật Local & Supabase)
 */
export async function saveRestrictedTopics(topics = []) {
  const cleanTopics = Array.from(
    new Set(topics.map((t) => t.toLowerCase().trim()).filter(Boolean))
  );
  cachedTopics = cleanTopics;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_TOPICS, JSON.stringify(cleanTopics));
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      // Xóa các topics cũ và chèn lại danh sách mới
      await supabase.from("ai_memories").delete().eq("type", "restricted_topic");
      if (cleanTopics.length > 0) {
        const rows = cleanTopics.map((topic) => ({
          content: topic,
          type: "restricted_topic",
          is_active: true,
        }));
        await supabase.from("ai_memories").insert(rows);
      }
    } catch (e) {
      console.warn("Lưu topics vào Supabase thất bại:", e);
    }
  }

  return cachedTopics;
}

/**
 * Tải danh sách ID các Thư mục/Danh mục được Bảo vệ đối với AI
 */
export async function loadRestrictedFolders(forceRefresh = false) {
  if (cachedFolders && !forceRefresh) return cachedFolders;

  let folders = [...DEFAULT_RESTRICTED_FOLDERS];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_memories")
        .select("*")
        .eq("type", "restricted_folder");

      if (!error && data && data.length > 0) {
        folders = data.map((d) => d.content.trim());
      }
    } catch (e) {
      console.warn("Lỗi đọc restricted_folder từ Supabase:", e);
    }
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_FOLDERS);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        folders = parsed;
      }
    }
  } catch (e) {}

  cachedFolders = Array.from(new Set(folders));
  return cachedFolders;
}

/**
 * Lưu danh sách Thư mục/Danh mục Bảo vệ
 */
export async function saveRestrictedFolders(folderIds = []) {
  const cleanFolders = Array.from(new Set(folderIds.filter(Boolean)));
  cachedFolders = cleanFolders;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_FOLDERS, JSON.stringify(cleanFolders));
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("ai_memories").delete().eq("type", "restricted_folder");
      if (cleanFolders.length > 0) {
        const rows = cleanFolders.map((fId) => ({
          content: fId,
          type: "restricted_folder",
          is_active: true,
        }));
        await supabase.from("ai_memories").insert(rows);
      }
    } catch (e) {
      console.warn("Lưu folders vào Supabase thất bại:", e);
    }
  }

  return cachedFolders;
}

/**
 * KIỂM TRA CÂU HỎI CỦA NGƯỜI DÙNG (GUARDRAIL CHECK)
 * @param {string} query - Câu hỏi người dùng nhập vào
 * @param {object} user - Thông tin tài khoản người dùng hiện tại
 * @param {Array<string>} activeTopics - Danh sách từ khóa cấm
 * @returns {object} { isRestricted: boolean, matchedTopic?: string, message?: string }
 */
export function checkQuestionRestricted(
  query,
  user,
  activeTopics = DEFAULT_RESTRICTED_TOPICS,
  restrictedFolderNames = []
) {
  // 1. Nếu là Admin: Toàn quyền hỏi mọi chủ đề, không bao giờ bị chặn
  const isAdmin = user?.role === "admin";
  if (isAdmin) {
    return { isRestricted: false };
  }

  // 2. Nếu tính năng bảo vệ đang TẮT: Cho phép hỏi bình thường
  const isGuardrailActive = getGuardrailActiveStatus();
  if (!isGuardrailActive) {
    return { isRestricted: false };
  }

  const cleanQuery = (query || "").toLowerCase();

  // 3. Kiểm tra nếu câu hỏi nhắm vào Thư mục/Danh mục đang bị ẩn hoặc bị khóa đối với nhân viên
  if (Array.isArray(restrictedFolderNames) && restrictedFolderNames.length > 0) {
    for (const folderName of restrictedFolderNames) {
      const fName = String(folderName || "").toLowerCase().trim();
      if (!fName || fName.length < 3) continue;

      // Kiểm tra tên đầy đủ hoặc các cụm từ trọng tâm trong tên thư mục (VD: "Bãi Lao", "Bãi Cồn" trong "Trích đo Bãi Lao và Bãi Cồn")
      const phrases = fName
        .split(/[,;&và\-\/]+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 4);

      const isMatched =
        cleanQuery.includes(fName) ||
        phrases.some((p) => cleanQuery.includes(p));

      if (isMatched) {
        return {
          isRestricted: true,
          matchedTopic: folderName,
          message: `⚠️ **Thông báo phân quyền bảo mật:**\n\nTài liệu hoặc dự án liên quan đến **"${folderName}"** hiện đang được giới hạn quyền truy cập nội bộ cho Ban Lãnh đạo.\n\nTài khoản **Nhân viên (${user?.email || "Staff"})** chưa được phân quyền tra cứu thông tin này. Vui lòng liên hệ Quản trị viên (Admin) nếu bạn cần hỗ trợ!`,
        };
      }
    }
  }

  // 4. Nếu là Nhân viên: Quét câu hỏi xem có chứa từ khóa nhạy cảm (tài chính, lương...) không
  const topics =
    activeTopics && activeTopics.length > 0
      ? activeTopics
      : DEFAULT_RESTRICTED_TOPICS;

  for (const topic of topics) {
    const t = topic.toLowerCase().trim();
    if (!t) continue;
    // Kiểm tra từ khóa xuất hiện trong câu hỏi
    if (cleanQuery.includes(t)) {
      return {
        isRestricted: true,
        matchedTopic: topic,
        message: `⚠️ **Thông báo phân quyền bảo mật:**\n\nChủ đề liên quan đến **"${topic}"** thuộc phạm vi dữ liệu bảo mật nội bộ của Ban Lãnh đạo.\n\nTài khoản **Nhân viên (${user?.email || "Staff"})** hiện chưa được phân quyền tra cứu thông tin này. Vui lòng liên hệ Admin hoặc Quản lý trực tiếp nếu bạn cần cung cấp số liệu!`,
      };
    }
  }

  return { isRestricted: false };
}

/**
 * LỌC TÀI LIỆU DÀNH CHO AI (ZERO-TRUST RAG FILTER)
 * Tự động loại bỏ các tài liệu thuộc Folder bảo mật hoặc có Tag bảo mật trước khi gửi cho Gemini
 */
export function filterDocumentsForUser(documents = [], user, restrictedFolderIds = DEFAULT_RESTRICTED_FOLDERS) {
  // Admin được đọc 100% tất cả tài liệu
  if (user?.role === "admin") {
    return documents;
  }

  // Nếu bảo vệ đang tắt -> Giữ nguyên
  if (!getGuardrailActiveStatus()) {
    return documents;
  }

  const restrictedSet = new Set(restrictedFolderIds || DEFAULT_RESTRICTED_FOLDERS);

  // Lọc tài liệu: Nhân viên sẽ không thấy tài liệu trong folder bảo mật hoặc gắn tag 'bảo mật'
  return documents.filter((doc) => {
    // 1. Kiểm tra Category cha
    if (doc.categoryId && restrictedSet.has(doc.categoryId)) {
      return false;
    }
    // 2. Kiểm tra SubFolder con
    if (doc.subFolderId && restrictedSet.has(doc.subFolderId)) {
      return false;
    }
    // 3. Kiểm tra Tags bảo mật trong tài liệu
    if (Array.isArray(doc.tags)) {
      const lowerTags = doc.tags.map((t) => String(t).toLowerCase());
      if (lowerTags.includes("bảo mật") || lowerTags.includes("admin only") || lowerTags.includes("nhạy cảm")) {
        return false;
      }
    }
    return true;
  });
}
