# Admin Panel Development Guide

## 🎯 Quick Start

### 1. Seed Admin Account

```bash
cd to-do-list/backend
node scripts/seedAdmin.js
```

**Output:**

```
✅ Admin user created successfully!

📋 Admin Account Details:
─────────────────────────────────
Email:        admin@example.com
Password:     00000000
Display Name: Admin
Role:         admin
User ID:      [generated-id]
─────────────────────────────────

⚠️  IMPORTANT:
   1. Change the admin password immediately after first login
   2. Use strong password in production
   3. Never commit this password to version control
```

### 2. Reset Admin Password (if needed)

```bash
node scripts/seedAdmin.js --reset
```

## 📋 Documentation Files

Navigate to `/docs/admin/` to find:

1. **00-overview.md** - High-level overview of admin panel features and architecture
2. **01-user-management-design.md** - Detailed user management feature design
3. **02-implementation-plan.md** - Step-by-step implementation roadmap

## 🏗️ Current Status

### Completed ✅

- [x] Admin feature documentation (3 detailed docs)
- [x] Admin seed script with password hashing
- [x] React component with SVG design conversion
  - Inline SVG icons (no icon library dependency)
  - Tailwind CSS styling
  - Interactive tabs (Dashboard, Users, Settings)
  - Color scheme: Yellow (#FFD60A), Pink (#FF2D55), Cyan (#00C2FF)

### In Progress 🔄

- [ ] Admin authentication middleware
- [ ] Admin routes protection
- [ ] Database schema updates
- [ ] User management API endpoints

### Not Started ⏳

- [ ] User List with pagination
- [ ] User Detail view
- [ ] Activity logging
- [ ] Email notifications
- [ ] Tests & documentation

## 🗂️ Project Structure

```
docs/admin/
├── 00-overview.md              # Project overview
├── 01-user-management-design.md  # Detailed design
└── 02-implementation-plan.md   # Implementation roadmap

to-do-list/backend/
├── scripts/
│   └── seedAdmin.js           # Admin account seeder
└── src/
    ├── models/
    │   └── User.js            # (to be updated)
    ├── middleware/
    │   └── adminAuth.js       # (to be created)
    └── routes/
        └── admin.js           # (to be created)

to-do-list/frontend/
└── src/
    ├── components/admin/
    │   ├── AdminDashboardPreview.jsx  # Main dashboard component
    │   ├── AdminLayout.jsx            # (to be created)
    │   └── ...                        # (other components)
    └── pages/admin/
        ├── index.jsx                  # (to be created)
        └── users.jsx                  # (to be created)
```

## 🔑 Admin Credentials

| Field    | Value             |
| -------- | ----------------- |
| Email    | admin@example.com |
| Password | 00000000          |
| Role     | admin             |

> ⚠️ **SECURITY WARNING**: Change this password immediately in production!

## 🎨 Design System

### Colors

- **Primary (Yellow)**: `#FFD60A` - Main actions, highlights
- **Accent (Pink)**: `#FF2D55` - User management, critical actions
- **Secondary (Cyan)**: `#00C2FF` - Information, alternative actions
- **Gold**: `#FFD60A` - Notifications, achievements
- **Base (Black)**: `#111111` - Text, borders
- **Background**: `#FFFDF7` - Main background

### Components Style

- **Borders**: 2-4px solid black (`border-[#111111]`)
- **Spacing**: Generous padding/margin (Figma-inspired)
- **Effects**: Subtle shadows, slight hover scale (1.05x)
- **Typography**: Bold fonts, clear hierarchy

### Tailwind Classes Used

```
bg-[#FFD60A]    # Yellow
bg-[#FF2D55]    # Pink
bg-[#00C2FF]    # Cyan
border-[#111111]  # Black border
text-[#111111]   # Black text
```

## 📱 Component Features

### AdminDashboardPreview Component

**File**: `frontend/src/components/admin/AdminDashboardPreview.jsx`

Features:

- ✅ Tabbed navigation (Dashboard, Users, Settings)
- ✅ Inline SVG icons (no external icon libraries)
- ✅ Responsive dashboard with stats cards
- ✅ User management table
- ✅ Settings management panel
- ✅ Color-coded sections matching Figma design
- ✅ Hover effects and transitions

Icons included:

- PlusIcon (add new)
- SearchIcon (search)
- HomeIcon (dashboard)
- UsersIcon (user management)
- SettingsIcon (settings)
- LogoutIcon (logout)

## 🚀 Next Steps

### Phase 1: Backend Setup (Priority: HIGH)

1. [ ] Update User model with admin fields
2. [ ] Create admin authentication middleware
3. [ ] Create admin API routes
4. [ ] Implement user management endpoints

### Phase 2: Frontend Components (Priority: HIGH)

1. [ ] Create AdminLayout wrapper component
2. [ ] Build Sidebar navigation
3. [ ] Build UserList component with pagination
4. [ ] Build UserDetail component
5. [ ] Implement search and filters

### Phase 3: Features (Priority: MEDIUM)

1. [ ] User enable/disable functionality
2. [ ] Password reset functionality
3. [ ] Activity logging
4. [ ] Bulk actions
5. [ ] Export functionality

### Phase 4: Polish (Priority: MEDIUM)

1. [ ] Error handling & validation
2. [ ] Loading states
3. [ ] Empty states
4. [ ] Toast notifications
5. [ ] Confirmation dialogs

### Phase 5: Testing & Deployment (Priority: HIGH)

1. [ ] Unit tests
2. [ ] Integration tests
3. [ ] E2E tests
4. [ ] Security audit
5. [ ] Production deployment

## 📝 Usage Examples

### Using the Component

```jsx
import AdminDashboardPreview from "@/components/admin/AdminDashboardPreview";

function AdminPage() {
  return <AdminDashboardPreview />;
}

export default AdminPage;
```

### Seeding Admin Account

```bash
# Development
cd to-do-list/backend
npm run seed:admin

# Or directly
node scripts/seedAdmin.js
```

## 🔐 Security Checklist

- [ ] Admin routes require authentication
- [ ] Admin routes check user role on backend
- [ ] Password is securely hashed (bcrypt)
- [ ] JWT tokens validated for admin endpoints
- [ ] Admin actions are logged
- [ ] Audit trail for sensitive operations
- [ ] Rate limiting on admin endpoints
- [ ] HTTPS in production
- [ ] Admin password policy enforced
- [ ] Session timeout after inactivity

## 📚 Related Documentation

- User Model: See `src/models/User.js` in backend
- API Design: See `/docs/admin/01-user-management-design.md`
- Implementation: See `/docs/admin/02-implementation-plan.md`

## 🤝 Contributing

When adding new admin features:

1. Update documentation in `/docs/admin/`
2. Follow the color scheme and design system
3. Use inline SVGs for icons
4. Add proper TypeScript types (if using TS)
5. Include error handling
6. Add unit tests
7. Update this README

## 🐛 Troubleshooting

### Seed Script Fails

```bash
# Ensure MongoDB is running
# Check .env.development has MONGODB_URI
# Verify User model path in seedAdmin.js
```

### Admin Login Not Working

```
1. Verify admin user was created: db.users.findOne({email: "admin@example.com"})
2. Check JWT token generation
3. Verify admin role is set correctly
4. Check middleware is applied to /admin routes
```

### Styling Issues

```
1. Ensure Tailwind CSS is properly configured
2. Use exact color codes: #FFD60A, #FF2D55, #00C2FF, #111111
3. Import AdminDashboardPreview correctly
4. Clear Tailwind cache: npm run build
```

## 📞 Support

For questions about the admin panel implementation:

1. Check `/docs/admin/` for detailed documentation
2. Review component code comments
3. Check implementation plan for architecture details
4. Review seed script for database setup

---

**Last Updated**: May 22, 2026  
**Status**: Phase 1 - Foundation ✅  
**Next Phase**: Phase 2 - User Management 🔄
