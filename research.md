Backend architecture - models, routes, middleware, services, cron jobs, config
Frontend architecture - components, pages, hooks, services, routing, UI library
Documentation - all existing docs covering architecture, conventions, and patterns
I'll wait for all three to report back before designing the feature documentation. This will take a moment while they read through the entire codebase.

Waiting for the research subagents to complete their comprehensive analysis of the codebase...

[From subagent 56dc4035-acb2-4748-a7b5-8aef4e5597b9 (Frontend Architecture Researcher)]: Here is a comprehensive summary of the frontend architecture for the to-do list application.

Overall Frontend Framework and UI Library
Framework: React (v19) with Vite as the build tool.
UI Component Library: shadcn/ui (using a "New York" style, slate base color, and CSS variables for theming).
Styling: TailwindCSS (v4 via @tailwindcss/vite).
Routing Setup
Library: react-router-dom (v7).
Structure: Defined in src/routes/AppRouter.jsx.
Layout: A MainLayout wraps all authenticated pages, providing the sidebar, header, and main content area.
Auth Guard: A custom ProtectedRoute component wraps authenticated routes, checking for access and refresh tokens. If not present, it redirects to /login.
Route Map:

Path	Component	Auth
/login	LoginPage	No
/register	RegisterPage	No
/forgot-password	ForgotPasswordPage	No
/reset-password/:token	ResetPasswordPage	No
/	Redirect to /dashboard	Yes
/dashboard	Dashboard	Yes
/tasks	TasksPage	Yes
/categories	CategoriesPage	Yes
/statistics	StatisticsPage	Yes
/voice-task	VoiceTaskPage	Yes
/settings	SettingsPage	Yes
*	NotFoundPage	No
State Management Approach
Primary: React Context API.
AuthContext (src/hooks/useAuth.jsx): Manages the entire authentication lifecycle, including login, register, logout, token refresh, profile fetching, and OAuth handling. Stores user, accessToken, and refreshToken in state and localStorage.
SidebarContext (src/hooks/useSidebar.jsx): Manages sidebar open/close state.
Data Fetching: A combination of direct axios calls from components/hooks and service files.
API Service Layer Patterns
HTTP Client: axios configured in src/services/api.js.
Base URL: VITE_API_URL env variable.
Request Interceptor: Attaches Authorization: Bearer <token> header from localStorage.
Response Interceptor: On a 401 error, it attempts to refresh the token using the refresh token. If the refresh fails, it clears localStorage and redirects to /login.
Service Files:
authService.js: login, register, getProfile, updateProfile, changePassword, refreshToken, forgotPassword, resetPassword, googleLogin, githubLogin.
taskService.js: Full CRUD, batch operations (batchUpdateStatus, batchDelete), tag management, pinning, and voice task creation (createVoiceTask).
categoryService.js: Full CRUD for categories.
statisticsService.js: getTaskStatistics, getProductivityData.
Custom Hooks and Their Purposes
Hook	Purpose
useAuth	Accesses AuthContext for user data, tokens, and auth actions.
useSidebar	Accesses SidebarContext for sidebar state.
useCategories	Fetches and manages category data with CRUD operations. Returns { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory }.
useTasks	Fetches and manages task data. Returns { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, batchUpdateStatus, batchDelete, updateTaskTags, togglePin, createVoiceTask }.
useTaskFilters	Complex filtering and sorting logic for tasks (by status, priority, category, tags, search, date range, sort order).
useStatistics	Fetches task statistics and productivity data.
Component Architecture and Hierarchy
layouts/
MainLayout.jsx: The main authenticated shell. Includes Sidebar, Header, and a main content area. Uses SidebarProvider.
components/
The components directory is organized into feature areas:

