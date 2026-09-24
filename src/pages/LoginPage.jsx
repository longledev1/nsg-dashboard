import React, { useState } from "react";
import { loginUser } from "../services/authService";
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function LoginPage({ onLoginSuccess, onBackToWelcome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(
          result.error ||
            "Email hoặc mật khẩu không chính xác! Vui lòng liên hệ Admin.",
        );
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra khi xác thực với hệ thống!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans bg-[#fcfaf7]">
      {/* LEFT COLUMN: BRAND IMAGE BANNER (bg.png) */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 bg-cover bg-center bg-no-repeat overflow-hidden border-r border-zinc-200/80"
        style={{ backgroundImage: "url('/bg.png')" }}
      >
        {/* Soft Contrast Overlay for Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-900/30 to-transparent pointer-events-none"></div>

        {/* Top Left Tag */}
        <div className="relative z-10">
          <span className="text-xs font-bold tracking-[0.25em] text-white/90 bg-zinc-950/40 px-3 py-1 rounded-full backdrop-blur-xs uppercase border border-white/20">
            NS Group &bull; INTERNAL PORTAL
          </span>
        </div>

        {/* Bottom Quote & Branding Text */}
        <div className="relative z-10 space-y-3 text-white">
          <h2 className="text-2xl font-bold tracking-tight text-white leading-snug">
            Cổng Thông tin &amp; Quản lý Tài liệu Thương hiệu NSG
          </h2>
          <p className="text-xs text-zinc-200 leading-relaxed max-w-lg font-light">
            Hệ thống bảo mật lưu trữ, định hướng và chuẩn hóa toàn bộ tài liệu
            concept, nhận diện thương hiệu cho các dự án FNB và Bất động sản của
            Tập đoàn.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white relative overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="w-full flex items-center justify-between shrink-0 mb-6">
          <button
            onClick={onBackToWelcome}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-100"
          >
            <ArrowLeft className="w-4 h-4 text-[#d0aa61]" />
            <span>Quay lại trang thông báo</span>
          </button>
        </div>

        {/* Centered Login Form Container */}
        <div className="w-full max-w-md mx-auto my-auto space-y-7">
          {/* Brand Logo */}
          <div className="text-center space-y-2">
            <img
              src="/logo_nsg black.png"
              alt="NS Group Logo"
              className="h-24 sm:h-28 w-auto mx-auto object-contain"
            />
            <p className="text-xs  font-bold">
              Đăng nhập bằng tài khoản nhân viên nội bộ NSG
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#504b44] mb-1.5">
                Email Nội bộ (*):
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="admin@nsg.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#504b44] mb-1.5">
                Mật khẩu (*):
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-900 hover:bg-[#d0aa61] hover:text-zinc-950 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-3 cursor-pointer group disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#d0aa61]" />
                  <span>Đang xác thực tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận Đăng nhập</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="w-full text-center text-[11px] text-zinc-400 shrink-0 pt-6 border-t border-zinc-100 mt-6">
          &copy; 2026 NS Group. All rights reserved.
        </div>
      </div>
    </div>
  );
}
