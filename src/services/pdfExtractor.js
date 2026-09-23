// Service trích xuất nội dung văn bản thực tế từ tệp PDF và Word (.docx / .doc)
// Chạy trực tiếp trên trình duyệt (Zero-backend setup)

/**
 * Tải động thư viện PDF.js từ CDN nếu chưa được nạp (Preload tự động)
 */
export async function loadPdfJsLib() {
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    if (document.getElementById('pdf-js-script')) {
      const checkInterval = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(checkInterval);
          resolve(window.pdfjsLib);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdf-js-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('Không thể tải PDF.js library'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Tải động thư viện Mammoth (đọc DOCX) từ CDN
 */
export async function loadMammothLib() {
  if (window.mammoth) return window.mammoth;

  return new Promise((resolve, reject) => {
    if (document.getElementById('mammoth-js-script')) {
      const checkInterval = setInterval(() => {
        if (window.mammoth) {
          clearInterval(checkInterval);
          resolve(window.mammoth);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'mammoth-js-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mammoth) {
        resolve(window.mammoth);
      } else {
        reject(new Error('Không thể tải Mammoth library'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Tải động thư viện JSZip từ CDN
 */
export async function loadJSZipLib() {
  if (window.JSZip) return window.JSZip;

  return new Promise((resolve, reject) => {
    if (document.getElementById('jszip-script')) {
      const checkInterval = setInterval(() => {
        if (window.JSZip) {
          clearInterval(checkInterval);
          resolve(window.JSZip);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'jszip-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.async = true;
    script.onload = () => {
      if (window.JSZip) {
        resolve(window.JSZip);
      } else {
        reject(new Error('Không thể tải JSZip library'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// Tự động kích hoạt tải ngầm các thư viện ngay khi ứng dụng chạy
if (typeof window !== 'undefined') {
  loadPdfJsLib().catch(() => {});
  loadMammothLib().catch(() => {});
  loadJSZipLib().catch(() => {});
}

/**
 * Trích xuất toàn bộ chữ (text) từ tệp PDF siêu tốc (lên tới 30 trang)
 * @param {File} file - Tệp PDF từ input file
 * @param {number} maxPages - Số trang tối đa cần đọc (mặc định 30 trang)
 * @returns {Promise<string>} Nội dung văn bản
 */
export async function extractTextFromPdf(file, maxPages = 30) {
  try {
    const pdfjsLib = await loadPdfJsLib();
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const numPages = Math.min(pdf.numPages, maxPages);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ');

      if (pageText.trim()) {
        fullText += `[Trang ${pageNum}]: ${pageText.trim()}\n`;
      }
    }

    return fullText.trim();
  } catch (err) {
    console.warn('Lỗi trích xuất chữ từ PDF:', err);
    return '';
  }
}

/**
 * Trích xuất chuẩn xác toàn bộ nội dung chữ từ file Word .docx
 * Sử dụng Mammoth kết hợp JSZip giải nén XML nội bộ
 * @param {File} file - Tệp .docx
 * @returns {Promise<string>}
 */
export async function extractTextFromDocx(file) {
  // Phương pháp 1: Sử dụng Mammoth library (chuẩn nhất cho Word DOCX)
  try {
    const mammoth = await loadMammothLib();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (result && result.value && result.value.trim()) {
      console.log('✅ Đã trích xuất thành công nội dung DOCX qua Mammoth:', file.name, `(${result.value.length} ký tự)`);
      return result.value.trim();
    }
  } catch (err) {
    console.warn('Mammoth extraction failed, fallback to JSZip:', err);
  }

  // Phương pháp 2: Sử dụng JSZip để giải nén word/document.xml
  try {
    const jszip = await loadJSZipLib();
    const zip = await jszip.loadAsync(file);
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const docXmlText = await docXmlFile.async('text');
      const textMatches = docXmlText.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        const cleanText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanText) {
          console.log('✅ Đã trích xuất thành công DOCX qua JSZip XML:', file.name, `(${cleanText.length} ký tự)`);
          return cleanText;
        }
      }
    }
  } catch (err2) {
    console.warn('JSZip extraction failed:', err2);
  }

  return '';
}

/**
 * Hàm tổng hợp trích xuất nội dung văn bản tự động theo định dạng tệp
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractDocumentContent(file) {
  if (!file) return '';
  const nameLower = file.name.toLowerCase();

  if (nameLower.endsWith('.pdf') || file.type === 'application/pdf') {
    return await extractTextFromPdf(file);
  } else if (nameLower.endsWith('.docx') || nameLower.endsWith('.doc')) {
    return await extractTextFromDocx(file);
  }

  return '';
}

/**
 * Render trang 1 của tài liệu PDF thành ảnh thu nhỏ (Thumbnail Base64 JPEG)
 * Phục vụ hiển thị trang bìa trực quan, sinh động trên DocumentCard
 * @param {string|File|Blob} fileOrUrl - URL đường dẫn tệp hoặc File/Blob nhị phân
 * @param {number} targetWidth - Chiều rộng ảnh thumbnail (mặc định 380px)
 * @returns {Promise<string|null>} DataURL ảnh JPEG hoặc null nếu lỗi
 */
export async function generatePdfThumbnail(fileOrUrl, targetWidth = 380) {
  if (!fileOrUrl) return null;
  try {
    const pdfjsLib = await loadPdfJsLib();
    let data;

    if (typeof fileOrUrl === 'string') {
      const response = await fetch(fileOrUrl);
      if (!response.ok) return null;
      data = await response.arrayBuffer();
    } else if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
      data = await fileOrUrl.arrayBuffer();
    } else {
      return null;
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    if (!pdf || pdf.numPages < 1) return null;

    const page = await pdf.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });

    // Đổ nền trắng bảo đảm không bị trong suốt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    // Xuất ảnh JPEG chất lượng 80% (rất nhẹ ~20KB - 40KB)
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.warn('Lỗi khi render thumbnail trang 1 PDF:', err.message || err);
    return null;
  }
}
