# Prompt Improver Backend (Cloudflare Worker)

Backend serverless chạy trên **Cloudflare Workers**, có nhiệm vụ:
-  **Bảo mật API Key**: Giấu Google Gemini API Key qua Worker Secret (`GEMINI_API_KEY`), không lộ trong client/extension.
-  **Phân loại tác vụ**: Tự động phát hiện loại tác vụ (`code`, `writing`, `analysis`, `translation`, `general`) để điều chỉnh meta-prompt tối ưu nhất.
-  **Gọi Gemini API**: Sử dụng model `gemini-2.5-flash-lite` (hoặc fallback `gemini-2.0-flash`, `gemini-1.5-flash`) trả về chuẩn JSON với 2 phiên bản (Tối giản & Chi tiết) và các Giả định (Assumptions).
-  **Hỗ trợ CORS**: Đầy đủ headers cho phép Chrome Extension gọi trực tiếp an toàn.

---

## Hướng dẫn Deploy lên Cloudflare

### Bước 1: Lấy Gemini API Key (Miễn phí)
1. Truy cập [Google AI Studio API Keys](https://aistudio.google.com/apikey).
2. Đăng nhập tài khoản Google và bấm **Create API key**.
3. Copy API key (dạng `AIzaSy...`).

---

### Bước 2: Cài đặt Wrangler CLI & Đăng nhập
Nếu bạn chưa cài Wrangler, mở Terminal và chạy:
```bash
npm install -g wrangler
wrangler login
```
*(Trình duyệt sẽ mở ra để bạn xác thực tài khoản Cloudflare miễn phí).*

---

### Bước 3: Deploy Worker
Mở Terminal trong thư mục backend này và chạy:
```bash
cd prompt-improver-backend
wrangler deploy
```

Sau khi deploy thành công, Wrangler sẽ in ra URL worker của bạn, ví dụ:
```
https://prompt-improver-backend.<your-subdomain>.workers.dev
```

---

### Bước 4: Thiết lập API Key làm Secret
>  **LƯU Ý QUAN TRỌNG:** KHÔNG ghi API key vào code hoặc `wrangler.toml`. Hãy dùng lệnh secret:

```bash
wrangler secret put GEMINI_API_KEY
```
Khi terminal hỏi `Enter a secret value:`, hãy dán Gemini API Key bạn đã lấy ở Bước 1 và nhấn **Enter**.

---

### Bước 5: Kiểm tra hoạt động (Test Curl)

#### 1. Kiểm tra Health Check:
```bash
curl https://prompt-improver-backend.<your-subdomain>.workers.dev
```
Kết quả trả về:
```json
{
  "status": "online",
  "service": "Prompt Improver Backend (Cloudflare Worker)",
  "hasApiKey": true,
  "version": "1.2.0"
}
```

#### 2. Thử nghiệm Cải thiện Prompt:
```bash
curl -X POST https://prompt-improver-backend.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"prompt": "viết bài về cà phê espresso"}'
```

Kết quả mẫu:
```json
{
  "success": true,
  "original": "viết bài về cà phê espresso",
  "minimal": "Viết bài giới thiệu súc tích về cà phê espresso: lịch sử, phương pháp pha chuẩn, hương vị đặc trưng.",
  "detailed": "Bạn là chuyên gia ẩm thực và barista chuyên nghiệp. Hãy viết một bài viết toàn diện về cà phê espresso...",
  "assumptions": [
    "Bài viết hướng đến người đọc phổ thông yêu thích cà phê",
    "Độ dài khoảng 500-800 từ"
  ],
  "taskType": "writing",
  "modelUsed": "gemini-2.5-flash-lite"
}
```

---

## Cấu hình vào Chrome Extension

1. Mở icon Extension trên trình duyệt Chrome.
2. Tại tab **Cài đặt**, dán URL Worker của bạn vào ô **Backend URL** (VD: `https://prompt-improver-backend.xxx.workers.dev`).
3. Bấm **Kiểm tra kết nối** rồi bấm **Lưu cấu hình**.
