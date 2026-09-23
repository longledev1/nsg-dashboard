import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  FileText,
  Eye,
  Download,
  Trash2,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { askGeminiAI } from "../services/aiService";
import NsgWindIcon from "./NsgWindIcon";

// Helper render Markdown inline (in đậm, link, code) với cỡ chữ to rõ ràng
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

// Component hiển thị nội dung tin nhắn dạng Markdown chuẩn web, chữ to rõ ràng
function WideFormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-2.5 leading-relaxed text-sm sm:text-base">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bỏ qua hoàn toàn các dòng chỉ có dấu hoa thị hoặc bullet trống (VD: *, -, •)
        if (/^([*-•]|\d+\.)\s*$/.test(trimmed)) {
          return null;
        }

        // Header đề mục có emoji
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
              className="font-bold text-sm sm:text-base text-zinc-900 pt-2 pb-1 border-b border-zinc-200/80 flex items-center gap-2"
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
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 text-zinc-800">
              <span className="text-[#9f7a35] font-extrabold text-base leading-snug shrink-0">
                •
              </span>
              <span className="flex-1 min-w-0">
                {renderInlineMarkdown(bulletContent)}
              </span>
            </div>
          );
        }

        // Đoạn văn bản
        return (
          <p key={idx} className="text-zinc-800">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function FullChatView({
  documents = [],
  categories = [],
  subFolders = [],
  onViewPdf,
  onSwitchToDocuments,
}) {
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
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingAI]);

  // Tự động điều chỉnh chiều cao textarea theo nội dung
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  const handleSend = async (customText) => {
    const query = (customText || inputText).trim();
    if (!query || isLoadingAI) return;

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
      title: "Yen Bay Project",
      desc: "Tóm tắt concept nhận diện thương hiệu & vật phẩm truyền thông",
      prompt: "Hãy tóm tắt thông tin chi tiết về Yen Bay Project",
    },
    {
      title: "Exocafe - Tropicana",
      desc: "Thông tin concept thiết kế không gian F&B Tropicana",
      prompt: "Cho tôi biết thông tin về concept Exocafe Tropicana",
    },
    {
      title: "Kho tài liệu F&B",
      desc: "Liệt kê các tài liệu và dự án F&B hiện có trong hệ thống",
      prompt: "Trong kho hiện có những tài liệu nào thuộc danh mục F&B?",
    },
    {
      title: "Màu sắc & Phong cách",
      desc: "Bảng màu và font chữ chủ đạo của các dự án",
      prompt: "Bảng màu và phong cách thiết kế của dự án Yen Bay gồm những mã màu nào?",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-[#504b44] text-white flex items-center justify-between border-b border-[#625d55]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#d0aa61]/20 border border-[#d0aa61]/40 flex items-center justify-center text-[#d0aa61] shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                NSG AI Assistant
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Trực tuyến
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Kết nối trực tiếp kho dữ liệu: {documents.length} tài liệu nội bộ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#3f3b35] hover:bg-[#625d55] border border-[#625d55] rounded-lg transition-colors cursor-pointer"
            title="Xóa lịch sử cuộc trò chuyện hiện tại"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Làm mới đoạn chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 bg-[#fcfaf7]">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 sm:gap-4 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "bot" && (
                <NsgWindIcon size="md" isSpinning={false} className="shrink-0 mt-0.5 drop-shadow-sm" />
              )}

              <div
                className={`space-y-3 max-w-[85%] sm:max-w-[78%] ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl shadow-xs ${
                    msg.sender === "user"
                      ? "bg-[#504b44] text-white rounded-br-xs text-sm sm:text-base leading-relaxed"
                      : "bg-white border border-zinc-200/90 text-[#504b44] rounded-bl-xs"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <WideFormattedMessage text={msg.text} />
                  )}

                  {/* Document Attachments Card in Assistant Reply */}
                  {msg.documents && msg.documents.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-zinc-200/80 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#9f7a35]">
                        <FileText className="w-4 h-4 text-[#9f7a35]" />
                        <span>TÀI LIỆU KHỚP TRỰC TIẾP TỪ KHO ({msg.documents.length}):</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.documents.map((doc) => {
                          const isWord =
                            doc.fileType === "word" ||
                            (doc.title &&
                              (doc.title.endsWith(".docx") || doc.title.endsWith(".doc")));

                          return (
                            <div
                              key={doc.id}
                              className="bg-[#faf6ed] border border-[#d0aa61]/50 hover:border-[#d0aa61] p-3 rounded-xl transition-all shadow-2xs space-y-2 flex flex-col justify-between"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    isWord
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="font-bold text-xs sm:text-sm text-zinc-900 truncate"
                                    title={doc.title}
                                  >
                                    {doc.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                                    <span className="font-bold uppercase text-[#9f7a35]">
                                      {isWord ? "WORD" : "PDF"}
                                    </span>
                                    <span>•</span>
                                    <span>{doc.fileSize || "Tài liệu"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-1 border-t border-[#d0aa61]/30">
                                <button
                                  onClick={() => onViewPdf && onViewPdf(doc)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#9f7a35]" />
                                  <span>Xem trực tiếp</span>
                                </button>
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={doc.title}
                                    className="flex items-center justify-center p-1.5 bg-[#504b44] hover:bg-[#3f3b35] text-white rounded-lg transition-colors"
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
                  className={`text-[11px] text-zinc-400 px-1 ${
                    msg.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#504b44] text-[#d0aa61] border border-[#d0aa61]/40 flex items-center justify-center shrink-0 font-bold text-sm shadow-sm mt-0.5">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {/* AI Thinking Animation với Cối Xoay Gió & Cánh Quạt Quay */}
          {isLoadingAI && (
            <div className="flex gap-3.5 sm:gap-4 items-start animate-in fade-in duration-200">
              <NsgWindIcon size="lg" isSpinning={true} className="shrink-0 drop-shadow-sm mt-0.5" />
              <div className="bg-white border border-zinc-200/90 p-4 rounded-2xl rounded-bl-xs shadow-xs flex flex-col gap-1 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-[#504b44] font-bold tracking-wide">
                    Cối xoay gió NSG đang xử lý &amp; tra cứu tài liệu...
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>Đang đối chiếu kho dữ liệu và tổng hợp câu trả lời chi tiết cho bạn</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d0aa61] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d0aa61] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d0aa61] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Suggestions (chỉ hiện khi mới bắt đầu hoặc ít hơn 3 tin nhắn) */}
          {messages.length <= 2 && (
            <div className="pt-4 border-t border-zinc-200/60">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#d0aa61]" />
                Gợi ý câu hỏi thường gặp:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {promptSuggestions.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.prompt)}
                    disabled={isLoadingAI}
                    className="text-left p-3.5 bg-white hover:bg-[#faf6ed] border border-zinc-200 hover:border-[#d0aa61] rounded-xl transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs sm:text-sm text-zinc-900 group-hover:text-[#9f7a35] transition-colors">
                        {item.title}
                      </p>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#9f7a35] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
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
      <div className="p-4 sm:p-5 bg-white border-t border-zinc-200">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-2.5 bg-[#fcfaf7] border border-zinc-300 focus-within:border-[#d0aa61] focus-within:ring-2 focus-within:ring-[#d0aa61]/20 rounded-2xl p-2 sm:p-2.5 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi của bạn về dự án, concept, thiết kế... (Nhấn Enter để gửi, Shift+Enter xuống dòng)"
              rows={1}
              disabled={isLoadingAI}
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none resize-none max-h-36 py-1.5 px-2 leading-relaxed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoadingAI}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                inputText.trim() && !isLoadingAI
                  ? "bg-[#504b44] hover:bg-[#3f3b35] text-[#d0aa61] shadow-sm hover:scale-105"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
            <span>NSG Assistant sử dụng công nghệ Google Gemini kết hợp RAG tra cứu trực tiếp dữ liệu nội bộ.</span>
            <span className="hidden sm:inline">Enter để gửi</span>
          </div>
        </div>
      </div>

    </div>
  );
}
