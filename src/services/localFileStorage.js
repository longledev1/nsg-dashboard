// Service quản lý lưu trữ tệp nhị phân (PDF/Word) cục bộ bền vững bằng IndexedDB
// Giúp tệp KHÔNG BỊ MẤT khi refresh trình duyệt ngay cả khi chưa kết nối Supabase Storage.

const DB_NAME = 'nsg_document_storage';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB không được hỗ trợ trên môi trường này'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  return dbPromise;
}

/**
 * Lưu trữ File hoặc Blob vào IndexedDB theo ID tài liệu
 */
export async function saveLocalFile(docId, fileOrBlob) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileOrBlob, docId);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.error('Lỗi lưu tệp vào IndexedDB:', e);
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('saveLocalFile error:', err);
    return false;
  }
}

/**
 * Lấy tệp từ IndexedDB và tạo live Blob URL hợp lệ
 */
export async function getLocalFileUrl(docId) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(docId);

      req.onsuccess = () => {
        const result = req.result;
        if (result && (result instanceof Blob || result instanceof File)) {
          const freshUrl = URL.createObjectURL(result);
          resolve({ url: freshUrl, blob: result });
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.error('getLocalFileUrl error:', err);
    return null;
  }
}

/**
 * Xóa tệp khỏi IndexedDB khi tài liệu bị xóa
 */
export async function deleteLocalFile(docId) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(docId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('deleteLocalFile error:', err);
    return false;
  }
}
