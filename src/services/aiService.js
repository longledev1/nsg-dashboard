// ==============================================================================
// SERVICE KẾT NỐI TRÍ TUỆ NHÂN TẠO GOOGLE GEMINI API (RAG ENGINE)
// Quản lý kết nối, xoay vòng API Keys, bộ nhớ đệm Cache và gọi Gemini API
// ==============================================================================

import { buildSystemInstruction } from "./aiPromptConfig";
import { getLocalKnowledgeAnswer } from "./aiFallbackKnowledge";
import { findMatchingDocs, isRefusalReply } from "./aiDocMatcher";
import { NSG_HISTORY_CONTENT } from "../lib/constants";
import { loadAiMemories } from "./aiMemoryService";

// Bộ lưu trữ thời gian hết hạn Rate Limit của từng Key (cooldown trong 60 giây)
const keyRateLimitExpiryMap = new Map();

// Bộ nhớ đệm câu trả lời (In-memory Query Cache) giúp phản hồi siêu tốc 0ms
const queryResponseCache = new Map();

// Danh sách các mô hình Gemini Flash chuẩn xác & ổn định nhất đã được kiểm định
const DEFAULT_CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-1.5-flash",
];

const cachedAvailableModelsMap = new Map();
let currentKeyIndex = 0;

/**
 * Lấy danh sách tất cả các Gemini API Keys từ biến môi trường
 */
export function getGeminiApiKeys() {
  const keys = [];

  if (typeof import.meta !== "undefined" && import.meta.env) {
    Object.keys(import.meta.env).forEach((envName) => {
      if (
        envName.startsWith("VITE_GEMINI_API_KEY") ||
        envName.startsWith("VITE_GEMINI_KEY") ||
        envName === "VITE_GEMINI_API_KEYS"
      ) {
        const val = import.meta.env[envName];
        if (typeof val === "string" && val.trim()) {
          const rawParts = val.split(/[,;\s\n\r]+/);
          rawParts.forEach((part) => {
            const trimmed = part.trim();
            if (
              trimmed.length >= 20 &&
              !trimmed.includes("YOUR_GEMINI_API_KEY") &&
              !trimmed.includes("AIzaSy...")
            ) {
              keys.push(trimmed);
            }
          });
        }
      }
    });
  }

  return Array.from(new Set(keys));
}

/**
 * Hàm fetch an toàn kèm Timeout (ngắt kết nối sau timeoutMs để tránh treo giao diện)
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tự động truy vấn ListModels từ Google để lọc mô hình khả dụng tốt nhất trong Whitelist
 */
async function getAvailableModels(apiKey) {
  if (cachedAvailableModelsMap.has(apiKey)) {
    return cachedAvailableModelsMap.get(apiKey);
  }

  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {},
      5000
    );
    if (!res.ok) return DEFAULT_CANDIDATE_MODELS;

    const data = await res.json();
    const modelNames = new Set(
      (data.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
    );

    // Chỉ giữ lại những model nằm trong whitelist an toàn đã được kiểm định
    const validModels = DEFAULT_CANDIDATE_MODELS.filter((m) => modelNames.has(m));
    if (validModels.length > 0) {
      cachedAvailableModelsMap.set(apiKey, validModels);
      return validModels;
    }
  } catch (err) {
    console.warn("Không thể truy vấn ListModels từ Google, dùng danh sách mặc định:", err.message);
  }

  return DEFAULT_CANDIDATE_MODELS;
}

/**
 * Hàm gửi câu hỏi & dữ liệu kho tài liệu cho NSG Assistant
 */
