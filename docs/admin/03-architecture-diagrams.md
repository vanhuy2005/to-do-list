# Admin Panel - Visual Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            AdminDashboardPreview Component              │  │
│  │  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │Dashboard │  │ Users   │  │Settings  │  │Profile │  │  │
│  │  └──────────┘  └─────────┘  └──────────┘  └────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
│           ↓                                        ↓             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Admin API Integration Layer                     │  │
│  │  useAdminAuth  │  useUsers  │  useActivity             │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
└───────────┼────────────────────────────────────────┼─────────────┘
            │                                        │
            ↓                                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js)                          │
├─────────────────────────────────────────────────────────────────┤
│           ↓                                        ↓             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Admin Auth Middleware                           │  │
│  │  - JWT Verification                                    │  │
│  │  - Role Check (admin)                                  │  │
│  │  - Request Logging                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
│           ↓                                        ↓             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Admin API Routes                                │  │
│  │  /api/admin/users      → User operations               │  │
│  │  /api/admin/activity   → Activity logs                 │  │
│  │  /api/admin/settings   → System settings               │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
│           ↓                                        ↓             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Business Logic Layer                            │  │
│  │  - User Management Service                             │  │
│  │  - Activity Service                                    │  │
│  │  - Settings Service                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
│           ↓                                        ↓             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Data Access Layer (Models)                      │  │
│  │  - User Model (with admin fields)                       │  │
│  │  - Activity Log Model                                  │  │
│  │  - Settings Model                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                        │             │
└───────────┼────────────────────────────────────────┼─────────────┘
            │                                        │
            ↓                                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                        MongoDB Database                         │
├─────────────────────────────────────────────────────────────────┤
│  collections: users, activity_logs, admin_settings              │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

### User Login Flow

```
┌─────────────────────────┐
│  Admin Login Page       │
│  Email + Password       │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  POST /api/auth/login                   │
│  - Validate credentials                 │
│  - Check role === 'admin'               │
│  - Generate JWT token                   │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  Store JWT in localStorage              │
│  - Set auth context                     │
│  - Redirect to /admin                   │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  AdminDashboardPreview Loads            │
│  - User is authenticated admin          │
│  - Dashboard data loads                 │
└─────────────────────────────────────────┘
```

### User Management Flow

```
┌──────────────────────────┐
│  Users Tab Clicked       │
└────────────┬─────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│  GET /api/admin/users                    │
│  Params:                                 │
│  - page, limit                          │
│  - search, filter, sort                 │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│  Middleware Check                        │
│  - Verify JWT token                      │
│  - Check user.role === 'admin'          │
│  - Log action                            │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│  Query Users from Database               │
│  - Apply filters                         │
│  - Paginate results                      │
│  - Return with total count              │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│  Return JSON Response                    │
│  {                                       │
│    users: [...],                         │
│    total: 1234,                          │
│    page: 1,                              │
│    limit: 20                             │
│  }                                       │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│  Display Users in Table                  │
│  - Render user list                      │
│  - Show pagination                       │
│  - Enable search/filter                  │
└──────────────────────────────────────────┘
```

### Disable User Flow

```
┌─────────────────────────────┐
│  Click "Disable" Button     │
│  on User Row                │
└────────────┬────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  Confirmation Dialog                    │
│  "Are you sure?"                        │
│  [Cancel] [Confirm]                     │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  POST /api/admin/users/:id/disable      │
│  Payload:                               │
│  {                                      │
│    reason: string (optional)            │
│  }                                      │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  Backend Processing                     │
│  - Find user by ID                      │
│  - Update status → 'disabled'           │
│  - Set disabledAt timestamp             │
│  - Set disabledBy admin reference       │
│  - Log action to audit trail            │
│  - Queue email notification             │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  Return Success Response                │
│  {                                      │
│    success: true,                       │
│    message: "User disabled"             │
│  }                                      │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  Show Success Toast                     │
│  Refresh user list                      │
│  Send notification email                │
└─────────────────────────────────────────┘
```

## 🗄️ Database Schema

### User Collection

```javascript
{
  _id: ObjectId,

  // Existing fields
  email: String,
  passwordHash: String,
  displayName: String,
  avatarUrl: String,
  emailVerified: Boolean,

  // Admin fields (NEW)
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'suspended'],
    default: 'active'
  },
  disabledAt: Date,
  disabledBy: ObjectId, // reference to Admin user

  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastOnlineAt: Date
}
```

### Activity Log Collection (NEW)