ui/: shadcn/ui primitives (button, card, dialog, dropdown-menu, input, label, select, badge, avatar, checkbox, textarea, toast, sonner, sheet, skeleton, tooltip, progress, tabs, switch, scroll-area, separator, chart).
layout/: Header.jsx (top bar with user greeting, notifications bell, profile avatar dropdown for settings/logout), Sidebar.jsx (navigation menu with links).
tasks/: TaskCard.jsx (individual task display), TaskDialog.jsx (create/edit modal), TaskList.jsx (renders list of TaskCard), TaskFilters.jsx (filter bar), TaskKanban.jsx (Kanban board view), TaskBatchActions.jsx (batch operations bar), TaskDetailPanel.jsx (slide-over panel), VoiceTaskCreator.jsx.
categories/: CategoryList.jsx, CategoryDialog.jsx, CategoryCard.jsx.
dashboard/: StatsCard.jsx, TaskChart.jsx, RecentTasks.jsx, UpcomingTasks.jsx, QuickActions.jsx.
statistics/: OverviewCards.jsx, TaskDistributionChart.jsx, ProductivityChart.jsx, CategoryBreakdown.jsx, PriorityBreakdown.jsx.
settings/: ProfileSettings.jsx (display name, email - READONLY), SecuritySettings.jsx (change password), PreferencesSettings.jsx (theme toggle, language, date format), NotificationSettings.jsx (email/push/overdue notification toggles - UI ONLY, no backend integration).
auth/: LoginForm.jsx, RegisterForm.jsx, ForgotPasswordForm.jsx, ResetPasswordForm.jsx, SocialLogin.jsx.
Key Observations for Profile Image Feature:
The Header.jsx component has an Avatar from shadcn that currently uses AvatarFallback with the user's initials. There is an AvatarImage component available but no src is being set from user data.
The ProfileSettings.jsx component displays user name and email but has no avatar upload UI.
The User object in AuthContext has: name, email, createdAt.
Key Observations for Overdue Email Feature:
NotificationSettings.jsx has toggles for email notifications, push notifications, and overdue task reminders, but these are UI-only (useState with hardcoded defaults). They don't persist to the backend.
Auth Flow on Frontend
Login/Register: User submits credentials → authService calls backend → On success, AuthContext stores accessToken, refreshToken in localStorage and fetches user profile.
Token Refresh: The api.js interceptor automatically handles 401 responses by calling the refresh endpoint and retrying the original request.
Logout: Clears localStorage and resets context state.
OAuth: SocialLogin.jsx opens a popup to the backend OAuth URL, then listens for a postMessage with tokens.
Protected Routes: ProtectedRoute checks for tokens in localStorage.
Existing Profile/Settings Pages
SettingsPage.jsx: Uses tabs for Profile, Security, Preferences, and Notifications.
ProfileSettings.jsx: Displays user info (name, email as read-only) with an "Update Profile" button that calls authService.updateProfile({ name }).
There is NO existing avatar/image functionality on the frontend.
Styling Approach
TailwindCSS v4 via @tailwindcss/vite plugin.
CSS Variables defined in index.css for theming (light and dark modes via .dark class).
shadcn/ui components use these CSS variables.
Google Font: Inter is imported in index.css.
Custom CSS for scrollbar styling, animations (fadeIn, slideUp), and toast styling.
All npm Dependencies and Their Purposes
Dependency	Purpose
react, react-dom	Core React library
react-router-dom	Client-side routing
axios	HTTP client for API calls
@hello-pangea/dnd	Drag and drop for Kanban board
@hookform/resolvers	Form validation resolvers
class-variance-authority	CSS class composition (shadcn)
clsx	Conditional class joining (shadcn)
cmdk	Command menu component
date-fns	Date utilities
framer-motion	Animations
lucide-react	Icons
react-day-picker	Date picker component
react-hook-form	Form management
recharts	Charts/graphs
sonner	Toast notifications
tailwind-merge	Tailwind class merging (shadcn)
zod	Schema validation
@radix-ui/*	Headless UI primitives (shadcn base)
This completes the comprehensive frontend architecture analysis.

[From subagent aeb4e0b5-2459-43df-a2f2-d6bfe3bc4172 (Documentation Researcher)]: Here is a comprehensive report of all documentation files found in the project.

Documentation Files Found
The project has a docs directory at c:\Users\Admin\Desktop\cong-nghe-web-giua-ki\to-do-list\docs\ containing 13 documentation files. There are no README.md files in the project root, backend, or frontend directories.

1. docs/api-reference.md (13,816 bytes)
Summary: Complete REST API reference documentation covering all endpoints.

Key Contents:

Base URL: http://localhost:5001/api
Auth endpoints: POST /auth/register, /auth/login, /auth/refresh-token, /auth/profile (GET/PUT), /auth/change-password, /auth/forgot-password, /auth/reset-password/:token, /auth/google, /auth/github
Task endpoints: Full CRUD at /tasks, plus /tasks/batch/status, /tasks/batch/delete, /tasks/:id/tags, /tasks/:id/pin
Category endpoints: Full CRUD at /categories
Statistics endpoints: /statistics/tasks, /statistics/productivity
Voice Task endpoint: POST /voice/process
Response format: { success: true/false, data/message/error }
Error codes: 400, 401, 403, 404, 409, 500
Rate limiting: 100 requests/15min general, 20 requests/15min for auth
Important note for profile: PUT /api/auth/profile currently accepts { name } only. The updateProfile in authViewModel handles name validation.
2. docs/architecture.md (6,024 bytes)
Summary: System architecture overview using MVVM pattern.

Key Contents:

Pattern: MVVM (Model-View-ViewModel)
Layers:
Model: Mongoose schemas (User, Task, Category)
ViewModel: Business logic layer (authViewModel, taskViewModel, categoryViewModel, statisticsViewModel, voiceTaskViewModel)
Routes: Express routers that call ViewModels
Services: External integrations (emailService, aiService)
Middleware: Auth (JWT verify), validation, error handling, rate limiting
Config: Database connection, environment variables
Data flow: Client → Route → Middleware → ViewModel → Model → Database
Tech stack: Node.js + Express, MongoDB + Mongoose, JWT auth, Socket.IO for real-time
3. docs/auth-flow.md (5,792 bytes)
Summary: Detailed authentication and authorization flow.

Key Contents:

Strategy: JWT-based with access + refresh tokens
Access token: 2 days expiry, stored in localStorage
Refresh token: 7 days expiry, stored in user document + localStorage
Registration: Name + email + password → hash with bcrypt (salt 12) → save user → generate tokens
Login: Find user by email → compare password → generate tokens → save refresh token to DB
Token refresh: Verify refresh token → check against DB stored token → generate new pair
Password reset: Generate reset token (crypto.randomBytes) → store hashed token + expiry → send email → verify on reset
OAuth: Google/GitHub → verify with provider → find/create user → generate tokens
Middleware: authenticateToken extracts Bearer token, verifies JWT, attaches req.user = { userId, email }
4. docs/business-logic.md (5,588 bytes)
Summary: Core business rules and domain logic.

Key Contents:

Task rules: Status enum (pending/in-progress/completed), Priority enum (low/medium/high), Due date must be future, Tags max 10 per task, auto-complete sets completedAt
Category rules: Name unique per user, max 50 categories, can't delete if has tasks (referential integrity)
User rules: Email unique, password min 8 chars, name 2-50 chars
Statistics: Calculated from task data, not stored. Completion rate, overdue count, by-priority breakdown
Overdue logic: A task is overdue if dueDate < now AND status !== 'completed'
5. docs/coding-convention.md (5,244 bytes)
Summary: Project coding standards and conventions.

Key Contents:

Naming: camelCase for variables/functions, PascalCase for components/models, UPPER_SNAKE for constants
File naming: camelCase for backend, PascalCase for React components
Architecture: MVVM strict, no direct model access from routes
Error handling: Try-catch in every ViewModel method, consistent { success, data/message/error } response
HTTP status codes: 200 success, 201 created, 400 bad request, 401 unauthorized, 404 not found, 500 server error
Validation: Validate in ViewModel before DB operations
Comments: JSDoc style for functions
Git: Conventional commits (feat/fix/docs/refactor/test)
6. docs/database.md (7,588 bytes)
Summary: Complete database schema documentation.

Key Contents:

User Model:



name: String (required, trim, 2-50)
email: String (required, unique, lowercase, trim)
password: String (required, min 8, select: false)
refreshToken: String
googleId: String
githubId: String
resetPasswordToken: String
resetPasswordExpires: Date
timestamps: true
Virtual: tasks (ref: Task, localField: _id, foreignField: userId)
Indexes: { email: 1 } unique
Task Model:



title: String (required, trim, 1-200)
description: String (trim, max 2000)
status: String (enum: pending/in-progress/completed, default: pending)
priority: String (enum: low/medium/high, default: medium)
dueDate: Date
completedAt: Date
tags: [String] (max 10 items, each max 30 chars)
isPinned: Boolean (default: false)
category: ObjectId (ref: Category)
userId: ObjectId (ref: User, required)
timestamps: true
Indexes: { userId: 1, status: 1 }, { userId: 1, dueDate: 1 }, { userId: 1, priority: 1 }
Category Model:



name: String (required, trim, 1-50)
color: String (default: #3B82F6, hex validation)
icon: String (default: folder)
description: String (max 200)
userId: ObjectId (ref: User, required)
timestamps: true
Indexes: { userId: 1, name: 1 } unique compound
7. docs/feature-patterns.md (5,977 bytes)
Summary: Standard patterns for implementing features.

Key Contents:

Backend pattern: Model → ViewModel (with validation + business logic) → Route (with middleware) → Response format
Frontend pattern: Service (API calls) → Hook (state + logic) → Component (UI) → Page (composition)
Form pattern: react-hook-form + zod schema + shadcn/ui form components
Error handling pattern: Backend try-catch → frontend toast notifications via sonner
Loading pattern: Skeleton components during loading, disabled buttons with spinners during mutations
CRUD pattern example: Shows complete flow from model to page for a hypothetical feature
Real-time pattern: Socket.IO for live updates (tasks)
8. docs/folder-structure.md (3,427 bytes)
Summary: Complete directory tree and file organization.

Key Contents:



backend/src/
├── config/        # db.js, env.js
├── cron/          # scheduledTasks.js
├── middleware/     # auth.js, errorHandler.js, rateLimiter.js, validate.js
├── models/        # User.js, Task.js, Category.js
├── routes/        # auth.js, tasks.js, categories.js, statistics.js, voice.js
├── scripts/       # seedData.js
├── services/      # emailService.js, aiService.js
├── viewmodels/    # authViewModel.js, taskViewModel.js, categoryViewModel.js, statisticsViewModel.js, voiceTaskViewModel.js
└── server.js
frontend/src/
├── components/
│   ├── ui/         # shadcn primitives
│   ├── layout/     # Header, Sidebar
│   ├── tasks/      # Task components
│   ├── categories/ # Category components
│   ├── dashboard/  # Dashboard widgets
│   ├── statistics/ # Stats components
│   ├── settings/   # Settings tabs
│   └── auth/       # Auth forms
├── hooks/          # Custom hooks
├── layouts/        # MainLayout
├── lib/            # utils.js
├── pages/          # Page components
├── routes/         # AppRouter
└── services/       # API services
9. docs/socket-events.md (2,792 bytes)
Summary: Socket.IO real-time event documentation.

Key Contents:

Connection: Authenticates via JWT token in handshake
Events emitted by server: task:created, task:updated, task:deleted, task:statusChanged
Events listened by client: Same as above
Room strategy: Each user joins their own room (user:<userId>)
Used for: Real-time task list sync across tabs/devices
10. docs/task-system.md (6,165 bytes)
Summary: Complete task management system documentation.

Key Contents:

CRUD operations with user-scoped access
Filtering: By status, priority, category, tags, date range, search text
Sorting: By dueDate, priority, createdAt, title (asc/desc)
Batch operations: Update status or delete multiple tasks
Tag system: Add/remove tags, max 10 per task
Pin system: Toggle pin, pinned tasks shown first
Voice task creation: Natural language → AI parses → creates task
Overdue detection: dueDate < now && status !== 'completed'
Statistics: Completion rate, overdue count, by-priority, by-category, productivity over time
11. docs/testing-strategy.md (4,123 bytes)
Summary: Testing approach and tooling.

Key Contents:

Backend: Jest for unit testing ViewModels and services
Frontend: Playwright for E2E testing
E2E test structure in frontend/e2e/
Test naming: *.test.js for backend, *.spec.js for E2E
Coverage target: 80% for ViewModels, 60% for services
12. docs/voice-task.md (5,865 bytes)
Summary: Voice/AI task creation feature documentation.

Key Contents:

Flow: User speaks/types natural language → frontend sends text → backend AI service parses → extracts title, description, priority, dueDate, tags → creates task
AI provider cascade: OpenRouter → Gemini → Groq → Ollama (local fallback)
Rate limiting: Per-user, configurable window
Caching: TTL-based cache for identical requests
Retry strategy: Exponential backoff with jitter
13. docs/env-configuration.md (3,944 bytes)
Summary: Environment variable documentation.

Key Contents:

Lists all env variables with descriptions, defaults, and whether they're required
Cloudinary: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUD_NAME — listed as "optional, for future profile image feature"
Resend: RESEND_API_KEY — listed as "optional, for future email notification feature"
Current email: emailService.js uses nodemailer with SMTP for password reset emails only
Key Findings for the Two Planned Features
Profile Image Feature:
Cloudinary credentials are already configured in .env
User model has NO avatar/profileImage field yet
Frontend Avatar component exists (shadcn) but uses initials fallback only
ProfileSettings.jsx exists but has no image upload UI
No file upload middleware (e.g., multer) is installed
The docs explicitly mention Cloudinary is "for future profile image feature"
Overdue Email Feature:
Resend API key is already configured in .env
Existing emailService.js uses nodemailer/SMTP for password reset only
Existing cron/scheduledTasks.js exists (need backend researcher to confirm contents)
Overdue logic is defined: dueDate < now && status !== 'completed'
NotificationSettings.jsx has UI toggles but they're non-functional (state only)
The docs mention Resend is "for future email notification feature"
node-cron is likely a dependency for scheduled tasks
[From subagent 5e77e633-793c-4545-b887-b881fe8e38dc (Backend Architecture Researcher)]: Here is a comprehensive analysis of the backend architecture.

Overall Architecture Pattern
MVVM (Model-View-ViewModel) — The backend uses a clear separation:

Models: Mongoose schemas (data layer)
ViewModels: Business logic layer (replaces traditional controllers)
Routes: Express routers that call ViewModel methods
Services: External integrations (email, AI)
Middleware: Cross-cutting concerns (auth, validation, rate limiting)
NPM Dependencies (from package.json)
json


{
  "dependencies": {
    "bcryptjs": "^3.0.2",         // Password hashing
    "cloudinary": "^2.6.1",       // Image upload (configured but not yet used)
    "cors": "^2.8.5",             // CORS middleware
    "dotenv": "^16.5.0",          // Environment variables
    "express": "^5.1.0",          // Web framework (v5!)
    "jsonwebtoken": "^9.0.2",     // JWT auth
    "mongoose": "^8.14.1",        // MongoDB ODM
    "morgan": "^1.10.0",          // HTTP request logging
    "multer": "^1.4.5-lts.2",    // File upload middleware (installed!)
    "node-cron": "^3.0.3",        // Cron scheduler
    "nodemailer": "^6.10.1",      // Email (currently for password reset)
    "resend": "^4.5.1",           // Email via Resend API (installed but not yet used)
    "socket.io": "^4.8.1"         // Real-time WebSocket
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.10"
  }
}
Key finding: Both multer (file upload) and resend packages are already installed but not yet used in the codebase.

Server Entry Point (server.js)
javascript


import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { initScheduledTasks } from "./cron/scheduledTasks.js";
// Route imports
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import categoryRoutes from "./routes/categories.js";
import statisticsRoutes from "./routes/statistics.js";
import voiceRoutes from "./routes/voice.js";
dotenv.config();
const app = express();
const httpServer = createServer(app);
// Socket.IO setup
const io = new Server(httpServer, {
  cors: { origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(","), credentials: true },
});
// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(","), credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
// Make io accessible to routes
app.set("io", io);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/voice", voiceRoutes);
// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
// Socket.IO authentication
io.use((socket, next) => {
  // JWT verification for socket connections
});
io.on("connection", (socket) => {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  socket.on("disconnect", () => { /* cleanup */ });
});
// Start server
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initScheduledTasks(); // Initialize cron jobs
  });
});
export { io };
export default app;
Config Files
config/db.js
Standard Mongoose connection to MongoDB Atlas using MONGODB_CONNECTIONSTRING.

