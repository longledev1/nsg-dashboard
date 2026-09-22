// ==============================================================================
// BỘ SINH PHẢN HỒI TRI THỨC DOANH NGHIỆP NSG NGOẠI TUYẾN (OFFLINE KNOWLEDGE ENGINE)
// Tự động kích hoạt khi tài khoản Gemini tạm thời đạt giới hạn Quota / Rate Limit (429) hoặc mạng gián đoạn.
// Đảm bảo nhân sự NSG luôn nhận được câu trả lời chi tiết, chính xác từ Hồ sơ Lịch sử & Doanh nghiệp NSG.
// ==============================================================================

export function getLocalKnowledgeAnswer(query) {
  const q = (query || "").toLowerCase();

  // 1. Phim ảnh / Điện ảnh / Phim trường / Bối cảnh điện ảnh
  if (
    q.includes("phim") ||
    q.includes("điện ảnh") ||
    q.includes("mỹ nhân kế") ||
    q.includes("nụ hôn rực rỡ") ||
    q.includes("bối cảnh") ||
    q.includes("phim trường")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
Tập đoàn NS Group (Ngọc Sương Group) có mối liên hệ đặc biệt sâu sắc và nổi tiếng với nền điện ảnh Việt Nam! Khu nghỉ dưỡng trứ danh **Resort Ngọc Sương (Cam Ranh)** đã từng là phim trường độc quyền và bối cảnh chính cho hai tác phẩm điện ảnh bom tấn ăn khách hàng đầu của điện ảnh nước nhà.

💡 **Chi tiết dấu ấn Điện ảnh trong lịch sử NS Group**:
- **Năm 2010 - Phim điện ảnh "Những Nụ Hôn Rực Rỡ"**:
  + **Đạo diễn**: Nguyễn Quang Dũng (Dũng "Khùng").
  + **Dàn diễn viên**: Siêu mẫu Thanh Hằng, ca sĩ Minh Hằng, rocker Phạm Anh Khoa, Phương Thanh, ban nhạc 4U...
  + **Vai trò của NSG**: Resort Ngọc Sương (Cam Ranh) được chọn làm **phim trường độc quyền**. Vẻ đẹp hoang sơ tuyệt mỹ, bờ cát trắng, làn nước biển trong vắt cùng hệ thống cầu gỗ và các bungalow trên mặt biển đặc trưng của Ngọc Sương đã tạo nên cơn sốt thị giác bùng nổ, biến nơi đây thành "thiên đường nghỉ dưỡng check-in" nổi tiếng khắp cả nước.
- **Năm 2013 - Siêu phẩm võ thuật 3D "Mỹ Nhân Kế"**:
  + **Đạo diễn**: Nguyễn Quang Dũng.
  + **Dàn diễn viên**: Siêu mẫu Thanh Hằng (Kiều Thị), Tăng Thanh Hà (Linh Lan), Ngọc Quyên, Diễm My 9x, Kim Dung...
  + **Vai trò của NSG**: Resort Ngọc Sương tiếp tục là **phim trường chính** của tác phẩm. Đoàn làm phim đã dựng toàn bộ quán rượu "Đường Sơn Quán" kỳ công ngay trên các mỏm đá sát mép vịnh Cam Ranh tại Resort Ngọc Sương, tạo nên những thước phim kiếm hiệp cổ trang tuyệt mỹ mang dấu ấn NSG.
- **Năm 2015 - Nghệ thuật & Ẩm thực Bến Nhà Rồng**:
  + NS Group đầu tư **3 tỷ đồng** ra mắt Dinner Show *"Lung Linh Sài Gòn"* tại Bến Nhà Rồng, kết hợp đỉnh cao giữa ẩm thực hải sản thượng hạng, âm nhạc dân tộc và vũ đạo nghệ thuật.

📄 **Tài liệu tham khảo**:
Mọi dữ liệu trên đều được ghi chép chính thức trong:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  // 2. Chủ tịch HĐQT & Ban Lãnh đạo
  if (
    q.includes("chủ tịch") ||
    q.includes("trần anh dũng") ||
    q.includes("lãnh đạo") ||
    q.includes("giám đốc") ||
    q.includes("nhân sự") ||
    q.includes("bộ máy") ||
    q.includes("lê hoàng hải") ||
    q.includes("lâm khắc bảo lân") ||
    q.includes("mạc vi chi") ||
    q.includes("thái minh toàn") ||
    q.includes("pascal quang") ||
    q.includes("phú")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
Linh hồn và người dẫn dắt bản sắc văn hóa ẩm thực của NS Group là **Chủ tịch HĐQT Trần Anh Dũng** (thế hệ thứ 2, con trai cụ Trần Tương). Đồng hành cùng ông là Ban điều hành chuyên nghiệp dẫn dắt từng khối thương hiệu và chuỗi cung ứng chiến lược.

💡 **Bộ máy lãnh đạo & nhân sự chủ lực NS Group**:
1. **Ông Trần Anh Dũng - Chủ tịch HĐQT NS Group**:
   - Linh hồn văn hóa ẩm thực tập đoàn; trực tiếp nghiên cứu, sáng tạo và chuẩn hóa các món ăn di sản độc bản (Gỏi cá Ngọc Sương, Nghêu hấp vang Pháp, Tôm đút lò Thermidor...).
2. **Ông Lê Hoàng Hải - Điều hành NS Group**:
   - Quản lý toàn bộ hoạt động vận hành; định hướng chiến lược – tài chính và mục tiêu tăng trưởng toàn diện.
3. **Ông Lâm Khắc Bảo Lân - NS Gourmet**:
   - Giữ gìn và phát triển bản sắc các thương hiệu con; tối ưu hóa quy trình vận hành thích ứng biến động thị trường.
4. **Bà Mạc Vi Chi - Exo Market**:
   - Quản trị chuỗi cung ứng thực phẩm tươi sống; nghiên cứu nguồn nguyên liệu đặc thù tiêu chuẩn cao.
5. **Ông Thái Minh Toàn - Phụ trách Marina**:
   - Tái thiết và dẫn dắt sự trở lại đầy phong cách của thương hiệu ẩm thực du thuyền Marina.
6. **Ông Trần Pascal Quang - Exora (Thế hệ thứ 3)**:
   - Cung ứng giải pháp toàn diện về trang thiết bị, thiết kế kiến trúc và phong cách sống sáng tạo.

⚠️ **Lưu ý đặc biệt về nhân sự**:
- Nhân sự **Phạm Đăng Phú** đã được miễn nhiệm, hiện không còn thuộc bộ máy nhân sự của Tập đoàn NS Group.

📄 **Tài liệu tham khảo**:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  // 3. Lịch sử hình thành, nguồn gốc, tên gọi Ngọc Sương, 1955
  if (
    q.includes("lịch sử") ||
    q.includes("nguồn gốc") ||
    q.includes("1955") ||
    q.includes("hình thành") ||
    q.includes("sáng lập") ||
    q.includes("tại sao") ||
    q.includes("tên gọi") ||
    q.includes("ngọc sương là ai") ||
    q.includes("trần tương")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
Thương hiệu **Ngọc Sương** được sáng lập từ năm **1955** tại vùng biển Cam Ranh bởi cụ **Trần Tương**. Tên gọi *"Ngọc Sương"* là sự kết hợp thiêng liêng từ **tên của người vợ và con gái** của người sáng lập, biểu trưng cho sự trân quý tình cảm gia đình và nét thanh tao, thuần khiết.

💡 **5 Giai đoạn phát triển vẻ vang suốt 70 năm (1955 - Nay)**:
- **Giai đoạn 1 (1955 - 1976): Khai sinh & Đặt nền móng**
  + Năm 1955: Cụ Trần Tương mở quán ăn hải sản Ngọc Sương đầu tiên tại Bãi Dài, Ba Ngòi (Cam Ranh) với biểu tượng cối xay gió Trại Mát mộc mạc.
  + Năm 1968: Ông Trần Anh Dũng kế nghiệp cha, tiếp tục cải tiến thực đơn và chuẩn hóa món Gỏi cá Ngọc Sương danh tiếng.
- **Giai đoạn 2 (1977 - 1987): Tu nghiệp Pháp & Hội nhập quốc tế**
  + Ông Trần Anh Dũng sang Pháp tu nghiệp, mở chuỗi nhà hàng nổi tiếng tại Paris (*Restaurant Saigon, Mandarine, Palais Imperial, Orchidee*).
  + Ông tiếp thu nghệ thuật sốt bơ tỏi, vang Pháp và kỹ nghệ ẩm thực phương Tây, kết hợp tinh hoa ấy với hải sản tươi Cam Ranh.
- **Giai đoạn 3 (1990 - 2009): Mở rộng chuỗi ẩm thực đô thị**
  + Khai trương hàng loạt cơ sở biểu tượng tại TP.HCM: Lê Quý Đôn (1990), Đoàn Thị Điểm (1993), Sương Nguyệt Ánh (1997), Nguyễn Đình Chiểu (2000)...
- **Giai đoạn 4 (2010 - 2020): Định vị cao cấp & Phim trường bom tấn**
  + Resort Ngọc Sương Cam Ranh là phim trường độc quyền cho *"Những Nụ Hôn Rực Rỡ"* (2010) và *"Mỹ Nhân Kế"* (2013).
  + Năm 2012: Khai trương Nhà hàng Ngọc Sương Bến Thuyền (Nguyễn Văn Trỗi). Năm 2015 ra mắt Dinner Show *"Lung Linh Sài Gòn"* (3 tỷ đồng).
- **Giai đoạn 5 (2021 - Nay): Hiện đại hóa & Vươn tầm tương lai**
  + Tái định vị hệ sinh thái thương hiệu đa phân khúc và triển khai chiến lược quốc tế hóa 2024-2030.

📄 **Tài liệu tham khảo**:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  // 4. Món ăn di sản, ẩm thực
  if (
    q.includes("món ăn") ||
    q.includes("ẩm thực") ||
    q.includes("di sản") ||
    q.includes("gỏi cá") ||
    q.includes("vang pháp") ||
    q.includes("thermidor") ||
    q.includes("tôm sú xỉn") ||
    q.includes("cơm nồi đất")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
Kho tàng ẩm thực của NS Group là sự kết tinh kỳ diệu giữa **hải sản tươi ngon của biển cả Việt Nam** và **kỹ nghệ ẩm thực tinh tế của Pháp**, do đích thân Chủ tịch HĐQT **Trần Anh Dũng** nghiên cứu và sáng tạo.

💡 **Các món ăn Di sản huyền thoại của Ngọc Sương**:
1. **Gỏi cá Ngọc Sương**: Món ăn biểu tượng số 1 làm nên thương hiệu từ 1955. Cá tươi phi lê thái mỏng, tái bằng cốt chanh tươi, cuốn cùng lá sung, đọt cóc, chuối chát và nước chấm tương mè bí truyền.
2. **Nghêu hấp vang Pháp**: Sự thăng hoa giữa nghêu biển miền Trung béo ngọt cùng vang trắng Pháp, bơ thơm và ngò tây.
3. **Tôm đút lò Thermidor**: Đỉnh cao ẩm thực cổ điển Pháp kết hợp phô mai nướng vàng óng ả trên tôm hùm/tôm sú nhiệt đới.
4. **Tôm sú xỉn**: Món hải sản được tẩm ướp và khò lửa trực tiếp tại bàn bằng rượu hảo hạng, tạo nên hương vị bùng nổ.
5. **Cơm nồi đất Ngọc Sương**: Cơm nấu niêu truyền thống dẻo thơm, đáy cháy giòn rụm ăn kèm hải sản đậm vị biển quê nhà.

📄 **Tài liệu tham khảo**:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  // 5. Hệ thống thương hiệu (Portfolio Branding)
  if (
    q.includes("thương hiệu") ||
    q.includes("brand") ||
    q.includes("portfolio") ||
    q.includes("dạ yến") ||
    q.includes("saigon marina") ||
    q.includes("yến bay") ||
    q.includes("kingclam") ||
    q.includes("trại mát") ||
    q.includes("chợ cũ") ||
    q.includes("exocafe")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
NS Group sở hữu hệ thống thương hiệu đa phân khúc (Portfolio Branding), từ trải nghiệm ẩm thực ngoại giao 4 sao sang trọng đến các mô hình ẩm thực ký ức và giải trí đương đại.

💡 **Hệ thống thương hiệu chủ lực của NS Group**:
- **Dạ Yến (4 sao)**: Hải sản Cung đình Huế thời Pháp; đậm nét văn hóa Việt, sang trọng. Khách hàng: Chiêu đãi ngoại giao, đối tác VIP, khách Nhật cao cấp.
- **Saigon Marina (4 sao)**: Hải sản cao cấp chủ đề Du thuyền phong cách Âu. Khách hàng: Giới kinh doanh, nghệ sĩ, tiệc sang trọng.
- **Yến Bay (4 sao)**: Nhà hàng hải sản tiêu chuẩn Ngọc Sương truyền thống. Khách hàng: Gia đình, doanh nghiệp, du khách.
- **KingClam (3 sao)**: Beer Club phong cách Âu bụi bặm; chuyên nghêu và steak. Khách hàng: Giới trẻ hiện đại, dân văn phòng.
- **Quán Ăn Trại Mát (3 sao)**: Trạm dừng chân di sản với kiến trúc cối xay gió, mái lá, phục vụ hải sản và cơm Việt truyền thống.
- **Chợ Cũ (3 sao)**: Không gian ẩm thực ký ức hoài niệm với các quầy quán truyền thống.
- **Exocafé (Café & Bakery)**: Mô hình nhiệt đới kết hợp thủ công mỹ nghệ, cung cấp tráng miệng và café cao cấp cho toàn hệ thống.

📄 **Tài liệu tham khảo**:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  // 6. Chiến lược & Kế hoạch phát triển 2024 - 2030
  if (
    q.includes("chiến lược") ||
    q.includes("kế hoạch") ||
    q.includes("2024") ||
    q.includes("2025") ||
    q.includes("2030") ||
    q.includes("thủ thiêm") ||
    q.includes("canal promenade") ||
    q.includes("bến thuyền") ||
    q.includes("opera complex") ||
    q.includes("central kitchen") ||
    q.includes("ns academy")
  ) {
    return {
      text: `📌 **Tóm tắt cốt lõi**:
Chiến lược 2024 – 2030 của NS Group kiên định với định hướng **"Chuyên nghiệp hóa hệ thống quản lý, tự động hóa sản xuất nhưng kiên quyết giữ chất lượng tươi ngon di sản"**, chuẩn bị nền tảng để đưa ẩm thực Việt Nam vươn ra quốc tế.

💡 **Kế hoạch triển khai trọng điểm**:
- **Giai đoạn 1 (2024 – trước 2025)**:
  + **Dự án Bến Thuyền (Nguyễn Văn Trỗi)**: Cải tạo toàn diện theo concept *"Phố dạo bờ kênh - Canal Promenade"* với 3 thương hiệu: Yến Bay, Exocafé, KingClam.
  + **Hạ tầng cốt lõi**: Xây dựng Bếp trung tâm (**Central Kitchen**) và Học viện đào tạo ẩm thực (**NS Academy**).
  + **Mở rộng địa bàn Thủ Thiêm**: Phát triển tại Khu đô thị Thủ Thiêm (dự án *The Opera Complex*) với bộ ba thương hiệu: Marina, KingClam, Chợ Cũ.
- **Giai đoạn 2 (Hướng tới 2030)**:
  + **Đại bản doanh Lê Quý Đôn**: Trở lại mặt bằng lịch sử Lê Quý Đôn (Quận 3), xây dựng trung tâm điều hành và trung tâm R&D toàn tập đoàn.
  + **Phát triển thương hiệu Dạ Yến**: Tạo dựng biểu tượng ẩm thực đại diện cho tinh hoa văn hóa Việt.
  + **Tiến quân ra thế giới (từ 2030)**: Khẳng định thương hiệu Việt trên thị trường quốc tế, quảng bá văn hóa ẩm thực Việt Nam ra toàn cầu.

📄 **Tài liệu tham khảo**:
[TÀI LIỆU: NSG History.docx]`,
      citedDocNames: ["NSG History.docx", "Hồ Sơ Doanh Nghiệp & Lịch Sử NS Group (NSG History.docx)"],
    };
  }

  return null;
}
