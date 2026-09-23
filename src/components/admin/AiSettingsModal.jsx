import React, { useState, useEffect } from "react";
import {
  X,
  Brain,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Ban,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import {
  loadAiMemories,
  addAiMemory,
  toggleAiMemory,
  deleteAiMemory,
} from "../../services/aiMemoryService";

export default function AiSettingsModal({ isOpen, onClose, showToast }) {
  const [activeTab, setActiveTab] = useState("remember"); // 'remember' | 'forget'
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải dữ liệu bộ nhớ AI
  const fetchMemories = async (force = false) => {
    setIsLoading(true);
    try {
      const data = await loadAiMemories(force);
      setMemories(data || []);
    } catch (err) {
      console.error("Lỗi tải bộ nhớ AI:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories(true);
      setInputText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rememberList = memories.filter((m) => m.type === "remember");
  const forgetList = memories.filter((m) => m.type === "forget");
  const currentList = activeTab === "remember" ? rememberList : forgetList;

  // Thêm một chỉ thị bộ nhớ mới
  const handleAdd = async (e) => {
    e?.preventDefault();
    const content = inputText.trim();
    if (!content) {
      showToast?.("Vui lòng nhập nội dung chỉ thị", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addAiMemory(content, activeTab);
      if (res.data) {
        setMemories((prev) => [res.data, ...prev]);
        setInputText("");
        showToast?.(
          activeTab === "remember"
            ? "Đã nạp thông tin mới vào bộ não AI thành công!"
            : "Đã thiết lập chỉ thị loại bỏ thông tin thành công!",
          "success"
        );
      } else {
        showToast?.(res.error || "Không thể lưu chỉ thị", "error");
      }
    } catch (err) {
      showToast?.("Đã xảy ra lỗi khi lưu: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bật / Tắt trạng thái
  const handleToggle = async (item) => {
    const newStatus = !item.isActive;
    try {
      const updated = await toggleAiMemory(item.id, newStatus);
      setMemories(updated);
      showToast?.(
        newStatus ? "Đã kích hoạt lại chỉ thị này" : "Đã tạm dừng chỉ thị này",
        "info"
      );
    } catch (err) {
      showToast?.("Lỗi thay đổi trạng thái: " + err.message, "error");
    }
  };

  // Xóa chỉ thị
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chỉ thị này khỏi bộ não AI?")) {
      return;
    }

    try {
      const updated = await deleteAiMemory(id);
      setMemories(updated);
      showToast?.("Đã xóa chỉ thị thành công", "success");
    } catch (err) {
      showToast?.("Lỗi khi xóa: " + err.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#504b44] text-white flex items-center justify-between border-b border-[#625d55]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d0aa61]/20 border border-[#d0aa61]/50 flex items-center justify-center text-[#d0aa61] shadow-inner">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Trung Tâm Quản Trị Bộ Não AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#d0aa61]/30 text-[#f5ebd6] border border-[#d0aa61]/40">
                  Dynamic Memory &amp; Directives
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Chỉ đạo thông tin AI bắt buộc ghi nhớ hoặc loại bỏ khỏi câu trả lời
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/80 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab("remember")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "remember"
                ? "border-[#9f7a35] text-[#9f7a35]"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#d0aa61]" />
            <span>Thông tin Bắt buộc Ghi nhớ</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "remember"
                  ? "bg-[#9f7a35] text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {rememberList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("forget")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "forget"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Ban className="w-4 h-4 text-rose-500" />
            <span>Chỉ thị Cấm / Loại bỏ thông tin</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "forget"
                  ? "bg-rose-600 text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {forgetList.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#fcfaf7]">
          
          {/* Quick Add Card */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#504b44]">
              {activeTab === "remember" ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#d0aa61]" />
                  <span>NẠP THÔNG TIN MỚI ĐỂ AI BẮT BUỘC GHI NHỚ:</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>THIẾT LẬP THÔNG TIN LỖI THỜI / CẤM AI NHẮC ĐẾN:</span>
                </>
              )}
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              {activeTab === "remember"
                ? "Bổ sung các cập nhật mới nhất (nhân sự mới, giá mới, tiến độ mới...). Thông tin này sẽ tự động ghi đè lên tài liệu cũ nếu có mâu thuẫn."
                : "Nhập các thông tin lỗi thời, đối tác cũ hoặc các chủ đề mà bạn muốn AI tuyệt đối không được đưa vào câu trả lời."}
            </p>

            <form onSubmit={handleAdd} className="space-y-3">
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeTab === "remember"
                    ? "Ví dụ: Từ tháng 10/2026, Giám đốc F&B là ông Nguyễn Văn A thay cho ông B; Dự án Bãi Cồn dự kiến hoàn thành vào quý 2/2027..."
                    : "Ví dụ: Tuyệt đối không đề cập đến công ty X khi nói về đối tác của NSG; Không báo giá cũ trên hợp đồng năm 2020..."
                }
                className="w-full p-3 text-xs sm:text-sm bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#d0aa61] focus:ring-1 focus:ring-[#d0aa61] text-zinc-900 placeholder:text-zinc-400 leading-relaxed resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !inputText.trim()}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    activeTab === "remember"
                      ? "bg-[#9f7a35] hover:bg-[#866524] text-white disabled:opacity-50"
                      : "bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Đang lưu..."
                      : activeTab === "remember"
                      ? "Nạp vào Bộ nhớ AI"
                      : "Thêm Chỉ thị Loại bỏ"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Active Directives */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Danh sách chỉ thị hiện có ({currentList.length})
              </h4>
              <button
                onClick={() => fetchMemories(true)}
                className="text-[11px] text-[#9f7a35] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>Đồng bộ từ Database</span>
              </button>
            </div>

            {currentList.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-zinc-300 p-6 space-y-2">
                <Brain className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-semibold text-zinc-600">
                  {activeTab === "remember"
                    ? "Chưa có thông tin ghi nhớ bổ sung nào."
                    : "Chưa có chỉ thị loại bỏ nào."}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                  Bạn có thể nhập thông tin vào ô bên trên để chỉ đạo trực tiếp cho Trí tuệ Nhân tạo Gemini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-start justify-between gap-3 shadow-2xs ${
                      item.isActive
                        ? "bg-white border-zinc-200/90"
                        : "bg-zinc-100/70 border-zinc-200 opacity-60"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang áp dụng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 text-zinc-600">
                            Đã tạm dừng
                          </span>
                        )}

                        <span className="text-[10.5px] text-zinc-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "Vừa xong"}
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13.5px] text-[#504b44] font-medium leading-relaxed break-words">
                        {item.content}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleToggle(item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          item.isActive
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-zinc-400 hover:bg-zinc-200"
                        }`}
                        title={item.isActive ? "Tạm ngưng chỉ thị này" : "Bật lại chỉ thị này"}
                      >
                        {item.isActive ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-400" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa chỉ thị vĩnh viễn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-white border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Đã đồng bộ thời gian thực với Cơ sở dữ liệu Supabase (Áp dụng tức thì cho mọi người dùng)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
