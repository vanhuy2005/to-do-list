# Quy Trình Deploy Production: Render + Mắt Bão + Cloudflare + Resend

Tài liệu này hướng dẫn chi tiết từng bước thiết lập môi trường Production hoàn chỉnh cho dự án Tasket sử dụng tên miền `tasket.io.vn`, lưu trữ trên **Render**, cấu hình DNS qua **Cloudflare**, và gửi email giao dịch qua **Resend**.

---

## 1. Tổng quan hệ thống

Hệ thống được thiết kế dưới dạng Monolith (React frontend SPA + Express backend + MongoDB Atlas), triển khai trên hạ tầng đám mây với luồng vận hành như sau:

### Sơ đồ luồng ứng dụng (Traffic Flow)
```
User ──> https://tasket.io.vn ──> Cloudflare DNS (SSL/Proxy off) ──> Render Web Service ──> Express API + React SPA
```

### Sơ đồ luồng gửi Email (Email Flow)
```
Tasket App (Render) ──> Resend API (Tokyo Region) ──> notifications@tasket.io.vn ──> Hộp thư của User
```

- **Tên miền mua tại**: Mắt Bão (`tasket.io.vn`).
- **Quản lý phân giải tên miền (DNS)**: Cloudflare (Free Plan).
- **Hạ tầng Deploy**: Web Service trên Render (kết nối trực tiếp từ nhánh `main` / `production`).
- **Hạ tầng Email**: Resend (Domain `tasket.io.vn` đã được verify DKIM/SPF đầy đủ).

---

## 2. Thiết lập Custom Domain trên Render

Để chạy ứng dụng Tasket bằng tên miền riêng thay vì subdomain mặc định của Render (`tasket-81tv.onrender.com`), thực hiện cấu hình như sau:

1. Truy cập trang quản trị **Render Dashboard**.
2. Chọn **Web Service** của Tasket -> **Settings** -> cuộn xuống mục **Custom Domains**.
3. Nhấp **Add Custom Domain** và thêm lần lượt hai bản ghi tên miền:
   - `tasket.io.vn` (Root domain)
   - `www.tasket.io.vn` (Subdomain)
4. Render sẽ cung cấp các thông tin DNS cần cấu hình:
   - **IP Address** cho root domain (`@` hoặc `tasket.io.vn`): `216.24.57.1`
   - **CNAME Target** cho `www`: `tasket-81tv.onrender.com`
5. Sau khi cập nhật cấu hình DNS trên Cloudflare (xem Mục 4), quay lại Render để kiểm tra trạng thái **Verified** và đảm bảo chứng chỉ SSL **Certificate Issued** thành công.

---

## 3. Chuyển đổi Name Server từ Mắt Bão sang Cloudflare

Để tối ưu hóa tốc độ DNS và bảo mật, toàn bộ quyền quản trị bản ghi DNS của `tasket.io.vn` được chuyển giao từ Mắt Bão sang Cloudflare.

1. Đăng ký/Đăng nhập tài khoản **Cloudflare**, chọn **Add a site** -> nhập `tasket.io.vn` -> chọn gói **Free**.
2. Cloudflare sẽ quét các bản ghi hiện tại và cung cấp 02 cặp Name Server tùy chỉnh:
   - `ariadne.ns.cloudflare.com`
   - `jack.ns.cloudflare.com`
3. Đăng nhập trang quản trị dịch vụ của **Mắt Bão** (`id.matbao.net`).
4. Đi tới mục **Quản trị tên miền** -> Chọn tên miền `tasket.io.vn` -> Vào tab **Name Server**.
5. Nhấp chọn nút **Sử dụng Name Server tùy chỉnh** và nhập thông tin Name Server từ Cloudflare cấp:
   - **Name Server 1**: `ariadne.ns.cloudflare.com` (IP tương ứng: `173.245.58.225`)
   - **Name Server 2**: `jack.ns.cloudflare.com` (IP tương ứng: `108.162.193.121`)
6. Nhấp lưu cấu hình và chờ đợi quá trình cập nhật Name Server (có thể mất từ 1 giờ tới 24 giờ để có hiệu lực hoàn toàn).

> [!NOTE]
> Nếu hệ thống Mắt Bão gặp lỗi không thể lưu cấu hình Name Server tùy chỉnh qua giao diện web, hãy liên hệ trực tiếp với đội ngũ Kỹ thuật/Support của Mắt Bão để được cập nhật thủ công trên hệ thống.

---

## 4. Cấu hình Bản ghi DNS trên Cloudflare