```javascript
{
  _id: ObjectId,

  // Action info
  action: String, // 'user_disabled', 'user_created', etc
  description: String,
  targetUser: ObjectId, // reference to affected user
  admin: ObjectId, // reference to admin who did the action

  // Context
  reason: String, // optional reason
  ipAddress: String,
  userAgent: String,

  // Timestamps
  createdAt: Date
}
```

## 🔄 Component Hierarchy

```
AdminDashboardPreview
├── Header
│   ├── Logo
│   ├── Title
│   └── Logout Button
├── Sidebar
│   ├── Dashboard Link
│   ├── Users Link
│   └── Settings Link
└── Main Content (conditional)
    ├── DashboardView
    │   ├── Stats Cards (4)
    │   └── Recent Activity
    ├── UsersView
    │   ├── Header (Title + Add Button)
    │   ├── Search & Filter
    │   └── Users Table
    │       └── User Rows
    └── SettingsView
        ├── General Settings
        ├── Security Settings
        └── Save Button
```

## 🔐 Permission Matrix

| Action              | User | Admin | Notes             |
| ------------------- | ---- | ----- | ----------------- |
| View Dashboard      | ❌   | ✅    | Admin only        |
| View User List      | ❌   | ✅    | Admin only        |
| View User Detail    | ❌   | ✅    | Admin only        |
| Edit User           | ❌   | ✅    | Admin only        |
| Disable User        | ❌   | ✅    | With confirmation |
| Delete User         | ❌   | ✅    | Permanent action  |
| Reset Password      | ❌   | ✅    | Sends reset link  |
| Change Role         | ❌   | ✅    | To admin/user     |
| View Activity Logs  | ❌   | ✅    | Admin only        |
| Export Users        | ❌   | ✅    | CSV format        |
| Change Own Password | ✅   | ✅    | Self-service      |
| View Own Profile    | ✅   | ✅    | Self-service      |

## 🎨 UI Component Structure

```
AdminDashboardPreview (Main Container)
├── 1. Header (Yellow #FFD60A)
│   └── Logo + Title + User Menu + Logout
│
├── 2. Sidebar (White background)
│   ├── Dashboard Tab
│   ├── Users Tab (Pink highlight when active)
│   ├── Settings Tab (Cyan highlight when active)
│   └── Logout Option
│
└── 3. Main Content Area (White background)
    └── Conditional Render Based on Active Tab
        ├── DashboardView
        │   ├── Stats Cards (4 colored cards)
        │   │   ├── Total Users (Pink)
        │   │   ├── Active Users (Cyan)
        │   │   ├── New This Month (Yellow)
        │   │   └── Total Tasks (White)
        │   └── Recent Activity Log
        │
        ├── UsersView
        │   ├── Title + Add Button
        │   ├── Search Bar + Status Filter
        │   └── Data Table
        │       ├── Header Row (Yellow)
        │       ├── Data Rows
        │       └── Action Buttons (Edit/Delete)
        │
        └── SettingsView
            ├── General Settings Form
            ├── Security Settings Form
            └── Save Button
```

## 🚀 API Endpoint Summary

```
Admin Routes (all require authentication + admin role)

GET    /api/admin/users
       → List all users with pagination

GET    /api/admin/users/:id
       → Get specific user details

PUT    /api/admin/users/:id
       → Update user information

DELETE /api/admin/users/:id
       → Delete user permanently

POST   /api/admin/users/:id/disable
       → Disable user account

POST   /api/admin/users/:id/enable
       → Enable user account

POST   /api/admin/users/:id/reset-password
       → Generate password reset link

GET    /api/admin/users/:id/activity
       → Get user activity log

GET    /api/admin/activity
       → Get admin audit log

PUT    /api/admin/settings
       → Update system settings

GET    /api/admin/settings
       → Get system settings
```

## 📈 Request/Response Examples

### GET /api/admin/users

**Request:**

```
GET /api/admin/users?page=1&limit=20&status=active&search=john&sort=createdAt
Authorization: Bearer {JWT_TOKEN}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "displayName": "John Doe",
        "role": "user",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z",
        "lastOnlineAt": "2024-01-20T14:20:00Z",
        "avatarUrl": "https://..."
      }
    ],
    "pagination": {
      "total": 1234,
      "page": 1,
      "limit": 20,
      "pages": 62
    }
  }
}
```

### POST /api/admin/users/:id/disable

**Request:**

```
POST /api/admin/users/507f1f77bcf86cd799439011/disable
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "reason": "Spam activity"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User disabled successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "status": "disabled",
    "disabledAt": "2024-01-20T15:30:00Z",
    "disabledBy": "admin-user-id"
  }
}
```

---

**Last Updated**: May 22, 2026
