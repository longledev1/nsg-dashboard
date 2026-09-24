import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Layers, 
  Upload, 
  Search, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Users, 
  Brain, 
  X,
  Sparkles,
  Smartphone
} from 'lucide-react';
import NsgWindIcon from '../NsgWindIcon';

/**
 * MobileBottomNav - Thanh điều hướng ngón tay cái chuẩn ứng dụng di động Native
 * Chỉ hiển thị trên màn hình điện thoại & máy tính bảng (< 1024px)
 */
export default function MobileBottomNav({
  user,
  activeCategory,
  activeSubFolder,
  onSelectAllDocs,
  onToggleSidebar,
  onOpenUploadModal,
  onOpenAi,
  onOpenUserManager,
  onOpenAiSettings,
  onLogout,
  showToast
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const isAdmin = user?.role === 'admin';
  const isHomeActive = activeCategory === null && activeSubFolder === null;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    setIsUserMenuOpen(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast?.('Đã bắt đầu cài đặt ứng dụng NSG!', 'success');
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("📲 Hướng dẫn cài App trên iPhone:\n\n1. Bấm nút [Chia sẻ] (biểu tượng hình vuông có mũi tên chỉ lên) ở thanh công cụ dưới Safari.\n2. Cuộn xuống và chọn [Thêm vào Màn hình chính] (Add to Home Screen).\n3. Bấm [Thêm] ở góc phải trên. Logo NSG sẽ xuất hiện trên màn hình điện thoại của bạn!");
      } else {
        alert("📲 Hướng dẫn cài đặt App:\n\n1. Bấm vào dấu 3 chấm góc phải trình duyệt.\n2. Chọn [Cài đặt ứng dụng] hoặc [Thêm vào Màn hình chính].\n3. Biểu tượng ứng dụng NSG sẽ xuất hiện ngoài màn hình điện thoại!");
      }
    }
  };

  return (
    <>
      {/* User Bottom Sheet Modal trên Mobile khi bấm tab "Tài khoản" */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsUserMenuOpen(false)}
        >
          <div 
            className="w-full bg-white rounded-t-3xl shadow-2xl p-5 border-t border-zinc-200 space-y-4 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            {/* Header Bottom Sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#faf6ed] border border-[#d0aa61]/50 text-[#9f7a35] font-bold flex items-center justify-center text-sm shadow-xs">
                  {user?.name ? user.name.charAt(0) : "N"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-800 flex items-center gap-1.5">
                    {user?.name || "Người dùng NSG"}
                    {isAdmin && (
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-[#d0aa61]/25 text-[#9f7a35] border border-[#d0aa61]/40 flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3 text-[#d0aa61]" /> Admin
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-zinc-400">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUserMenuOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Options */}
            <div className="space-y-1.5">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenUserManager?.();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-[#faf6ed] hover:text-[#9f7a35] transition-colors cursor-pointer border border-transparent hover:border-[#d0aa61]/30 text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Quản lý Tài khoản &amp; Phân quyền</span>
                </button>
              )}

              {/* Nút Cài đặt PWA App */}
              <button
                type="button"
                onClick={handleInstallApp}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold block text-emerald-900">Cài đặt Ứng dụng về máy</span>
                  <span className="text-[10px] text-emerald-600 block truncate">Thêm icon NSG ra màn hình điện thoại</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (!isAdmin) {
                    showToast?.(
                      "⚠️ Quyền truy cập bị hạn chế: Chức năng 'Thiết lập AI' chỉ dành cho Quản trị viên.",
                      "error"
                    );
                  }
                  onOpenAiSettings?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-[#faf6ed] hover:text-[#9f7a35] transition-colors cursor-pointer border border-transparent hover:border-[#d0aa61]/30 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Brain className="w-4 h-4" />
                </div>
                <span>Thiết lập AI &amp; Chỉ thị tri thức</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left pt-2"
              >
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Đăng xuất khỏi hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none transition-all"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        aria-label="Thanh điều hướng di động"
      >
        <div className="flex items-center justify-around px-2 pt-1.5 h-14">
          
          {/* 1. Trang chủ / Tất cả tài liệu */}
          <button
            type="button"
            onClick={onSelectAllDocs}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer active:scale-95 ${
              isHomeActive 
                ? 'text-[#9f7a35] font-bold' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Home className={`w-5 h-5 transition-transform ${isHomeActive ? 'scale-110 text-[#d0aa61]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Tài liệu</span>
          </button>

          {/* 2. Danh mục & Thư mục Drawer */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer active:scale-95 ${
              !isHomeActive 
                ? 'text-[#9f7a35] font-bold' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Danh mục</span>
          </button>

          {/* 3. Nút nổi bật ở giữa: Tải lên (cho Admin) hoặc Cối xay gió AI */}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => onOpenUploadModal?.()}
              className="flex flex-col items-center justify-center -mt-4 cursor-pointer active:scale-90 transition-transform"
              title="Upload file tài liệu mới"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#9f7a35] to-[#d0aa61] text-white flex items-center justify-center shadow-lg shadow-[#d0aa61]/40 border-2 border-white">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-zinc-700 mt-0.5">Tải lên</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAi}
              className="flex flex-col items-center justify-center -mt-4 cursor-pointer active:scale-90 transition-transform"
              title="Mở Trợ lý AI NSG"
            >
              <div className="w-12 h-12 rounded-full bg-white text-[#d0aa61] flex items-center justify-center shadow-lg shadow-[#d0aa61]/40 border-2 border-[#d0aa61]">
                <NsgWindIcon size="xs" isSpinning={false} />
              </div>
              <span className="text-[10px] font-bold text-[#9f7a35] mt-0.5">Hỏi AI</span>
            </button>
          )}

          {/* 4. Tab Trợ lý AI (khi Admin đã dùng nút giữa làm Tải lên) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAi}
              className="flex flex-col items-center justify-center flex-1 py-1 text-zinc-500 hover:text-[#9f7a35] transition-colors cursor-pointer active:scale-95"
            >
              <div className="relative">
                <NsgWindIcon size="xs" isSpinning={false} className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">Hỏi AI</span>
            </button>
          )}

          {/* 5. Tài khoản & Cài đặt */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer active:scale-95"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Cá nhân</span>
          </button>

        </div>
      </nav>
    </>
  );
}
