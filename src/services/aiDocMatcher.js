// ==============================================================================
// BỘ LỌC TÀI LIỆU & KHỚP TRÍCH DẪN THÔNG MINH (DOCUMENT RETRIEVAL & CITATION MATCHER)
// ==============================================================================

/**
 * Kiểm tra xem câu hỏi có phải là câu chào hỏi, cảm ơn hoặc giao tiếp xã giao thông thường không
 */
export function isGreetingOrSmallTalk(query) {
  if (!query) return true;
  const q = query
    .toLowerCase()
    .trim()
    .replace(/[.,?!;:()[\]{}"'`~@#$%^&*_+=/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!q) return true;

  const greetingPhrases = [
    "chào", "chao", "xin chào", "xin chao", "chào bạn", "chao ban", 
    "chào em", "chao em", "chào anh", "chào chị", "chào bot", "chào ai", 
    "chào nsg", "chào admin", "hello", "hi", "hey", "alo", "helo", "hế lô", "hê lô",
    "good morning", "good afternoon", "good evening", 
    "chào buổi sáng", "chào buổi chiều", "chào buổi tối",
    "cảm ơn", "cam on", "cảm ơn bạn", "cảm ơn em", "cảm ơn nhiều", "thank", "thanks", "thank you", "tks",
    "tạm biệt", "tam biet", "bye", "goodbye", "bye bye", "hẹn gặp lại",
    "ok", "oke", "oki", "okie", "ok bạn", "oke bạn", "được rồi", "tuyệt", "tuyệt vời", "hay quá", "tốt"
  ];

  if (greetingPhrases.includes(q)) return true;

  const words = q.split(" ").filter(Boolean);
  const commonChitChatWords = new Set([
    "chào", "chao", "xin", "bạn", "ban", "em", "anh", "chị", "ơi", "oi", "nhé", "nhe", "nha", "ạ", "a",
    "hello", "hi", "hey", "alo", "cảm", "ơn", "on", "thank", "thanks", "ok", "oke", "bye"
  ]);

  if (words.length <= 4 && words.every((w) => commonChitChatWords.has(w))) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem câu trả lời có phải là từ chối ngoài phạm vi hay không
 */
export function isRefusalReply(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("từ chối ngoài phạm vi") ||
    lower.includes("ngoài phạm vi") ||
    lower.includes("không thuộc phạm vi") ||
    lower.includes("không thể hỗ trợ câu hỏi ngoài phạm vi") ||
    lower.includes("chỉ được phân quyền hỗ trợ") ||
    lower.includes("vui lòng đặt câu hỏi liên quan đến hoạt động và tài liệu của tập đoàn")
  );
}

/**
 * Hàm hỗ trợ tìm kiếm tài liệu thông minh & khớp trích dẫn CHÍNH XÁC từ Gemini AI
 * Tìm kiếm trên cả Tiêu đề, Tags, Mô tả và Nội dung văn bản bên trong file
 */
export function findMatchingDocs(
  query,
  documents,
  replyText = "",
  citedDocNames = [],
  categories = [],
  subFolders = [],
) {
  if (!documents || documents.length === 0) return [];

  // Nếu câu trả lời là từ chối ngoài phạm vi HOẶC câu hỏi chỉ là chào hỏi / cảm ơn / xã giao, tuyệt đối không đính kèm file
  if (isRefusalReply(replyText) || isGreetingOrSmallTalk(query)) {
    return [];
  }

  // Deduplicate documents input beforehand
  const uniqueDocsMap = new Map();
  documents.forEach((d) => {
    if (d && d.id) uniqueDocsMap.set(d.id, d);
  });
  const cleanDocsList = Array.from(uniqueDocsMap.values());

  const matchedDocsMap = new Map(); // key: doc.id => doc
  const lowerReply = (replyText || "").toLowerCase();

  // 1. Ưu tiên hàng đầu: Khớp qua thẻ trích dẫn rõ ràng do AI phát ra [TÀI LIỆU: ...]
  if (citedDocNames && citedDocNames.length > 0) {
    citedDocNames.forEach((citedName) => {
      const cLower = citedName.toLowerCase().trim();
      cleanDocsList.forEach((d) => {
        const titleLower = (d.title || "").toLowerCase();
        const baseName = titleLower.replace(/\.[^/.]+$/, "");
        if (
          titleLower === cLower ||
          titleLower.includes(cLower) ||
          cLower.includes(titleLower) ||
          (baseName.length >= 5 && cLower.includes(baseName))
        ) {
          matchedDocsMap.set(d.id, d);
        }
      });
    });

    if (matchedDocsMap.size > 0) {
      return Array.from(matchedDocsMap.values());
    }
  }

  // 2. Ưu tiên thứ hai: Chỉ khớp khi câu trả lời trích dẫn rõ ràng tên tệp kèm từ khóa "tài liệu" hoặc "tệp"
  cleanDocsList.forEach((doc) => {
    const docTitleLower = (doc.title || "").toLowerCase();
    if (
      docTitleLower.length >= 6 &&
      (lowerReply.includes(`tài liệu "${docTitleLower}`) || 
       lowerReply.includes(`tệp "${docTitleLower}`) ||
       lowerReply.includes(`file "${docTitleLower}`) ||
       lowerReply.includes(`tài liệu: ${docTitleLower}`))
    ) {
      matchedDocsMap.set(doc.id, doc);
    }
  });

  if (matchedDocsMap.size > 0) {
    return Array.from(matchedDocsMap.values());
  }

  // 3. Khớp theo từ khóa tìm kiếm người dùng (Tìm kiếm sâu vào cả Title, Tags, Description và Content)
  const lowerQuery = (query || "").toLowerCase();

  const stopWords = new Set([
    "cho", "tôi", "xin", "gửi", "tài", "liệu", "file", "tệp", "với", "nhé", "nha", "nhe",
    "xem", "đọc", "tìm", "kiếm", "hỏi", "có", "không", "ở", "đâu", "về", "coi", "thử",
    "của", "và", "các", "những", "nào", "gì", "là", "được", "ra", "sao", "thế",
    "bạn", "giúp", "ạ", "ơi", "portal", "tập", "đoàn", "em", "anh", "chị", "dạ", "vâng",
    "muốn", "thông", "tin", "biết", "cần", "chi", "tiết", "nội", "dung", "chào", "chao", "hello", "hi", "hey", "alo",
    "hồ", "sơ", "văn", "bản", "liên", "quan", "toàn", "bộ", "tất", "cả", "cảm", "ơn", "thanks", "thank", "ok", "oke",
    "mới", "nhất", "tải", "download", "hướng", "dẫn", "quy", "định", "bye",
    "bao", "nhiêu", "thêm", "nữa", "doc", "docx", "pdf", "chỉ", "cách",
    "làm", "một", "hai", "ba", "bốn", "năm", "bài", "câu", "hay", "như",
    "này", "kia", "đó", "đây", "theo", "sau", "trước", "khi", "lúc", "trong",
    "ngoài", "giữa", "lại", "rồi", "qua", "vào", "đến", "tới", "lên", "xuống",
    "người", "việc", "ngày", "tháng", "tặng", "viết", "soạn", "tạo", "nói"
  ]);

  const specificKeywords = lowerQuery
    .replace(/[.,?!;:()[\]{}"'`~@#$%^&*_+=/\\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (specificKeywords.length === 0) return [];

  const cleanQueryPhrase = specificKeywords.join(" ");
  const scoredDocs = [];

  cleanDocsList.forEach((doc) => {
    let score = 0;
    const titleLower = (doc.title || "").toLowerCase();
    const descLower = (doc.description || "").toLowerCase();
    const tagsLower = (doc.tags || []).map((t) => t.toLowerCase()).join(" ");
    const contentLower = (doc.content || "").toLowerCase();

    // Khớp cụm từ khóa liên tục
    if (cleanQueryPhrase.length >= 4) {
      if (titleLower.includes(cleanQueryPhrase)) score += 35;
      else if (tagsLower.includes(cleanQueryPhrase)) score += 25;
      else if (descLower.includes(cleanQueryPhrase)) score += 20;
      else if (contentLower.includes(cleanQueryPhrase)) score += 15;
    }

    // Khớp từng từ khóa riêng biệt trong Title, Tags, Description và Content
    let matchedKwCount = 0;
    let hasMetadataMatch = false;

    specificKeywords.forEach((kw) => {
      const inTitle = titleLower.includes(kw);
      const inTags = tagsLower.includes(kw);
      const inDesc = descLower.includes(kw);
      const inContent = contentLower.includes(kw);

      if (inTitle) {
        score += 15;
        matchedKwCount++;
        hasMetadataMatch = true;
      } else if (inTags) {
        score += 12;
        matchedKwCount++;
        hasMetadataMatch = true;
      } else if (inDesc) {
        score += 8;
        matchedKwCount++;
        hasMetadataMatch = true;
      } else if (inContent) {
        score += 5;
        matchedKwCount++;
      }
    });

    // Chỉ chấp nhận tài liệu khi:
    // 1. Khớp từ khóa vào Metadata (Title, Tags, Description) và đạt điểm chuẩn
    // 2. Hoặc cụm từ khớp trong content với điểm cao (>= 20) và khớp phần lớn từ khóa
    const requiredMatchCount =
      specificKeywords.length > 1 ? Math.ceil(specificKeywords.length * 0.6) : 1;
    const isQualify = hasMetadataMatch
      ? score >= 15 && matchedKwCount >= requiredMatchCount
      : score >= 20 && matchedKwCount >= requiredMatchCount;

    if (isQualify) {
      scoredDocs.push({ doc, score });
    }
  });

  scoredDocs.sort((a, b) => b.score - a.score);

  // Đảm bảo tuyệt đối không bị trùng lặp tài liệu theo doc.id
  const finalUniqueMap = new Map();
  scoredDocs.forEach(({ doc }) => {
    if (!finalUniqueMap.has(doc.id)) {
      finalUniqueMap.set(doc.id, doc);
    }
  });

  return Array.from(finalUniqueMap.values());
}
