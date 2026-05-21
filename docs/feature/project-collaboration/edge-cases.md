# Quản lý Trường hợp Biên (Edge Cases): Collaborative Project Workspace System

Hệ thống cộng tác nhiều người dùng thời gian thực luôn phải đối mặt với nhiều kịch bản bất thường như gián đoạn mạng, tranh chấp dữ liệu, thao tác đồng thời hoặc lỗi tính toàn vẹn. Tài liệu này liệt kê chi tiết các trường hợp biên và phương án xử lý tương ứng trên cả Backend và Frontend.

---

## 1. Các Trường hợp Biên về Mời & Gia nhập (Invite Edge Cases)

### 1.1 Race Condition khi Link mời có giới hạn lượt dùng (`maxUses`)
*   **Kịch bản:** Một liên kết mời còn đúng **1 lượt sử dụng**. Hai người dùng A và B click vào link và gửi yêu cầu join `/join/:token` gần như đồng thời (cách nhau vài phần mười giây).
*   **Hành vi mong muốn:** Chỉ một người dùng được phép vào dự án thành công. Người thứ hai phải nhận được phản hồi lỗi `400 Bad Request` chỉ ra mã mời đã đạt số lần sử dụng tối đa.
*   **Cách xử lý Backend:** Sử dụng truy vấn cập nhật nguyên tử (Atomic Update) trong MongoDB bằng Mongoose với toán tử `$inc` và kiểm tra điều kiện chặt chẽ:
    ```javascript
    const project = await Project.findOneAndUpdate(
      {
        "shareLinks.tokenHash": tokenHash,
        "shareLinks.isRevoked": false,
        $or: [
          { "shareLinks.maxUses": null },
          { $expr: { $lt: ["$shareLinks.usedCount", "$shareLinks.maxUses"] } }
        ]
      },
      {
        $inc: { "shareLinks.$.usedCount": 1 }
      },
      { new: true }
    );
    ```
    Nếu không tìm thấy bản ghi phù hợp, lập tức chặn gia nhập. Điều này triệt tiêu hoàn toàn rủi ro race condition.

### 1.2 Người dùng đã là thành viên nhấn vào Link mời
*   **Kịch bản:** Người dùng đang là thành viên của dự án nhưng vô tình click lại liên kết mời gia nhập.
*   **Hành vi mong muốn:** Backend nhận biết người dùng đã thuộc dự án. Trả về mã thành công `200 OK` nhưng kèm thông điệp tiếng Việt: *"Bạn đã là thành viên của dự án này."* và chuyển hướng (redirect) ngay lập tức về trang chi tiết dự án, không tăng số lượt sử dụng (`usedCount`) của link mời.

---

## 2. Trường hợp Biên về Nhân sự dự án (Membership Edge Cases)

### 2.1 Chủ sở hữu dự án (Owner) tự động rời khỏi dự án
*   **Kịch bản:** Owner cố tình gọi API `/projects/:id/leave` để rời dự án.
*   **Hành vi mong muốn:** Backend chặn ngay lập tức và trả về lỗi `400 Bad Request` với mã `OWNER_LEAVE_BLOCKED`, yêu cầu Owner phải thực hiện chuyển giao quyền sở hữu (`transfer`) cho một thành viên khác trước khi rời đi.
*   *Ngoại lệ:* Nếu Owner là thành viên duy nhất còn lại của dự án, hành động rời đi sẽ tự động kích hoạt tiến trình lưu trữ (`archive`) hoặc xóa mềm dự án.

### 2.2 Đồng thời thay đổi vai trò (Concurrent Role Update)
*   **Kịch bản:** Thành viên A đang mở trang và xem dự án dưới vai trò `Editor`. Cùng lúc đó, Chủ sở hữu dự án ở màn hình khác hạ cấp thành viên A xuống thành `Viewer`. A vẫn cố gắng kéo thả hoặc chỉnh sửa một task.
*   **Hành vi mong muốn:**
    *   **Backend:** Kiểm tra quyền thời gian thực trước khi lưu task. Trả về `403 Forbidden` do vai trò thực tế của A trong database đã bị thay đổi thành Viewer.
    *   **Real-time (Ably):** Khi Owner thay đổi vai trò thành viên, một sự kiện `member:updated` được phát tức thời qua kênh Ably. Trình duyệt của thành viên A lắng nghe sự kiện này và tự động chuyển giao diện sang trạng thái Read-only ngay lập tức mà không cần A phải load lại trang, kèm thông báo Toast cảnh báo.

---

## 3. Trường hợp Biên về Tác vụ (Task Edge Cases)

### 3.1 Dịch chuyển Task giữa các dự án khác nhau (Moving Tasks between Projects)
*   **Kịch bản:** Một Editor di chuyển một Task từ Dự án X sang Dự án Y.
*   **Hành vi mong muốn:**
    *   Backend phải xác thực người dùng đó có quyền `Editor` ở **cả hai dự án X và Y**.
    *   Cập nhật `projectId` của Task.
    *   Phát tín hiệu hủy bỏ `task:deleted` trên kênh Ably của dự án X để màn hình các thành viên dự án X xóa task này đi.
    *   Đồng thời phát tín hiệu `task:created` trên kênh Ably của dự án Y để hiển thị task này lên màn hình các thành viên dự án Y.

### 3.2 Xóa dự án chứa hàng ngàn task (Cascade Delete Performance)
*   **Kịch bản:** Owner thực hiện xóa dự án chứa số lượng cực lớn các tasks.
*   **Hành vi mong muốn:** Việc thực thi xóa mềm đồng bộ (synchronous) hàng ngàn task cùng một lúc có thể gây treo máy chủ.
*   **Cách xử lý:** Cập nhật trạng thái `deletedAt` của chính bản ghi Project trước. Sử dụng cơ chế bất đồng bộ (Asynchronous Queue hoặc Background Task) để quét dọn và cập nhật `deletedAt` cho các Task tương ứng sau, đảm bảo API phản hồi tức thời dưới 100ms.
