# 05 — Kiến Trúc Hệ Thống

> **Phiên bản:** 1.1 · **Cập nhật lần cuối:** 2026-04-03

---

## 1. Component Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        SPA["React SPA<br/>(Vite + TailwindCSS)"]
        Router["react-router-dom<br/>+ Route Guards"]
        I18n["i18n<br/>(VI/EN)"]
        SocketClient["Socket.IO Client"]
    end

    subgraph "API Gateway Layer"
        Express["Express.js Server"]
        AuthMW["Auth Middleware<br/>(JWT Verify)"]
        RoleMW["Role Middleware<br/>(RBAC: user/admin)"]
        Validator["Input Validator<br/>(express-validator)"]
    end

    subgraph "ViewModel Layer (MVVM)"
        AuthVM["Auth ViewModel"]
        TaskVM["Task ViewModel"]
        AdminVM["Admin ViewModel"]
        ProfileVM["Profile ViewModel"]
    end

    subgraph "Auth Providers"
        Passport["Passport.js"]
        GoogleOAuth["Google Strategy"]
        GitHubOAuth["GitHub Strategy"]
        LocalAuth["Local Strategy<br/>(bcrypt)"]
    end

    subgraph "Realtime Layer"
        SocketServer["Socket.IO Server<br/>Namespace: /v1/realtime"]
        UserRoom["Room: user:userId"]
        AdminRoom["Room: admin-channel"]
    end

    subgraph "Data Layer"
        Mongoose["Mongoose ODM"]
        UserModel["User Model"]
        TaskModel["Task Model"]
        SessionModel["RefreshSession Model"]
        AuditModel["AuditLog Model"]
    end

    subgraph "Infrastructure"
        MongoDB[("MongoDB")]
        CronJob["Cron Job<br/>(Purge expired)"]
    end

    SPA --> Router
    SPA --> I18n
    SPA <-->|"REST /api/v1"| Express
    SPA <-->|"WebSocket"| SocketClient
    SocketClient <--> SocketServer

    Express --> AuthMW --> RoleMW --> Validator
    Validator --> AuthVM
    Validator --> TaskVM
    Validator --> AdminVM
    Validator --> ProfileVM

    AuthVM --> Passport
    Passport --> GoogleOAuth
    Passport --> GitHubOAuth
    Passport --> LocalAuth

    SocketServer --> UserRoom
    SocketServer --> AdminRoom

    AuthVM --> Mongoose
    TaskVM --> Mongoose
    AdminVM --> Mongoose
    ProfileVM --> Mongoose

    Mongoose --> UserModel --> MongoDB
    Mongoose --> TaskModel --> MongoDB
    Mongoose --> SessionModel --> MongoDB
    Mongoose --> AuditModel --> MongoDB

    CronJob -->|"Purge soft-deleted > 7d"| MongoDB
```

---

## 2. Sequence Diagrams

### 2.1 Đăng ký & Đăng nhập (Local Auth)

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant SPA as React SPA
    participant API as Express API
    participant DB as MongoDB

    Note over U,DB: --- Đăng ký ---
    U->>SPA: Nhập email, password, displayName
    SPA->>API: POST /api/v1/auth/register
    API->>API: Validate input
    API->>DB: Check email exists
    alt Email đã tồn tại
        DB-->>API: Found
        API-->>SPA: 409 EMAIL_EXISTS
        SPA-->>U: Hiển thị lỗi
    else Email chưa tồn tại
        API->>API: Hash password (bcrypt)
        API->>DB: Insert user (providers: ["local"])
        API->>API: Generate JWT access token
        API->>API: Create refresh session (hash token)
        API->>DB: Insert refresh_session
        API-->>SPA: 201 { accessToken, user }
        Note over API,SPA: Set-Cookie: refreshToken (httpOnly)
        SPA-->>U: Redirect → Home
    end

    Note over U,DB: --- Đăng nhập ---
    U->>SPA: Nhập email, password
    SPA->>API: POST /api/v1/auth/login
    API->>DB: Find user by email
    API->>API: Verify password (bcrypt)
    alt Sai thông tin
        API-->>SPA: 401 INVALID_CREDENTIALS
    else Đúng
        API->>API: Generate new JWT + refresh session
        API-->>SPA: 200 { accessToken, user }
        Note over API,SPA: Set-Cookie: refreshToken (httpOnly)
    end
```

### 2.2 OAuth Flow (Google/GitHub)

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant SPA as React SPA
    participant API as Express API
    participant OAuth as Google/GitHub
    participant DB as MongoDB

    U->>SPA: Click "Đăng nhập Google"
    SPA->>API: GET /api/v1/auth/google
    API->>OAuth: Redirect → OAuth consent screen
    U->>OAuth: Cho phép truy cập
    OAuth->>API: Callback với auth code
    API->>OAuth: Exchange code → user profile
    OAuth-->>API: { email, name, avatar, providerId }

    API->>DB: Find user by email
    alt User chưa tồn tại
        API->>DB: Create new user (providers: ["google"])
        API-->>SPA: 201 + token + toast "Tài khoản mới"
    else User đã tồn tại, chưa link Google
        Note over API: Auto-link (ADR-003)
        API->>DB: Push "google" vào providers[]
        API-->>SPA: 200 + token + toast warning<br/>"Tài khoản đã được liên kết"
    else User đã link Google
        API-->>SPA: 200 + token (đăng nhập bình thường)
    end

    SPA-->>U: Redirect → Home
