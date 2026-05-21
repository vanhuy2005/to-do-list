# Thiết kế Cơ sở Dữ liệu: Collaborative Project Workspace System

Tài liệu này đặc tả chi tiết thiết kế cơ sở dữ liệu MongoDB bằng Mongoose ODM, các cải tiến cấu trúc schema hiện tại, hệ thống đánh chỉ mục (index), quy trình quản lý trạng thái, và chiến lược di chuyển dữ liệu (migration).

---

## 1. Phân tích Schema Hiện tại & Đề xuất Cải tiến

Hiện tại, cấu trúc `Project` cơ bản đã tồn tại trong `to-do-list/backend/src/models/Project.js` nhưng bị giới hạn về khả năng bảo mật mã mời, khả năng lưu trữ, và khôi phục sự cố.

### Các thay đổi lớn được đề xuất:
1.  **Bảo mật hóa Token mời:** Thay đổi trường `shareLinks.token` lưu Plaintext thành `shareLinks.tokenHash` để lưu mã băm SHA-256 một chiều.
2.  **Hỗ trợ Mã mời ngắn (Invite Code):** Thêm trường `inviteCode` ở cấp độ root của Project schema phục vụ việc gia nhập nhanh bằng mã 6 ký tự trên mobile.
3.  **Hỗ trợ Trạng thái & Lưu trữ:** Thêm thuộc tính `status` (`active` | `archived`) để hỗ trợ đóng băng dự án (read-only) thay vì xóa bỏ.
4.  **Hỗ trợ Xóa mềm (Soft Delete):** Thêm các trường `deletedAt` và `restoreUntil` đồng bộ với cơ chế xóa mềm 7 ngày của hệ thống Task hiện tại.
5.  **Cá nhân hóa UI:** Thêm trường `iconUrl` hoặc `emoji` lưu ảnh đại diện hoặc biểu tượng dự án.

---

## 2. Chi tiết Cấu trúc Mongoose Schema Nâng cao

### 2.1 Schema Mô hình Dự án (`Project.js`)
```javascript
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    emoji: {
      type: String,
      default: "📁", // Emoji mặc định đại diện dự án
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    visibility: {
      type: String,
      enum: ["private", "link"],
      default: "private",
    },
    members: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          role: {
            type: String,
            enum: ["viewer", "comment", "editor", "owner"],
            required: true,
            default: "viewer",
          },
          addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    shareLinks: {
      type: [
        {
          tokenHash: {
            type: String,
            required: true,
          },
          role: {
            type: String,
            enum: ["viewer", "comment", "editor"],
            required: true,
            default: "viewer",
          },
          label: {
            type: String,
            default: "General Invite Link",
          },
          maxUses: {
            type: Number,
            default: null, // null là không giới hạn số lần dùng
          },
          usedCount: {
            type: Number,
            default: 0,
          },
          isRevoked: {
            type: Boolean,
            default: false,
          },
          expiresAt: {
            type: Date,
            default: null, // null là không hết hạn
          },
          createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    inviteCode: {
      code: {
        type: String,
        uppercase: true,
        trim: true,
        default: null,
      },
      role: {
        type: String,
        enum: ["viewer", "comment", "editor"],
        default: "viewer",
      },
      maxUses: {
        type: Number,
        default: null,
      },
      usedCount: {
        type: Number,
        default: 0,
      },
      isRevoked: {
        type: Boolean,
        default: false,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
      },
    },
    settings: {
      type: Object,
      default: {
        allowMemberInvites: true, // Cho phép Editor tạo share link
      },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    restoreUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Đánh chỉ mục tối ưu hóa truy vấn chuyên sâu
projectSchema.index({ ownerId: 1, deletedAt: 1 });
projectSchema.index({ "members.userId": 1, deletedAt: 1 });
projectSchema.index({ "shareLinks.tokenHash": 1 });
projectSchema.index({ "inviteCode.code": 1 }, { sparse: true });
```

