# BÁO CÁO KỸ THUẬT: TÁI CẤU TRÚC CLEAN ARCHITECTURE VÀ NHẬT KÝ SỬA LỖI
**Dự án:** Prompt Improver (Chrome Extension Manifest V3)  
**Nhánh làm việc:** `refactor/clean-architecture-mv3`  
**Phiên bản:** v2.0.0 (Clean Architecture Standard)  
**Ngày lập báo cáo:** 10/09/2026  

---

## MỤC LỤC
1. [Tổng Quan Bối Cảnh & Mục Tiêu Tái Cấu Trúc](#1-tổng-quan-bối-cảnh--mục-tiêu-tái-cấu-trúc)
2. [Chiến Lược Cách Ly Môi Trường Phát Triển (Git Worktree)](#2-chiến-lược-cách-ly-môi-trường-phát-triển-git-worktree)
3. [Kiến Trúc Chuẩn Hóa Mới (Clean Architecture / MV3)](#3-kiến-trúc-chuẩn-hóa-mới-clean-architecture--mv3)
4. [Cơ Chế Đóng Gói & Tải Tiện Ích Trực Tiếp Từ Gốc (Cách A)](#4-cơ-chế-đóng-gói--tải-tiện-ích-trực-tiếp-từ-gốc-cách-a)
5. [Nhật Ký Sự Cố Phát Sinh & Phân Tích Nguyên Nhân Gốc Rễ (RCA)](#5-nhật-ký-sự-cố-phát-sinh--phân-tích-nguyên-nhân-gốc-rễ-rca)
   * 5.1. [Sự cố 1: Popup vỡ giao diện (Unstyled HTML / Mất CSS & JS)](#51-sự-cố-1-popup-vỡ-giao-diện-unstyled-html--mất-css--js)
   * 5.2. [Sự cố 2: Mất nút "✨ Cải thiện" trên khung chat AI](#52-sự-cố-2-mất-nút--cải-thiện-trên-khung-chat-ai)
6. [Chi Tiết Kỹ Thuật Các Bản Vá (Fix Details)](#6-chi-tiết-kỹ-thuật-các-bản-vá-fix-details)
7. [Báo Cáo Kiểm Thử Tự Động & Xác Minh (Test & Build Verification)](#7-báo-cáo-kiểm-thử-tự-động--xác-minh-test--build-verification)
8. [Hướng Dẫn Vận Hành & Quy Trình Hợp Nhất (Merge Guide)](#8-hướng-dẫn-vận-hành--quy-trình-hợp-nhất-merge-guide)

---

## 1. Tổng Quan Bối Cảnh & Mục Tiêu Tái Cấu Trúc

### 1.1. Hiện trạng phiên bản cũ (v2.0.0 Monolithic Vanilla JS)
Trước khi tái cấu trúc, toàn bộ mã nguồn extension được viết bằng Vanilla JavaScript nguyên khối phân bổ trong thư mục `src/`:
* File `src/content.js` dài gần 900 dòng, kiêm nhiệm toàn bộ logic: DOM query, platform detection, gọi background, tính điểm prompt, quản lý Shadow DOM, modal UI, toast, xử lý sự kiện.
* File `src/background.js` kiêm nhiệm điều phối message, quản lý storage cache, gọi Cloudflare Worker, xử lý retry delay 429, quản lý context menu và alarms.
* Không có TypeScript compile time check: Dễ phát sinh lỗi runtime do thay đổi cấu trúc dữ liệu payload.
* Thiếu tính mô-đun: Khó viết Unit Test độc lập cho các thuật toán phân loại và chấm điểm; khó mở rộng thêm các nền tảng AI Chat mới.

### 1.2. Mục tiêu tái cấu trúc
1. **Tuân thủ Clean Architecture (Hexagonal Architecture):** Tách biệt ranh giới giữa Domain Logic thuần túy với các API trình duyệt phụ thuộc (`chrome.*`).
2. **Type Safety với TypeScript:** Sử dụng hệ thống kiểu Discriminated Unions cho Message Bus và Strict Mode cho toàn bộ mã nguồn.
3. **Hiện đại hóa Tooling:** Tích hợp Vite Multi-Entry Bundler và Vitest cho kiểm thử tự động.
4. **Bảo tồn 100% chức năng:** Giữ nguyên giao diện Warm Neo-Brutalism, toàn bộ hệ thống SVG Lucide icons, 5 Persona strategies, và tích hợp Cloudflare Worker backend.

---

## 2. Chiến Lược Cách Ly Môi Trường Phát Triển (Git Worktree)

### 2.1. Vấn đề của phương pháp chuyển nhánh truyền thống (`git checkout`)
Khi người dùng cài extension vào Chrome thông qua tính năng **Load unpacked**, Chrome sẽ trỏ trực tiếp vào thư mục vật lý trên ổ cứng và đọc file theo thời gian thực (real-time). Nếu thực hiện chuyển nhánh trên cùng một thư mục, Chrome sẽ đọc phải code dở dang, code đang build hoặc các file chưa hoàn thiện, làm gián đoạn việc sử dụng hàng ngày của người dùng.

### 2.2. Giải pháp Git Worktree
Thiết lập 2 thư mục vật lý hoàn toàn độc lập liên kết cùng một git repository:

```
D:\AllProject\
├── projectExtention/          ──> Nhánh `main` (Bản ổn định, Chrome dùng hàng ngày)
└── projectExtention-refactor/ ──> Nhánh `refactor/clean-architecture-mv3` (Nơi phát triển & build)
```

* **Thư mục chính (`projectExtention`):** Luôn giữ commit ổn định nhất của nhánh `main`, working tree clean 100%, không bị ảnh hưởng bởi bất kỳ lệnh build hay refactor nào.
* **Thư mục refactor (`projectExtention-refactor`):** Nhánh `refactor/clean-architecture-mv3`, chứa cấu hình TypeScript, Vite và mã nguồn mới.

---

## 3. Kiến Trúc Chuẩn Hóa Mới (Clean Architecture / MV3)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                              │
│  [Popup UI]        [Options UI]        [Injected Shadow DOM UI]        │
└───────────────┬───────────────────────────────────┬────────────────────┘
                │                                   │
┌───────────────▼───────────────────────────────────▼────────────────────┐
│                    Extension Runtime Layer (MV3)                       │
│  [Service Worker (ESM)]  [Message Router]  [DOM Observer SPA Watcher]  │
└───────────────┬───────────────────────────────────┬────────────────────┘
                │                                   │
┌───────────────▼───────────────────────────────────▼────────────────────┐
│                   Infrastructure Layer (Adapters)                      │
│  [Storage Repositories]   [Worker API Client]   [Platform Adapters]    │
└───────────────┬───────────────────────────────────┬────────────────────┘
                │                                   │
┌───────────────▼───────────────────────────────────▼────────────────────┐
│                       Pure Domain Layer (Core)                         │
│  [Entities & Models]    [Scoring Engine]    [Classification Use Cases] │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Chi tiết các tầng trong `src/`

1. **`src/core/` (Domain Layer - 100% Pure TypeScript):**
   * Hoàn toàn độc lập với Chrome API và DOM. Có thể chạy trên mọi runtime (Node.js, Browser, Web Worker).
   * `models/`: `prompt.entity.ts`, `score.entity.ts`, `persona.entity.ts`, `task-type.entity.ts`.
   * `use-cases/`: `classify-task.use-case.ts`, `score-prompt.use-case.ts`, `apply-persona.use-case.ts`, `expand-semantic.use-case.ts`.
2. **`src/infrastructure/` (Data & External Layer):**
   * `storage/`: `base-storage.ts` (Chrome Storage wrapper), `settings.repository.ts`, `cache.repository.ts` (SHA-256 LRU cache với auto-eviction), `history.repository.ts`, `vault.repository.ts` (mã hóa Web Crypto AES-GCM).
   * `api/`: `worker-client.ts` (gọi Cloudflare Worker với exponential backoff và bảo vệ quota 429), `ping-client.ts`.
   * `messaging/`: `message-client.ts` (type-safe message client).
3. **`src/background/` (Service Worker Coordinator):**
   * Đóng vai trò stateless event coordinator theo đúng chuẩn MV3.
   * `message-router.ts`: Xử lý message tập trung, ánh xạ Discriminated Unions sang Use Cases, chuẩn hóa mã lỗi `ExtensionError`.
   * `handlers/`: `lifecycle.handler.ts`, `context-menu.handler.ts`, `alarms.handler.ts`.
4. **`src/content/` (Content Script & Shadow DOM):**
   * `platforms/`: Platform Adapter Pattern (`chatgpt.adapter.ts`, `claude.adapter.ts`, `gemini.adapter.ts`, `deepseek.adapter.ts`, `copilot.adapter.ts`, `generic.adapter.ts`).
   * `dom-observer.ts`: Lắng nghe thay đổi DOM SPA routing (MutationObserver kết hợp polling fallback) và thực thi thuật toán chèn nút.
   * `ui-mount.ts`: Quản lý Shadow DOM hosts, tự động inject isolated CSS và SVG sprite.
   * `components/`: `toolbar-button.ts`, `improve-modal.ts`, `undo-toast.ts`.
5. **`src/ui/` (Standalone Pages):**
   * `popup/`: `index.html`, `main.ts`, `popup.css`.
   * `options/`: `index.html`, `main.ts`, `options.css`.
6. **`src/shared/` (Contracts & Utilities):**
   * `types/messages.ts`, `types/settings.ts`, `errors/extension-error.ts`.
   * `utils/`: `crypto.ts`, `token-counter.ts`, `entity-extractor.ts`, `domain-matcher.ts`, `svg-icons.ts`.

---

## 4. Cơ Chế Đóng Gói & Tải Tiện Ích Trực Tiếp Từ Gốc (Cách A)

### 4.1. Bài toán tiện dụng cho người dùng
Theo quy trình build Vite thông thường, toàn bộ file đầu ra nằm trong thư mục con `dist/`. Nếu yêu cầu người dùng mở Chrome và chọn thư mục `dist/` thay vì thư mục gốc dự án, người dùng sẽ phải thao tác phức tạp hơn và dễ chọn nhầm thư mục.

### 4.2. Giải pháp Cách A (Direct Root Unpacked Loading)
Để người dùng chỉ cần chọn thẳng thư mục gốc `projectExtention-refactor` trong Chrome, cấu trúc `manifest.json` tại thư mục gốc được thiết kế trỏ trực tiếp vào các bundle đã build:

```json
{
  "manifest_version": 3,
  "action": {
    "default_popup": "dist/popup.html"
  },
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://chatgpt.com/*", "*://claude.ai/*", "*://gemini.google.com/*", "*://chat.deepseek.com/*", "*://copilot.microsoft.com/*", "<all_urls>"],
      "js": ["dist/content.js"],
      "run_at": "document_idle"
    }
  ],
  "options_ui": {
    "page": "dist/options.html",
    "open_in_tab": true
  }
}
```

### 4.3. Script đóng gói tự động (`scripts/build.js`)
Build script thực hiện 3 công đoạn chuyên biệt:
1. **Đóng gói UI Pages:** Build `popup` và `options` với cờ `base: './'`, tự động sinh bản tương đối tại `dist/popup.html` và `dist/options.html`.
2. **Đóng gói Service Worker (ESM):** Tạo file `dist/background.js` hỗ trợ đầy đủ bởi Chrome MV3 module worker.
3. **Đóng gói Content Script (IIFE Self-Contained):** Đóng gói toàn bộ dependency vào một file duy nhất `dist/content.js` định dạng IIFE, triệt tiêu hoàn toàn lệnh `import` ngoài (vượt qua rào cản cấm ES Module trong Content Script của Chrome MV3).

---

## 5. Nhật Ký Sự Cố Phát Sinh & Phân Tích Nguyên Nhân Gốc Rễ (RCA)

Trong quá trình người dùng nạp thử nghiệm tiện ích vào Chrome, đã phát sinh 2 sự cố nghiêm trọng được ghi nhận qua ảnh chụp màn hình:

### 5.1. Sự cố 1: Popup vỡ giao diện (Unstyled HTML / Mất CSS & JS)

#### Triệu chứng thực tế (Ảnh 1):
Cửa sổ Popup khi bấm mở trên thanh tiện ích Chrome hiển thị dạng HTML thô không có style: font chữ mặc định Times New Roman, chiều rộng bị co rúm (~180px), các nút bấm hiển thị dạng nút xám mặc định của Windows, trạng thái hiển thị "Chưa kiểm tra" và không có phản hồi khi bấm nút.

#### Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Lỗi đường dẫn tuyệt đối của Vite:** Trong file `scripts/build.js`, tác vụ build UI không chỉ định tham số `base`. Vite sử dụng giá trị mặc định `base: '/'`. Do đó, file HTML xuất ra chứa:
   ```html
   <link rel="stylesheet" href="/assets/popup-xxxx.css">
   <script type="module" src="/assets/popup-xxxx.js"></script>
   ```
   Khi tiện ích được nạp từ thư mục gốc, Chrome hiểu đường dẫn `/assets/...` là đường dẫn tuyệt đối từ gốc tiện ích (`chrome-extension://<id>/assets/...`). Tuy nhiên, Vite lại xuất file bundle vào `dist/assets/`. Kết quả: Trình duyệt nhận mã lỗi **HTTP 404 Not Found** cho cả file CSS và file JavaScript.
2. **Lỗi lệch tầng đường dẫn font WOFF2:** Trong file `src/ui/popup/popup.css` và `src/ui/options/options.css`, đường dẫn `@font-face` được khai báo là `url('../../assets/fonts/...')`. Vì file CSS nằm ở tầng `src/ui/popup/` (3 cấp so với root), `../../` chỉ trỏ tới `src/assets/` (không tồn tại), khiến Vite đưa ra cảnh báo không thể giải quyết font tại thời điểm build.

---

### 5.2. Sự cố 2: Mất nút "✨ Cải thiện" trên khung chat AI

#### Triệu chứng thực tế (Ảnh 2):
Khi mở giao diện web chat (ChatGPT, Claude, hoặc các giao diện có khung nhập liệu *"Write a message..."*), nút "✨ Cải thiện" hoàn toàn không xuất hiện cạnh nút `+` hoặc bên trong khung soạn thảo.

#### Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Tiến trình khởi tạo bị nghẽn (Blocking Bootstrap):**
   Trong file `src/content/index.ts`, hàm `bootstrap()` có đoạn mã:
   ```typescript
   // Mã lỗi ban đầu
   const res = await MessageClient.send<CheckSiteResult>({
     type: 'SITE:CHECK_ENABLED',
     payload: { hostname },
   });
   if (res && res.enabled === false) return;
   ```
   Lệnh `await` này đồng bộ hóa việc khởi chạy với Background Service Worker. Trong Chrome MV3, khi một tab được tải hoặc khi tiện ích vừa nạp, Service Worker có thể đang ở trạng thái ngủ (idle) hoặc đang trong tiến trình đăng ký ban đầu. Nếu Service Worker chưa kịp kích hoạt listener, Promise của `MessageClient.send` sẽ bị hoãn (hang). Toàn bộ hàm `bootstrap()` bị dừng lại ngay tại dòng kiểm tra này, dẫn tới `DOMObserver` không bao giờ được khởi động.
2. **Thuật toán tìm điểm neo (Anchor) bị lỗi thời & thiếu tính dự phòng:**
   * Trong `chatgpt.adapter.ts` và `claude.adapter.ts`, hàm `findToolbarAnchor` chỉ kiểm tra các selector cũ (`button[aria-label*="attach" i]`). Giao diện mới của ChatGPT đã đổi nút `+` sang `data-testid="composer-plus-button"` hoặc `aria-label="Add content or tools"`. Claude.ai sử dụng `data-testid="chat-input-attach"`.
   * Khi khung chat còn trống (chưa có chữ), các nền tảng chat AI thường ẩn nút Send hoặc gắn thuộc tính `disabled`. Hàm kiểm tra hiển thị `isElementVisible(sendBtn)` trả về `false`.
   * Khi cả nút Attach và nút Send đều không thỏa mãn, hàm `findToolbarAnchor` trả về thẻ `<form>` hoặc `inputEl.parentElement`. Sau đó, `dom-observer.ts` gọi lệnh:
     ```typescript
     anchorEl.parentElement.insertBefore(btnHost, anchorEl.nextElementSibling);
     ```
     Lệnh này vô tình chèn nút `btnHost` ra **bên ngoài** toàn bộ thẻ `<form>`, nằm dưới đáy trang hoặc bị thuộc tính `overflow: hidden` của container cha cắt bỏ hoàn toàn khỏi tầm nhìn.

---

## 6. Chi Tiết Kỹ Thuật Các Bản Vá (Fix Details)

### 6.1. Khắc phục triệt để lỗi tài nguyên Popup (Vite Base & Relative Paths)
1. **Cấu hình `base: './'` trong build script:**
   Đảm bảo tất cả các asset được tham chiếu dưới dạng tương đối:
   ```javascript
   // scripts/build.js
   await build({
     root: ROOT,
     base: './',
     // ...
   });
   ```
2. **Tự động sinh `dist/popup.html` và `dist/options.html`:**
   Script tự động tạo bản HTML ở ngay thư mục `dist/` với các đường dẫn `./assets/...`, đồng thời sửa đường dẫn trong `manifest.json` trỏ thẳng tới `dist/popup.html` và `dist/options.html`:
   ```html
   <!-- dist/popup.html -->
   <script type="module" crossorigin src="./assets/popup-BM0x_Urk.js"></script>
   <link rel="stylesheet" crossorigin href="./assets/popup-BaL_XPPd.css">
   ```
3. **Chuẩn hóa đường dẫn font trong CSS:**
   Cập nhật các đường dẫn `@font-face` trong `popup.css` và `options.css` thành `../../../assets/fonts/...`. Vite tự động biên dịch, băm mã hóa và nhúng toàn bộ font WOFF2 vào bundle (0 warning).

---

### 6.2. Khởi chạy Content Script không chặn (Non-Blocking Bootstrap)
Loại bỏ hoàn toàn việc chờ đợi Service Worker trước khi gắn giao diện. `DOMObserver` được kích hoạt ngay tức thì:

```typescript
// src/content/index.ts
// 1. Khởi tạo Platform Adapter và DOM Observer ngay lập tức (không chặn)
const adapter = resolvePlatformAdapter(hostname);
const observer = new DOMObserver({
  adapter,
  onButtonClick: (inputEl) => { /* ... */ },
});

observer.start();

// 2. Kiểm tra cài đặt bất đồng bộ trong nền — nếu người dùng tắt domain này thì dừng
MessageClient.send<CheckSiteResult>({
  type: 'SITE:CHECK_ENABLED',
  payload: { hostname },
}).then((res) => {
  if (res && res.enabled === false) {
    observer.stop();
    const btn = document.getElementById('pi-btn-host');
    if (btn) btn.remove();
    console.log('[Prompt Improver] Extension đã bị tắt trên trang:', hostname);
  }
}).catch(() => {
  // Background chưa sẵn sàng, giữ nguyên trạng thái hoạt động bình thường
});
```

---

### 6.3. Khôi phục Thuật toán Chèn 4 Tầng Toàn Năng (4-Tier Injection)
Trong `src/content/dom-observer.ts`, thuật toán chèn nút được thiết kế lại với 4 tầng bảo vệ lũy tiến, đảm bảo nút luôn xuất hiện trên mọi giao diện:

```typescript
// src/content/dom-observer.ts
scanAndInject(): void {
  const inputEl = this.adapter.findChatInput();
  if (!inputEl) return;

  this.activeInput = inputEl;

  // Nếu nút đã tồn tại và còn trong DOM thì không chèn thêm
  const existing = document.getElementById('pi-btn-host');
  if (existing && document.body.contains(existing)) return;

  const btnHost = createToolbarButton(() => {
    if (this.activeInput) this.onButtonClick(this.activeInput);
  });

  // TẦNG 1: Anchor tùy biến từ Adapter (nếu hợp lệ)
  const customAnchor = this.adapter.findToolbarAnchor(inputEl);
  if (customAnchor && isElementVisible(customAnchor)) {
    if (customAnchor.nextElementSibling) {
      customAnchor.parentElement?.insertBefore(btnHost, customAnchor.nextElementSibling);
      return;
    } else if (customAnchor.parentElement) {
      customAnchor.parentElement.appendChild(btnHost);
      return;
    }
  }

  // TẦNG 2: Tìm nút Đính kèm / Plus (+)
  for (const sel of ATTACH_BTN_SELECTORS) {
    const attachBtn = document.querySelector<HTMLElement>(sel);
    if (attachBtn && isElementVisible(attachBtn)) {
      const attachGroup = attachBtn.closest('div.relative.shrink-0') ||
                          attachBtn.closest('div.flex') ||
                          attachBtn.parentElement;
      if (attachGroup && attachGroup.parentElement) {
        const nextSlot = attachGroup.nextElementSibling;
        if (nextSlot && (nextSlot.classList.contains('flex-row') || nextSlot.classList.contains('flex'))) {
          nextSlot.appendChild(btnHost);
        } else {
          attachGroup.parentElement.insertBefore(btnHost, attachGroup.nextSibling);
        }
        return;
      }
    }
  }

  // TẦNG 3: Tìm nút Gửi (Send Button)
  for (const sel of SEND_BTN_SELECTORS) {
    const sendBtn = document.querySelector<HTMLElement>(sel);
    if (sendBtn && isElementVisible(sendBtn)) {
      const sendGroup = sendBtn.closest('div.flex') || sendBtn.parentElement;
      if (sendGroup && sendGroup.parentElement) {
        sendGroup.parentElement.insertBefore(btnHost, sendGroup);
        return;
      }
    }
  }

  // TẦNG 4: Tìm Toolbar Flex Container bên trong Form / Composer Wrapper
  const composerContainer = inputEl.closest('form') ||
                           inputEl.closest('div[class*="composer"]') ||
                           inputEl.closest('div[class*="rounded-"]') ||
                           inputEl.parentElement;

  if (composerContainer) {
    const toolbar = composerContainer.querySelector<HTMLElement>('div[class*="flex"][class*="items-center"]') ||
                    composerContainer.querySelector<HTMLElement>('div.flex') ||
                    composerContainer;
    toolbar.appendChild(btnHost);
  }
}
```

---

### 6.4. Bổ sung Bộ Selectors Hiện Đại Cho Toàn Bộ Nền Tảng AI

1. **Nút Đính kèm / Plus (`ATTACH_BTN_SELECTORS`):**
   * ChatGPT Modern: `button[data-testid="composer-plus-button"]`, `button[data-testid="attachment-button"]`, `button[aria-label*="Add content" i]`
   * Claude.ai: `button[data-testid="chat-input-attach"]`, `button[aria-label*="attach" i]`
   * Gemini: `button[aria-label*="Upload" i]`, `button[aria-label*="Thêm hình ảnh" i]`
   * Generic & VN: `button[aria-label*="Đính kèm" i]`, `button[aria-label*="Tải tệp" i]`, `button[aria-label*="Thêm" i]`, `button[data-testid*="attach"]`, `button[aria-haspopup="menu"]`
2. **Khung Nhập Liệu (`findChatInput`):**
   * ChatGPT: `#prompt-textarea`, `div#prompt-textarea`, `textarea#prompt-textarea`, `div[contenteditable="true"][data-placeholder]`, `textarea[placeholder*="message" i]`.
   * Claude: `div[contenteditable="true"][data-testid="chat-input"]`, `div.ProseMirror`, `div.tiptap.ProseMirror`.
   * Generic Web Chat: `textarea[placeholder*="message" i]`, `textarea[placeholder*="ask" i]`, `div[contenteditable="true"][role="textbox"]` (khớp hoàn hảo khung *"Write a message..."*).

---

## 7. Báo Cáo Kiểm Thử Tự Động & Xác Minh (Test & Build Verification)

Toàn bộ các bộ kiểm thử đã được chạy và xác nhận đạt **100% tỷ lệ vượt qua**:

```
========================================================================
                          KẾT QUẢ KIỂM THỬ
========================================================================
1. TypeScript Strict Type-Check (tsc --noEmit)
   Kết quả: 0 Errors (Không có bất kỳ cảnh báo hoặc lỗi kiểu dữ liệu ngầm định nào).

2. Vitest Core Domain Unit Tests (npm run test:unit)
   Kết quả: 1 test file passed, 20/20 unit tests passed (100%).
   - ClassifyTaskUseCase: 5/5 cases passed (code, writing, analysis, translation, general).
   - ScorePromptUseCase: 3/3 cases passed.
   - ApplyPersonaUseCase: 4/4 cases passed.
   - ExpandSemanticUseCase: 3/3 cases passed.
   - Pure Crypto & Token Counter: 5/5 cases passed.

3. Legacy Compatibility & Syntax Tests (npm run test:legacy)
   Kết quả: 45/45 checks passed (100%).
   - Cú pháp toàn bộ 13 file JS/TS: Hợp lệ.
   - Xác thực Manifest V3 cấu hình: Đạt 14/14 tiêu chí.
   - Các hàm nòng cốt (detectTaskType, hashPrompt, v.v.): Đầy đủ.

4. Production Build (npm run build)
   - Đóng gói UI: dist/popup.html, dist/options.html, dist/assets/*.css, dist/assets/*.js.
   - Đóng gói Background: dist/background.js (17.8 KB, ESM format).
   - Đóng gói Content Script: dist/content.js (34.0 KB, IIFE format, 0 external imports).
   - Đồng bộ font WOFF2, CSS và Manifest: Hoàn tất không cảnh báo.
========================================================================
```

---

## 8. Hướng Dẫn Vận Hành & Quy Trình Hợp Nhất (Merge Guide)

### 8.1. Kiểm thử thủ công trên Chrome
1. Mở Chrome và truy cập: `chrome://extensions/`
2. Bật chế độ **Developer mode** ở góc trên cùng bên phải.
3. Tìm tiện ích **Prompt Improver** (đang trỏ vào `projectExtention-refactor`):
   * Bấm vào biểu tượng **Reload (mũi tên xoay tròn 🔄)** để nạp mã nguồn và bundle mới nhất.
4. **Kiểm tra Popup:**
   * Bấm vào biểu tượng extension trên thanh công cụ trình duyệt.
   * Giao diện Warm Neo-Brutalism sẽ hiển thị đầy đủ viền espresso, font Space Grotesk, màu nền kem và các nút chức năng hoạt động chính xác.
5. **Kiểm tra nút trên trang chat:**
   * Mở hoặc F5 lại tab chat (ChatGPT, Claude, hoặc trang có placeholder *"Write a message..."*).
   * Nút **✨ Cải thiện** sẽ xuất hiện ngay cạnh nút đính kèm `+` hoặc trong thanh công cụ chat.
   * Nhập thử prompt và bấm nút để kiểm tra Modal xem trước và Dashboard điểm.

### 8.2. Lệnh hợp nhất vào nhánh `main` (Khi đã nghiệm thu)
Khi bạn đã hoàn toàn hài lòng với phiên bản tái cấu trúc trên nhánh `refactor/clean-architecture-mv3`, chỉ cần mở terminal tại thư mục chính và thực hiện hợp nhất:

```powershell
# 1. Chuyển về thư mục chính
cd D:\AllProject\projectExtention

# 2. Hợp nhất nhánh refactor vào main
git merge refactor/clean-architecture-mv3

# 3. Đẩy lên remote repository (nếu có)
git push origin main

# 4. Dọn dẹp worktree sau khi hoàn tất
git worktree remove ../projectExtention-refactor
```