config/env.js
Validates and exports environment variables with defaults:

javascript


export const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodb: { connectionString: process.env.MONGODB_CONNECTIONSTRING },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_EXPIRY || "2d",
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  },
  cloudinary: {
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudName: process.env.CLOUD_NAME,
  },
  resend: { apiKey: process.env.RESEND_API_KEY },
  cors: { origin: process.env.CORS_ORIGIN, credentials: process.env.CORS_CREDENTIALS === "true" },
  smtp: { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  app: { url: process.env.APP_URL || "http://localhost:5173" },
  // ... AI config omitted for brevity
};
Key finding: Cloudinary and Resend config are already exported from config/env.js but not consumed anywhere.

Database Models
User Model (models/User.js)
javascript


const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  refreshToken: { type: String },
  googleId: { type: String },
  githubId: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
// Virtual: tasks
userSchema.virtual("tasks", { ref: "Task", localField: "_id", foreignField: "userId" });
// Index
userSchema.index({ email: 1 }, { unique: true });
// Pre-save: hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
// Method: comparePassword
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
No avatar/profileImage field exists.

Task Model (models/Task.js)
javascript


const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  dueDate: { type: Date },
  completedAt: { type: Date },
  tags: {
    type: [String],
    validate: [v => v.length <= 10, "Maximum 10 tags allowed"],
    default: [],
  },
  isPinned: { type: Boolean, default: false },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