export async function askGeminiAI(
  userQuery,
  documents = [],
  categories = [],
  subFolders = [],
  currentUser = null,
  restrictedFolderNames = [],
) {
  const query = userQuery.trim();
  if (!query) return { text: "", documents: [] };

  // 1. Kiểm tra API Keys
  const apiKeys = getGeminiApiKeys();
  if (apiKeys.length === 0) {
    return {
      isKeyMissing: true,
      text: `⚠️ **Chưa cấu hình Gemini API Key!**\n\nĐể kích hoạt trí tuệ nhân tạo đọc & trả lời tài liệu thực tế của Google Gemini:\n1. Mở file \`.env.local\` trong dự án.\n2. Thêm dòng: \`VITE_GEMINI_API_KEY=AIzaSy...\`\n3. Lấy API Key miễn phí tại: https://aistudio.google.com/app/apikey`,
      documents: findMatchingDocs(query, documents, "", [], categories, subFolders),
    };
  }

  // 2. Kiểm tra Cache câu hỏi
  const cacheKey = `${query.toLowerCase().trim()}::${documents.length}`;
  if (queryResponseCache.has(cacheKey)) {
    console.log("⚡ Phản hồi siêu tốc từ Cache cho câu hỏi:", query);
    return queryResponseCache.get(cacheKey);
  }

  // 3. Chuẩn bị ngữ cảnh dữ liệu tài liệu & cấu trúc thư mục
  const uniqueDocsMap = new Map();
  (documents || []).forEach(d => { if (d && d.id) uniqueDocsMap.set(d.id, d); });
  const cleanDocs = Array.from(uniqueDocsMap.values());

  // Nhận diện tài liệu trọng tâm liên quan trực tiếp đến câu hỏi để cấp phát toàn văn không cắt ngắn
  const preMatchedDocs = findMatchingDocs(query, cleanDocs, "", [], categories, subFolders);
  const prioritizedDocIds = new Set((preMatchedDocs || []).map(d => d.id));

  // Bổ sung các tài liệu khớp từ khóa câu hỏi vào danh sách ưu tiên
  const queryTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  cleanDocs.forEach(d => {
    const docFullStr = `${d.title || ''} ${d.tags?.join(' ') || ''}`.toLowerCase();
    if (queryTokens.some(tok => docFullStr.includes(tok))) {
      prioritizedDocIds.add(d.id);
    }
  });

  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
  const subFolderMap = subFolders.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

  const structureSummary = categories
    .map(c => {
      const subs = subFolders.filter(s => s.categoryId === c.id);
      const subNames = subs.length > 0 ? subs.map(s => s.name).join(', ') : 'Chưa có folder con';
      return `• Danh mục "${c.name}": [Folder: ${subNames}]`;
    })
    .join('\n');

  // Phân bổ ngữ cảnh thông minh và siêu nhẹ (Lightweight Smart Context):
  // - Chỉ lọc các tài liệu thực sự liên quan nhất đến câu hỏi (tối đa 2-3 tài liệu trọng tâm)
  // - Cấp phát nội dung trích xuất gọn gàng (~4.500 ký tự) cho tài liệu trọng tâm
  // - Các tài liệu khác chỉ hiển thị tóm lược danh mục để giảm tải tối đa cho Google Free Tier
  const nonHistoryDocs = cleanDocs.filter((doc) => doc.id !== "doc-nsg-history-profile");
  const priorityDocs = nonHistoryDocs.filter((doc) => prioritizedDocIds.has(doc.id)).slice(0, 3);
  const otherDocs = nonHistoryDocs.filter((doc) => !prioritizedDocIds.has(doc.id));

  const detailedDocs = priorityDocs.length > 0 ? priorityDocs : otherDocs.slice(0, 2);
  const summaryOnlyDocs = priorityDocs.length > 0 ? otherDocs : otherDocs.slice(2);

  const detailedDocsText = detailedDocs
    .map((doc, idx) => {
      const isPriority = prioritizedDocIds.has(doc.id);
      const catName = categoryMap[doc.categoryId] || "General";
      const subName = subFolderMap[doc.subFolderId] || "Trực tiếp cấp Danh mục";
      const fullTextSnippet = doc.content && doc.content.trim()
        ? `\n   NỘI DUNG VĂN BẢN TRÍCH XUẤT:\n"""\n${doc.content.slice(0, 4500)}\n"""`
        : `\n   (Mô tả tệp: "${doc.description || 'Không có'}")`;
      return `--- TÀI LIỆU #${idx + 1} ${isPriority ? '★ [TRỌNG TÂM]' : ''} ---
• Tên tệp: "${doc.title}"
• Danh mục: "${catName}" | Thư mục: "${subName}"
• Định dạng: ${doc.fileType?.toUpperCase()} | Kích thước: ${doc.fileSize || "N/A"}${fullTextSnippet}`;
    })
    .join("\n\n");

  const otherDocsSummaryText = summaryOnlyDocs.length > 0
    ? `\n\nDANH MỤC CÁC TÀI LIỆU KHÁC CÓ TRONG KHO (THAM KHẢO TIÊU ĐỀ):\n` +
      summaryOnlyDocs
        .slice(0, 15)
        .map((d) => `• "${d.title}" (${categoryMap[d.categoryId] || 'General'} / ${subFolderMap[d.subFolderId] || 'Gốc'})`)
        .join("\n")
    : "";

  const docContextText = `${detailedDocsText}${otherDocsSummaryText}`;

  // 4. Xây dựng System Instruction từ module cấu hình riêng & Bộ nhớ động
  const aiMemories = await loadAiMemories();
  const systemInstruction = buildSystemInstruction({
    structureSummary,
    docContextText,
    historyContent: NSG_HISTORY_CONTENT,
    aiMemories,
    currentUser,
    restrictedFolderNames,
  });

  const contents = [
    {
      role: "user",
      parts: [{ text: `${systemInstruction}\n\nCâu hỏi của nhân viên NSG: "${query}"` }],
    },
  ];

  let replyText = null;
  let lastError = null;
  const now = Date.now();

  // Tạo danh sách key theo thứ tự xoay vòng (round-robin)
  const orderedKeys = [];
  for (let i = 0; i < apiKeys.length; i++) {
    orderedKeys.push(apiKeys[(currentKeyIndex + i) % apiKeys.length]);
  }
  // Đưa các key đang bị Rate Limit tạm thời về cuối danh sách
  orderedKeys.sort((a, b) => {
    const isLimitedA = (keyRateLimitExpiryMap.get(a) || 0) > now ? 1 : 0;
    const isLimitedB = (keyRateLimitExpiryMap.get(b) || 0) > now ? 1 : 0;
    return isLimitedA - isLimitedB;
  });

  // 5. Gửi yêu cầu qua Gemini API với cơ chế tự động xoay vòng Key
  for (let keyAttempt = 0; keyAttempt < orderedKeys.length; keyAttempt++) {
    const currentApiKey = orderedKeys[keyAttempt];
    const candidateModels = await getAvailableModels(currentApiKey);

    for (const modelName of candidateModels) {
      try {
        const apiVersion = "v1beta";
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${currentApiKey}`;
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
            },
          }),
        }, 45000);

        if (response.ok) {
          const data = await response.json();
          replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            console.log(`✅ Kết nối AI thành công qua model: ${modelName} (Key ...${currentApiKey.slice(-8)})`);
            keyRateLimitExpiryMap.delete(currentApiKey);
            currentKeyIndex = (apiKeys.indexOf(currentApiKey) + 1) % apiKeys.length;
            break;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errStatus = response.status;
          const errMsg = errData?.error?.message || `Status ${errStatus}`;
          lastError = errMsg;

          if (errStatus === 429 || errMsg.toLowerCase().includes("quota")) {
            console.warn(`Key (...${currentApiKey.slice(-8)}) đạt giới hạn Quota (429). Chuyển ngay sang key tiếp theo...`);
            keyRateLimitExpiryMap.set(currentApiKey, Date.now() + 60000);
            break; // Chuyển sang key tiếp theo ngay lập tức, không thử model khác trên key này
          }

          if (errStatus === 503) {
            console.warn(`Model ${modelName} đang quá tải tạm thời (503). Chờ 1.5s và tự động thử lại...`);
            await new Promise((r) => setTimeout(r, 1500));
            try {
              const retryRes = await fetchWithTimeout(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents,
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192,
                  },
                }),
              }, 40000);
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                replyText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (replyText) {
                  console.log(`✅ Kết nối AI thành công sau khi tự động thử lại model: ${modelName}`);
                  keyRateLimitExpiryMap.delete(currentApiKey);
                  currentKeyIndex = (apiKeys.indexOf(currentApiKey) + 1) % apiKeys.length;
                  break;
                }
              }
            } catch (retryErr) {
              lastError = retryErr.message;
            }
          }
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (replyText) break;
  }

  // 6. Xử lý kết quả trả về & Đính kèm tài liệu phù hợp
  if (replyText) {
    // Trích xuất gợi ý câu hỏi tiếp theo [GỢI Ý: ...]
    const suggestions = [];
    const suggestionRegex = /\[(?:GỢI Ý|SUGGESTIONS?):\s*([^\]]+)\]/i;
    const sugMatch = replyText.match(suggestionRegex);
    if (sugMatch) {
      const rawItems = sugMatch[1].split(/[|;\n]+/);
      rawItems.forEach((item) => {
        const trimmed = item.trim().replace(/^[-*•\d.]+\s*/, '');
        if (
          trimmed.length >= 6 &&
          trimmed.length <= 120 &&
          !trimmed.toLowerCase().includes("tài liệu")
        ) {
          suggestions.push(trimmed);
        }
      });
    }

    const citedDocNames = [];
    const citationRegex = /\[TÀI LIỆU:\s*([^\]]+)\]/gi;
    let match;
    while ((match = citationRegex.exec(replyText)) !== null) {
      citedDocNames.push(match[1].trim());
    }

    // Xóa thẻ trích dẫn ngầm [TÀI LIỆU: ...] và thẻ [GỢI Ý: ...]
    let cleanReplyText = replyText
      .replace(/\[(?:GỢI Ý|SUGGESTIONS?):\s*[^\]]+\]/gi, "")
      .replace(/\[TÀI LIỆU:\s*[^\]]+\]/gi, "");

    // Xóa các dòng chỉ chứa dấu hoa thị hoặc bullet trống (VD: "* ", "*", "- ", "-")
    cleanReplyText = cleanReplyText
      .split("\n")
      .filter((line) => !/^\s*([*-•]|\d+\.)?\s*$/.test(line))
      .join("\n");

    // Nếu tiêu đề "📄 Tài liệu tham khảo:" bị cô lập ở cuối bài (không còn văn bản phía sau), dọn sạch vì đã có thẻ card bên dưới
    cleanReplyText = cleanReplyText
      .replace(/(?:^|\n)\s*(?:📄\s*)?\*{0,2}Tài liệu tham khảo\*{0,2}:?\s*$/gi, "")
      .trim();

    const isRefusal = isRefusalReply(cleanReplyText);
    const matchedDocs = isRefusal
      ? []
      : findMatchingDocs(query, documents, replyText, citedDocNames, categories, subFolders);

    const finalResult = {
      text: cleanReplyText,
      documents: matchedDocs,
      suggestions: isRefusal ? [] : suggestions.slice(0, 3),
    };

    queryResponseCache.set(cacheKey, finalResult);
    return finalResult;
  } else {
    // Kích hoạt Tri thức Dự phòng Ngoại tuyến nếu Gemini tạm thời bận
    const localAnswer = getLocalKnowledgeAnswer(query);
    if (localAnswer) {
      let cleanReplyText = localAnswer.text.replace(/\[TÀI LIỆU:\s*[^\]]+\]/gi, "");
      cleanReplyText = cleanReplyText
        .split("\n")
        .filter((line) => !/^\s*([*-•]|\d+\.)?\s*$/.test(line))
        .join("\n");
      cleanReplyText = cleanReplyText
        .replace(/(?:^|\n)\s*(?:📄\s*)?\*{0,2}Tài liệu tham khảo\*{0,2}:?\s*$/gi, "")
        .trim();

      const matchedDocs = findMatchingDocs(
        query,
        documents,
        localAnswer.text,
        localAnswer.citedDocNames,
        categories,
        subFolders,
      );

      return {
        text: `${cleanReplyText}\n\n*(ℹ️ Phản hồi từ Bộ nhớ Tri thức Doanh nghiệp NSG - Gemini AI tạm thời đạt giới hạn lượt gọi)*`,
        documents: matchedDocs,
      };
    }

    const matchedDocs = findMatchingDocs(query, documents, "", [], categories, subFolders);
    let errorNotice = "";
    const isQuotaError =
      lastError &&
      (lastError.toLowerCase().includes("quota") ||
        lastError.toLowerCase().includes("rate") ||
        lastError.includes("429"));
    const isServiceBusy =
      lastError &&
      (lastError.includes("503") ||
        lastError.toLowerCase().includes("high demand") ||
        lastError.toLowerCase().includes("service unavailable"));

    if (isQuotaError) {
      const retryMatch = lastError.match(/retry in\s+([\d.]+)\s*s/i);
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 20;

      errorNotice = `⚠️ **Hệ thống AI đang tạm thời làm nguội (Cooldown):**\n\nGói Google Gemini miễn phí giới hạn tần suất gọi nhanh (15 câu/phút). Bạn vui lòng chờ khoảng **${retrySeconds} giây** rồi gửi lại câu hỏi nhé!\n\n💡 *Mẹo sử dụng nhiều API Key:* Nhiều API Key tạo trên **cùng 1 tài khoản Google** sẽ dùng chung một hạn mức. Để xoay vòng chống nghẽn hiệu quả nhất, hãy tạo API Key từ **các tài khoản Gmail khác nhau** rồi thêm vào hệ thống.`;
    } else if (isServiceBusy) {
      errorNotice = `⚠️ **Máy chủ Google Gemini đang có lượng truy cập tăng đột biến (High Demand 503):**\n\nHệ thống AI của Google đang bị nghẽn tạm thời trong chốc lát. Bạn vui lòng bấm gửi lại câu hỏi sau vài giây nhé!`;
    } else {
      errorNotice = `⚠️ **Không thể kết nối với Gemini AI**: ${lastError || "Dịch vụ tạm thời bận. Vui lòng thử lại sau giây lát."}`;
    }
    if (matchedDocs.length > 0) {
      errorNotice += `\n\nTuy nhiên, dưới đây là các tài liệu liên quan được tìm thấy trong kho:`;
    }

    return {
      text: errorNotice,
      documents: matchedDocs,
    };
  }
}
