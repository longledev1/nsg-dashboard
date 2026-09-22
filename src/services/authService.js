import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { checkUserLockStatus, syncUserAccount } from "./userService";

// Service xử lý Xác thực Đăng nhập & Đăng xuất (Thuần Supabase Auth 100%)
export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error:
        "Hệ thống chưa được cấu hình biến môi trường Supabase URL và ANON KEY!",
    };
  }

  try {
    // 1. Kiểm tra trước trạng thái khóa tài khoản
    const lockInfo = await checkUserLockStatus(cleanEmail);
    if (lockInfo.isLocked) {
      return {
        success: false,
        error: `⛔ Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên NSG! ${
          lockInfo.reason ? `(Lý do: ${lockInfo.reason})` : "Vui lòng liên hệ phòng IT / Quản trị viên để được hỗ trợ."
        }`,
      };
    }

    // 2. Gọi trực tiếp API Đăng nhập của Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error("Supabase Auth error:", error.message);
      return {
        success: false,
        error:
          error.message === "Invalid login credentials"
            ? "Email hoặc mật khẩu không chính xác!"
            : error.message,
      };
    }

    if (data?.user) {
      const userEmail = data.user.email.toLowerCase();

      // Kiểm tra lại trạng thái khóa tài khoản một lần nữa sau khi đã có user id
      const postLockInfo = await checkUserLockStatus(userEmail);
      if (postLockInfo.isLocked) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `⛔ Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên NSG! ${
            postLockInfo.reason ? `(Lý do: ${postLockInfo.reason})` : "Vui lòng liên hệ phòng IT / Quản trị viên để được hỗ trợ."
          }`,
        };
      }

      // Phân quyền: Email chứa 'admin' có quyền admin, ngược lại là employee
      const role =
        data.user.user_metadata?.role ||
        (userEmail.includes("admin") ? "admin" : "employee");
      const name =
        data.user.user_metadata?.full_name ||
        (userEmail.includes("admin")
          ? "Quản trị viên NSG"
          : userEmail.includes("staff1")
            ? "Nhân viên NSG 1"
            : "Nhân viên NSG 2");

      const userProfile = {
        id: data.user.id,
        email: userEmail,
        name: name,
        role: role,
      };

      // Tự động đồng bộ thông tin vào bảng user_accounts
      syncUserAccount(userProfile);

      return {
        success: true,
        user: userProfile,
      };
    }
  } catch (err) {
    console.error("Lỗi kết nối Supabase Auth:", err);
    return {
      success: false,
      error: "Không thể kết nối đến máy chủ Supabase Auth!",
    };
  }

  return {
    success: false,
    error: "Đăng nhập không thành công!",
  };
}

export async function logoutUser() {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Lỗi Đăng xuất Supabase Auth:", err);
    }
  }
}