```

### 2.3 Task CRUD + Realtime Sync

```mermaid
sequenceDiagram
    actor U as User A
    participant SPA_A as SPA (Device A)
    participant API as Express API
    participant Socket as Socket.IO Server
    participant SPA_B as SPA (Device B)
    participant DB as MongoDB

    Note over U,DB: User A tạo task từ Device A

    U->>SPA_A: Nhấn "Tạo Task" → Fill form
    SPA_A->>API: POST /api/v1/tasks
    API->>DB: Insert task
    DB-->>API: Created
    API-->>SPA_A: 201 { task }

    API->>Socket: Emit "task:changed"<br/>to room user:{userId}
    Socket->>SPA_A: event "task:changed"
    Socket->>SPA_B: event "task:changed"

    Note over SPA_A,SPA_B: Full Refetch Strategy (ADR-002)

    SPA_A->>API: GET /api/v1/tasks
    SPA_B->>API: GET /api/v1/tasks
    API->>DB: Query tasks
    DB-->>API: Results
    API-->>SPA_A: Updated task list
    API-->>SPA_B: Updated task list
```

### 2.4 Admin Moderation Flow

```mermaid
sequenceDiagram
    actor Admin
    participant SPA as Admin SPA
    participant API as Express API
    participant Socket as Socket.IO
    participant DB as MongoDB

    Admin->>SPA: Mở trang Moderation
    SPA->>API: GET /api/v1/admin/moderation
    API->>DB: Find users WHERE<br/>lastOnlineAt < (now - 30d)<br/>AND status = "active"
    DB-->>API: Inactive users list
    API-->>SPA: 200 { users }
    SPA-->>Admin: Hiển thị danh sách

    Admin->>SPA: Click "Vô hiệu hóa" trên user X
    SPA->>API: PUT /api/v1/admin/moderation/:id/disable
    API->>DB: Update user.status = "disabled"
    API->>DB: Insert audit_log (action: "user.disabled")
    API-->>SPA: 200 OK

    API->>Socket: Emit "user:updated" → room user:{userId}
    API->>Socket: Emit "admin:metrics-updated" → admin-channel
```

---

## 3. Authentication Architecture

### 3.1 JWT Strategy

```mermaid
graph LR
    A[User Login] --> B[Generate Access Token]
    A --> C[Generate Refresh Token]
    B --> D["Memory (SPA variable)<br/>Short-lived: 15min"]
    C --> E["httpOnly Cookie<br/>Long-lived: 7 days"]
    C --> F["Hash bằng bcrypt<br/>→ DB refresh_sessions"]
```

| Token | Lưu trữ | TTL | Sử dụng |
|-------|---------|-----|---------|
| **Access Token** | Memory (JS variable) | 15 phút | Header `Authorization: Bearer <token>` |
| **Refresh Token** | httpOnly cookie | 7 ngày | Tự động gửi khi gọi `/auth/refresh` |

### 3.2 Token Rotation

1. Access token hết hạn → SPA interceptor gọi `POST /auth/refresh`
2. Server verify refresh token (compare bcrypt hash)
3. Nếu hợp lệ: issue access token mới + refresh token mới (xóa token cũ)
4. Nếu không hợp lệ: 401 → redirect Login

### 3.3 Multi-device Sessions

- Mỗi login = 1 `refresh_session` record
- User xem danh sách sessions tại `GET /profile/sessions`
- User xóa session cụ thể tại `DELETE /profile/sessions/:id`
- TTL index trên `expiresAt` → tự động dọn session hết hạn

---

## 4. Realtime Architecture (Socket.IO)

### 4.1 Connection Lifecycle

```mermaid
graph TD
    A[Client Connect] --> B{JWT Valid?}
    B -->|Không| C[Disconnect + Error]
    B -->|Có| D[Join room user:userId]
    D --> E{role = admin?}
    E -->|Có| F[Join room admin-channel]
    E -->|Không| G[Ready]
    F --> G
    G --> H[Lắng nghe events]
    H --> I[Nhận event → Full Refetch]
```

### 4.2 Event Flow

| Trigger | Event | Target Room | Client Action |
|---------|-------|-------------|---------------|
| CRUD Task | `task:changed` | `user:{ownerId}` | Fetch lại `/tasks` |
| Admin thay đổi user | `user:updated` | `user:{targetUserId}` | Fetch lại `/profile` |
| Event hệ thống quan trọng | `admin:metrics-updated` | `admin-channel` | Fetch lại `/admin/analytics` |

→ Chi tiết chiến lược Full Refetch: [ADR-002](./07-architectural-decisions.md#adr-002)

---

## 5. Security Architecture

| Layer | Measure | Chi tiết |
|-------|---------|----------|
| **Transport** | HTTPS | TLS encryption cho mọi request |
| **Auth** | JWT + httpOnly Cookie | Access token không lưu localStorage |
| **Password** | bcrypt hashing | Cả user password và refresh token |
| **Input** | express-validator | Server-side validation mọi endpoint |
| **CORS** | Whitelist origin | Chỉ cho phép SPA origin |
| **Rate Limiting** | express-rate-limit | Giới hạn request/IP cho auth endpoints |
| **Socket.IO** | JWT handshake | Xác thực khi thiết lập kết nối |

---

> **Tham chiếu:**
> - Schema dữ liệu → [02-thiet-ke-csdl.md](./02-thiet-ke-csdl.md)
> - API endpoints → [03-thiet-ke-api.md](./03-thiet-ke-api.md)
> - Quyết định kiến trúc → [07-architectural-decisions.md](./07-architectural-decisions.md)
