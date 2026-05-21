# Thiết kế API RESTful: Collaborative Project Workspace System

Tài liệu này đặc tả chi tiết giao diện lập trình ứng dụng (API) của hệ thống Không gian Làm việc Dự án Nhóm. Toàn bộ các API được gắn đầu mã phiên bản `/api/v1` và được bảo vệ thông qua JWT xác thực.

---

## 1. Quy chuẩn Response Payload

Phù hợp với cấu trúc chuẩn của ứng dụng, tất cả API trả về dưới dạng JSON nhất quán:

### Trạng thái Thành công (200 OK / 201 Created):
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông điệp phản hồi bằng tiếng Việt thành công"
}
```

### Trạng thái Thất bại (400 Bad Request / 403 Forbidden / 404 Not Found / 429 Too Many Requests):
```json
{
  "success": false,
  "error": {
    "code": "TÊN_MÃ_LỖI_UPPERCASE",
    "message": "Thông điệp giải thích lỗi bằng tiếng Việt rõ ràng cho người dùng"
  }
}
```

---

## 2. Chi tiết Đặc tả Danh sách Endpoint

### 2.1 Dự án - Nhóm API CRUD & Quản lý Vòng đời

#### 2.1.1 Lấy danh sách dự án
*   **Path:** `GET /projects`
*   **Auth:** Yêu cầu đăng nhập.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "60c72b2f9b1d8e001c888888",
          "name": "Dự án Thiết kế Pop Art",
          "description": "Không gian làm việc nhóm thiết kế UI mới",
          "emoji": "🎨",
          "status": "active",
          "visibility": "private",
          "ownerId": "60c72b2f9b1d8e001c999999",
          "members": [
            { "userId": "60c72b2f9b1d8e001c999999", "role": "owner" }
          ],
          "createdAt": "2026-05-21T12:00:00.000Z"
        }
      ]
    }
    ```

#### 2.1.2 Tạo dự án mới
*   **Path:** `POST /projects`
*   **Auth:** Yêu cầu đăng nhập.
*   **Payload:**
    ```json
    {
      "name": "Dự án mới tuyển dụng",
      "description": "Lên kế hoạch và theo dõi hồ sơ ứng viên",
      "emoji": "👥",
      "visibility": "private"
    }
    ```
*   **Response (201 Created):** Trả về đối tượng dự án vừa khởi tạo thành công.

#### 2.1.3 Cập nhật dự án
*   **Path:** `PATCH /projects/:id`
*   **Auth:** Yêu cầu vai trò `owner` hoặc `editor` của dự án.
*   **Payload:** `{ "name": "...", "description": "...", "emoji": "...", "visibility": "..." }`

