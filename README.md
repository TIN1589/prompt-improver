<div align="center">

#  Prompt Improver — AI Prompt Optimizer

**Trợ lý tối ưu hóa câu lệnh AI thời gian thực dành cho Chrome & Serverless Edge Backend**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Serverless-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Gemini_2.0_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Tests-36%2F36_Passed-brightgreen.svg?style=for-the-badge)](test/)

<p align="center">
  <a href="#-tổng-quan-dự-án">Tổng Quan</a> •
  <a href="#-tính-năng-nổi-bật">Tính Năng</a> •
  <a href="#-kiến-trúc-hệ-thống">Kiến Trúc</a> •
  <a href="#-hướng-dẫn-cài-đặt--triển-khai">Cài Đặt</a> •
  <a href="#-kiểm-thử-testing">Kiểm Thử</a> •
  <a href="#-bảo-mật--quyền-riêng-tư">Bảo Mật</a> •
  <a href="#-giấy-phép">Giấy Phép</a>
</p>

</div>

---

## Tổng Quan Dự Án

**Prompt Improver** là một giải pháp mở rộng trình duyệt (Chrome Extension MV3) kết hợp cùng Serverless Edge Backend (Cloudflare Workers). Tiện ích tự động tích hợp nút **"✨ Cải thiện"** trực tiếp vào giao diện của các nền tảng AI hàng đầu như **ChatGPT**, **Claude.ai**, **Google Gemini**, **Perplexity**, **DeepSeek**, **Copilot**... 

Khi người dùng soạn thảo, hệ thống tự động phân tích ngữ cảnh, phân loại tác vụ và gọi Google Gemini AI để sinh ra **2 phiên bản prompt tối ưu hóa** (Tối giản & Chi tiết) cùng danh sách các **Giả định ngầm định (Assumptions)**, giúp người dùng nhận được câu trả lời chất lượng cao nhất từ AI mà không tốn công gõ prompt dài dòng.

---

## Tính Năng Nổi Bật

-  **2 Chế độ Tối ưu Thông minh**:
  -  **Bản Tối giản (Minimal)**: Loại bỏ từ thừa, cô đọng nội dung, đi thẳng vào trọng tâm kỹ thuật, tiết kiệm token tối đa.
  -  **Bản Chi tiết (Detailed)**: Thiết lập Role/Persona chuyên gia, phân tích ngữ cảnh, bổ sung ràng buộc chất lượng và định dạng đầu ra chuẩn mực.
-  **Giả định Làm rõ (Assumptions Detection)**: Tự động phát hiện và cảnh báo các thông tin còn thiếu trong prompt ban đầu.
-  **Hoàn tác Tức thì (1-Click Undo)**: Toast thông báo góc màn hình cho phép khôi phục nguyên trạng prompt gốc bất cứ lúc nào.
-  **Nhận diện Tác vụ Tự động (Task Classification)**: Tự động phân loại `code`, `writing`, `analysis`, `translation`, `general` để áp dụng cấu trúc meta-prompt chuyên biệt.
-  **Bảo mật Secret qua Cloudflare Worker**: Gemini API Key được mã hóa và lưu an toàn trên Cloudflare Worker Secrets, hoàn toàn không bị lộ ở client extension.
-  **Local SHA-256 Hash Cache**: Cache kết quả băm SHA-256 trên trình duyệt, phản hồi tức thì với các prompt quen thuộc và tiết kiệm API quota.
-  **Modern Neo-Brutalism & Glassmorphism UI**: Giao diện nổi bật, hiện đại, đóng gói trong **Shadow DOM** chống xung đột CSS với website chủ.
-  **Cơ chế Kháng Lỗi (Exponential Backoff)**: Tự động thử lại khi gặp giới hạn tần suất gọi API (HTTP 429).

---

## Kiến Trúc Hệ Thống

```
+-----------------------------------------------------------------------------------+
|                            TRÌNH DUYỆT (CHROME CLIENT)                            |
|                                                                                   |
|  [ ChatGPT / Claude / Gemini Web UI ]                                            |
|        │                                                                          |
|        ▼ (Injected via Shadow DOM)                                               |
|  [ Content Script: content.js ] ───> [ Nút ✨ Cải Thiện & Modal Xem Trước ]       |
|        │                                                                          |
|        ▼ (chrome.runtime.sendMessage)                                             |
|  [ Background Service Worker: background.js ]                                     |
|        ├── SHA-256 Hash Cache Storage                                            |
|        └── Exponential Backoff Retry (429 Handler)                               |
+────────────────────────────────────────┬──────────────────────────────────────────+
                                         │ HTTPS (POST /improve)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     SERVERLESS BACKEND (CLOUDFLARE WORKERS)                       |
|                                                                                   |
|  [ worker.js ]                                                                    |
|        ├── CORS & Rate Limit Middleware                                           |
|        ├── Task Classifier (Code / Writing / Analysis / Translation / General)   |
|        └── Meta-Prompt Synthesis Engine                                           |
|                     │                                                             |
|                     ▼ (Secured via Worker Secrets)                                |
|        [ Google Gemini 2.0 Flash API (Free / Pro Tier) ]                          |
+-----------------------------------------------------------------------------------+
```

