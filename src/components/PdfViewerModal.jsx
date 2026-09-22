import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, 
  Upload, RefreshCw, Copy, Check, ExternalLink
} from 'lucide-react';
import { getLocalFileUrl, saveLocalFile } from '../services/localFileStorage';

/**
 * Trình dựng nội dung văn bản Word chuyên nghiệp & thanh lịch (Structured Word Document Renderer)
 * Đảm bảo 100% văn bản nằm gọn gàng trên trang giấy A4 màu trắng, không bao giờ bị tràn hay đè nền.
 */
function WordContentRenderer({ content, title }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-3.5 text-zinc-800 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // 1. Tiêu đề lớn La Mã (I., II., III., IV., V.)
        if (/^[I|V|X]+\.\s+[A-ZÀ-Ỹ\s()–-]+$/i.test(trimmed) || /^[I|V|X]+\.\s+/.test(trimmed)) {
          return (
            <div key={idx} className="mt-8 mb-4 pt-4 border-t-2 border-zinc-100 first:border-0 first:mt-0">
              <div className="inline-block px-3.5 py-1.5 bg-[#faf6ed] border-l-4 border-[#d0aa61] rounded-r-lg shadow-xs">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-wide">
                  {trimmed}
                </h2>
              </div>
            </div>
          );
        }

        // 2. Tiểu mục đánh số (1. Giai đoạn 1..., 2. Giai đoạn 2..., 1. Trần Anh Dũng...)
        if (/^\d+\.\s+[A-ZÀ-Ỹ]/.test(trimmed)) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-bold text-[#1e3a8a] mt-5 mb-2 pl-1 border-b border-zinc-100 pb-1">
              {trimmed}
            </h3>
          );
        }

        // 3. Cột mốc năm (1955:, 1968:, 2010:, ...)
        if (/^[-•*]?\s*\d{4}\s*[:(]/.test(trimmed)) {
          const match = trimmed.match(/^[-•*]?\s*(\d{4}[^:]*):\s*(.*)$/);
          if (match) {
            const yearPart = match[1];
            const detailPart = match[2];
            return (
              <div key={idx} className="flex items-start gap-2.5 my-2 pl-2 text-[14px] sm:text-[15px]">
                <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-xs border border-blue-200 mt-0.5">
                  {yearPart}
                </span>
                <span className="text-zinc-700 leading-relaxed flex-1">
                  {detailPart}
                </span>
              </div>
            );
          }
        }

        // 4. Các dòng gạch đầu dòng (- hoặc + hoặc •)
        if (trimmed.startsWith('- ') || trimmed.startsWith('+ ') || trimmed.startsWith('• ')) {
          const isSub = trimmed.startsWith('+ ');
          const cleanText = trimmed.replace(/^[-+•]\s*/, '');
          const colonIndex = cleanText.indexOf(':');

          if (colonIndex > 0 && colonIndex < 40) {
            const label = cleanText.slice(0, colonIndex);
            const value = cleanText.slice(colonIndex + 1);
            return (
              <div key={idx} className={`flex items-start gap-2 my-1.5 text-[14px] sm:text-[15px] ${isSub ? 'pl-6 sm:pl-8 text-zinc-600' : 'pl-2 text-zinc-700'}`}>
                <span className="text-[#d0aa61] font-bold shrink-0 mt-1">•</span>
                <span className="leading-relaxed">
                  <strong className="text-zinc-900 font-semibold">{label}:</strong>
                  {value}
                </span>
              </div>
            );
          }

          return (
            <div key={idx} className={`flex items-start gap-2 my-1.5 text-[14px] sm:text-[15px] ${isSub ? 'pl-6 sm:pl-8 text-zinc-600' : 'pl-2 text-zinc-700'}`}>
              <span className="text-[#d0aa61] font-bold shrink-0 mt-1">•</span>
              <span className="leading-relaxed">{cleanText}</span>
            </div>
          );
        }

        // 5. Cảnh báo / Ghi chú đặc biệt
        if (trimmed.includes('GHI CHÚ ĐẶC BIỆT') || trimmed.includes('Lưu ý:')) {
          return (
            <div key={idx} className="my-4 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-900 text-xs sm:text-sm font-medium">
              ⚠️ {trimmed.replace(/^[*_#\s]+/, '').replace(/[*_#\s]+$/, '')}
            </div>
          );
        }

        // 6. Dòng văn bản bình thường
        return (
          <p key={idx} className="text-[14px] sm:text-[15px] text-zinc-700 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function PdfViewerModal({ document, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeUrl, setActiveUrl] = useState(null);
  const [isUrlResolved, setIsUrlResolved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const fileInputRef = useRef(null);

  const isWord = document?.fileType === 'word' || 
                 document?.title?.endsWith('.doc') || 
                 document?.title?.endsWith('.docx');

  // 1. Phân giải đường dẫn tệp
  useEffect(() => {
    let isMounted = true;
    
    async function resolveFileUrl() {
      if (!document) return;
      setIsUrlResolved(false);

      // 1. Lấy từ IndexedDB bền vững
      if (document.id) {
        try {
          const localData = await getLocalFileUrl(document.id);
          if (localData?.url && isMounted) {
            setActiveUrl(localData.url);
            setIsUrlResolved(true);
            return;
          }
        } catch (e) {
          console.warn('Lỗi đọc IndexedDB:', e);
        }
      }

      const docUrl = document.fileUrl || document.file_url;

      // 2. Nếu là đường dẫn hợp lệ (http, https, hoặc relative public path /...)
      if (
        docUrl &&
        (docUrl.startsWith('http://') ||
          docUrl.startsWith('https://') ||
          docUrl.startsWith('/') ||
          docUrl.startsWith('./'))
      ) {
        if (isMounted) {
          setActiveUrl(docUrl);
          setIsUrlResolved(true);
        }
        return;
      }

      // 3. Nếu là blob URL
      if (docUrl && docUrl.startsWith('blob:')) {
        try {
          const res = await fetch(docUrl);
          if (res.ok && isMounted) {
            setActiveUrl(docUrl);
            setIsUrlResolved(true);
            return;
          }
        } catch {
          // Blob đã thu hồi
        }
      }

      if (isMounted) {
        setActiveUrl(null);
        setIsUrlResolved(true);
      }
    }

    resolveFileUrl();

    return () => {
      isMounted = false;
    };
  }, [document]);

  if (!document) return null;

  const handleDownload = () => {
    const downloadUrl = activeUrl || document.fileUrl || document.file_url;
    if (!downloadUrl) return;
    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = document.title;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleCopyText = () => {
    const textToCopy = document.content || document.description || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsReuploading(true);
      await saveLocalFile(document.id, file);
      const freshUrl = URL.createObjectURL(file);
      setActiveUrl(freshUrl);
    } catch (err) {
      console.error('Lỗi khi nạp lại tệp:', err);
      alert('Không thể lưu tệp vào bộ nhớ: ' + err.message);
    } finally {
      setIsReuploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[80] bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      style={{ zIndex: 80 }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleReupload} 
        accept=".pdf,.doc,.docx" 
        className="hidden" 
      />

      {/* Modal Container */}
      <div 
        className={`bg-[#3f3b35] border border-[#59544c] rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[92vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="px-4 py-3 bg-[#322e29] border-b border-[#4d4841] flex items-center justify-between gap-3 text-white shrink-0">
          {/* File Title & Badges */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isWord ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400' : 'bg-[#d0aa61]/20 border border-[#d0aa61]/40 text-[#d0aa61]'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-zinc-100 truncate" title={document.title}>
                {document.title}
              </h2>
              <p className="text-[11px] text-zinc-300 flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                  isWord ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {isWord ? 'WORD DOCX' : 'PDF DOCUMENT'}
                </span>
                <span>Size: {document.fileSize || 'N/A'}</span>
                <span>&bull; Ngày tạo: {document.createdAt || 'Gần đây'}</span>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-[#454039] border border-[#5d574e] rounded-lg px-2 py-1 text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-200 font-mono w-10 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(160, prev + 10))}
                className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Copy Button */}
            {(document.content || document.description) && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4d4841] hover:bg-[#5d574e] text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
                title="Sao chép toàn bộ nội dung"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Sao chép chữ</span>
                  </>
                )}
              </button>
            )}

            {/* Download Button */}
            {(activeUrl || document.fileUrl || document.file_url) && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d0aa61] hover:bg-[#b89149] text-[#322e29] font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                title="Tải tệp gốc về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-[#4d4841] rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Xem Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-300 hover:text-red-400 hover:bg-[#4d4841] rounded-lg transition-colors ml-1 border-l border-[#4d4841] cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Canvas Body: Luôn cuộn mượt mà từ đầu trang, không dùng flex center gây tràn */}
        <div className="flex-1 bg-[#26231f] overflow-y-auto w-full relative">
          {!isUrlResolved ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-zinc-300">
              <RefreshCw className="w-7 h-7 animate-spin text-[#d0aa61]" />
              <p className="text-sm">Đang nạp dữ liệu tài liệu...</p>
            </div>
          ) : isWord ? (
            /* ========================================================================= */
            /* MICROSOFT WORD DOCUMENT VIEWER: TRANG GIẤY A4 CHUYÊN NGHIỆP */
            /* ========================================================================= */
            <div className="w-full py-8 px-3 sm:px-6 md:px-10 flex justify-center">
              {/* Trang giấy A4 màu trắng bao bọc toàn bộ nội dung từ đầu tới cuối */}
              <div 
                className="bg-white text-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl p-6 sm:p-12 md:p-16 border border-zinc-200 transition-transform"
                style={{
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: 'top center',
                  marginBottom: zoomLevel > 100 ? `${(zoomLevel - 100) * 10}px` : '40px'
                }}
              >
                {/* Header trang tài liệu */}
                <div className="border-b-2 border-zinc-100 pb-5 mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                      W
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                        HỒ SƠ TẬP ĐOÀN NS GROUP
                      </span>
                      <h1 className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                        {document.title.replace(/\.[^/.]+$/, "")}
                      </h1>
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-400 font-mono hidden sm:block">
                    <div className="font-semibold text-zinc-600">NS GROUP ARCHIVE</div>
                    <div>LƯU HÀNH NỘI BỘ</div>
                  </div>
                </div>

                {/* Toàn bộ nội dung văn bản Word hiển thị hoàn hảo trên nền trắng */}
                <WordContentRenderer 
                  content={document.content || document.description} 
                  title={document.title} 
                />
              </div>
            </div>
          ) : activeUrl ? (
            /* Trình đọc PDF nhúng */
            <iframe
              src={`${activeUrl}#toolbar=1&navpanes=1&zoom=${zoomLevel}`}
              title={document.title}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          ) : (
            /* Fallback xem văn bản khi PDF mất liên kết file nhị phân */
            <div className="w-full py-8 px-4 sm:px-8 flex justify-center">
              <div className="bg-white text-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl p-6 sm:p-12 border border-zinc-200">
                <WordContentRenderer 
                  content={document.content || document.description} 
                  title={document.title} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
