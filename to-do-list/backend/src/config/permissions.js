export const ROLE_PERMISSIONS = {
  user: [
    "profile:read",
    "profile:update",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "audit-logs:read:self",
    "audit-logs:delete:self",
  ],
  admin: [
    "admin:access",
    "users:read",
    "users:update",
    "users:disable",
    "users:delete",
    "moderation:read",
    "trash:read",
    "analytics:read",
    "audit-logs:read:any",
    "audit-logs:delete:any",
  ],
};

export const getPermissionsByRole = (role = "user") =>
  ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;

export const hasPermission = (role, permission) =>
  getPermissionsByRole(role).includes(permission);
