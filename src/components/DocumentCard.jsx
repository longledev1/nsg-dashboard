import React from 'react';
import { Eye, Calendar, HardDrive, Tag, Edit2, Trash2, CheckSquare, Square, Lock, FolderOutput, Download, MoreVertical, Share2 } from 'lucide-react';
import { sanitizeFileUrl } from '../services/documentService';
import { getLocalFileUrl } from '../services/localFileStorage';
import { generatePdfThumbnail } from '../services/pdfExtractor';

// Bộ nhớ đệm ảnh thumbnail trang 1 trong phiên trình duyệt (0ms render)
const thumbnailMemoryCache = new Map();

/**
 * Xóa cache ảnh thumbnail của 1 tài liệu khi người dùng nạp lại file mới
 */
export function clearDocumentThumbnailCache(docId) {
  if (!docId) return;
  thumbnailMemoryCache.delete(docId);
  try {
    localStorage.removeItem(`nsg_thumb_${docId}`);
  } catch (e) {}
}

/**
 * Lưu ảnh thumbnail mới vào cache kèm fileUrl để xác thực tính mới
 */
export function setCachedDocumentThumbnail(docId, fileUrl, thumb) {
  if (!docId || !thumb) return;
  const entry = { thumb, fileUrl: fileUrl || '' };
  thumbnailMemoryCache.set(docId, entry);
  try {
    localStorage.setItem(`nsg_thumb_${docId}`, JSON.stringify(entry));
  } catch (e) {}
}

function getValidCachedThumb(docId, currentFileUrl) {
  if (!docId) return null;
  // 1. Kiểm tra RAM cache
  if (thumbnailMemoryCache.has(docId)) {
    const entry = thumbnailMemoryCache.get(docId);
    if (entry && typeof entry === 'object') {
      if (!currentFileUrl || !entry.fileUrl || entry.fileUrl === currentFileUrl) {
        return entry.thumb;
      }
    } else if (typeof entry === 'string') {
      return entry;
    }
  }

  // 2. Kiểm tra LocalStorage
  try {
    const saved = localStorage.getItem(`nsg_thumb_${docId}`);
    if (saved) {
      let parsed;
      try {
        parsed = JSON.parse(saved);
      } catch (err) {
        parsed = { thumb: saved, fileUrl: '' };
      }
      if (parsed && parsed.thumb) {
        if (!currentFileUrl || !parsed.fileUrl || parsed.fileUrl === currentFileUrl) {
          thumbnailMemoryCache.set(docId, parsed);
          return parsed.thumb;
        }
      }
    }
  } catch (e) {}

  return null;
}

