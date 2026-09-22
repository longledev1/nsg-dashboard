import { supabase, isSupabaseConfigured } from "../lib/supabase";

const LOCAL_STORAGE_USERS_KEY = "nsg_user_accounts_cache";

/**
 * Danh sách tài khoản mặc định dự phòng khi chưa kết nối Supabase
 */
const DEFAULT_FALLBACK_ACCOUNTS = [
  {
    id: "usr-admin",
    email: "admin@nsg.vn",
    full_name: "Quản trị viên NSG",
    role: "admin",
    is_locked: false,
    locked_reason: null,
    locked_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-staff1",
    email: "staff1@nsg.vn",
    full_name: "Nhân viên NSG 1",
    role: "employee",
    is_locked: false,
    locked_reason: null,
    locked_at: null,
    created_at: new Date().toISOString(),
  },
];

/**
 * Đọc bộ nhớ đệm tài khoản từ LocalStorage
 */
function getCachedAccounts() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Lỗi đọc cache user accounts:", e);
  }
  return DEFAULT_FALLBACK_ACCOUNTS;
}

/**
 * Lưu bộ nhớ đệm tài khoản vào LocalStorage
 */
function setCachedAccounts(accounts) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn("Lỗi ghi cache user accounts:", e);
  }
}

/**
 * Tải danh sách tài khoản từ bảng `user_accounts` trên Supabase
 */
export async function loadUserAccounts() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("user_accounts")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        setCachedAccounts(data);
        return data;
      }
    } catch (err) {
      console.warn("Lỗi tải user_accounts từ Supabase:", err);
    }
  }

  return getCachedAccounts();
}

/**
 * Kiểm tra trạng thái khóa của một tài khoản theo Email
 */
export async function checkUserLockStatus(email) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return { isLocked: false, reason: null };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("user_accounts")
        .select("is_locked, locked_reason")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return {
          isLocked: Boolean(data.is_locked),
          reason: data.locked_reason || null,
        };
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra lock status từ Supabase:", err);
    }
  }

  // Dự phòng kiểm tra từ cache
  const cached = getCachedAccounts();
  const found = cached.find((u) => u.email.toLowerCase() === cleanEmail);
  if (found) {
    return {
      isLocked: Boolean(found.is_locked),
      reason: found.locked_reason || null,
    };
  }

  return { isLocked: false, reason: null };
}

/**
 * Cập nhật trạng thái Khóa / Mở khóa cho tài khoản nhân viên
 */
export async function updateUserLockStatus(email, isLocked, reason = "") {
  const cleanEmail = (email || "").trim().toLowerCase();
  const now = new Date().toISOString();

  // Không cho phép khóa tài khoản admin
  if (cleanEmail === "admin@nsg.vn" && isLocked) {
    return {
      success: false,
      error: "Không thể khóa tài khoản Quản trị viên hệ thống!",
    };
  }

  let dbSuccess = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("user_accounts")
        .update({
          is_locked: isLocked,
          locked_reason: isLocked ? reason : null,
          locked_at: isLocked ? now : null,
          updated_at: now,
        })
        .eq("email", cleanEmail);

      if (!error) {
        dbSuccess = true;
      } else {
        console.error("Lỗi cập nhật lock status Supabase:", error.message);
      }
    } catch (err) {
      console.error("Lỗi ngoại lệ khi update lock status:", err);
    }
  }

  // Luôn cập nhật vào Cache LocalStorage để đồng bộ giao diện tức thì
  const cached = getCachedAccounts();
  const updatedList = cached.map((u) => {
    if (u.email.toLowerCase() === cleanEmail) {
      return {
        ...u,
        is_locked: isLocked,
        locked_reason: isLocked ? reason : null,
        locked_at: isLocked ? now : null,
        updated_at: now,
      };
    }
    return u;
  });

  // Nếu user chưa có trong cache thì thêm mới
  if (!updatedList.some((u) => u.email.toLowerCase() === cleanEmail)) {
    updatedList.push({
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      full_name: cleanEmail.split("@")[0],
      role: "employee",
      is_locked: isLocked,
      locked_reason: isLocked ? reason : null,
      locked_at: isLocked ? now : null,
      created_at: now,
      updated_at: now,
    });
  }

  setCachedAccounts(updatedList);

  return {
    success: true,
    data: updatedList,
  };
}

/**
 * Đồng bộ thông tin người dùng vào bảng `user_accounts` khi đăng nhập
 */
export async function syncUserAccount(user) {
  if (!user || !user.email) return;

  const cleanEmail = user.email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("user_accounts").upsert(
        [
          {
            id: user.id || undefined,
            email: cleanEmail,
            full_name: user.name || cleanEmail.split("@")[0],
            role: user.role || (cleanEmail.includes("admin") ? "admin" : "employee"),
            updated_at: now,
          },
        ],
        { onConflict: "email", ignoreDuplicates: false },
      );
    } catch (err) {
      console.warn("Lỗi sync user account vào Supabase:", err);
    }
  }
}
