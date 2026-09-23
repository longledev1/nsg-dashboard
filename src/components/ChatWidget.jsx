import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  User,
  FileText,
  ArrowRight,
  Sparkles,
  Loader2,
  Eye,
  Download,
  Trash2,
  HelpCircle,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { askGeminiAI } from "../services/aiService";
import NsgWindIcon from "./NsgWindIcon";

// Cấu hình hạn mức AI
const DAILY_LIMIT = 25; // 25 câu hỏi/ngày cho nhân viên
const COOLDOWN_SECONDS = 5; // Giãn cách 5 giây giữa 2 câu hỏi chống spam

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper render Markdown inline (in đậm, code) với cỡ chữ to rõ ràng
function renderInlineMarkdown(content) {
  if (!content) return "";
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Component hiển thị nội dung tin nhắn Markdown chuẩn web, gọn gàng, vừa mắt như ChatGPT
function WideFormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-[13.5px] sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        // Bỏ qua hoàn toàn các dòng chỉ có dấu hoa thị hoặc bullet trống (VD: *, -, •)
        if (/^([*-•]|\d+\.)\s*$/.test(trimmed)) {
          return null;
        }

        // Tiêu đề đề mục có emoji
        const isHeader =
          trimmed.startsWith("📌") ||
          trimmed.startsWith("💡") ||
          trimmed.startsWith("📄") ||
          trimmed.startsWith("###");

        if (isHeader) {
          const cleanTitle = trimmed
            .replace(/^###\s*/, "")
            .replace(/\*\*/g, "");
          return (
            <div
              key={idx}
              className="font-bold text-[13.5px] sm:text-sm text-zinc-900 pt-2 pb-0.5 border-b border-zinc-200/70 flex items-center gap-1.5"
            >
              <span>{cleanTitle}</span>
            </div>
          );
        }

        // Bullet point
        const isBullet = /^[*-•]\s+/.test(trimmed);
        if (isBullet) {
          const bulletContent = trimmed.replace(/^[*-•]\s+/, "").trim();
          if (!bulletContent) return null;
          return (
            <div
              key={idx}
              className="flex items-start gap-2 pl-1.5 text-zinc-800"
            >
              <span className="text-[#9f7a35] font-extrabold text-sm leading-snug shrink-0">
                •
              </span>
              <span className="flex-1 min-w-0 leading-relaxed">
                {renderInlineMarkdown(bulletContent)}
              </span>
            </div>
          );
        }

        // Đoạn văn bản
        return (
          <p key={idx} className="text-zinc-800 leading-relaxed">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatWidget({
  user,
  documents = [],
  categories = [],
  subFolders = [],
  onViewPdf,
}) {
  const isAdmin = user?.role === "admin";
  const userIdentifier = user?.id || user?.email || "staff";
  const quotaStorageKey = `nsg_ai_quota_${userIdentifier}`;

  const categoryMap = React.useMemo(() => {
    return (categories || []).reduce(
      (acc, c) => ({ ...acc, [c.id]: c.name }),
      {},
    );
  }, [categories]);

  const subFolderMap = React.useMemo(() => {
    return (subFolders || []).reduce(
      (acc, s) => ({ ...acc, [s.id]: s.name }),
      {},
    );
  }, [subFolders]);

  const [usedCount, setUsedCount] = useState(() => {
    try {
      const saved = localStorage.getItem(quotaStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === getTodayKey()) {
          return parsed.count || 0;
        }
      }
    } catch (e) {}
    return 0;
  });

  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Đồng bộ quota khi user đổi
  useEffect(() => {
    try {
      const saved = localStorage.getItem(quotaStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === getTodayKey()) {
          setUsedCount(parsed.count || 0);
          return;
        }
      }
    } catch (e) {}
    setUsedCount(0);
  }, [userIdentifier]);

  // Bộ đếm ngược giãn cách 5 giây
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const remainingQuestions = isAdmin
    ? Infinity
    : Math.max(0, DAILY_LIMIT - usedCount);
  const isQuotaExhausted = !isAdmin && remainingQuestions <= 0;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Xin chào! Tôi là **NSG AI Assistant** - Trợ lý Trí tuệ Nhân tạo Nội bộ của Tập đoàn NSG.\n\nTôi có thể đọc hiểu toàn bộ tài liệu dự án, hợp đồng, concept thiết kế trong kho để giải đáp thắc mắc và cung cấp tài liệu cho bạn. Hãy đặt câu hỏi hoặc chọn một trong các gợi ý bên dưới để bắt đầu!",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus vào textarea khi mở modal
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isLoadingAI]);

  // Phím tắt Escape để đóng modal
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [isOpen]);

  // Tự động co giãn chiều cao textarea theo nội dung
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  const handleSend = async (customText) => {
    const query = (customText || inputText).trim();
    if (!query || isLoadingAI) return;

    if (!isAdmin) {
      if (isQuotaExhausted) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "bot",
            text: `⚠️ **Hạn mức hôm nay đã hết:** Bạn đã sử dụng hết **${DAILY_LIMIT} lượt hỏi AI** của ngày hôm nay.\n\nHạn mức sẽ tự động được làm mới vào **00:00 ngày mai**. Nếu bạn cần tra cứu thêm cho công việc, vui lòng liên hệ Quản trị viên NSG.`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        return;
      }

      if (cooldownRemaining > 0) {
        return;
      }
    }

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText("");
    setIsLoadingAI(true);

    // Cập nhật quota sử dụng và kích hoạt cooldown 5s
    if (!isAdmin) {
      const nextCount = usedCount + 1;
      setUsedCount(nextCount);
      try {
        localStorage.setItem(
          quotaStorageKey,
          JSON.stringify({
            date: getTodayKey(),
            count: nextCount,
          }),
        );
      } catch (e) {}
      setCooldownRemaining(COOLDOWN_SECONDS);
    }

    try {
      const aiResult = await askGeminiAI(
        query,
        documents,
        categories,
        subFolders,
      );

      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: aiResult.text,
        documents: aiResult.documents || [],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Lỗi gửi tin nhắn AI:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: `⚠️ **Đã xảy ra lỗi:** Không thể kết nối với dịch vụ AI (${err.message}). Vui lòng thử lại sau giây lát.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "bot",
        text: "Đoạn trò chuyện đã được làm mới. Tôi sẵn sàng hỗ trợ bạn tra cứu tài liệu mới!",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // Các gợi ý câu hỏi mẫu thông minh
  const promptSuggestions = [
    {
      title: "Chủ tịch & Ban lãnh đạo",
      desc: "Thông tin Chủ tịch HĐQT và các nhân sự chủ chốt của NS Group",
      prompt:
        "Chủ tịch HĐQT và các thành viên ban lãnh đạo chủ chốt của NS Group gồm những ai?",
    },
    {
      title: "Lịch sử & Di sản NSG",
      desc: "Khởi nguồn từ năm 1955 và hành trình phát triển qua các giai đoạn",
      prompt:
        "Hãy tóm tắt lịch sử hình thành từ năm 1955 và các giai đoạn phát triển của NS Group",
    },
    {
      title: "Hệ thống thương hiệu",
      desc: "Danh mục các thương hiệu F&B: Dạ Yến, Marina, Yến Bay, KingClam...",
      prompt:
        "Hệ thống thương hiệu F&B của NS Group gồm những thương hiệu nào và phân khúc ra sao?",
    },
    {
      title: "Chiến lược 2024 - 2030",
      desc: "Kế hoạch phát triển Bến Thuyền, Thủ Thiêm và vươn ra quốc tế",
      prompt:
        "Chiến lược và kế hoạch phát triển của NS Group giai đoạn 2024 - 2030 như thế nào?",
    },
  ];

  return (
    <>
      {/* Floating Launcher Button ở góc phải dưới màn hình */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-[#faf6ed] text-[#504b44] rounded-full shadow-xl hover:shadow-2xl hover:scale-105 border border-[#d0aa61]/60 hover:border-[#d0aa61] transition-all duration-200 group cursor-pointer"
          >
            <NsgWindIcon
              size="sm"
              isSpinning={false}
              className="shrink-0 -ml-1 drop-shadow-xs"
            />
            <span className="font-bold text-xs sm:text-sm text-[#504b44] group-hover:text-[#9f7a35] transition-colors">
              Hỏi trợ lý AI của NSG để tìm nhanh tài liệu
            </span>
          </button>
        </div>
      )}

      {/* Near Full-Screen Modal Dialog (Chiếm khoảng 92% diện tích màn hình, có viền mờ xung quanh) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-[1450px] h-[92vh] max-h-[960px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200/90 animate-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="px-5 sm:px-6 py-3.5 bg-[#504b44] text-white flex items-center justify-between border-b border-[#625d55] shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <NsgWindIcon
                  size="md"
                  isSpinning={isLoadingAI}
                  className="shrink-0 drop-shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-sm sm:text-base text-white tracking-wide">
                      NSG AI Assistant
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Trực tuyến
                    </span>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#d0aa61]/25 text-[#f5dfa8] border border-[#d0aa61]/40">
                        Admin: Không giới hạn
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          remainingQuestions > 5
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : remainingQuestions > 0
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-red-500/25 text-red-300 border border-red-500/40"
                        }`}
                        title="Hạn mức số lượt hỏi AI hôm nay của bạn"
                      >
                        ⚡ Lượt hỏi hôm nay: {remainingQuestions}/{DAILY_LIMIT}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Đọc hiểu dữ liệu từ kho lưu trữ: {documents.length} tài liệu
                    nội bộ Tập đoàn NSG
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#3f3b35] hover:bg-[#625d55] border border-[#625d55] rounded-lg transition-colors cursor-pointer"
                  title="Xóa lịch sử trò chuyện hiện tại"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Làm mới đoạn chat</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-[#3f3b35] hover:bg-red-600 border border-[#625d55] rounded-lg transition-all cursor-pointer shadow-xs ml-1"
                  title="Đóng cửa sổ (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Đóng</span>
                </button>
              </div>
            </div>

            {/* Modal Messages Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-4 bg-[#fcfaf7]">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-3.5 ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.sender === "bot" && (
                      <NsgWindIcon
                        size="md"
                        isSpinning={false}
                        className="shrink-0 mt-0.5 drop-shadow-sm"
                      />
                    )}

                    <div
                      className={`space-y-1.5 max-w-[88%] sm:max-w-[82%] ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl shadow-xs ${
                          msg.sender === "user"
                            ? "bg-[#504b44] text-white rounded-br-xs text-xs sm:text-[13.5px] leading-relaxed"
                            : "bg-white border border-zinc-200/90 text-[#504b44] rounded-bl-xs"
                        }`}
                      >
                        {msg.sender === "user" ? (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                        ) : (
                          <WideFormattedMessage text={msg.text} />
                        )}

                        {/* Document Attachments Card in Assistant Reply */}
                        {msg.documents && msg.documents.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-zinc-200/80 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#9f7a35]">
                              <FileText className="w-3.5 h-3.5 text-[#9f7a35]" />
                              <span>
                                TÀI LIỆU KHỚP TRỰC TIẾP TỪ KHO (
                                {msg.documents.length}):
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {msg.documents.map((doc) => {
                                const isWord =
                                  doc.fileType === "word" ||
                                  (doc.title &&
                                    (doc.title.endsWith(".docx") ||
                                      doc.title.endsWith(".doc")));

                                return (
                                  <div
                                    key={doc.id}
                                    className="bg-[#faf6ed] border border-[#d0aa61]/50 hover:border-[#d0aa61] p-2.5 rounded-xl transition-all shadow-2xs space-y-2 flex flex-col justify-between"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div
                                        className={`p-1.5 rounded-lg shrink-0 ${
                                          isWord
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="font-bold text-xs text-zinc-900 truncate"
                                          title={doc.title}
                                        >
                                          {doc.title}
                                        </p>

                                        {/* Badges Danh mục & Folder */}
                                        <div className="flex flex-wrap items-center gap-1 mt-1">
                                          {categoryMap[doc.categoryId] && (
                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200/80 text-zinc-700 truncate max-w-[110px]">
                                              {categoryMap[doc.categoryId]}
                                            </span>
                                          )}
                                          {subFolderMap[doc.subFolderId] && (
                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-[#d0aa61]/25 text-[#9f7a35] truncate max-w-[110px]">
                                              {subFolderMap[doc.subFolderId]}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-zinc-400">
                                            {isWord ? "WORD" : "PDF"}{" "}
                                            {doc.fileSize
                                              ? `• ${doc.fileSize}`
                                              : ""}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#d0aa61]/30">
                                      <button
                                        onClick={() =>
                                          onViewPdf && onViewPdf(doc)
                                        }
                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3 text-[#9f7a35]" />
                                        <span>Xem</span>
                                      </button>
                                      {doc.fileUrl && (
                                        <a
                                          href={doc.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={doc.title}
                                          className="flex items-center justify-center p-1 bg-[#504b44] hover:bg-[#3f3b35] text-white rounded-lg transition-colors"
                                          title="Tải về máy"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className={`text-[10.5px] text-zinc-400 px-1 ${
                          msg.sender === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>

                    {msg.sender === "user" && (
                      <div className="w-8 h-8 rounded-xl bg-[#504b44] text-[#d0aa61] border border-[#d0aa61]/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-xs mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* AI Thinking Indicator với Cối Xoay Gió & Cánh Quạt Quay */}
                {isLoadingAI && (
                  <div className="flex gap-3.5 sm:gap-4 items-start animate-in fade-in duration-200">
                    <NsgWindIcon
                      size="lg"
                      isSpinning={true}
                      className="shrink-0 drop-shadow-sm mt-0.5"
                    />
                    <div className="bg-white border border-zinc-200/90 p-3.5 sm:p-4 rounded-2xl rounded-bl-xs shadow-xs flex flex-col gap-1 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] text-[#504b44] font-bold tracking-wide">
                          Cối xoay gió NSG đang xử lý &amp; tra cứu tài liệu...
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>
                          Đang đối chiếu dữ liệu kho và soạn câu trả lời cho bạn
                        </span>
                        <span className="inline-flex gap-0.5">
                          <span
                            className="w-1 h-1 rounded-full bg-[#d0aa61] animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></span>
                          <span
                            className="w-1 h-1 rounded-full bg-[#d0aa61] animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></span>
                          <span
                            className="w-1 h-1 rounded-full bg-[#d0aa61] animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Suggestions (chỉ hiện khi mới bắt đầu hoặc ít hơn 3 tin nhắn) */}
                {messages.length <= 2 && (
                  <div className="pt-4 border-t border-zinc-200/70">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#d0aa61]" />
                      Gợi ý câu hỏi thường gặp:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {promptSuggestions.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(item.prompt)}
                          disabled={
                            isLoadingAI ||
                            isQuotaExhausted ||
                            cooldownRemaining > 0
                          }
                          className={`text-left p-3 bg-white border border-zinc-200 rounded-xl transition-all shadow-2xs group ${
                            isQuotaExhausted || cooldownRemaining > 0
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-[#faf6ed] hover:border-[#d0aa61] cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-bold text-xs text-zinc-900 group-hover:text-[#9f7a35] transition-colors">
                              {item.title}
                            </p>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#9f7a35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Message Input Bar */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-zinc-200 shrink-0 shadow-md">
              <div className="max-w-4xl mx-auto">
                {/* Banner thông báo hết lượt hỏi cho nhân viên */}
                {isQuotaExhausted && (
                  <div className="mb-2.5 p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-950">
                          Đã đạt giới hạn hỏi trong ngày (0/{DAILY_LIMIT})
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Hạn mức hỏi AI sẽ được tự động làm mới vào{" "}
                          <strong>00:00 ngày mai</strong>. Vui lòng liên hệ
                          Admin nếu cần hỗ trợ khẩn cấp.
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-xs bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg shrink-0">
                      Hết lượt
                    </span>
                  </div>
                )}

                <div className="relative flex items-end gap-2.5 bg-[#fcfaf7] border border-zinc-300 focus-within:border-[#d0aa61] focus-within:ring-2 focus-within:ring-[#d0aa61]/20 rounded-2xl p-2 transition-all shadow-inner">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isQuotaExhausted
                        ? `⚠️ Bạn đã dùng hết ${DAILY_LIMIT} lượt hỏi hôm nay. Hệ thống sẽ tự động làm mới vào 00:00 ngày mai.`
                        : cooldownRemaining > 0
                          ? `⏳ Đang giãn cách câu hỏi... Vui lòng đợi ${cooldownRemaining} giây.`
                          : "Nhập câu hỏi của bạn về dự án, concept, thiết kế... (Nhấn Enter để gửi, Shift+Enter xuống dòng)"
                    }
                    rows={1}
                    disabled={isLoadingAI || isQuotaExhausted}
                    className="flex-1 bg-transparent border-none text-xs sm:text-[13.5px] text-zinc-800 placeholder-zinc-400 focus:outline-none resize-none max-h-32 py-1.5 px-2.5 leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={
                      !inputText.trim() ||
                      isLoadingAI ||
                      isQuotaExhausted ||
                      cooldownRemaining > 0
                    }
                    className={`p-2.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                      inputText.trim() &&
                      !isLoadingAI &&
                      !isQuotaExhausted &&
                      cooldownRemaining === 0
                        ? "bg-[#504b44] hover:bg-[#3f3b35] text-[#d0aa61] shadow-sm hover:scale-105 cursor-pointer"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    }`}
                  >
                    {cooldownRemaining > 0 ? (
                      <>
                        <Clock className="w-4 h-4 text-zinc-400 animate-spin" />
                        <span className="text-xs">{cooldownRemaining}s</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Gửi</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1.5 px-1">
                  <span>
                    {isAdmin ? (
                      <span className="text-[#9f7a35] font-medium">
                        👑 Quản trị viên: Không giới hạn lượt hỏi AI.
                      </span>
                    ) : (
                      <span>
                        Hạn mức tài khoản: Còn lại{" "}
                        <strong
                          className={
                            remainingQuestions > 0
                              ? "text-zinc-700 font-bold"
                              : "text-red-500 font-bold"
                          }
                        >
                          {remainingQuestions}/{DAILY_LIMIT}
                        </strong>{" "}
                        lượt hôm nay • Giãn cách 5s chống spam.
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline font-medium">
                    Enter để gửi • Shift+Enter xuống dòng • Phím Esc để đóng
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
