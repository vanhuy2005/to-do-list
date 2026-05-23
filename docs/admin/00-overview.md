# Admin Panel - Overview

## Mục tiêu

Xây dựng admin panel cho phép quản trị viên thực hiện các tác vụ quản lý người dùng, theo dõi hoạt động hệ thống và cấu hình các thông số quan trọng.

## Phạm vi (Scope)

### Phase 1: User Management

- ✅ Xem danh sách người dùng
- ✅ Tìm kiếm/lọc người dùng
- ✅ Xem chi tiết người dùng
- ✅ Kích hoạt/vô hiệu hóa tài khoản
- ✅ Xóa người dùng
- ✅ Reset mật khẩu người dùng
- ✅ Xem lịch sử hoạt động

### Phase 2: System Monitoring (Future)

- Thống kê và báo cáo
- Giám sát hiệu suất
- Logs hệ thống
- Cảnh báo bất thường

### Phase 3: Settings (Future)

- Cấu hình hệ thống
- Email templates
- Notification settings
- Security policies

## Architecture

```
/admin
  ├── components/
  │   ├── AdminLayout.jsx       # Layout chính
  │   ├── Sidebar.jsx            # Navigation sidebar
  │   ├── TopBar.jsx             # Header với user info
  │   └── UserManagement/
  │       ├── UserList.jsx       # Danh sách người dùng
  │       ├── UserDetail.jsx     # Chi tiết người dùng
  │       └── UserActions.jsx    # Actions (delete, disable, etc)
  ├── pages/
  │   ├── index.jsx              # Dashboard
  │   ├── users.jsx              # User management page
  │   └── settings.jsx           # Settings page (future)
  ├── hooks/
  │   ├── useAdminAuth.js        # Admin authentication
  │   └── useUsers.js            # User management logic
  └── utils/
      └── adminPermissions.js    # Role-based access control
```

## Authentication

- Admin user có role: `admin`
- Required environment: `VITE_ADMIN_AUTH_TOKEN` (dev mode)
- Protected routes: Tất cả routes `/admin/*`
- Auto-redirect đến login nếu không phải admin

## Default Admin Account

```
Email: admin@example.com
Password: 00000000
Role: admin
Status: active
```

> ⚠️ Thay đổi password ngay sau lần đăng nhập đầu tiên

## Key Features

### 1. User Management

- Xem danh sách tất cả người dùng
- Filter theo: status, role, createdAt
- Search theo email, displayName
- Bulk actions (disable multiple users)
- Soft delete (disabledAt timestamp)

### 2. User Details

- Xem profile đầy đủ
- Lịch sử hoạt động gần đây
- Quản lý preferences (language, theme)
- Reset password (gửi email reset link)
- Change role

### 3. Activity Monitoring

- Last online timestamp
- Login history
- Action logs (tasks created, deleted, etc)

## Security Considerations

1. **Authentication**
   - Admin role check on backend (mandatory)
   - JWT token validation
   - Session timeout after 30 minutes inactivity

2. **Authorization**
   - Role-based access control (RBAC)
   - User can only be edited by admin
   - Audit logs cho mọi admin actions

3. **Data Protection**
   - Password không bao giờ được hiển thị/export
   - Sensitive data (emails, etc) masked nếu cần
   - Require admin password confirm cho delete operations

## Database Schema Updates

User.js cần thêm:

- `adminRole: { type: String, enum: ['admin', 'moderator', 'user'] }` (optional)
- `disabledAt: Date` (soft delete)
- `lastAdminAction: { action, admin, timestamp }`

## API Endpoints Required

```
GET    /api/admin/users              # Danh sách users
GET    /api/admin/users/:id          # Chi tiết user
PUT    /api/admin/users/:id          # Update user
DELETE /api/admin/users/:id          # Soft delete user
POST   /api/admin/users/:id/disable  # Disable account
POST   /api/admin/users/:id/enable   # Enable account
POST   /api/admin/users/:id/reset-password
GET    /api/admin/users/:id/activity # Activity logs
```

## Frontend Routes

```
/admin                    → Dashboard
/admin/users              → User Management
/admin/users/:id          → User Detail
/admin/settings           → Settings (future)
/admin/login              → Admin Login
```

## Development Checklist

- [ ] Create admin seed account
- [ ] Setup admin middleware on backend
- [ ] Create admin routes protection
- [ ] Build AdminLayout component
- [ ] Build UserList component
- [ ] Build UserDetail component
- [ ] Implement user search/filter
- [ ] Add activity logs display
- [ ] Create admin dashboard
- [ ] Add audit logging for admin actions
- [ ] Setup email notifications for admin actions
- [ ] Test role-based access control
- [ ] Document admin API endpoints
