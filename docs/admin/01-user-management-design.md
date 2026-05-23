# User Management Feature - Detailed Design

## 1. Data Model

### User Schema Extensions

```javascript
// Update User.js schema
{
  // Existing fields...

  // Admin-specific fields
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
  disabledAt: {
    type: Date,
    default: null
  },
  disabledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastAdminNotes: {
    type: String,
    default: null
  }
}
```

## 2. User Management Features

### A. User List View

```
┌─────────────────────────────────────────────────┐
│ Users Management                         [+ Add] │
├─────────────────────────────────────────────────┤
│ Search: [_______________] Status: [▼]           │
│ Sort: Created ▼                                  │
├─────────────────────────────────────────────────┤
│ # │ Email           │ Name       │ Status   │ ⋯ │
├─────────────────────────────────────────────────┤
│ 1 │ user@mail.com   │ John Doe   │ Active   │ ⋯ │
│ 2 │ admin@mail.com  │ Admin      │ Active   │ ⋯ │
│ 3 │ inactive@m.com  │ Jane Smith │ Disabled │ ⋯ │
└─────────────────────────────────────────────────┘
```

### B. Filters & Search

- **Search**: Email, displayName
- **Status Filter**: Active, Disabled, All
- **Role Filter**: Admin, User
- **Date Range**: Created date
- **Provider**: local, google, github
- **Sort**: Name, Email, Created, LastOnline

### C. Bulk Actions

- [x] Select multiple users
- [x] Disable selected
- [x] Enable selected
- [x] Export CSV

### D. User Detail Page

```
┌──────────────────────────────────────────────┐
│ ◀ User: John Doe (ID: xxx)      [Edit] [⋯]  │
├──────────────────────────────────────────────┤
│ Basic Info                                    │
│ • Email: user@mail.com                       │
│ • Display Name: John Doe                     │
│ • Status: Active          [Disable]          │
│ • Role: User              [Change to Admin]  │
│ • Provider: local                            │
│ • Email Verified: Yes                        │
│                                              │
│ Account Activity                             │
│ • Created: 2024-01-15                        │
│ • Last Online: 2 hours ago                   │
│ • Email Verified: 2024-01-15                 │
│                                              │
│ Preferences                                  │
│ • Language: Vietnamese                       │
│ • Theme: Light                               │
│ • Email Notifications: Enabled               │
│                                              │
│ Actions                                      │
│ [Reset Password] [Resend Email] [Delete]    │
│                                              │
│ Activity Log (Last 10)                       │
│ • 2024-01-15 - Created task "Demo"          │
│ • 2024-01-14 - Updated profile               │
│ • ...                                         │
└──────────────────────────────────────────────┘
```

## 3. Admin Actions

### Reset Password

```
POST /api/admin/users/:userId/reset-password
{
  action: 'reset_password',
  adminId: 'admin_user_id',
  resetToken: 'generated_token'
}

Response:
{
  success: true,
  resetLink: 'https://app.com/reset-password?token=xxx'
}
```

### Disable/Enable Account

```
POST /api/admin/users/:userId/disable
{
  reason: 'Spam activity',
  disabledBy: 'admin_user_id'
}

User.status → 'disabled'
User.disabledAt → timestamp
User.disabledBy → admin reference
```

### Change User Role

```
PUT /api/admin/users/:userId
{
  role: 'admin'
}
```

### Delete User

```
DELETE /api/admin/users/:userId
(Hard delete - permanently remove)

Requires:
- Admin password confirmation
- Cascading delete of user's tasks
```

## 4. Frontend Components

### AdminLayout

```jsx
<AdminLayout>
  <Sidebar />
  <div className="flex flex-col flex-1">
    <TopBar />
    <main className="flex-1 overflow-auto">{children}</main>
  </div>
</AdminLayout>
```

### Sidebar Navigation

- Dashboard
- User Management
- Settings (future)
- Logout

### UserList Component

- Table with pagination
- Search & filter form
- Bulk action toolbar
- Row context menu (view, edit, delete)

### UserDetail Component

- Tabs: Info, Activity, Settings
- Edit form modal
- Confirmation dialogs
- Activity timeline

## 5. Permissions & Authorization

### Admin Can:

- ✅ View all users
- ✅ Disable/Enable accounts
- ✅ Change user roles
- ✅ Reset passwords
- ✅ Delete users
- ✅ View activity logs
- ✅ Export user data

### Admin Cannot:

- ❌ Modify own admin privileges
- ❌ Delete own account
- ❌ Access other admins' sensitive data

## 6. Activity Logging

Track all admin actions:

```javascript
{
  action: 'user_disabled',
  admin: 'admin_user_id',
  target_user: 'user_id',
  reason: 'Spam',
  timestamp: Date,
  ip_address: '192.168.1.1'
}
```

## 7. Email Notifications

When admin action occurs:

- **User Disabled**: "Your account has been disabled. Contact support."
- **Password Reset**: "Password reset link sent by admin"
- **Role Changed**: "Your role has been changed to [role]"

## 8. Security Measures

1. **Rate Limiting**: Admin actions rate-limited
2. **Audit Trail**: All changes logged
3. **Confirmation Dialogs**: Dangerous actions require confirmation
4. **Session Timeout**: 30 minutes of inactivity
5. **IP Logging**: Track which IPs perform admin actions
6. **Admin Alerts**: Alert other admins of significant actions

## 9. Testing Checklist

- [ ] Admin user can login
- [ ] Non-admin redirected from /admin
- [ ] User list loads correctly
- [ ] Search/filter works
- [ ] User detail page shows correct info
- [ ] Disable/enable user works
- [ ] Password reset works
- [ ] Delete user works (with confirmation)
- [ ] Change role works
- [ ] Activity log displays
- [ ] Bulk actions work
- [ ] Export CSV works
- [ ] Session timeout works