// Indexes
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });
// Pre-save: auto-set completedAt
taskSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "completed") {
    this.completedAt = new Date();
  } else if (this.isModified("status") && this.status !== "completed") {
    this.completedAt = undefined;
  }
  next();
});
No overdueEmailSentAt or notification tracking field.

Category Model (models/Category.js)
javascript


const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
  color: { type: String, default: "#3B82F6", match: /^#([A-Fa-f0-9]{6})$/ },
  icon: { type: String, default: "folder" },
  description: { type: String, maxlength: 200 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
categorySchema.index({ userId: 1, name: 1 }, { unique: true });
Middleware
middleware/auth.js
javascript


export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = user; // { userId, email }
    next();
  });
};
middleware/rateLimiter.js
In-memory rate limiter (Map-based):

generalLimiter: 100 requests / 15 minutes
authLimiter: 20 requests / 15 minutes
Cleans up expired entries every minute
middleware/validate.js
Generic Zod-based validation middleware:

javascript


export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: result.error.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    });
  }
  req.validatedData = result.data;
  next();
};
middleware/errorHandler.js
Global error handler:

javascript


export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
Routes
Auth Routes (routes/auth.js)


POST   /register         → authViewModel.register
POST   /login            → authViewModel.login
POST   /refresh-token    → authViewModel.refreshToken
GET    /profile          → [auth] authViewModel.getProfile
PUT    /profile          → [auth] authViewModel.updateProfile
PUT    /change-password   → [auth] authViewModel.changePassword
POST   /forgot-password   → authViewModel.forgotPassword
POST   /reset-password/:token → authViewModel.resetPassword
POST   /google           → authViewModel.googleLogin
POST   /github           → authViewModel.githubLogin
Task Routes (routes/tasks.js)


