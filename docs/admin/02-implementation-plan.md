# Admin Implementation Plan

## Timeline & Phases

### Phase 1: Foundation (Week 1)

- [x] Create admin documentation
- [ ] Create admin seed account
- [ ] Update User schema for admin fields
- [ ] Create admin middleware on backend
- [ ] Setup admin routes protection
- [ ] Create basic AdminLayout component

### Phase 2: User Management (Week 2-3)

- [ ] Build UserList component with pagination
- [ ] Implement search & filters
- [ ] Build UserDetail component
- [ ] Create user action endpoints (disable, delete, etc)
- [ ] Implement password reset functionality
- [ ] Add activity log display

### Phase 3: Polish & Security (Week 4)

- [ ] Add bulk actions
- [ ] Implement audit logging
- [ ] Add email notifications
- [ ] Security review & testing
- [ ] Performance optimization
- [ ] Documentation finalization

## Backend Tasks

### 1. Update User Model

```javascript
// src/models/User.js
- Add role field (enum: user, admin)
- Add status field (enum: active, disabled, suspended)
- Add disabledAt timestamp
- Add disabledBy reference
- Add lastAdminNotes
- Add createdBy reference (for tracking)
```

### 2. Create Admin Middleware

```javascript
// src/middleware/adminAuth.js
- Verify JWT token
- Check user.role === 'admin'
- Pass through or 401
```

### 3. Admin Routes

```javascript
// src/routes/admin.js
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/disable
POST   /api/admin/users/:id/enable
POST   /api/admin/users/:id/reset-password
GET    /api/admin/users/:id/activity
```

### 4. Seed Admin Account

```bash
node scripts/seedAdmin.js
# Creates admin@example.com with password hashed
```

## Frontend Tasks

### 1. Setup Admin Folder Structure

```
src/pages/admin/
├── index.jsx                # Dashboard
├── login.jsx                # Admin login
├── users/
│   ├── index.jsx           # User list
│   └── [id].jsx            # User detail
└── settings/
    └── index.jsx           # Settings (future)

src/components/admin/
├── AdminLayout.jsx
├── Sidebar.jsx
├── TopBar.jsx
├── UserManagement/
│   ├── UserList.jsx
│   ├── UserDetail.jsx
│   └── UserActions.jsx
└── common/
    ├── ConfirmDialog.jsx
    └── LoadingSpinner.jsx

src/hooks/
├── useAdminAuth.js
└── useUsers.js

src/utils/
└── adminPermissions.js
```

### 2. Key Components to Build

#### AdminLayout

- Main layout wrapper
- Sidebar & TopBar
- Session management
- Theme support

#### Sidebar

- Navigation links
- User profile section
- Logout button

#### UserList

- Table with users
- Pagination
- Search & filters
- Bulk selection
- Row actions menu

#### UserDetail

- User information display
- Edit capabilities
- Activity timeline
- Action buttons

### 3. State Management

- Use React Context for admin auth
- Local state for modals/forms
- Consider Redux if complexity grows

## API Response Format

### Get Users List

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@mail.com",
        "displayName": "John Doe",
        "role": "user",
        "status": "active",
        "createdAt": "2024-01-15",
        "lastOnlineAt": "2024-01-20T10:30:00",
        "avatarUrl": "...",
        "providers": ["local"]
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

### Get User Detail

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@mail.com",
      "displayName": "John Doe",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "avatarUrl": "...",
      "preferredLanguage": "vi",
      "themePreference": "light",
      "createdAt": "2024-01-15",
      "lastOnlineAt": "2024-01-20T10:30:00",
      "providers": ["local", "google"],
      "notificationPreferences": {
        "emailOverdue": true,
        "emailDigest": true,
        "digestHour": 8,
        "timezone": "Asia/Ho_Chi_Minh"
      }
    },
    "activity": [
      {
        "action": "task_created",
        "description": "Created task: Demo Project",
        "timestamp": "2024-01-20T10:30:00"
      }
    ]
  }
}
```

## Database Seed Script

File: `scripts/seedAdmin.js`

```javascript
// Connects to MongoDB
// Creates admin@example.com user with:
// - Email: admin@example.com
// - Password: 00000000 (hashed)
// - Role: admin
// - Status: active
// - emailVerified: true
// Output: Admin user created successfully with ID: xxx
```

## Environment Variables

```env
# .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_PATH=/admin

# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ADMIN_PATH=/admin
```

## Testing Strategy

### Unit Tests

- Admin middleware
- Permission checks
- User filter/search logic

### Integration Tests

- Admin user CRUD operations
- Activity logging
- Email notifications

### E2E Tests

- Admin login flow
- User management workflow
- Sensitive operations (delete, etc)

## Security Checklist

- [ ] Admin route protection on backend
- [ ] Admin route protection on frontend
- [ ] Password hashing for admin account
- [ ] JWT token validation
- [ ] Session timeout
- [ ] Audit logging for all actions
- [ ] Rate limiting on admin endpoints
- [ ] HTTPS enforcement in production
- [ ] Admin password policy
- [ ] Prevent privilege escalation

## Documentation to Write

- [ ] Admin User Guide
- [ ] API Documentation
- [ ] Deployment Instructions
- [ ] Troubleshooting Guide
- [ ] Security Guidelines