Sau khi Cloudflare xác nhận trạng thái **Active** cho domain `tasket.io.vn`, toàn bộ bản ghi cũ tại Mắt Bão sẽ không còn hiệu lực. Hãy xóa các cấu hình cũ và tạo chính xác các bản ghi sau trên trang quản trị DNS của Cloudflare:

### Bảng cấu hình DNS Records

| Type | Name | Content (Giá trị bản ghi) | Proxy status | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `216.24.57.1` | **DNS only** (Xám) | Auto |
| **CNAME** | `www` | `tasket-81tv.onrender.com` | **DNS only** (Xám) | Auto |
| **TXT** | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...` *(Giá trị DKIM lấy từ Resend)* | **DNS only** (Xám) | Auto |
| **MX** | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` (Priority: `10`) | **DNS only** (Xám) | Auto |
| **TXT** | `send` | `v=spf1 include:amazonses.com ~all` | **DNS only** (Xám) | Auto |
| **TXT** | `_dmarc` | `v=DMARC1; p=none;` | **DNS only** (Xám) | Auto |

> [!IMPORTANT]
> - Bản ghi DKIM (`resend._domainkey`) bắt buộc phải là loại **TXT**, tuyệt đối không được tạo nhầm thành bản ghi loại **A**.
> - Không bật Proxy đám mây màu cam (bắt buộc chọn **DNS only**) cho tất cả các bản ghi tên miền phụ gửi mail (`send`, `resend._domainkey`, `_dmarc`) và các bản ghi trỏ về Render để tránh lỗi SSL handshake của Render.
> - Phải copy toàn bộ chuỗi giá trị DKIM dài từ dashboard của Resend, không copy phần bị hiển thị rút gọn (`...`).

---

## 5. Cấu hình Tên miền gửi Email trên Resend

Để gửi email với tên miền thương hiệu riêng (`notifications@tasket.io.vn`) thay vì email thử nghiệm mặc định, thực hiện cấu hình như sau:

1. Đăng nhập vào trang quản trị **Resend Dashboard**.
2. Đi tới mục **Domains** -> Chọn **Add Domain**.
3. Nhập thông tin cấu hình:
   - **Domain**: `tasket.io.vn`
   - **Region**: **Tokyo (ap-northeast-1)** (để giảm độ trễ tối đa khi gửi từ máy chủ châu Á).
   - **Return-Path**: Nhập `send`.
4. Resend sẽ hiển thị danh sách các DNS record cần thiết (DKIM, SPF, MX, DMARC).
5. Copy các giá trị này và cấu hình chính xác sang Cloudflare (như bảng tại Mục 4).
6. Nhấp nút **Verify DNS Records** trên Resend dashboard.
7. Khi trạng thái chuyển sang **Verified** (như ảnh chụp hệ thống thực tế), ứng dụng đã sẵn sàng gửi email production.
8. Cập nhật biến môi trường Production của backend:
   ```env
   EMAIL_FROM=Tasket <notifications@tasket.io.vn>
   ```

> [!CAUTION]
> Tuyệt đối không sử dụng email mặc định `EMAIL_FROM=Tasket <onboarding@resend.dev>` trên môi trường Production. Hệ thống backend đã tích hợp mã kiểm tra nghiêm ngặt, sẽ tự động chặn khởi động (crash) nếu phát hiện sử dụng email onboarding ở production.

---

## 6. Biến Môi trường Production (Environment Variables)

Dưới đây là danh sách toàn bộ các biến môi trường bắt buộc cấu hình trên Render Web Service (Settings -> Environment Variables). 

> [!WARNING]
> Bản mẫu dưới đây đã được lược bỏ các thông tin nhạy cảm. Khi điền thực tế trên Render, hãy thay thế bằng các khóa API và chuỗi bảo mật thật của bạn.

