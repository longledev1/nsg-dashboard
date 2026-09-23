import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, 
  Upload, RefreshCw, Copy, Check, ExternalLink, AlertCircle, FileUp, Sparkles, Eye
} from 'lucide-react';
import { getLocalFileUrl, saveLocalFile } from '../services/localFileStorage';
import { sanitizeFileUrl, uploadPdfFileToStorage, updateDocumentInDb, isTouchDeviceOrIOS } from '../services/documentService';
import { extractDocumentContent, generatePdfThumbnail } from '../services/pdfExtractor';
import { clearDocumentThumbnailCache, setCachedDocumentThumbnail } from './DocumentCard';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

export default function PdfViewerModal({ document, onUpdateDocument, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeUrl, setActiveUrl] = useState(null);
  const [isUrlResolved, setIsUrlResolved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const [viewerMode, setViewerMode] = useState('direct'); // 'direct' (native browser PDF) | 'google' | 'text'
  const fileInputRef = useRef(null);

  const isWord = document?.fileType === 'word' || 
                 document?.id === 'doc-nsg-history-profile' ||
                 (/\.docx?(\)|$|\?|\s)/i.test(document?.title || '')) ||
                 (/\.docx?(\?|$)/i.test(document?.fileUrl || '')) ||
                 (document?.title && document.title.toLowerCase().includes('.doc'));

  // 1. Phân giải đường dẫn tệp an toàn
  useEffect(() => {
    let isMounted = true;
    
    async function resolveFileUrl() {
      if (!document) return;
      setIsUrlResolved(false);

      // 1. Phân giải URL từ Cloud / Public Static Path được truyền qua props
      const rawUrl = document.fileUrl || document.file_url;
      const cleanUrl = sanitizeFileUrl(rawUrl);

      if (cleanUrl && isMounted) {
        setActiveUrl(cleanUrl);
        setIsUrlResolved(true);
        return;
      }

      // 2. Kiểm tra trong IndexedDB của máy hiện tại
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

      // 3. Tự động truy vấn trực tiếp Supabase Database (Xử lý trường hợp Tab 2 mở sẵn từ trước khi Tab 1 nạp file)
      if (document.id && isSupabaseConfigured && supabase) {
        try {
          const { data: dbData } = await supabase
            .from('documents')
            .select('file_url')
            .eq('id', document.id)
            .maybeSingle();

          if (dbData?.file_url) {
            const freshUrl = sanitizeFileUrl(dbData.file_url);
            if (freshUrl && isMounted) {
              setActiveUrl(freshUrl);
              setIsUrlResolved(true);
              return;
            }
          }
        } catch (dbErr) {
          console.warn('Truy vấn file_url mới nhất từ DB thất bại:', dbErr);
        }
      }

      // 4. Với tài liệu hồ sơ mặc định nếu mất URL, fallback về public asset
      if (document.id === 'doc-nsg-history-profile' && isMounted) {
        setActiveUrl('/NSG History.docx');
        setIsUrlResolved(true);
        return;
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
    const downloadUrl = activeUrl || sanitizeFileUrl(document.fileUrl || document.file_url);
    if (downloadUrl) {
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.title;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      return;
    }

    // Nếu không có tệp nhị phân nhưng có văn bản trích xuất, xuất file text
    const textContent = document.content || document.description;
    if (textContent) {
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title.replace(/\.[^/.]+$/, "")}_NoiDung.txt`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyText = () => {
    const textToCopy = document.content || document.description || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Nạp lại file: Tự động lưu IndexedDB + Tải lên Supabase Storage + Cập nhật DB
  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsReuploading(true);
      
      // 1. Lưu vào IndexedDB cục bộ của thiết bị hiện tại
      await saveLocalFile(document.id, file);
      const freshBlobUrl = URL.createObjectURL(file);
      setActiveUrl(freshBlobUrl);

      // 2. Trích xuất văn bản nếu tài liệu chưa có nội dung
      let extracted = document.content;
      if (!extracted || extracted.length < 50) {
        try {
          extracted = await extractDocumentContent(file);
        } catch (extErr) {
          console.warn('Lỗi trích xuất chữ khi reupload:', extErr);
        }
      }

      // 3. Xóa cache ảnh thumbnail cũ và trích xuất ảnh bìa mới từ file vừa nạp
      clearDocumentThumbnailCache(document.id);
      let freshThumb = null;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          freshThumb = await generatePdfThumbnail(file, 380);
        } catch (thumbErr) {
          console.warn('Lỗi tạo thumbnail mới khi reupload:', thumbErr);
        }
      }

      // 4. Tải lên Supabase Storage bucket nsg-documents
      const uploadResult = await uploadPdfFileToStorage(file);
      if (uploadResult?.error || !uploadResult?.url) {
        const errMsg = uploadResult?.error || 'Không nhận được URL từ Supabase Storage';
        const isTimeout = errMsg.toLowerCase().includes('thời gian chờ') || errMsg.toLowerCase().includes('timeout');
        if (isTimeout) {
          alert(`⚠️ Tệp tin tải lên bị hết thời gian chờ!\n\nChi tiết: "${errMsg}"\n\n👉 File có thể có dung lượng nặng hoặc đường truyền mạng bị chậm/chập chờn. Bạn vui lòng kiểm tra kết nối mạng và thử nạp lại nhé!`);
        } else {
          alert(`❌ Tệp đã lưu tạm trên máy này, nhưng CHƯA thể tải lên Cloud Storage Supabase!\n\nLỗi từ Supabase: "${errMsg}"\n\n👉 Bạn hãy vào Supabase SQL Editor chạy câu lệnh cấp quyền cho Storage bucket 'nsg-documents'.`);
        }
        return;
      }

      const remotePublicUrl = uploadResult.url;

      // Lưu thumbnail mới vào cache với remotePublicUrl mới
      if (freshThumb) {
        setCachedDocumentThumbnail(document.id, remotePublicUrl, freshThumb);
      }

      // 5. Đồng bộ vào Supabase Database
      const updatedDoc = {
        ...document,
        fileUrl: remotePublicUrl,
        content: extracted || document.content || document.description || '',
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        thumbnailUrl: freshThumb || null,
      };

      const dbResult = await updateDocumentInDb(updatedDoc);
      if (dbResult && !dbResult.success) {
        alert(`❌ Tệp PDF đã tải lên Cloud Storage thành công, nhưng LỖI khi lưu vào Supabase Database: "${dbResult.error}"\n\n👉 Vui lòng kiểm tra quyền của bảng 'documents' trên Supabase.`);
        return;
      }

      if (onUpdateDocument) {
        onUpdateDocument(updatedDoc);
      }
      setActiveUrl(remotePublicUrl);
      alert('✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG LÊN CLOUD!\nTệp PDF đã được lưu vào Storage và Database. Tab khác, iPad và Điện thoại từ bây giờ đều xem được ngay lập tức!');
    } catch (err) {
      console.error('Lỗi khi nạp lại tệp:', err);
      alert('Không thể lưu tệp: ' + err.message);
    } finally {
      setIsReuploading(false);
    }
  };

  // Mở tài liệu trực tiếp sang Tab mới toàn màn hình (hỗ trợ tối đa cho iPad, Safari, Chrome)
  const handleOpenNewTab = () => {
    const rawUrl = activeUrl || sanitizeFileUrl(document.fileUrl || document.file_url);
    if (rawUrl) {
      // 1. Nếu là đường dẫn tệp tĩnh public (như /NSG History.docx) trên hosting
      if (rawUrl.startsWith('/') && typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
        const fullPublicUrl = `${window.location.origin}${rawUrl}`;
        window.open(fullPublicUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // 2. Mở URL online (Supabase Cloud Storage / Blob): mở trực tiếp để trình duyệt đọc PDF gốc native
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 4. Nếu chỉ có văn bản trích xuất -> mở trang tab mới toàn màn hình
    const textContent = document.content || document.description;
    if (textContent) {
      const newWin = window.open('', '_blank');
      if (newWin) {
        newWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${document.title}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.75; padding: 40px 20px; max-width: 900px; margin: 0 auto; color: #27272a; background: #f4f4f5; }
                .container { background: #ffffff; padding: 48px; border-radius: 16px; border: 1px solid #e4e4e7; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); }
                h1 { color: #18181b; border-bottom: 2px solid #f4f4f5; padding-bottom: 16px; font-size: 24px; margin-top: 0; }
                .meta { font-size: 13px; color: #71717a; margin-bottom: 28px; font-family: monospace; font-weight: 600; }
                .content { white-space: pre-wrap; font-size: 15px; color: #3f3f46; word-break: break-word; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>${document.title}</h1>
                <div class="meta">NS GROUP PORTAL &bull; HỒ SƠ TẬP ĐOÀN &bull; LƯU HÀNH NỘI BỘ</div>
                <div class="content">${textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>
            </body>
          </html>
        `);
        newWin.document.close();
      }
    }
  };

  const hasContentText = Boolean(document.content || document.description);
  
  // Tính toán đường dẫn hiển thị cho iframe: mặc định dùng trực tiếp PDF (nhanh, nét, ổn định nhất)
  const getEmbeddedIframeSrc = () => {
    if (!activeUrl) return null;
    if (viewerMode === 'google') {
      if (activeUrl.startsWith('http://') || activeUrl.startsWith('https://')) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(activeUrl)}&embedded=true`;
      }
      if (activeUrl.startsWith('/') && typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
        const fullUrl = `${window.location.origin}${activeUrl}`;
        return `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
      }
    }
    // Mặc định viewerMode === 'direct': nạp trực tiếp PDF
    return `${activeUrl}#toolbar=1&navpanes=1`;
  };

  const iframeSrc = getEmbeddedIframeSrc();
  const showTextReader = isWord || (!activeUrl && hasContentText) || viewerMode === 'text';

  return (
    <div 
      className="fixed inset-0 z-[80] bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      style={{ zIndex: 80 }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleReupload} 
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
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
              <p className="text-[11px] text-zinc-300 flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                  isWord ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {isWord ? 'WORD DOCX' : 'PDF DOCUMENT'}
                </span>
                <span>Size: {document.fileSize || 'N/A'}</span>
                <span>&bull; Ngày: {document.createdAt || 'Gần đây'}</span>
                {!activeUrl && !isWord && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Trích xuất văn bản
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle Switcher */}
            {activeUrl && !isWord && (
              <div className="flex items-center bg-[#454039] border border-[#5d574e] rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewerMode('direct')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${viewerMode === 'direct' ? 'bg-[#d0aa61] text-[#322e29] font-bold shadow-2xs' : 'text-zinc-300 hover:text-white'}`}
                  title="Xem tài liệu PDF trực tiếp bằng trình đọc trình duyệt"
                >
                  PDF
                </button>
                {hasContentText && (
                  <button
                    onClick={() => setViewerMode('text')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${viewerMode === 'text' ? 'bg-[#d0aa61] text-[#322e29] font-bold shadow-2xs' : 'text-zinc-300 hover:text-white'}`}
                    title="Xem bản trích xuất văn bản"
                  >
                    Văn bản
                  </button>
                )}
              </div>
            )}

            {/* Nút Mở Tab Mới Toàn Màn Hình */}
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4d4841] hover:bg-[#5d574e] text-[#d0aa61] hover:text-[#e4c27a] font-semibold text-xs rounded-lg transition-colors cursor-pointer border border-[#5d574e] shadow-2xs"
              title="Mở sang Tab mới để xem toàn màn hình (khắc phục lỗi màn hình trắng iPad)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#d0aa61]" />
              <span className="hidden sm:inline">Mở Tab Mới</span>
              <span className="sm:hidden">Tab mới</span>
            </button>

            {/* Nút Đính kèm / Nạp lại tệp PDF gốc */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isReuploading}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#4d4841] hover:bg-[#5d574e] text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Tải lên tệp gốc để đồng bộ"
            >
              {isReuploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#d0aa61]" />
                  <span>Đang nạp...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5 text-[#d0aa61]" />
                  <span>Nạp file gốc</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            {hasContentText && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4d4841] hover:bg-[#5d574e] text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
                title="Sao chép toàn bộ nội dung"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Sao chép</span>
                  </>
                )}
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d0aa61] hover:bg-[#b89149] text-[#322e29] font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Tải tệp về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

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

        {/* Reader Canvas Body */}
        <div className="flex-1 w-full relative min-h-0 bg-[#26231f] flex flex-col overflow-hidden">
          {!isUrlResolved ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-zinc-300 flex-1">
              <RefreshCw className="w-7 h-7 animate-spin text-[#d0aa61]" />
              <p className="text-sm">Đang nạp dữ liệu tài liệu...</p>
            </div>
          ) : showTextReader ? (
            /* ========================================================================= */
            /* TRÌNH ĐỌC NỘI DUNG VĂN BẢN TRÊN TRANG GIẤY A4 CHUYÊN NGHIỆP */
            /* ========================================================================= */
            <div className="w-full h-full overflow-y-auto py-8 px-3 sm:px-6 md:px-10 flex flex-col items-center flex-1">
              
              {/* Thông báo chế độ xem nếu PDF không có liên kết cloud */}
              {!isWord && !activeUrl && (
                <div className="w-full max-w-4xl mb-4 p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-200 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tệp PDF gốc được tải lên trước đó ở máy cục bộ. Đang hiển thị đầy đủ nội dung văn bản trích xuất.</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReuploading}
                    className="shrink-0 px-3 py-1 bg-[#d0aa61] hover:bg-[#b89149] text-[#322e29] font-bold rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nạp lại tệp PDF</span>
                  </button>
                </div>
              )}

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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs ${
                      isWord ? 'bg-blue-600' : 'bg-[#9f7a35]'
                    }`}>
                      {isWord ? 'W' : 'PDF'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-[#9f7a35] uppercase bg-[#faf6ed] px-2.5 py-0.5 rounded border border-[#d0aa61]/30">
                        TÀI LIỆU HỒ SƠ NS GROUP
                      </span>
                      <h1 className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">
                        {document.title.replace(/\.[^/.]+$/, "")}
                      </h1>
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-400 font-mono hidden sm:block">
                    <div className="font-semibold text-zinc-600">NS GROUP PORTAL</div>
                    <div>LƯU HÀNH NỘI BỘ</div>
                  </div>
                </div>

                {/* Toàn bộ nội dung văn bản Word/PDF hiển thị hoàn hảo trên nền trắng */}
                {hasContentText ? (
                  <WordContentRenderer 
                    content={document.content || document.description} 
                    title={document.title} 
                  />
                ) : (
                  <div className="py-16 text-center text-zinc-500 space-y-4">
                    <FileText className="w-12 h-12 text-zinc-300 mx-auto" />
                    <p className="text-sm font-medium">Tài liệu này chưa có nội dung văn bản trích xuất.</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-[#d0aa61] text-[#322e29] font-bold rounded-lg hover:bg-[#b89149] transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Chọn và tải tệp PDF/Word lên</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : iframeSrc ? (
            /* Trình đọc PDF nhúng: dùng object kết hợp iframe fallback chuẩn W3C */
            <div className="absolute inset-0 w-full h-full bg-white flex flex-col">
              {/* Banner trợ giúp thông minh cho iPad / thiết bị di động */}
              {isTouchDeviceOrIOS() && (
                <div className="bg-[#faf6ed] border-b border-[#d0aa61]/40 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs text-[#504b44] shrink-0 shadow-2xs">
                  <span className="font-medium truncate">
                    📱 Nếu bạn dùng <strong>iPad / Mobile</strong> và khung bên dưới bị trắng do Apple chặn, hãy mở Tab mới:
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="px-2.5 py-1 bg-[#d0aa61] hover:bg-[#b89149] text-[#322e29] font-bold rounded-lg transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Tab Mới</span>
                  </button>
                </div>
              )}
              <object
                data={iframeSrc}
                type="application/pdf"
                className="w-full h-full flex-1 border-0"
              >
                <iframe
                  src={iframeSrc}
                  title={document.title}
                  className="w-full h-full flex-1 border-0 bg-white"
                />
              </object>
            </div>
          ) : (
            /* Fallback xem văn bản khi PDF mất liên kết file nhị phân */
            <div className="w-full h-full overflow-y-auto py-8 px-4 sm:px-8 flex justify-center flex-1">
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