GET    /                 → [auth] taskViewModel.getTasks (with query filters)
POST   /                 → [auth] taskViewModel.createTask
GET    /:id              → [auth] taskViewModel.getTaskById
PUT    /:id              → [auth] taskViewModel.updateTask
DELETE /:id              → [auth] taskViewModel.deleteTask
PUT    /batch/status     → [auth] taskViewModel.batchUpdateStatus
POST   /batch/delete     → [auth] taskViewModel.batchDelete
PUT    /:id/tags         → [auth] taskViewModel.updateTaskTags
PUT    /:id/pin          → [auth] taskViewModel.togglePin
Category Routes (routes/categories.js)


GET    /                 → [auth] categoryViewModel.getCategories
POST   /                 → [auth] categoryViewModel.createCategory
PUT    /:id              → [auth] categoryViewModel.updateCategory
DELETE /:id              → [auth] categoryViewModel.deleteCategory
Statistics Routes (routes/statistics.js)


GET    /tasks            → [auth] statisticsViewModel.getTaskStatistics
GET    /productivity     → [auth] statisticsViewModel.getProductivityData
Voice Routes (routes/voice.js)
POST   /process          → [auth, rateLimiter] voiceTaskViewModel.processVoiceTask
ViewModels (Business Logic Layer)
authViewModel.js - Key methods:
register(req, res): Validates input, checks duplicate email, creates user, generates tokens
login(req, res): Finds user (with password selected), compares password, generates tokens, saves refresh token
getProfile(req, res): Finds user by req.user.userId, returns { name, email, createdAt }
updateProfile(req, res): Validates name (2-50 chars), updates user, returns updated user
Token generation: generateTokens(user) creates both access and refresh tokens
Key observation for profile image: updateProfile currently only handles name. Response returns { _id, name, email, createdAt }.

