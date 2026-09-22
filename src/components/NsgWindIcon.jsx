import React from 'react';

/**
 * NsgWindIcon - Biểu tượng Cối Xoay Gió NSG AI
 * 
 * Khi ở trạng thái chờ: Hiển thị cối xoay gió NSG hoàn chỉnh.
 * Khi AI đang soạn thảo (isSpinning = true): 
 *   - Thân tháp cối xay đứng yên cố định.
 *   - 4 cánh quạt quay mượt mà quanh trục tâm.
 *   - Hiệu ứng luồng gió xoáy khí động học mượt mà (vòng xoáy gió và ngọn gió lướt, không nhấp nháy).
 * 
 * @param {boolean} isSpinning - Kích hoạt quay cánh quạt và tạo luồng gió khi AI đang soạn câu trả lời
 * @param {string} size - Kích thước: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} className - Class tùy biến thêm
 */
export default function NsgWindIcon({
  isSpinning = false,
  size = 'md',
  className = '',
}) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center select-none aspect-square shrink-0 ${currentSize} ${className}`}>
      {!isSpinning ? (
        /* Trạng thái tĩnh: Cối xoay gió NSG nguyên bản */
        <img
          src="/nsg-windmill.png"
          alt="NSG Windmill Icon"
          className="w-full h-full object-contain drop-shadow-xs"
        />
      ) : (
        /* Trạng thái hoạt động: Thân cối xay đứng yên, cánh quạt quay và tạo luồng gió */
        <div className="relative w-full h-full">
          {/* Thân cối xay cố định (đã lược bỏ cánh quạt nền) */}
          <img
            src="/nsg-windmill-tower.png"
            alt="NSG Windmill Tower"
            className="w-full h-full object-contain drop-shadow-xs pointer-events-none"
          />

          {/* Hiệu ứng luồng gió xoáy khí động học gọn gàng ôm sát cánh quạt (Không có vệt kẻ ngang) */}
          <div 
            className="absolute pointer-events-none"
            style={{
              top: '41.68%',
              left: '48.95%',
              width: '84%',
              height: '84%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Vòng gió xoáy chính thuận chiều (Quay mượt cùng chiều cánh quạt) */}
            <svg 
              className="absolute inset-0 w-full h-full animate-spin"
              style={{ animationDuration: '1.4s', animationTimingFunction: 'linear' }}
              viewBox="0 0 100 100" 
              fill="none"
            >
              <defs>
                <linearGradient id="nsgWindGradWhite" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#d0aa61" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Vệt gió xoáy ôm tròn mép ngoài cánh quạt */}
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="url(#nsgWindGradWhite)"
                strokeWidth="1.8"
                strokeDasharray="24 46"
                strokeLinecap="round"
                className="opacity-70"
              />
            </svg>

            {/* Vòng gió đối lưu ngược chiều nhẹ nhàng */}
            <svg 
              className="absolute inset-0 w-full h-full"
              style={{ animation: 'spin 2.6s linear infinite reverse' }}
              viewBox="0 0 100 100" 
              fill="none"
            >
              <circle
                cx="50"
                cy="50"
                r="39"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="16 64"
                strokeLinecap="round"
                className="opacity-45"
              />
            </svg>
          </div>

          {/* Cánh quạt quay quanh trục tâm (tọa độ trục: cx ~ 48.95%, cy ~ 41.68%) */}
          <div 
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              top: '41.68%',
              left: '48.95%',
              width: '74.3%',
              height: '74.3%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img
              src="/nsg-wind-icon.png"
              alt="NSG Windmill Blades"
              className="w-full h-full object-contain animate-spin"
              style={{
                animationDuration: '1.2s',
                animationTimingFunction: 'linear',
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
