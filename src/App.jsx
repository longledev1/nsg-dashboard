import React, { useState, useEffect } from 'react';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { loadDocumentById } from './services/documentService';
import { FileText, ExternalLink, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    // Clear any legacy persistent login from localStorage so browser close logs out
    try {
      localStorage.removeItem('nsg_portal_user');
    } catch (e) {}

    try {
      const savedUser = sessionStorage.getItem('nsg_portal_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Current Unauthenticated View: 'welcome' | 'login'
  const [currentView, setCurrentView] = useState('welcome');

  // Shared Document State (Chế độ xem tài liệu chia sẻ qua Google Docs Viewer)
  const [sharedDocInfo, setSharedDocInfo] = useState(null);
  const [loadingSharedDoc, setLoadingSharedDoc] = useState(false);
  const [sharedDocError, setSharedDocError] = useState(null);

  // Xử lý link chia sẻ ?docId=... cho người ngoài (mở thẳng qua Google Docs Viewer)
  useEffect(() => {
    if (user) return; // Nếu đã đăng nhập thì DashboardPage tự xử lý

    const params = new URLSearchParams(window.location.search);
    const docId = params.get('docId');
    if (docId) {
      setLoadingSharedDoc(true);
      setSharedDocError(null);

      loadDocumentById(docId)
        .then((doc) => {
          if (!doc) {
            setSharedDocError('Không tìm thấy tài liệu hoặc liên kết chia sẻ không tồn tại.');
            return;
          }

          let targetUrl = doc.fileUrl || doc.file_url;
          // Nếu là đường dẫn tệp tĩnh nội bộ (ví dụ: /NSG History.docx)
          if (targetUrl && targetUrl.startsWith('/') && typeof window !== 'undefined') {
            targetUrl = `${window.location.origin}${targetUrl}`;
          }

          if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(targetUrl)}`;
            setSharedDocInfo({ doc, googleViewerUrl, rawUrl: targetUrl });

            // Tự động chuyển hướng mở thẳng Google Docs Viewer
            window.location.href = googleViewerUrl;
          } else {
            setSharedDocInfo({ doc, rawUrl: null });
            setSharedDocError('Tài liệu chưa có tệp đính kèm khả dụng để xem.');
          }
        })
        .catch((err) => {
          console.error('Lỗi nạp tài liệu chia sẻ:', err);
          setSharedDocError('Đã xảy ra lỗi khi nạp tài liệu: ' + (err.message || err));
        })
        .finally(() => {
          setLoadingSharedDoc(false);
        });
    }
  }, [user]);

  const handleLoginSuccess = (account) => {
    setUser(account);
    try {
      sessionStorage.setItem('nsg_portal_user', JSON.stringify(account));
    } catch (e) {}
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('welcome');
    try {
      sessionStorage.removeItem('nsg_portal_user');
      localStorage.removeItem('nsg_portal_user');
    } catch (e) {}
  };

  // If user is already logged in, show Dashboard directly
  if (user) {
    return (
      <DashboardPage
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // Màn hình chuyển tiếp xem tài liệu qua Google Docs Viewer cho khách ngoài
  if (loadingSharedDoc || sharedDocInfo || sharedDocError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26231f] text-white p-4">
        <div className="bg-[#332f2a] border border-[#524c43] p-6 sm:p-8 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faf6ed]/10 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61] shadow-inner">
            <FileText className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#d0aa61] uppercase tracking-wider">
              NS GROUP &bull; TÀI LIỆU CHIA SẺ
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-2">
              {sharedDocInfo?.doc?.title || 'Đang mở tài liệu...'}
            </h3>
          </div>

          {loadingSharedDoc ? (
            <div className="flex items-center justify-center gap-2.5 text-zinc-300 text-xs py-3">
              <RefreshCw className="w-4 h-4 animate-spin text-[#d0aa61]" />
              <span>Đang kết nối hệ thống tài liệu NSG...</span>
            </div>
          ) : sharedDocInfo?.googleViewerUrl ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Đang tự động chuyển hướng sang <strong>Google Docs Viewer</strong> để đọc file...
              </p>
              <a
                href={sharedDocInfo.googleViewerUrl}
                className="w-full py-3 px-4 bg-[#d0aa61] hover:bg-[#b89149] text-[#26231f] font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Bấm vào đây để mở xem ngay lập tức</span>
              </a>
            </div>
          ) : (
            <div className="py-2 text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800/40">
              {sharedDocError || 'Không thể mở tài liệu.'}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-700/50 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setSharedDocInfo(null);
                setSharedDocError(null);
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', window.location.pathname);
                }
              }}
              className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              &larr; Vào Trang chủ NS Group Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, route between WelcomePage and LoginPage
  if (currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToWelcome={() => setCurrentView('welcome')}
      />
    );
  }

  return (
    <WelcomePage
      onGoToLogin={() => setCurrentView('login')}
    />
  );
}
