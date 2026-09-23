import React from 'react';
import { Eye, Calendar, HardDrive, Tag, Edit2, Trash2, CheckSquare, Square, Lock, FolderOutput, Download } from 'lucide-react';
import { sanitizeFileUrl } from '../services/documentService';
import { getLocalFileUrl } from '../services/localFileStorage';

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
  userRole
}) {
  const isWord = document.fileType === 'word' || 
                 document.id === 'doc-nsg-history-profile' ||
                 (/\.docx?(\)|$|\?|\s)/i.test(document.title || '')) ||
                 (/\.docx?(\?|$)/i.test(document.fileUrl || '')) ||
                 (document.title && document.title.toLowerCase().includes('.doc'));

  const isProtected = Boolean(document.isProtected || document.isDefault || document.id === 'doc-nsg-history-profile');
  const bgImageUrl = isWord ? '/word_background.png' : '/pdf_background.png';

  const formattedDate = React.useMemo(() => {
    if (!document.createdAt) return 'Mới';
    const match = String(document.createdAt).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1].slice(2)}`;
    }
    return String(document.createdAt).slice(0, 10);
  }, [document.createdAt]);

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
    <div className={`bg-white rounded-xl border transition-all flex flex-col justify-between group overflow-hidden relative ${
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

          {/* Admin Action Buttons (Edit, Move, Delete) */}
          {userRole === 'admin' && (
            <div className="flex items-center gap-0.5 shrink-0 bg-zinc-50 p-0.5 rounded-lg border border-zinc-200 shadow-2xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditDocument && onEditDocument(document);
                }}
                className="p-1.5 rounded-md text-zinc-500 hover:text-[#9f7a35] hover:bg-white active:scale-90 transition-all cursor-pointer"
                title="Chỉnh sửa thông tin tài liệu"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDocument && onMoveDocument(document);
                }}
                className="p-1.5 rounded-md text-zinc-500 hover:text-[#9f7a35] hover:bg-white active:scale-90 transition-all cursor-pointer"
                title="Di chuyển tài liệu sang folder khác"
              >
                <FolderOutput className="w-3.5 h-3.5" />
              </button>
              
              {isProtected ? (
                <span 
                  className="p-1.5 rounded-md text-zinc-300 cursor-not-allowed" 
                  title="Tài liệu cốt lõi hệ thống được bảo vệ - Không thể xóa"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument && onDeleteDocument(document);
                  }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-white active:scale-90 transition-all cursor-pointer"
                  title="Xóa tài liệu khỏi kho"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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

        {/* Thumbnail Banner with Custom Background (pdf_background.png / word_background.png) */}
        <div 
          onClick={() => onViewPdf(document)}
          className="h-32 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative overflow-hidden border border-zinc-200 shadow-inner bg-cover bg-center bg-no-repeat group-hover:scale-[1.02]"
          style={{ backgroundImage: `url('${bgImageUrl}')` }}
        >
          {/* Format Badge */}
          <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-white font-bold text-[9px] rounded-md uppercase shadow-xs ${
            isWord ? 'bg-blue-600' : 'bg-red-600'
          }`}>
            {isWord ? 'WORD' : 'PDF'}
          </div>
          
          <div className="bg-zinc-950/60 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 text-white mt-auto">
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
      <div className="px-3.5 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-1.5 text-xs text-zinc-500">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 min-w-0 shrink">
          <span className="flex items-center gap-1 whitespace-nowrap font-medium text-zinc-600 shrink-0">
            <HardDrive className="w-3 h-3 text-zinc-400 shrink-0" />
            {document.fileSize || 'N/A'}
          </span>
          <span 
            className="hidden sm:flex items-center gap-1 whitespace-nowrap text-zinc-400 shrink-0" 
            title={document.createdAt ? `Ngày tải: ${document.createdAt}` : 'Mới'}
          >
            <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nút Tải về nhanh ngay ngoài Card */}
          <button
            type="button"
            onClick={handleQuickDownload}
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-700 hover:text-[#9f7a35] px-2 py-1 rounded-md bg-white hover:bg-[#faf6ed] border border-zinc-200 hover:border-[#d0aa61]/50 whitespace-nowrap transition-all cursor-pointer shadow-2xs shrink-0"
            title="Tải tệp này về máy"
          >
            <Download className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="whitespace-nowrap">Tải về</span>
          </button>

          {/* Nút Đọc ngay */}
          <button
            type="button"
            onClick={() => onViewPdf(document)}
            className="flex items-center gap-1 text-xs font-semibold text-[#9f7a35] hover:text-[#b89149] px-2.5 py-1 rounded-md bg-[#faf6ed] border border-[#d0aa61]/40 hover:bg-[#d0aa61]/25 whitespace-nowrap transition-all cursor-pointer shadow-2xs shrink-0"
            title="Xem tài liệu"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Đọc ngay</span>
          </button>
        </div>
      </div>

    </div>
  );
}
