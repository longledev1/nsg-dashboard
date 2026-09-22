import React from "react";
import { Search, LogOut, ShieldCheck, Users, Menu } from "lucide-react";

export default function Header({
  user,
  searchQuery,
  setSearchQuery,
  onLogout,
  onOpenUserManager,
  onToggleSidebar,
}) {
  return (
    <header className="bg-[#504b44] text-white border-b border-zinc-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Mobile/iPad Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-zinc-300 hover:text-white hover:bg-[#3f3b35] active:bg-[#625d55] rounded-xl transition-all flex items-center justify-center cursor-pointer lg:hidden"
            title="Mở danh mục & thư mục tài liệu"
            aria-label="Mở danh mục"
          >
            <Menu className="w-5 h-5 text-[#d0aa61]" />
          </button>

          <div className="px-1 sm:px-2 py-1 rounded-lg flex items-center justify-center">
            <img
              src="/logo nsg.png"
              alt="NSG Logo"
              className="h-14 sm:h-20 w-auto object-contain max-w-[100px] sm:max-w-[140px]"
            />
          </div>
          <div className="border-l border-white/40 pl-2.5 hidden md:block">
            <p className="text-[10px] text-white/90 tracking-wider uppercase font-medium">
              QUẢN LÝ TÀI LIỆU NỘI BỘ
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu, concept, dự án..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#3f3b35] border border-[#625d55] rounded-xl text-white placeholder-zinc-300 focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61] transition-all"
            />
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Nút Quản lý Tài khoản (Chỉ hiển thị cho Admin) */}
          {user?.role === "admin" && (
            <button
              onClick={onOpenUserManager}
              className="px-3 py-1.5 bg-[#3f3b35] hover:bg-[#d0aa61] text-[#d0aa61] hover:text-[#504b44] border border-[#d0aa61]/50 hover:border-[#d0aa61] rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
              title="Quản lý tài khoản & phân quyền nhân sự"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Quản lý Tài khoản</span>
            </button>
          )}

          {user && (
            <div className="flex items-center gap-3 bg-[#3f3b35] px-3.5 py-1.5 rounded-xl border border-[#625d55]">
              <div className="w-8 h-8 rounded-full bg-[#d0aa61] text-[#504b44] font-bold flex items-center justify-center text-xs shadow-xs">
                {user.name ? user.name.charAt(0) : "N"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  {user.name}
                  {user.role === "admin" && (
                    <ShieldCheck
                      className="w-3.5 h-3.5 text-[#d0aa61]"
                      title="Quản trị viên"
                    />
                  )}
                </p>
                <p className="text-[10px] text-zinc-300">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="p-2 text-zinc-300 hover:text-white hover:bg-[#3f3b35] rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}
