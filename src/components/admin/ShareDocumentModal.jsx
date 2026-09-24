import React, { useState } from 'react';
import { X, Share2, Copy, Check, QrCode, Smartphone, FileText, Lock, ExternalLink } from 'lucide-react';

export default function ShareDocumentModal({ document, currentUser, onClose, showToast }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!document) return null;

  // Tạo liên kết Deep-link mở trực tiếp tài liệu
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const shareUrl = `${origin}${pathname}?docId=${encodeURIComponent(document.id)}`;

  // Kiểm tra hỗ trợ Web Share API (Mobile / Tablet / Safari / Chrome Edge)
  const canWebShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback cho trình duyệt cũ
        const textArea = window.document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        window.document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        window.document.execCommand('copy');
        window.document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast && showToast('Đã sao chép liên kết tài liệu vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Lỗi copy link:', err);
      showToast && showToast('Không thể tự động sao chép, vui lòng copy liên kết thủ công.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: document.title,
        text: `Tài liệu công ty NSG: ${document.title}`,
        url: shareUrl,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share thất bại:', err);
      }
    }
  };

  const isWord = document.fileType === 'word' || 
                 document.id === 'doc-nsg-history-profile' ||
                 (/\.docx?(\)|$|\?|\s)/i.test(document.title || ''));

  // Mã QR Code URL (180x180)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}&margin=10`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf6ed] border border-[#d0aa61]/30 flex items-center justify-center text-[#9f7a35]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Chia sẻ tài liệu nội bộ</h3>
              <p className="text-[11px] text-zinc-500">Chỉ dành cho Quản trị viên (Admin)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Document Preview Snippet */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${isWord ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs text-zinc-900 line-clamp-1" title={document.title}>
                {document.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                <span className="uppercase font-semibold text-[10px] text-zinc-600 px-1.5 py-0.2 rounded bg-zinc-200/80">
                  {isWord ? 'WORD' : 'PDF'}
                </span>
                <span>•</span>
                <span>{document.fileSize || 'N/A'}</span>
                {document.isProtected && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Bản ghi cốt lõi
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Share Link Box */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Liên kết xem trực tiếp tài liệu
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-700 focus:outline-none select-all"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white border border-emerald-600'
                    : 'bg-[#faf6ed] hover:bg-[#d0aa61]/25 text-[#9f7a35] border border-[#d0aa61]/40'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              * Người nhận nhấp vào link này sẽ được tự động mở thẳng màn hình đọc tài liệu.
            </p>
          </div>

          {/* Action Row: Mobile Web Share & QR Code Toggle */}
          <div className="pt-1 flex flex-col gap-2">
            {canWebShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-[#d0aa61]" />
                <span>Gửi nhanh qua ứng dụng (Zalo, Mail, Telegram...)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowQr(prev => !prev)}
              className="w-full py-2 px-3 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-500" />
              <span>{showQr ? 'Ẩn mã QR Code' : 'Hiện mã QR Code (Quét bằng điện thoại)'}</span>
            </button>
          </div>

          {/* QR Code Container */}
          {showQr && (
            <div className="pt-2 flex flex-col items-center justify-center animate-in fade-in duration-150">
              <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${document.title}`}
                  className="w-36 h-36 object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1.5 font-medium">
                Bật Camera điện thoại quét để mở tài liệu ngay
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