---

## Cấu Trúc Thư Mục Dự Án

```
projectExtention/
├── prompt-improver-backend/          # Phần 1: Cloudflare Worker Backend
│   ├── worker.js                     # Xử lý POST /improve, gọi Gemini & phân loại tác vụ
│   ├── wrangler.toml                 # Cấu hình triển khai Cloudflare Wrangler
│   ├── package.json                  # Scripts & metadata của backend
│   ├── .env.example                  # File mẫu cấu hình biến môi trường
│   └── README.md                     # Hướng dẫn chi tiết triển khai worker
├── src/                              # Phần 2: Chrome Extension Source Code (MV3)
│   ├── background.js                 # Service worker: gọi API backend, retry 429, SHA-256 cache
│   ├── content.js                    # Injected button , modal xem trước, apply & undo
│   ├── content.css                   # Styling cho nút, modal và undo toast (Shadow DOM)
│   ├── popup.html / popup.js         # Màn hình cài đặt URL, site toggles, ping test, cache stats
│   ├── popup.css                     # Giao diện popup phong cách hiện đại
│   ├── options.html / options.js     # Trang cấu hình nâng cao
│   ├── semanticExpander.js           # Bộ mở rộng ngữ nghĩa & quy tắc prompt
│   └── utils.js                      # Tiện ích: đếm token, băm SHA-256, phân loại tác vụ
├── assets/                           # Icon extension (16x16, 48x48, 128x128) & Fonts
├── test/                             # Unit tests & Validation scripts
│   ├── test_optimizer.js             # Kiểm thử logic nén & tối ưu prompt
│   ├── test_backend_mock.js          # Kiểm thử tích hợp mock backend & phân loại
│   ├── test_semantic_expander.js     # Kiểm thử bộ mở rộng ngữ nghĩa
│   └── syntax_check.js               # Kiểm thử cú pháp & toàn vẹn Manifest V3
├── .gitignore                        # Loại trừ credential, cache và node_modules
├── LICENSE                           # Giấy phép nguồn mở MIT
├── manifest.json                     # Cấu hình Chrome Extension Manifest V3
├── package.json                      # Quản lý scripts test & dev chung
└── README.md                         # Tài liệu dự án chính
```

---

## Hướng Dẫn Cài Đặt & Triển Khai

### BƯỚC 1: Triển Khai Backend (Cloudflare Worker)

1. **Lấy Gemini API Key (Miễn phí):**
   - Truy cập [Google AI Studio](https://aistudio.google.com/apikey) và tạo một API Key mới.

2. **Cài đặt Wrangler CLI & Đăng nhập:**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **Deploy Worker lên Cloudflare:**
   ```bash
   cd prompt-improver-backend
   wrangler deploy
   ```
   *Ghi nhớ URL được sinh ra (Ví dụ: `https://prompt-improver-backend.<your-subdomain>.workers.dev`).*

4. **Thiết lập Secret an toàn cho API Key:**
   ```bash
   wrangler secret put GEMINI_API_KEY
   # Dán Gemini API Key của bạn vào và nhấn Enter
   ```

---

### BƯỚC 2: Cài Đặt Extension Vào Trình Duyệt

1. Mở Chrome và truy cập đường dẫn: `chrome://extensions/`
2. Bật công tắc **Developer mode** ở góc trên cùng bên phải.
3. Nhấp nút **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `projectExtention`.
4. Nhấp vào biểu tượng tiện ích trên thanh Toolbar:
   - Dán URL Backend từ Bước 1 vào mục **Backend URL**.
   - Nhấp **Kiểm tra kết nối** để xác nhận trạng thái  **Online**.
   - Nhấp **Lưu cấu hình**.

---

## Kiểm Thử (Testing)

Dự án đi kèm bộ kiểm thử tự động toàn diện kiểm tra cú pháp, Manifest V3 và logic thuật toán:

```bash
# 1. Chạy toàn bộ Unit Tests thuật toán tối ưu & token
npm test

# 2. Kiểm tra tính toàn vẹn cú pháp & Manifest V3
node test/syntax_check.js

# 3. Kiểm thử Mock Backend & SHA-256 Hashing
node test/test_backend_mock.js

# 4. Kiểm thử Semantic Expander
node test/test_semantic_expander.js
```

---

## Bảo Mật & Quyền Riêng Tư

-  **Zero Hardcoded Secrets**: Toàn bộ API Key được bảo mật trên Cloudflare Secret Store, không đóng gói vào file extension client.
-  **Shadow DOM Isolation**: Toàn bộ CSS/JS của extension chạy độc lập trong Shadow Root, không can thiệp hay đọc trộm dữ liệu DOM ngoài ô nhập liệu.
-  **Client-Side Cache**: Cache prompt lưu cục bộ tại `chrome.storage.local`, không gửi dữ liệu người dùng về máy chủ thứ ba.

---

## Giấy Phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và tích hợp cho các mục đích cá nhân và thương mại.

---

<div align="center">
  <sub>Xây dựng với và tinh thần mã nguồn mở bởi đội ngũ phát triển.</sub>
</div>