#### 2.1.4 Lưu trữ dự án (Archive)
*   **Path:** `POST /projects/:id/archive`
*   **Auth:** Yêu cầu vai trò `owner` của dự án.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Dự án đã được đưa vào lưu trữ thành công"
    }
    ```

#### 2.1.5 Khôi phục dự án lưu trữ
*   **Path:** `POST /projects/:id/restore`
*   **Auth:** Yêu cầu vai trò `owner`.

#### 2.1.6 Xóa dự án (Xóa mềm)
*   **Path:** `DELETE /projects/:id`
*   **Auth:** Yêu cầu vai trò `owner`.
*   **Response (200 OK):** Di chuyển dự án vào trạng thái chờ xóa, gia hạn khôi phục trong vòng 7 ngày.

---

### 2.2 Thành viên - Nhóm API Quản lý Thành viên

#### 2.2.1 Thêm thành viên trực tiếp bằng Email
*   **Path:** `POST /projects/:id/members`
*   **Auth:** Yêu cầu vai trò `owner` hoặc `editor` (tùy thuộc vào cấu hình `allowMemberInvites`).
*   **Payload:**
    ```json
    {
      "email": "cong-tac-vien@gmail.com",
      "role": "editor"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Đã thêm thành viên mới vào dự án thành công"
    }
    ```

#### 2.2.2 Cập nhật vai trò thành viên
*   **Path:** `PATCH /projects/:id/members/:memberId`
*   **Auth:** Yêu cầu vai trò `owner`.
*   **Payload:** `{ "role": "commenter" }`

#### 2.2.3 Xóa thành viên khỏi dự án
*   **Path:** `DELETE /projects/:id/members/:memberId`
*   **Auth:** Yêu cầu vai trò `owner`.

#### 2.2.4 Rời khỏi dự án
*   **Path:** `POST /projects/:id/leave`
*   **Auth:** Bất kỳ thành viên nào (Ngoại trừ Owner, Owner buộc phải chuyển giao quyền sở hữu trước khi rời đi).

#### 2.2.5 Chuyển giao quyền sở hữu dự án
*   **Path:** `PATCH /projects/:id/transfer`
*   **Auth:** Yêu cầu vai trò `owner`.
*   **Payload:** `{ "newOwnerId": "60c72b2f9b1d8e001c123456" }`

---

### 2.3 Liên kết Chia sẻ & Tham gia (Share Links & Invite Codes)

#### 2.3.1 Tạo liên kết mời bảo mật
*   **Path:** `POST /projects/:id/share-links`
*   **Auth:** Yêu cầu vai trò `owner` (hoặc `editor` nếu cấu hình dự án cho phép).
*   **Payload:**
    ```json
    {
      "role": "editor",
      "label": "Đội ngũ Thiết kế đồ họa",
      "maxUses": 10,
      "expiresInDays": 7
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "linkId": "60c72b2f9b1d8e001caaaaaa",
        "role": "editor",
        "label": "Đội ngũ Thiết kế đồ họa",
        "url": "http://localhost:5173/join/b2f9b1d8e001c88...64charhex...",
        "expiresAt": "2026-05-28T12:00:00.000Z"
      }
    }
    ```

#### 2.3.2 Vô hiệu hóa (Revoke) liên kết mời
*   **Path:** `DELETE /projects/:id/share-links/:linkId`
*   **Auth:** Vai trò `owner`.

#### 2.3.3 Gia nhập dự án bằng Secure Link
*   **Path:** `POST /projects/join/:token`
*   **Auth:** Yêu cầu đăng nhập.
*   **Rate Limiting:** Tối đa 10 lần thử trong vòng 15 phút trên mỗi IP.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "projectId": "60c72b2f9b1d8e001c888888",
        "role": "editor"
      },
      "message": "Bạn đã gia nhập dự án thành công"
    }
    ```

#### 2.3.4 Kích hoạt / Lấy mã mời ngắn (Invite Code)
*   **Path:** `POST /projects/:id/invite-code`
*   **Auth:** Yêu cầu vai trò `owner`.
*   **Response (200 OK):** Trả về mã mời ngẫu nhiên 6 ký tự viết hoa (Ví dụ: `AB39XZ`).

#### 2.3.5 Gia nhập dự án bằng Mã mời ngắn
*   **Path:** `POST /projects/join-code`
*   **Auth:** Yêu cầu đăng nhập.
*   **Payload:** `{ "code": "AB39XZ" }`
*   **Rate Limiting:** Tối đa 5 lần thử trong vòng 15 phút trên mỗi IP.

---

### 2.4 Quản lý Tác vụ Dự án (Project Tasks)

#### 2.4.1 Lấy danh sách nhiệm vụ trong dự án (với Phân trang & Lọc)
*   **Path:** `GET /projects/:id/tasks`
*   **Auth:** Bất kỳ vai trò nào thuộc dự án.
*   **Query Params:** `page=1&limit=20&status=todo&priority=high`
*   **Response (200 OK):** Trả về mảng danh sách các tasks thuộc dự án và đối tượng thông tin phân trang `pagination`.