```env
# ─── Môi trường ─────────────────────────────────────────────────────────────
NODE_ENV=production
NODE_VERSION=22
NPM_CONFIG_PRODUCTION=false

# ─── URL Cấu hình ────────────────────────────────────────────────────────────
APP_URL=https://tasket.io.vn
VITE_API_URL=/api/v1
CORS_ORIGIN=https://tasket.io.vn,https://www.tasket.io.vn,https://tasket-81tv.onrender.com

# ─── Better Auth (OAuth & Session) ───────────────────────────────────────────
BETTER_AUTH_URL=https://tasket.io.vn
BETTER_AUTH_TRUSTED_ORIGINS=https://tasket.io.vn,https://www.tasket.io.vn,https://tasket-81tv.onrender.com
BETTER_AUTH_SECRET=<STRONG_RANDOM_BETTER_AUTH_SECRET_MIN_32_CHARS>

# ─── Database ────────────────────────────────────────────────────────────────
MONGODB_CONNECTIONSTRING=<MONGODB_CONNECTION_STRING_ATLAS>

# ─── JWT Legacy ──────────────────────────────────────────────────────────────
JWT_SECRET=<STRONG_RANDOM_JWT_SECRET_MIN_32_CHARS>
JWT_REFRESH_SECRET=<STRONG_RANDOM_JWT_REFRESH_SECRET_MIN_32_CHARS>
JWT_EXPIRY=2d
REFRESH_TOKEN_EXPIRY=7d

# ─── Google OAuth ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID_PRODUCTION>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET_PRODUCTION>

# ─── Resend Email Service ────────────────────────────────────────────────────
RESEND_API_KEY=<PRODUCTION_RESEND_API_KEY>
EMAIL_FROM="Tasket <notifications@tasket.io.vn>"
EMAIL_DEV_REDIRECT_TO_ADMIN=false
ADMIN_EMAIL=nguyen.van.quang.huy.2105@gmail.com

# ─── Cloudinary (Upload ảnh đại diện) ─────────────────────────────────────────
CLOUD_NAME=ddnauyhho
CLOUDINARY_API_KEY=<CLOUDINARY_API_KEY>
CLOUDINARY_API_SECRET=<CLOUDINARY_API_SECRET>

# ─── Realtime PubSub ──────────────────────────────────────────────────────────
ABLY_API_KEY=<PRODUCTION_ABLY_API_KEY>

# ─── Voice Task AI Integration ────────────────────────────────────────────────
AI_PROVIDER=auto
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_API_KEY=<OPENROUTER_API_KEY_PRODUCTION>
GEMINI_API_KEY=<GEMINI_API_KEYS_PRODUCTION_COMMA_SEPARATED>
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=<GROQ_API_KEYS_PRODUCTION>
```

---

## 7. Cấu hình Google OAuth Credentials

Để người dùng có thể đăng nhập bằng tài khoản Google trên trang web Production, cần cập nhật cấu hình OAuth Client ID tại **Google Cloud Console** (`console.cloud.google.com`):

### 1. Authorized JavaScript origins (Nguồn JavaScript được ủy quyền)
Thêm đầy đủ các địa chỉ URL sau:
- `https://tasket.io.vn`
- `https://www.tasket.io.vn`
- `http://localhost:5173` *(Hỗ trợ debug dưới local)*
- `http://localhost:5001` *(Hỗ trợ debug dưới local)*

### 2. Authorized redirect URIs (URI chuyển hướng được ủy quyền)
Cung cấp chính xác đường dẫn callback của Better Auth:
- `https://tasket.io.vn/api/v1/auth/core/callback/google`
- `https://www.tasket.io.vn/api/v1/auth/core/callback/google`
- `http://localhost:5001/api/v1/auth/core/callback/google` *(Hỗ trợ callback dưới local)*

---

## 8. Checklist Xác Minh Sau Khi Deploy (Post-Deployment Checklist)

Sau khi hệ thống Render cập nhật build thành công, hãy thực hiện kiểm tra thủ công toàn bộ các đầu việc sau để đảm bảo hệ thống vận hành hoàn hảo:

- [ ] **Truy cập web**: Địa chỉ `https://tasket.io.vn` mở bình thường, giao diện tải nhanh, không lỗi 5xx.
- [ ] **Redirect WWW**: `https://www.tasket.io.vn` mở được bình thường hoặc tự động chuyển hướng chính xác về root domain.
- [ ] **Render Custom Domain**: Trạng thái tên miền hiển thị `Verified` và chứng chỉ SSL `Certificate Issued`.
- [ ] **Cloudflare Active**: Trạng thái domain trên Cloudflare hiển thị `Active` (màu xanh lá).
- [ ] **Resend Domain**: Tên miền `tasket.io.vn` hiển thị trạng thái `Verified` trên Resend Dashboard.
- [ ] **Cấu hình Email**: Đảm bảo biến `EMAIL_FROM` đã được cấu hình thành `Tasket <notifications@tasket.io.vn>`.
- [ ] **Đăng nhập Google**: Thử nghiệm đăng nhập thành công bằng tài khoản Google OAuth ở Production.
- [ ] **Đăng nhập Email/Password**: Tạo tài khoản mới bằng Email/Password truyền thống và đăng nhập thành công.
- [ ] **Nhận Email Overdue**: Tạo một Task và chỉnh thời gian quá hạn, xác nhận email cảnh báo tự động được gửi thành công đến địa chỉ Gmail cá nhân của user (không phải mail admin).
- [ ] **Resend Logs**: Truy cập Resend Dashboard -> mục **Logs**, kiểm tra trạng thái các email gửi đi hiển thị `Sent` hoặc `Delivered` thành công đến đúng địa chỉ email của người nhận.
- [ ] **Tách biệt Admin Email**: Đảm bảo không còn hiện tượng chuyển hướng email về `ADMIN_EMAIL` nữa (`EMAIL_DEV_REDIRECT_TO_ADMIN` phải là `false`).
- [ ] **Rotate Secrets**: Các mã JWT secrets và Better Auth secret trên Production đã được đổi mới, khác biệt hoàn toàn so với môi trường Local/Development.

