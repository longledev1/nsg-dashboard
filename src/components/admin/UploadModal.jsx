import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Check, AlertCircle, AlertTriangle, Loader2, Files, Trash2 } from 'lucide-react';
import { uploadPdfFileToStorage, sortSubFoldersWithGeneralFirst } from '../../services/documentService';
import { extractDocumentContent } from '../../services/pdfExtractor';
import { saveLocalFile } from '../../services/localFileStorage';

export default function UploadModal({
  categories,
  subFolders,
  preSelectedCategory,
  preSelectedSubFolder,
  onUploadDocument,
  onClose,
  onShowToast
}) {
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(preSelectedCategory || categories[0]?.id || '');
  const [selectedSubFolder, setSelectedSubFolder] = useState(preSelectedSubFolder || '');
  const [tagsInput, setTagsInput] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadStepText, setUploadStepText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (preSelectedCategory) setSelectedCategory(preSelectedCategory);
    if (preSelectedSubFolder) setSelectedSubFolder(preSelectedSubFolder);
  }, [preSelectedCategory, preSelectedSubFolder]);

  // Filter SubFolders based on Selected Category
  const availableSubFolders = sortSubFoldersWithGeneralFirst(
    subFolders.filter(sf => sf.categoryId === selectedCategory)
  );

  const processFiles = (selectedFilesList) => {
    const selectedFiles = Array.from(selectedFilesList);
    if (selectedFiles.length === 0) return;

    const validFiles = [];
    const rejectedFiles = [];

    selectedFiles.forEach(f => {
      const nameLower = f.name.toLowerCase();
      const isValidFormat = 
        f.type === 'application/pdf' ||
        f.type === 'application/msword' ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        nameLower.endsWith('.pdf') || 
        nameLower.endsWith('.doc') || 
        nameLower.endsWith('.docx');

      if (isValidFormat) {
        validFiles.push(f);
      } else {
        rejectedFiles.push(f.name);
      }
    });

    if (rejectedFiles.length > 0) {
      const warningText = `⚠️ Phát hiện ${rejectedFiles.length} tệp KHÔNG thuộc định dạng PDF hoặc Word (.docx/.doc) đã bị từ chối:\n• ${rejectedFiles.join('\n• ')}`;
      setWarning(warningText);
      if (onShowToast) {
        onShowToast(`Cảnh báo: ${rejectedFiles.length} tệp không đúng định dạng PDF/Word đã bị hủy bỏ!`, 'error');
      }
    } else {
      setWarning('');
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      setError('Vui lòng chọn danh mục chính!');
      return;
    }

    if (files.length === 0) {
      setError('Vui lòng chọn ít nhất 1 tệp tài liệu PDF hoặc Word!');
      return;
    }

    setUploading(true);
    setError('');
    setProgressPercent(5);
    setUploadStepText('Đang khởi tạo tiến trình upload...');
    setUploadProgress({ current: 0, total: files.length });

    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const targetSubId = selectedCategory === 'cat-general' ? null : (selectedSubFolder || null);

    try {
      // Upload từng file một hàng loạt với tiến trình chi tiết
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentProcessingFile(file);
        setUploadProgress({ current: i + 1, total: files.length });

        const basePercent = Math.round((i / files.length) * 100);
        setProgressPercent(Math.max(basePercent + 10, 15));
        setUploadStepText(`[Tệp ${i + 1}/${files.length}] Đang tải lên & trích xuất văn bản...`);

        // Chạy song song cả 2 tác vụ: Trích xuất chữ AI + Tải lên Supabase Storage cùng một lúc
        const [extractedContentResult, uploadedPublicUrlResult] = await Promise.all([
          extractDocumentContent(file).catch((err) => {
            console.warn('Lỗi đọc nội dung file:', err);
            return '';
          }),
          uploadPdfFileToStorage(file).catch((err) => {
            console.warn('Lỗi tải file lên storage:', err);
            return null;
          }),
        ]);

        const extractedContent = extractedContentResult || '';
        let uploadedPublicUrl = uploadedPublicUrlResult || URL.createObjectURL(file);

        // Lưu trữ thông tin vào cơ sở dữ liệu
        setProgressPercent(Math.round(((i + 0.95) / files.length) * 100));
        setUploadStepText(`[Tệp ${i + 1}/${files.length}] Đang đồng bộ vào kho dữ liệu...`);

        const nameLower = file.name.toLowerCase();
        const fileType = (nameLower.endsWith('.doc') || nameLower.endsWith('.docx')) ? 'word' : 'pdf';
        const docDesc = description.trim() || (extractedContent ? extractedContent.slice(0, 300) + '...' : `Tài liệu ${file.name}`);

        const newDoc = {
          id: `doc-${Date.now()}-${i}`,
          title: file.name,
          description: docDesc,
          content: extractedContent,
          categoryId: selectedCategory,
          subFolderId: targetSubId,
          fileUrl: uploadedPublicUrl,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileType: fileType,
          tags: tagsArray.length > 0 ? tagsArray : ['NSG', fileType.toUpperCase()],
          createdAt: new Date().toISOString().split('T')[0],
        };

        // Lưu trực tiếp file nhị phân vào IndexedDB để không bị mất khi refresh trình duyệt
        await saveLocalFile(newDoc.id, file).catch(err => {
          console.warn('Không thể lưu file vào IndexedDB:', err);
        });

        await onUploadDocument(newDoc);
      }

      // Hoàn tất 100%
      setProgressPercent(100);
      setUploadStepText('Đã tải lên và xử lý toàn bộ tài liệu thành công!');
      if (onShowToast) {
        onShowToast(`Đã upload thành công ${files.length} tài liệu vào kho!`, 'success');
      }

      setTimeout(() => {
        setUploading(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Batch Upload Error:', err);
      setError('Đã có lỗi xảy ra trong quá trình tải tệp hàng loạt!');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#504b44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d0aa61]/20 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61]">
              <Files className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Upload Nhiều File Tài liệu Hàng loạt</h3>
              <p className="text-[11px] text-zinc-300">Tải nhiều tệp PDF &amp; Word (.docx) cùng lúc vào kho NSG</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-[#625d55] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Active Upload Progress Bar Card */}
          {uploading && (
            <div className="p-4 bg-[#faf6ed] border border-[#d0aa61]/50 rounded-xl space-y-2.5 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#9f7a35] shrink-0" />
                  <span className="font-bold text-xs text-zinc-800">
                    {uploadStepText}
                  </span>
                </div>
                <span className="font-extrabold text-sm text-[#9f7a35]">
                  {progressPercent}%
                </span>
              </div>

              {/* Graphical Progress Bar Track */}
              <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-[#d0aa61] to-[#9f7a35] h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {currentProcessingFile && (
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                  <span className="truncate max-w-[280px]">
                    Tệp: <b className="text-zinc-700">{currentProcessingFile.name}</b>
                  </span>
                  <span className="shrink-0 font-medium">
                    {(currentProcessingFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {warning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs whitespace-pre-line leading-relaxed flex items-start gap-2.5 shadow-xs animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{warning}</div>
            </div>
          )}

          {/* Multiple File Selector Box */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Chọn các file PDF / Word (*):
            </label>
            <div 
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                dragActive 
                  ? 'border-[#d0aa61] bg-[#faf6ed]' 
                  : 'border-zinc-300 hover:border-[#d0aa61] bg-zinc-50/50 hover:bg-[#faf6ed]/50'
              }`}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id="doc-upload-input-multi"
              />
              <label htmlFor="doc-upload-input-multi" className="cursor-pointer flex flex-col items-center gap-1.5">
                <Upload className="w-8 h-8 text-[#d0aa61]" />
                <span className="font-semibold text-zinc-800">
                  {dragActive ? 'Kéo thả các file PDF / Word vào đây' : 'Click hoặc Kéo thả nhiều tệp file cùng lúc'}
                </span>
                <span className="text-[10px] text-zinc-400">Chỉ chấp nhận file PDF (.pdf) hoặc Word (.doc, .docx)</span>
              </label>
            </div>
          </div>

          {/* Selected Files List Preview */}
          {files.length > 0 && (
            <div className="space-y-1.5 border border-zinc-200 rounded-xl p-3 bg-zinc-50/80 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 border-b border-zinc-200 pb-1.5 mb-1.5">
                <span>Danh sách {files.length} file đã chọn:</span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-red-600 hover:underline text-[10px]"
                >
                  Xóa tất cả
                </button>
              </div>

              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-[#d0aa61] shrink-0" />
                    <span className="font-medium text-zinc-800 truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">({(f.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded"
                    title="Bỏ chọn file này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category & Subfolder Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Danh mục Chính (*):</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubFolder('');
                }}
                disabled={uploading}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] disabled:opacity-50"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Folder Dự án:</label>
              <select
                value={selectedSubFolder}
                onChange={(e) => setSelectedSubFolder(e.target.value)}
                disabled={uploading || availableSubFolders.length === 0}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] disabled:opacity-50"
              >
                <option value="">
                  {availableSubFolders.length === 0 
                    ? '(Không có - Thuộc Danh mục chính)' 
                    : '-- Chọn Folder (Không bắt buộc) --'}
                </option>
                {availableSubFolders.map(sf => (
                  <option key={sf.id} value={sf.id}>{sf.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Mô tả chung (tùy chọn):</label>
            <textarea
              rows={2}
              placeholder="Nhập mô tả nội dung chung cho các tài liệu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900 disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Gắn Thẻ (Tags):</label>
            <input
              type="text"
              placeholder="Nhập các thẻ cách nhau bằng dấu phẩy (VD: Concept, Branding, 2024...)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#d0aa61] text-zinc-900 disabled:opacity-50"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="px-5 py-2 bg-[#d0aa61] hover:bg-[#b89149] text-[#504b44] font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#504b44]" />
                  <span>Đang tải lên ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Upload {files.length > 0 ? `${files.length} File` : ''}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