taskViewModel.js - Key methods:
getTasks: Supports filters (status, priority, category, search, tags, dateFrom, dateTo) and sorting
createTask: Validates required fields, checks category ownership, creates task, emits Socket.IO event
updateTask: Validates ownership, updates fields, emits Socket.IO event
deleteTask: Validates ownership, deletes, emits Socket.IO event
batchUpdateStatus / batchDelete: Bulk operations with ownership verification
statisticsViewModel.js:
Aggregates task data: total, completed, pending, in-progress, overdue count
Overdue query: { userId, status: { $ne: "completed" }, dueDate: { $lt: new Date() } }
Productivity data: tasks completed per day over last 30 days
Services
emailService.js
Uses nodemailer with SMTP configuration:

javascript


class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
    await this.transporter.sendMail({
      from: `"Todo App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `...reset email template...`,
    });
  }
}
export default new EmailService();
Key observation: This is the ONLY email service. It uses nodemailer/SMTP, NOT Resend. Resend is installed but unused.

aiService.js
Complex AI service with:

Multi-provider cascade (OpenRouter → Gemini → Groq → Ollama)
Round-robin API key rotation
Exponential backoff retry
In-memory caching
Concurrency queue (p-queue pattern)
Parses natural language into task JSON
Cron Jobs (cron/scheduledTasks.js)
javascript


import cron from "node-cron";
import Task from "../models/Task.js";
export function initScheduledTasks() {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Running scheduled task: checking overdue tasks...");
      const overdueTasks = await Task.find({
        status: { $ne: "completed" },
        dueDate: { $lt: new Date() },
      }).populate("userId", "name email");
      if (overdueTasks.length > 0) {
        console.log(`Found ${overdueTasks.length} overdue tasks`);
        // TODO: Send notifications for overdue tasks
      }
    } catch (error) {
      console.error("Scheduled task error:", error);
    }
  });
  console.log("Scheduled tasks initialized");
}
Key finding: The cron job already exists and finds overdue tasks, but the notification sending is a TODO placeholder. This is exactly where the overdue email feature needs to be implemented.

Scripts (scripts/seedData.js)
Seeds sample data for development: creates a test user, categories, and tasks.

Error Handling Patterns
Every ViewModel method wrapped in try-catch
Consistent response: { success: true/false, data/message/error }
Global errorHandler middleware catches unhandled errors
Validation errors return 400 with field-level error details
Validation Patterns
Zod schemas used for route-level validation via validate middleware
Additional business logic validation in ViewModels
Mongoose schema-level validation as last line of defense
Summary of Key Findings for Planned Features
Profile Image:
✅ cloudinary npm package installed
✅ multer npm package installed
✅ Cloudinary config exported from config/env.js
❌ No avatar field in User model
❌ No Cloudinary initialization/configuration code
❌ No upload route or middleware
❌ updateProfile only handles name
Pattern to follow: ViewModel pattern, consistent response format, auth middleware
Overdue Email:
✅ resend npm package installed
✅ Cron job infrastructure exists (node-cron, initScheduledTasks)
✅ Overdue task query already written in cron job
✅ Overdue query logic defined in statisticsViewModel
❌ Cron job has TODO for notification sending
❌ No Resend service class
❌ No email notification tracking in Task or User model
❌ No notification preferences in User model
Pattern to follow: EmailService class pattern, cron pattern, ViewModel pattern
Excellent! All three research subagents have reported back with comprehensive findings. I now have a deep understanding of the entire codebase. Let me synthesize everything and create the feature documentation.