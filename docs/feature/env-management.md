# Quản lý Biến Môi trường (Environment Variables Management)

Tài liệu này quy định cách quản lý các biến môi trường cho dự án Tasket.

## 1. Các file được commit và không được commit
- **ĐƯỢC COMMIT**: `!.env.example`, `!.env.development.example`, `!.env.production.example` (Đây là các file mẫu không chứa secret thật)
- **KHÔNG COMMIT**: `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`, `.env.*.local` (Đây là các file thực thi chứa secret nhạy cảm)

## 2. Cách tạo cấu hình cho Local Development
Môi trường phát triển cục bộ sử dụng `.env.development`.
Khởi tạo file từ bản mẫu bằng lệnh:
```bash
cp .env.development.example .env.development
```
Sau đó thay thế các placeholder `<...>` bằng secret thật (chỉ dùng cho mục đích dev local).

## 3. Cách tạo cấu hình cho Production Local (Kiểm thử)
Nếu muốn giả lập chạy giống production trên máy local, tạo file `.env.production`:
```bash
cp .env.production.example .env.production
```
*Lưu ý: Không bao giờ dùng JWT/Auth secrets của Production thật để thử nghiệm trên máy local, hãy dùng một chuỗi bí mật ngẫu nhiên.*

## 4. Quản lý trên môi trường Production (Render/Cloud)
- Trên Render (hoặc nền tảng cloud tương tự), biến môi trường được nhập trực tiếp qua bảng điều khiển (dashboard) **Environment Variables**.
- Hệ thống ưu tiên biến môi trường từ nền tảng hơn file `.env.production` ở dưới local (do cơ chế `override: false` của dotenv).

## 5. Cảnh báo bảo mật
- **KHÔNG ĐƯỢC COMMIT secret thật**: Không commit bất kì thông tin nhạy cảm nào như `MONGODB_CONNECTIONSTRING`, `API_KEY`, hay `SECRET`. 
- Nếu lỡ làm lộ secret trên repository công khai hoặc cho người không có thẩm quyền, **phải thu hồi (rotate) ngay lập tức** secret đó từ nhà cung cấp dịch vụ và cập nhật mới.
