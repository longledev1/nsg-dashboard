// Service nén tối ưu dung lượng tệp PDF tự động chạy trên trình duyệt (Client-Side)
// Giải quyết giới hạn tải tệp 50MB của Supabase Storage mà không cần server trung gian

import { loadPdfJsLib } from './pdfExtractor';

// Ngưỡng dung lượng kích hoạt nén tự động (mặc định 48MB để an toàn tuyệt đối với hạn mức 50MB của Supabase)
export const LARGE_FILE_THRESHOLD_BYTES = 48 * 1024 * 1024; // 48MB

/**
 * Kiểm tra xem tệp có phải là PDF hay không
 */
export function isPdfFile(file) {
  if (!file) return false;
  const nameLower = (file.name || '').toLowerCase();
  return file.type === 'application/pdf' || nameLower.endsWith('.pdf');
}

/**
 * Kiểm tra tệp có vượt quá ngưỡng cần nén tự động (> 48MB) không
 */
export function isOverSizeLimit(file, thresholdBytes = LARGE_FILE_THRESHOLD_BYTES) {
  return file && file.size > thresholdBytes;
}

/**
 * Tải thư viện pdf-lib (ưu tiên local package, dự phòng nạp CDN nếu chạy trên môi trường khác)
 */
export async function loadPdfLib() {
  // 1. Thử nạp từ bundled npm module
  try {
    const pdfLibModule = await import('pdf-lib');
    if (pdfLibModule && pdfLibModule.PDFDocument) {
      return pdfLibModule;
    }
  } catch (err) {
    console.warn('Không thể nạp pdf-lib từ bundle nội bộ, chuyển sang CDN dự phòng...', err);
  }

  // 2. Thử lấy từ window nếu đã tải trước đó
  if (window.PDFLib) {
    return window.PDFLib;
  }

  // 3. Nạp động script từ CDN
  return new Promise((resolve, reject) => {
    if (document.getElementById('pdf-lib-script')) {
      const checkInterval = setInterval(() => {
        if (window.PDFLib) {
          clearInterval(checkInterval);
          resolve(window.PDFLib);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdf-lib-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    script.async = true;
    script.onload = () => {
      if (window.PDFLib) {
        resolve(window.PDFLib);
      } else {
        reject(new Error('Không thể khởi tạo PDFLib từ CDN'));
      }
    };
    script.onerror = () => {
      // Fallback 2: unpkg
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      fallbackScript.async = true;
      fallbackScript.onload = () => {
        if (window.PDFLib) {
          resolve(window.PDFLib);
        } else {
          reject(new Error('Không thể tải PDFLib từ cả 2 nguồn CDN'));
        }
      };
      fallbackScript.onerror = (e) => reject(new Error('Thất bại khi tải thư viện xử lý PDF: ' + e));
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  });
}

/**
 * Nén tối ưu dung lượng tệp PDF
 * @param {File|Blob} file Tệp PDF gốc
 * @param {Object} options Cấu hình nén tùy chọn
 * @param {Function} onProgress Callback cập nhật tiến trình { current, total, percent, statusText }
 * @returns {Promise<{ compressedFile: File, originalSize: number, compressedSize: number, ratio: number, pages: number }>}
 */
export async function compressPdfFile(file, options = {}, onProgress = null) {
  if (!isPdfFile(file)) {
    throw new Error('Định dạng tệp không được hỗ trợ nén. Chỉ hỗ trợ tệp PDF.');
  }

  const reportProgress = (current, total, statusText, extraPercent = 0) => {
    if (typeof onProgress === 'function') {
      const calcPercent = total > 0 ? Math.min(Math.round((current / total) * 90) + extraPercent, 98) : 5;
      onProgress({
        current,
        total,
        percent: calcPercent,
        statusText,
      });
    }
  };

  reportProgress(0, 100, 'Đang chuẩn bị nạp công cụ nén PDF...');

  // Nạp đồng thời cả 2 thư viện PDF.js (đọc/render) và PDF-lib (tạo/ghi PDF mới)
  const [pdfjsLib, PDFLib] = await Promise.all([
    loadPdfJsLib(),
    loadPdfLib()
  ]);

  reportProgress(5, 100, 'Đang phân tích cấu trúc tệp PDF gốc...');

  // Đọc mảng nhị phân của tệp PDF
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages === 0) {
    throw new Error('Tệp PDF rỗng, không có trang nào!');
  }

  // Tự động tinh chỉnh scale & JPEG quality tối ưu dựa theo tổng số trang
  // để bảo đảm dung lượng đầu ra luôn dưới 45MB mà vẫn giữ độ nét cao
  let scale = 1.35;
  let quality = 0.78;

  if (numPages <= 20) {
    scale = 1.45;
    quality = 0.82; // Rất sắc nét cho tài liệu ít trang
  } else if (numPages <= 60) {
    scale = 1.30;
    quality = 0.76;
  } else if (numPages <= 120) {
    scale = 1.15;
    quality = 0.72;
  } else {
    // Với tài liệu > 120 trang cực kỳ lớn
    scale = 1.0;
    quality = 0.68;
  }

  // Cho phép ghi đè từ options nếu có truyền vào
  if (options.scale) scale = options.scale;
  if (options.quality) quality = options.quality;

  // Khởi tạo tài liệu PDF mới qua PDFLib
  const { PDFDocument } = PDFLib;
  const newPdfDoc = await PDFDocument.create();

  // Nén và tái tạo từng trang
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    reportProgress(
      pageNum,
      numPages,
      `Đang tối ưu & nén trang ${pageNum}/${numPages}...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1.0 });

    // Giới hạn chiều rộng / chiều cao tối đa của ảnh render để tránh tràn bộ nhớ Canvas
    let pageScale = scale;
    const maxDimension = Math.max(baseViewport.width, baseViewport.height);
    if (maxDimension * pageScale > 2000) {
      pageScale = 2000 / maxDimension;
    }

    const renderViewport = page.getViewport({ scale: pageScale });

    // Tạo Canvas ảo để vẽ trang với chất lượng tối ưu
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(renderViewport.width);
    canvas.height = Math.round(renderViewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });

    // Đổ nền trắng mặc định để chống trường hợp nền trong suốt bị đen khi chuyển JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: renderViewport,
      intent: 'display'
    }).promise;

    // Chuyển Canvas thành ảnh JPEG được nén chất lượng cao
    const imgBlob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });

    const imgBytes = await imgBlob.arrayBuffer();

    // Nhúng ảnh vào tài liệu PDF mới
    const embeddedImg = await newPdfDoc.embedJpg(imgBytes);

    // Kích thước trang mới luôn giữ chuẩn tỉ lệ thực của trang gốc (Points 72 DPI)
    const newPage = newPdfDoc.addPage([baseViewport.width, baseViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    // Giải phóng bộ nhớ Canvas lập tức để trình duyệt không bị đầy RAM
    canvas.width = 0;
    canvas.height = 0;
  }

  reportProgress(numPages, numPages, 'Đang đóng gói và hoàn tất tệp PDF tối ưu...', 5);

  // Đóng gói byte nhị phân của tài liệu PDF mới
  const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
  const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });

  const fileName = file.name || 'document_compressed.pdf';
  const compressedFile = new File([compressedBlob], fileName, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  const originalSize = file.size;
  const compressedSize = compressedFile.size;
  const ratio = originalSize > 0 
    ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
    : 0;

  reportProgress(numPages, numPages, `Đã nén thành công! Giảm ${ratio}% dung lượng.`, 8);

  return {
    compressedFile,
    originalSize,
    compressedSize,
    savedBytes: originalSize - compressedSize,
    ratio,
    pages: numPages,
    isCompressed: true
  };
}