---

## 3. Khóa Chỉ mục Mới (New Indexes) & Phân tích Hiệu năng

*   **`{ "shareLinks.tokenHash": 1 }`**: Phục vụ việc tìm kiếm dự án tương ứng ngay lập tức khi một người dùng click vào link gia nhập `/join/:token`. Đảm bảo truy vấn $O(1)$ thay vì scan toàn bộ bảng.
*   **`{ "inviteCode.code": 1 }` (sparse)**: Cho phép tìm nhanh dự án dựa trên mã 6 chữ số. Thiết lập thuộc tính `sparse` để tránh đánh chỉ mục các dự án không kích hoạt tính năng mời bằng mã code (mã thô bằng `null`).
*   **`{ "members.userId": 1, deletedAt: 1 }`**: Phục vụ việc hiển thị danh sách dự án trên trang chủ của người dùng. Lọc nhanh các dự án đang hoạt động mà người dùng tham gia.

---

## 4. Tích hợp Nhật ký Hệ thống (AuditLog Model)

Mô hình `AuditLog` cần mở rộng trường `entityType` để theo dõi các hành động quản trị dự án:
```javascript
entityType: {
  type: String,
  required: true,
  enum: ["user", "task", "session", "project"] // Thêm 'project'
}
```
### Các Action được Ghi nhận:
*   `project.created` / `project.updated` / `project.archived` / `project.restored` / `project.deleted`
*   `project.member.added` / `project.member.removed` / `project.member.role_changed`
*   `project.share_link.created` / `project.share_link.revoked`
*   `project.invite_code.generated` / `project.invite_code.revoked`
*   `project.ownership.transferred`

---

## 5. Chiến lược Xóa mềm (Soft Delete Strategy)

*   Khi dự án bị xóa mềm (`deletedAt` được cập nhật thành thời gian hiện tại, `restoreUntil` đặt là 7 ngày sau):
    *   Tất cả nhiệm vụ thuộc dự án này (`Task` có `projectId === project._id`) tự động cập nhật trường `deletedAt` và `restoreUntil` tương ứng.
    *   Người dùng không thể truy cập, xem hoặc chỉnh sửa dự án này trừ khi nhấn "Khôi phục" (Restore).
*   Sau 7 ngày, một tác vụ nền (cron job) chạy quét các dự án có `restoreUntil < Date.now()` để thực hiện xóa vĩnh viễn (Hard Delete) dự án và toàn bộ task con khỏi cơ sở dữ liệu.

---

## 6. Kế hoạch Di chuyển Dữ liệu (Migration Strategy)

Nhằm đảm bảo hệ thống nâng cấp mượt mà không gây lỗi phân tích cú pháp (parsing errors) đối với dữ liệu cũ:

1.  **Script backfill dữ liệu cũ:**
    *   Quét qua toàn bộ dự án hiện có.
    *   Đối với các dự án chưa có trường `emoji`, tự động bổ sung `"emoji": "📁"`.
    *   Đối với các dự án chưa có trường `status`, tự động bổ sung `"status": "active"`.
    *   Nếu mảng `members` trống hoặc chưa chứa thông tin Owner, tiến hành chèn Owner hiện tại vào danh sách thành viên với vai trò `"owner"`.
    *   Chuyển đổi bất kỳ plaintext token cũ nào trong mảng `shareLinks` thành mã băm SHA-256 và đổi tên trường sang `tokenHash`.
2.  **Mẫu di chuyển (Migration Script Phác thảo):**
    ```javascript
    const projects = await Project.find({
      $or: [
        { status: { $exists: false } },
        { emoji: { $exists: false } }
      ]
    });
    for (const p of projects) {
      if (!p.status) p.status = 'active';
      if (!p.emoji) p.emoji = '📁';
      // Xử lý chuyển đổi token cũ nếu có...
      await p.save();
    }
    ```