export default function DocumentCard({
  document,
  categoryName,
  subFolderName,
  isSelected,
  onToggleSelect,
  onViewPdf,
  onEditDocument,
  onMoveDocument,
  onDeleteDocument,
  onShareDocument,
  userRole
}) {
  const isWord = document.fileType === 'word' || 
                 document.id === 'doc-nsg-history-profile' ||
                 (/\.docx?(\)|$|\?|\s)/i.test(document.title || '')) ||
                 (/\.docx?(\?|$)/i.test(document.fileUrl || '')) ||
                 (document.title && document.title.toLowerCase().includes('.doc'));

  const isProtected = Boolean(document.isProtected || document.isDefault || document.id === 'doc-nsg-history-profile');
  const bgImageUrl = isWord ? '/word_background.png' : '/pdf_background.png';

  const currentFileUrl = sanitizeFileUrl(document.fileUrl || document.file_url);

  // Quản lý ảnh bìa trang 1 thực tế của tệp PDF (Xác thực theo fileUrl để không bị kẹt ảnh file cũ)
  const [pdfThumbnail, setPdfThumbnail] = React.useState(() => {
    const cached = getValidCachedThumb(document.id, currentFileUrl);
    if (cached) return cached;
    return document.thumbnailUrl || document.thumbnail_url || null;
  });

  // Tự động render trang 1 của PDF ngầm và lưu vào Cache khi nạp file mới hoặc chưa có cache
  React.useEffect(() => {
    if (isWord) return;

    // Kiểm tra xem cache có khớp với fileUrl hiện tại không
    const cachedThumb = getValidCachedThumb(document.id, currentFileUrl);
    if (cachedThumb) {
      setPdfThumbnail(cachedThumb);
      return;
    }

    // Nếu không khớp (fileUrl đã thay đổi do nạp lại file) -> reset và render lại trang 1 của file mới
    setPdfThumbnail(null);

    let isMounted = true;
    async function loadThumbnail() {
      let sourceUrl = currentFileUrl;

      if (!sourceUrl && document.id) {
        try {
          const localData = await getLocalFileUrl(document.id);
          if (localData?.url) sourceUrl = localData.url;
        } catch (e) {}
      }

      if (!sourceUrl) return;

      try {
        const thumb = await generatePdfThumbnail(sourceUrl, 380);
        if (thumb && isMounted) {
          setPdfThumbnail(thumb);
          setCachedDocumentThumbnail(document.id, currentFileUrl, thumb);
        }
      } catch (err) {
        console.warn('Lỗi trích xuất thumbnail PDF:', err);
      }
    }

    loadThumbnail();

    return () => {
      isMounted = false;
    };
  }, [document.id, currentFileUrl, isWord]);

  // Quản lý trạng thái mở menu 3 chấm (:)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Đóng menu khi click ra ngoài hoặc bấm Escape
  React.useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Tải tệp trực tiếp từ Card 1 chạm
  const handleQuickDownload = async (e) => {
    e.stopPropagation();
    const rawUrl = document.fileUrl || document.file_url;
    const cleanUrl = sanitizeFileUrl(rawUrl);

    if (cleanUrl) {
      const link = window.document.createElement('a');
      link.href = cleanUrl;
      link.download = document.title || 'Tai_lieu_NSG';
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      return;
    }

    if (document.id) {
      try {
        const localData = await getLocalFileUrl(document.id);
        if (localData?.url) {
          const link = window.document.createElement('a');
          link.href = localData.url;
          link.download = document.title || 'Tai_lieu_NSG';
          link.target = '_blank';
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          return;
        }
      } catch (err) {
        console.warn('Lỗi đọc file local:', err);
      }
    }

    const textContent = document.content || document.description;
    if (textContent) {
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${(document.title || 'Tai_lieu_NSG').replace(/\.[^/.]+$/, '')}_NoiDung.txt`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    alert('Tài liệu chưa có tệp đính kèm khả dụng để tải về.');
  };

  return (
    <div className={`bg-white rounded-xl border transition-all flex flex-col justify-between group relative ${
      isSelected 
        ? 'border-[#d0aa61] ring-2 ring-[#d0aa61]/30 shadow-md' 
        : 'border-zinc-200/80 hover:shadow-md hover:border-[#d0aa61]/60'
    }`}>
      
      {/* Top Card Header */}
      <div className="p-4 flex-1">
        
        {/* Row 1: Checkbox & Protection Badge (Left) | Action Buttons (Right) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Multi-select Checkbox */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect && onToggleSelect(document.id);
                }}
                className="p-1 -ml-1 text-zinc-400 hover:text-[#d0aa61] active:scale-95 transition-all shrink-0 cursor-pointer"
                title={isSelected ? "Bỏ chọn tài liệu này" : "Chọn tài liệu này"}
              >
                {isSelected ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#d0aa61] fill-[#faf6ed]" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-zinc-300 hover:text-[#d0aa61]" />
                )}
              </button>
            )}

            {isProtected && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#faf6ed] text-[#9f7a35] border border-[#d0aa61]/30 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5 text-[#d0aa61]" /> Hệ thống
              </span>
            )}
          </div>

          {/* Admin Action Menu: Gộp tất cả hành động vào icon 3 chấm dọc (:) - Chỉ dành cho Quản trị viên */}
          {userRole === 'admin' && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(prev => !prev);
                }}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isMenuOpen 
                    ? 'bg-[#faf6ed] border-[#d0aa61] text-[#9f7a35] shadow-xs' 
                    : 'bg-zinc-50 hover:bg-white border-zinc-200 text-zinc-500 hover:text-[#9f7a35]'
                }`}
                title="Tùy chọn tài liệu"
                aria-label="Tùy chọn tài liệu"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-zinc-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* 1. Chia sẻ tài liệu */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onShareDocument && onShareDocument(document);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-[#faf6ed] hover:text-[#9f7a35] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#d0aa61]" />
                    <span>Chia sẻ tài liệu</span>
                  </button>

                  {/* 2. Di chuyển file */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onMoveDocument && onMoveDocument(document);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-[#faf6ed] hover:text-[#9f7a35] flex items-center gap-2.5 transition-colors cursor-pointer"
                    title="Di chuyển file sang folder khác"
                  >
                    <FolderOutput className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Di chuyển file</span>
                  </button>

                  {/* 3. Chỉnh sửa thông tin */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditDocument && onEditDocument(document);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-[#faf6ed] hover:text-[#9f7a35] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Sửa thông tin</span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-zinc-100" />

                  {/* 4. Xóa tài liệu */}
                  {isProtected ? (
                    <div 
                      className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-400 flex items-center gap-2.5 cursor-not-allowed select-none"
                      title="Tài liệu cốt lõi hệ thống được bảo vệ - Không thể xóa"
                    >
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Tài liệu bảo vệ</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteDocument && onDeleteDocument(document);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Xóa tài liệu</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Category & Subfolder Path Badges */}
        {(categoryName || subFolderName) && (
          <div className="flex items-center flex-wrap gap-1 mb-3 min-w-0">
            {categoryName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 max-w-[140px] truncate" title={categoryName}>
                {categoryName}
              </span>
            )}
            {categoryName && subFolderName && (
              <span className="text-zinc-300 text-[10px]">/</span>
            )}
            {subFolderName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#faf6ed] text-[#9f7a35] border border-[#d0aa61]/30 max-w-[140px] truncate" title={subFolderName}>
                {subFolderName}
              </span>
            )}
          </div>
        )}

        {/* Thumbnail Banner with Custom Background or Real Page 1 of PDF */}
        <div 
          onClick={() => onViewPdf(document)}
          className="h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden border border-zinc-200/90 shadow-inner bg-cover bg-center bg-no-repeat group-hover:scale-[1.02] bg-[#f8f6f0]"
          style={!pdfThumbnail ? { backgroundImage: `url('${bgImageUrl}')` } : undefined}
        >
          {/* Ảnh trang 1 thực tế của PDF nếu có */}
          {pdfThumbnail && (
            <div className="absolute inset-0 w-full h-full overflow-hidden flex items-start justify-center bg-zinc-100">
              <img
                src={pdfThumbnail}
                alt={document.title}
                className="w-full h-full object-cover object-top filter brightness-[0.98] group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Lớp phủ chuyển sắc tinh tế làm nổi bật nút bấm và text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            </div>
          )}

          {/* Format Badge */}
          <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-white font-bold text-[9px] rounded-md uppercase shadow-xs z-10 ${
            isWord ? 'bg-blue-600' : 'bg-red-600'
          }`}>
            {isWord ? 'WORD' : 'PDF'}
          </div>

          {/* Badge nhỏ đánh dấu Trang 1 */}
          {pdfThumbnail && (
            <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-[9px] font-medium text-amber-200 rounded border border-white/20 z-10 shadow-xs">
              Trang 1
            </div>
          )}
          
          <div className="bg-zinc-950/70 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/25 flex items-center gap-1.5 text-white mt-auto mb-2.5 z-10 shadow-sm group-hover:bg-zinc-950/85 transition-colors">
            <Eye className="w-3.5 h-3.5 text-[#d0aa61]" />
            <span className="text-[11px] font-semibold tracking-wide">Đọc trực tiếp</span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 
          onClick={() => onViewPdf(document)}
          className="mt-3.5 font-bold text-sm text-[#504b44] group-hover:text-[#9f7a35] transition-colors line-clamp-2 cursor-pointer"
          title={document.title}
        >
          {document.title}
        </h3>

        <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed font-normal">
          {document.description || 'Không có mô tả chi tiết.'}
        </p>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {document.tags.map((tag, idx) => (
              <span key={idx} className="text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium">
                <Tag className="w-2.5 h-2.5 text-zinc-400" />
                {tag}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Card Footer Meta & Action */}
      <div className="px-4 py-3 bg-zinc-50/80 border-t border-zinc-100 flex flex-col gap-2.5">
        {/* Hàng 1: Dung lượng & Ngày tải lên đầy đủ, rõ ràng */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-zinc-600">
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span>{document.fileSize || 'N/A'}</span>
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-zinc-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>{document.createdAt || 'Mới'}</span>
          </span>
        </div>

        {/* Hàng 2: Nút Tải về & Đọc ngay (Cân xứng, rộng rãi, dễ bấm trên mọi thiết bị) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Nút Tải về */}
          <button
            type="button"
            onClick={handleQuickDownload}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-[#faf6ed] text-zinc-700 hover:text-[#9f7a35] border border-zinc-200 hover:border-[#d0aa61]/50 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs"
            title="Tải tệp này về máy"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tải về</span>
          </button>

          {/* Nút Đọc ngay */}
          <button
            type="button"
            onClick={() => onViewPdf(document)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#faf6ed] hover:bg-[#d0aa61]/25 text-[#9f7a35] hover:text-[#b89149] border border-[#d0aa61]/40 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs"
            title="Xem tài liệu"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Đọc ngay</span>
          </button>
        </div>
      </div>

    </div>
  );
}