---

## 9. Xử lý sự cố thường gặp (Troubleshooting)

### 1. Render báo lỗi SSL (SSL Handshake Error / Certificate Pending)
- **Nguyên nhân**: Bản ghi A hoặc CNAME trên Cloudflare đang bật Proxy đám mây màu cam (làm ẩn đi IP thật của Render khiến Render không thể verify SSL qua giao thức HTTP).
- **Khắc phục**: Chuyển trạng thái Proxy của bản ghi `A` trỏ về `216.24.57.1` và bản ghi `CNAME` `www` trỏ về `tasket-81tv.onrender.com` thành **DNS only** (Đám mây màu xám). Chờ 5-15 phút để Render tự động phát hành chứng chỉ.

### 2. Trạng thái Resend Domain luôn báo "Pending"
- **Nguyên nhân**: Cloudflare chưa cập nhật hoặc cấu hình thiếu/sai các bản ghi TXT (DKIM) và MX.
- **Khắc phục**: Kiểm tra lại xem có copy thiếu chuỗi ký tự dài của DKIM hay không. Sử dụng công cụ trực tuyến như `dig` hoặc `nslookup` để kiểm tra bản ghi TXT của domain. Hãy đợi khoảng 10-30 phút sau khi cấu hình để hệ thống DNS toàn cầu đồng bộ.

### 3. Lỗi xác thực DKIM thất bại (DKIM signature invalid)
- **Nguyên nhân**: Tạo nhầm bản ghi DKIM `resend._domainkey` với loại bản ghi là `A` thay vì `TXT`, hoặc giá trị bị rút gọn do giao diện copy bị lỗi.
- **Khắc phục**: Xóa bản ghi sai đi, tạo mới một bản ghi đúng định dạng **TXT** với Name là `resend._domainkey` và Content là chuỗi ký tự `p=...` dài được copy trực tiếp từ Resend.

### 4. Email chỉ gửi về mail Admin, không gửi đến được user khác
- **Nguyên nhân**: Môi trường Production vẫn đang cấu hình biến `EMAIL_DEV_REDIRECT_TO_ADMIN=true`.
- **Khắc phục**: Cập nhật lại giá trị biến `EMAIL_DEV_REDIRECT_TO_ADMIN` trên Render thành `false`. Backend Tasket sẽ tự động crash khi khởi động nếu phát hiện cấu hình này sai trên production để bảo vệ bạn khỏi việc mất mát email thật của user.

### 5. Google OAuth báo lỗi `redirect_uri_mismatch` khi nhấn đăng nhập
- **Nguyên nhân**: Đường dẫn URI redirect từ client không khớp chính xác từng ký tự với URI đăng ký trên Google Cloud Console (ví dụ thiếu ký tự `s` trong `https` hoặc thiếu `/` ở cuối).
- **Khắc phục**: Click vào dòng chi tiết lỗi của Google để lấy chính xác URI bị từ chối, sau đó copy nguyên văn và thêm vào phần **Authorized redirect URIs** trên trang quản trị Google Cloud Console.

### 6. Lỗi CORS (Cross-Origin Resource Sharing) trên trình duyệt
- **Nguyên nhân**: Biến `CORS_ORIGIN` hoặc `BETTER_AUTH_TRUSTED_ORIGINS` trên Backend không trùng khớp hoặc thiếu tên miền của Frontend (`https://tasket.io.vn` và `https://www.tasket.io.vn`).
- **Khắc phục**: Kiểm tra và điền chính xác biến `CORS_ORIGIN` trên backend chứa danh sách các domain client phân tách bằng dấu phẩy (không có khoảng trắng dư thừa). Đồng thời đảm bảo `BETTER_AUTH_TRUSTED_ORIGINS` chứa đầy đủ cả hai phiên bản có và không có `www`.
