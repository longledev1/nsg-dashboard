import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Tự động đăng ký Service Worker để kích hoạt tính năng cài đặt App PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('NSG PWA Service Worker đã sẵn sàng:', reg.scope);
      })
      .catch((err) => {
        console.warn('Lỗi đăng ký Service Worker:', err);
      });
  });
}
