import React from "react";
import { ArrowRight } from "lucide-react";

export default function WelcomePage({ onGoToLogin }) {
  return (
    <div className="h-screen max-h-screen bg-[#fcfaf7] text-[#504b44] font-sans flex flex-col justify-between py-6 px-6 sm:px-12 overflow-hidden selection:bg-[#d0aa61]/20 selection:text-[#9f7a35] relative">
      {/* Soft Faded Background Pattern Layer (Low Opacity Watermark Style) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
        style={{ backgroundImage: "url('/bg_welcome.png')" }}
      ></div>

      {/* Optional Soft Backdrop Filter to guarantee 100% text readability */}
      <div className="absolute inset-0 bg-[#fcfaf7]/60 pointer-events-none"></div>

      {/* Top Header Tag */}
      <div className="w-full text-center shrink-0 pt-2 relative z-10">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-500">
          NS Group &bull; INTERNAL BRAND PORTAL
        </span>
      </div>

      {/* Main Minimalist Center Container (Strictly fit in 1 frame) */}
      <div className="max-w-2xl w-full mx-auto my-auto space-y-4 sm:space-y-5 text-[#504b44] leading-relaxed font-normal relative z-10">
        {/* Centered Brand Logo */}
        <div className="text-center shrink-0">
          <img
            src="/logo_nsg black.png"
            alt="NS Group Logo"
            className="h-28 sm:h-36 w-auto mx-auto object-contain hover:opacity-95 transition-opacity"
          />
        </div>

        {/* Minimalist Content Block (Crystal Clear Contrast) */}
        <div className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm text-zinc-700 font-normal">
          <h2 className="text-sm sm:text-base font-bold text-[#504b44] tracking-tight leading-snug">
            Cảm ơn bạn đã dành thời gian truy cập Cổng thông tin &amp; Kho tài
            liệu NS Group.
          </h2>

          <p className="font-normal text-zinc-800">
            Hệ thống này được xây dựng với mục tiêu hỗ trợ các bộ phận nội bộ
            trong việc lưu trữ, tra cứu, định hướng và duy trì sự nhất quán
            trong hình ảnh thương hiệu{" "}
            <strong className="text-[#504b44] font-bold">NSG</strong> trên mọi
            nền tảng.
          </p>

          <p className="hidden sm:block text-zinc-800">
            Thông qua kho tài liệu và Brand Guidelines, chúng tôi mong muốn tạo
            ra một nền tảng tập trung giúp tất cả các hoạt động truyền thông,
            thiết kế, concept dự án (FNB, Estate...) đều phản ánh đúng tinh thần
            và giá trị cốt lõi của thương hiệu.
          </p>

          <p className="text-zinc-700 text-[11px] sm:text-xs italic border-l-2 border-[#d0aa61] pl-3 py-0.5 bg-[#faf6ed]/50 rounded-r">
            Xin lưu ý rằng đây là tài liệu nội bộ mang tính bảo mật và tham khảo
            dành riêng cho{" "}
            <span className="font-bold">Nhân viên NSG được cấp quyền</span> .
            Một số nội dung sẽ liên tục được cập nhật để phù hợp với chiến lược
            phát triển trong tương lai.
          </p>

          <p className="pt-1 text-[#504b44] font-semibold text-xs sm:text-sm">
            Một lần nữa, xin cảm ơn sự quan tâm và đồng hành của bạn.
          </p>
        </div>

        {/* Minimalist Action Button Area */}
        <div className="pt-4 border-t border-zinc-300/80 flex items-center justify-center shrink-0">
          <button
            onClick={onGoToLogin}
            className="w-full sm:w-auto px-9 py-3.5 bg-zinc-900 hover:bg-[#d0aa61] hover:text-zinc-950 text-white font-semibold text-xs rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 group tracking-wider shadow-md cursor-pointer shrink-0"
          >
            <span>VÀO TRANG ĐĂNG NHẬP</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center text-[10px] text-zinc-600 tracking-wide shrink-0 pb-1 relative z-10 font-semibold">
        &copy; 2026 NS Group. All rights reserved.
      </div>
    </div>
  );
}
