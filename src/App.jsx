import React, { useState, useEffect } from 'react';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SplashScreen from './components/SplashScreen';
import { loadDocumentById } from './services/documentService';
import { FileText, ExternalLink, RefreshCw } from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href || '';
      // Nếu là link mở tài liệu chia sẻ (?docId=...), tắt hoàn toàn SplashScreen để mở thẳng tài liệu ngay lập tức
      if (url.includes('docId=')) {
        return false;
      }
    }
    return true;
  });
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

  // Shared Document State (Xem trực tiếp trong app, không qua Google Docs Viewer để không bị lỗi 401 ẩn danh)
  const [sharedDocInfo, setSharedDocInfo] = useState(null);
  const [loadingSharedDoc, setLoadingSharedDoc] = useState(false);
  const [sharedDocError, setSharedDocError] = useState(null);

  // Xử lý link chia sẻ ?docId=... cho người ngoài (Cách 2: Mở thẳng file gốc trực tiếp từ Cloud Storage)
  useEffect(() => {
    if (user) return; // Nếu đã đăng nhập thì DashboardPage tự xử lý

    let docId = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      docId = params.get('docId');
      if (!docId && window.location.hash.includes('docId=')) {
        const hashQuery = window.location.hash.includes('?') 
          ? window.location.hash.substring(window.location.hash.indexOf('?'))
          : window.location.hash.substring(1);
        docId = new URLSearchParams(hashQuery).get('docId');
      }
    }
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
          if (targetUrl && targetUrl.startsWith('/') && typeof window !== 'undefined') {
            targetUrl = `${window.location.origin}${targetUrl}`;
          }

          if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
            setSharedDocInfo({ doc, rawUrl: targetUrl });

            const isWord = doc.fileType === 'word' || 
                           doc.id === 'doc-nsg-history-profile' ||
                           (/\.docx?(\)|$|\?|\s)/i.test(doc.title || '')) ||
                           (/\.docx?(\)|$|\?|\s)/i.test(targetUrl));

            if (isWord) {
              // File Word: Mở qua Microsoft Office Viewer (Hỗ trợ 100% tab ẩn danh, không bị lỗi 401 của Google)
              const msViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(targetUrl)}`;
              window.location.replace(msViewerUrl);
            } else {
              // File PDF: Mở thẳng file PDF gốc từ Supabase CDN sang trình đọc native của trình duyệt (Cách 2)
              // Tab ẩn danh mở mượt 100%, không cần Google Docs Viewer
              window.location.replace(targetUrl);
            }
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

  const renderContent = () => {
    // If user is already logged in, show Dashboard directly
    if (user) {
      return (
        <DashboardPage
          user={user}
          onLogout={handleLogout}
        />
      );
    }

    // Màn hình chuyển tiếp mở tệp trực tiếp sang tab xem (Cách 2)
    if (loadingSharedDoc || sharedDocInfo || sharedDocError) {
      const isWord = sharedDocInfo?.doc?.fileType === 'word' ||
                     sharedDocInfo?.doc?.id === 'doc-nsg-history-profile' ||
                     (/\.docx?(\)|$|\?|\s)/i.test(sharedDocInfo?.doc?.title || ''));
      const directUrl = isWord && sharedDocInfo?.rawUrl
        ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(sharedDocInfo.rawUrl)}`
        : sharedDocInfo?.rawUrl;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f5f0] text-zinc-800 p-4">
          {/* Vùng chuyển sắc trang trí vàng đồng nhẹ nhàng phía sau */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d0aa61]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="bg-white border border-zinc-200/90 p-6 sm:p-8 rounded-2xl max-w-md w-full shadow-xl text-center space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
            {/* Logo / Document Icon Container */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faf6ed] border border-[#d0aa61]/35 flex items-center justify-center text-[#9f7a35] shadow-xs">
              <FileText className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#9f7a35] uppercase tracking-wider bg-[#faf6ed] px-3 py-0.5 rounded-full border border-[#d0aa61]/30 inline-block">
                NS GROUP &bull; TÀI LIỆU CHIA SẺ
              </span>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 mt-2 line-clamp-2">
                {sharedDocInfo?.doc?.title || 'Đang mở tài liệu...'}
              </h3>
            </div>

            {loadingSharedDoc ? (
              <div className="flex items-center justify-center gap-2.5 text-zinc-500 text-xs py-3">
                <RefreshCw className="w-4 h-4 animate-spin text-[#d0aa61]" />
                <span>Đang kết nối kho tài liệu NSG...</span>
              </div>
            ) : directUrl ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Đang tự động chuyển hướng mở tài liệu trên trình duyệt...
                </p>
                <a
                  href={directUrl}
                  className="w-full py-3 px-4 bg-[#d0aa61] hover:bg-[#b89149] text-[#26231f] font-bold text-xs rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <ExternalLink className="w-4 h-4 text-[#26231f]" />
                  <span>Bấm vào đây để mở tài liệu ngay</span>
                </a>
              </div>
            ) : (
              <div className="py-2.5 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {sharedDocError || 'Không thể mở tài liệu.'}
              </div>
            )}

            <div className="pt-3 border-t border-zinc-100 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSharedDocInfo(null);
                  setSharedDocError(null);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer font-medium"
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
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {renderContent()}
    </>
  );
}
