import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  User,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  loadUserAccounts,
  updateUserLockStatus,
} from "../../services/userService";

export default function UserManagerModal({ isOpen, onClose, currentUser, showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State cho hộp thoại xác nhận Khóa / Mở khóa
  const [lockTargetUser, setLockTargetUser] = useState(null); // { email, fullName, isLocked }
  const [lockReason, setLockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Tải danh sách người dùng khi mở modal
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await loadUserAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
      showToast?.("Không thể tải danh sách tài khoản!", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setSearchQuery("");
      setRoleFilter("all");
      setStatusFilter("all");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lọc danh sách tài khoản theo tìm kiếm và bộ lọc
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      acc.email.toLowerCase().includes(q) ||
      (acc.full_name && acc.full_name.toLowerCase().includes(q));

    const matchRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && (acc.role === "admin" || acc.email.includes("admin"))) ||
      (roleFilter === "employee" && acc.role !== "admin" && !acc.email.includes("admin"));

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !acc.is_locked) ||
      (statusFilter === "locked" && acc.is_locked);

    return matchQuery && matchRole && matchStatus;
  });

  // Thống kê nhanh
  const totalCount = accounts.length;
  const lockedCount = accounts.filter((a) => a.is_locked).length;
  const activeCount = totalCount - lockedCount;

  // Xử lý xác nhận Khóa / Mở khóa
  const handleConfirmToggleLock = async () => {
    if (!lockTargetUser) return;
    const { email, is_locked } = lockTargetUser;
    const willLock = !is_locked;

    setActionLoading(true);
    try {
      const res = await updateUserLockStatus(
        email,
        willLock,
        willLock ? lockReason.trim() : ""
      );

      if (res.success) {
        setAccounts(res.data || []);
        showToast?.(
          willLock
            ? `Đã khóa thành công tài khoản ${email}!`
            : `Đã mở khóa thành công tài khoản ${email}!`,
          "success"
        );
        setLockTargetUser(null);
        setLockReason("");
      } else {
        showToast?.(res.error || "Thao tác thất bại!", "error");
      }
    } catch (err) {
      console.error("Lỗi cập nhật lock:", err);
      showToast?.("Đã xảy ra lỗi khi cập nhật tài khoản!", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden font-sans">
        {/* MODAL HEADER */}
        <div className="bg-[#504b44] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#3f3b35] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#3f3b35] rounded-xl text-[#d0aa61] border border-[#625d55]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Quản lý Tài khoản &amp; Phân quyền Nhân sự
              </h3>
              <p className="text-[11px] text-zinc-300">
                Xem danh sách, kiểm soát quyền truy cập và khóa/mở khóa tài khoản nhân viên NSG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#3f3b35] rounded-lg transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-3 gap-3 px-5 sm:px-6 pt-4 shrink-0 bg-[#fcfaf7] border-b border-zinc-200/80 pb-4">
          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Tổng tài khoản</p>
              <p className="text-lg sm:text-xl font-bold text-zinc-900">{totalCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-600 font-medium">Đang hoạt động</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-700">{activeCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-red-600 font-medium">Đang bị khóa</p>
              <p className="text-lg sm:text-xl font-bold text-red-700">{lockedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CONTROLS & SEARCH BAR */}
        <div className="p-4 sm:px-6 bg-white border-b border-zinc-200/80 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc họ tên nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Lọc theo vai trò */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d0aa61]"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="employee">Nhân viên</option>
            </select>

            {/* Lọc theo trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d0aa61]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="locked">🔴 Đã bị khóa</option>
            </select>

            {/* Nút làm mới */}
            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#d0aa61]" : ""}`} />
            </button>
          </div>
        </div>

        {/* USERS TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fcfaf7]">
          {loading && accounts.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#d0aa61]" />
              <span>Đang tải danh sách tài khoản từ máy chủ...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs">
              <Users className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
              <span>Không tìm thấy tài khoản nào khớp với bộ lọc!</span>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Tài khoản &amp; Họ tên</th>
                    <th className="py-3 px-3">Vai trò</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAccounts.map((acc) => {
                    const isAdmin = acc.role === "admin" || acc.email.includes("admin");
                    const isSelf = currentUser?.email && acc.email.toLowerCase() === currentUser.email.toLowerCase();

                    return (
                      <tr
                        key={acc.id || acc.email}
                        className={`hover:bg-zinc-50/80 transition-colors ${
                          acc.is_locked ? "bg-red-50/30" : ""
                        }`}
                      >
                        {/* Cột Tên & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAdmin
                                  ? "bg-[#d0aa61] text-[#504b44]"
                                  : acc.is_locked
                                  ? "bg-red-100 text-red-700"
                                  : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {acc.full_name ? acc.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                                <span>{acc.full_name || acc.email.split("@")[0]}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium">
                                    Bạn
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate">{acc.email}</p>
                              {acc.is_locked && acc.locked_reason && (
                                <p className="text-[10.5px] text-red-600 mt-0.5 italic flex items-center gap-1">
                                  <span>Lý do:</span> {acc.locked_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột Vai trò */}
                        <td className="py-3 px-3">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#faf6ed] text-[#9f7a35] border border-[#d0aa61]/40">
                              <ShieldCheck className="w-3 h-3 text-[#d0aa61]" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                              <User className="w-3 h-3 text-zinc-500" />
                              Nhân viên
                            </span>
                          )}
                        </td>

                        {/* Cột Trạng thái */}
                        <td className="py-3 px-3">
                          {acc.is_locked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <Lock className="w-3 h-3 text-red-600" />
                              Đã khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hoạt động
                            </span>
                          )}
                        </td>

                        {/* Cột Thao tác */}
                        <td className="py-3 px-4 text-right">
                          {isAdmin ? (
                            <span className="text-[11px] text-zinc-400 italic">
                              Không thể khóa Admin
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setLockTargetUser(acc);
                                setLockReason(acc.locked_reason || "");
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                acc.is_locked
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {acc.is_locked ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Mở khóa</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Khóa tài khoản</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white px-5 sm:px-6 py-3.5 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <p>
            * Lưu ý: Tài khoản bị khóa sẽ lập tức bị đăng xuất và không thể truy cập tài liệu hay hỏi AI.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* POPUP XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN */}
      {lockTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  lockTargetUser.is_locked
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {lockTargetUser.is_locked ? (
                  <Unlock className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900">
                  {lockTargetUser.is_locked
                    ? "Mở khóa tài khoản nhân viên?"
                    : "Xác nhận khóa tài khoản nhân viên?"}
                </h4>
                <p className="text-xs text-zinc-500">{lockTargetUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {lockTargetUser.is_locked
                ? `Bạn đang chuẩn bị mở khóa cho nhân viên "${lockTargetUser.full_name || lockTargetUser.email}". Sau khi mở, nhân viên có thể đăng nhập và truy cập tài liệu bình thường.`
                : `Nhân viên "${lockTargetUser.full_name || lockTargetUser.email}" sẽ bị tạm ngừng quyền truy cập ngay lập tức, không thể đăng nhập hoặc tra cứu tài liệu.`}
            </p>

            {/* Input lý do khóa (chỉ hiện khi chuẩn bị khóa) */}
            {!lockTargetUser.is_locked && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Lý do khóa (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tạm đình chỉ công tác, nghi ngờ lộ mật khẩu..."
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmToggleLock}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                  lockTargetUser.is_locked
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {lockTargetUser.is_locked ? "Xác nhận Mở khóa" : "Xác nhận Khóa tài khoản"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
