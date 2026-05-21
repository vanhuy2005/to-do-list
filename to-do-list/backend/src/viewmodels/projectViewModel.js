import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { realtimeService } from "../services/realtimeService.js";

const RESTORE_WINDOW_DAYS = 7;
const MAX_MEMBERS_PER_PROJECT = 50;
const MAX_SHARE_LINKS_PER_PROJECT = 10;
const ALLOWED_PROJECT_ROLES = ["viewer", "comment", "editor", "owner"];
const EDIT_PROJECT_ROLES = ["editor", "owner"];

class ViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "ViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const ensureValidObjectId = (id, typeName = "ID") => {
  if (!id || !String(id).match(/^[0-9a-fA-F]{24}$/)) {
    throw new ViewModelError(400, "INVALID_ID", `${typeName} không hợp lệ`);
  }
};

const resolveUserId = (userId) => {
  if (!userId) {
    throw new ViewModelError(401, "MISSING_AUTH", "Bạn cần đăng nhập để thực hiện thao tác này");
  }
  return userId;
};

const asStringId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const getProjectRole = (project, userId) => {
  if (!project || !userId) return null;
  if (asStringId(project.ownerId) === asStringId(userId)) return "owner";
  
  const member = (project.members || []).find(
    (m) => asStringId(m.userId) === asStringId(userId)
  );
  return member ? member.role : null;
};

const checkProjectAccess = (project, userId, requiredRoles = ALLOWED_PROJECT_ROLES) => {
  if (!project || project.deletedAt) {
    throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
  }
  const role = getProjectRole(project, userId);
  if (!role || !requiredRoles.includes(role)) {
    throw new ViewModelError(403, "FORBIDDEN_PROJECT_ACCESS", "Bạn không có quyền thực hiện thao tác này");
  }
  if (project.status === "archived" && role !== "owner") {
    throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại hoặc đã được lưu trữ");
  }
  return role;
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateSecureToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateInviteCode = () => {
  // 6 character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const writeProjectAuditLog = async ({
  actorId,
  action,
  entityId,
  summaryBefore = {},
  summaryAfter = {},
}) => {
  try {
    await AuditLog.create({
      actorId,
      targetId: actorId,
      action,
      entityType: "project",
      entityId,
      summaryBefore,
      summaryAfter,
    });
  } catch (error) {
    console.warn("Không thể ghi audit log dự án:", error.message);
  }
};

const projectViewModel = {
  async getAllProjects(userId) {
    const ownerId = resolveUserId(userId);
    const filter = {
      deletedAt: null,
      $or: [{ ownerId }, { "members.userId": ownerId }],
    };

    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .populate("ownerId", "email displayName")
      .populate("members.userId", "email displayName")
      .lean();

    const enriched = projects
      .map((p) => ({
        ...p,
        role: getProjectRole(p, ownerId),
      }))
      .filter((p) => !(p.status === "archived" && p.role !== "owner"));

    return {
      statusCode: 200,
      success: true,
      data: enriched,
    };
  },

  async getProjectById(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null })
      .populate("ownerId", "email displayName")
      .populate("members.userId", "email displayName")
      .populate("members.addedBy", "email displayName")
      .populate("shareLinks.createdBy", "email displayName");

    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    const userRole = checkProjectAccess(project, ownerId);

    // Hide secure properties (like shareLinks and inviteCode) for non-editors/owners
    const result = project.toObject();
    if (!EDIT_PROJECT_ROLES.includes(userRole)) {
      delete result.shareLinks;
      delete result.inviteCode;
    }

    return {
      statusCode: 200,
      success: true,
      data: {
        ...result,
        userRole,
      },
    };
  },

  async createProject(payload, userId) {
    const ownerId = resolveUserId(userId);
    if (!payload.name || !payload.name.trim()) {
      throw new ViewModelError(400, "MISSING_NAME", "Tên dự án là bắt buộc");
    }

    // Rate limit check: max 10 projects per hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlyCount = await Project.countDocuments({
      ownerId,
      createdAt: { $gte: oneHourAgo },
    });
    if (hourlyCount >= 10) {
      throw new ViewModelError(429, "RATE_LIMIT_EXCEEDED", "Bạn đã tạo quá nhiều dự án trong 1 giờ. Vui lòng thử lại sau.");
    }

    const project = await Project.create({
      ownerId,
      name: payload.name.trim(),
      description: payload.description || "",
      emoji: payload.emoji || "📝",
      visibility: payload.visibility || "private",
      members: [
        {
          userId: ownerId,
          role: "owner",
          addedBy: ownerId,
          addedAt: new Date(),
        },
      ],
    });

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.created",
      entityId: project._id,
      summaryAfter: { name: project.name, emoji: project.emoji },
    });

    return {
      statusCode: 201,
      success: true,
      data: project,
      message: "Tạo dự án thành công",
    };
  },

  async updateProject(projectId, payload, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, EDIT_PROJECT_ROLES);

    const summaryBefore = {
      name: project.name,
      description: project.description,
      emoji: project.emoji,
      visibility: project.visibility,
    };

    if (payload.name !== undefined) {
      if (!payload.name.trim()) {
        throw new ViewModelError(400, "MISSING_NAME", "Tên dự án không được để trống");
      }
      project.name = payload.name.trim();
    }
    if (payload.description !== undefined) project.description = payload.description;
    if (payload.emoji !== undefined) project.emoji = payload.emoji;
    
    // Visibility changes allowed by Owner only
    if (payload.visibility !== undefined) {
      checkProjectAccess(project, ownerId, ["owner"]);
      project.visibility = payload.visibility;
    }

    if (payload.settings !== undefined) {
      checkProjectAccess(project, ownerId, ["owner"]);
      project.settings = payload.settings;
    }

    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.updated",
      entityId: project._id,
      summaryBefore,
      summaryAfter: {
        name: project.name,
        description: project.description,
        emoji: project.emoji,
        visibility: project.visibility,
      },
    });

    // Notify realtime channel
    realtimeService.publishProjectEvent(projectId, "project_updated", {
      projectId,
      name: project.name,
      description: project.description,
      emoji: project.emoji,
    });

    return {
      statusCode: 200,
      success: true,
      data: project,
      message: "Cập nhật dự án thành công",
    };
  },

  async deleteProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    // Delete can only be triggered by the owner
    checkProjectAccess(project, ownerId, ["owner"]);

    const deletedAt = new Date();
    const restoreUntil = new Date(deletedAt);
    restoreUntil.setDate(restoreUntil.getDate() + RESTORE_WINDOW_DAYS);

    project.deletedAt = deletedAt;
    project.restoreUntil = restoreUntil;
    await project.save();

    // Soft delete all tasks belonging to this project and keep track of it
    await Task.updateMany(
      { projectId, deletedAt: null },
      { deletedAt, restoreUntil, $set: { "settings.restoredByProject": true } }
    );

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.deleted",
      entityId: project._id,
      summaryBefore: { name: project.name },
      summaryAfter: { deletedAt, restoreUntil },
    });

    // Publish deletion event
    realtimeService.publishProjectEvent(projectId, "project_deleted", { projectId });

    return {
      statusCode: 200,
      success: true,
      message: "Dự án đã được đưa vào thùng rác. Tất cả task thuộc dự án đã được ẩn.",
    };
  },

  async restoreProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: { $ne: null } });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại trong thùng rác");
    }

    if (project.restoreUntil && new Date(project.restoreUntil) < new Date()) {
      throw new ViewModelError(410, "RESTORE_EXPIRED", "Đã hết thời gian khôi phục dự án");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    project.deletedAt = null;
    project.restoreUntil = null;
    await project.save();

    // Restore tasks soft-deleted along with project
    await Task.updateMany(
      { projectId, "settings.restoredByProject": true },
      { $set: { deletedAt: null, restoreUntil: null }, $unset: { "settings.restoredByProject": "" } }
    );

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.restored",
      entityId: project._id,
      summaryAfter: { name: project.name },
    });

    return {
      statusCode: 200,
      success: true,
      data: project,
      message: "Khôi phục dự án thành công",
    };
  },

  async hardDeleteProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: { $ne: null } });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại trong thùng rác");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    // Purge project tasks permanently
    await Task.deleteMany({ projectId });
    await project.deleteOne();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.purged",
      entityId: projectId,
      summaryBefore: { name: project.name },
    });

    return {
      statusCode: 200,
      success: true,
      message: "Dự án đã được xóa vĩnh viễn cùng toàn bộ task liên quan.",
    };
  },

  async archiveProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if (project.status === "archived") {
      throw new ViewModelError(400, "ALREADY_ARCHIVED", "Dự án đã được lưu trữ từ trước");
    }

    project.status = "archived";
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.archived",
      entityId: project._id,
      summaryAfter: { status: "archived" },
    });

    realtimeService.publishProjectEvent(projectId, "project_archived", { projectId });

    return {
      statusCode: 200,
      success: true,
      data: project,
      message: "Lưu trữ dự án thành công",
    };
  },

  async unarchiveProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if (project.status === "active") {
      throw new ViewModelError(400, "ALREADY_ACTIVE", "Dự án đang hoạt động bình thường");
    }

    project.status = "active";
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.unarchived",
      entityId: project._id,
      summaryAfter: { status: "active" },
    });

    realtimeService.publishProjectEvent(projectId, "project_unarchived", { projectId });

    return {
      statusCode: 200,
      success: true,
      data: project,
      message: "Khôi phục trạng thái dự án thành công",
    };
  },

  async addMember(projectId, payload, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(actorId);

    if (!payload.email || !payload.email.trim()) {
      throw new ViewModelError(400, "MISSING_EMAIL", "Email người được mời là bắt buộc");
    }
    const email = payload.email.trim().toLowerCase();
    const role = payload.role || "viewer";

    if (!ALLOWED_PROJECT_ROLES.includes(role) || role === "owner") {
      throw new ViewModelError(400, "INVALID_ROLE", "Vai trò không hợp lệ");
    }

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if ((project.members || []).length >= MAX_MEMBERS_PER_PROJECT) {
      throw new ViewModelError(400, "MEMBER_LIMIT_EXCEEDED", `Dự án đạt số lượng thành viên tối đa (${MAX_MEMBERS_PER_PROJECT} người)`);
    }

    const userToInvite = await User.findOne({ email, status: "active" });
    if (!userToInvite) {
      throw new ViewModelError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản hoạt động khớp với email này");
    }

    const alreadyMember = project.members.some(
      (m) => asStringId(m.userId) === asStringId(userToInvite._id)
    );
    if (alreadyMember) {
      throw new ViewModelError(400, "ALREADY_MEMBER", "Người dùng này đã là thành viên của dự án");
    }

    project.members.push({
      userId: userToInvite._id,
      role,
      addedBy: ownerId,
      addedAt: new Date(),
    });

    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "member.added",
      entityId: project._id,
      summaryAfter: { email: userToInvite.email, role },
    });

    const populatedProject = await Project.findById(projectId)
      .populate("members.userId", "email displayName")
      .populate("members.addedBy", "email displayName");

    // Publish membership event
    realtimeService.publishProjectEvent(projectId, "member_joined", {
      projectId,
      userId: userToInvite._id,
      email: userToInvite.email,
      displayName: userToInvite.displayName,
      role,
    });

    return {
      statusCode: 200,
      success: true,
      data: populatedProject.members,
      message: "Đã thêm thành viên mới",
    };
  },

  async updateMemberRole(projectId, memberUserId, payload, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    ensureValidObjectId(memberUserId, "Member User ID");
    const ownerId = resolveUserId(actorId);

    const role = payload.role;
    if (!ALLOWED_PROJECT_ROLES.includes(role) || role === "owner") {
      throw new ViewModelError(400, "INVALID_ROLE", "Vai trò không hợp lệ");
    }

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if (asStringId(memberUserId) === asStringId(project.ownerId)) {
      throw new ViewModelError(400, "CANNOT_MODIFY_OWNER", "Không thể chỉnh sửa vai trò chủ sở hữu. Vui lòng sử dụng tính năng chuyển quyền.");
    }

    const member = project.members.find(
      (m) => asStringId(m.userId) === asStringId(memberUserId)
    );
    if (!member) {
      throw new ViewModelError(404, "MEMBER_NOT_FOUND", "Không tìm thấy thành viên trong dự án");
    }

    const previousRole = member.role;
    member.role = role;
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "member.role_updated",
      entityId: project._id,
      summaryBefore: { userId: memberUserId, role: previousRole },
      summaryAfter: { userId: memberUserId, role },
    });

    realtimeService.publishProjectEvent(projectId, "member_updated", {
      projectId,
      userId: memberUserId,
      role,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Cập nhật vai trò thành viên thành công",
    };
  },

  async removeMember(projectId, memberUserId, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    ensureValidObjectId(memberUserId, "Member User ID");
    const ownerId = resolveUserId(actorId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if (asStringId(memberUserId) === asStringId(project.ownerId)) {
      throw new ViewModelError(400, "CANNOT_REMOVE_OWNER", "Không thể xóa chủ sở hữu khỏi dự án.");
    }

    const memberIndex = project.members.findIndex(
      (m) => asStringId(m.userId) === asStringId(memberUserId)
    );
    if (memberIndex === -1) {
      throw new ViewModelError(404, "MEMBER_NOT_FOUND", "Không tìm thấy thành viên trong dự án");
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "member.removed",
      entityId: project._id,
      summaryBefore: { userId: memberUserId },
    });

    realtimeService.publishProjectEvent(projectId, "member_removed", {
      projectId,
      userId: memberUserId,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã xóa thành viên khỏi dự án",
    };
  },

  async leaveProject(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    if (asStringId(project.ownerId) === asStringId(ownerId)) {
      throw new ViewModelError(400, "OWNER_CANNOT_LEAVE", "Chủ sở hữu không thể rời dự án. Bạn cần bàn giao quyền sở hữu trước.");
    }

    const memberIndex = project.members.findIndex(
      (m) => asStringId(m.userId) === asStringId(ownerId)
    );
    if (memberIndex === -1) {
      throw new ViewModelError(403, "NOT_A_MEMBER", "Bạn không phải thành viên của dự án này");
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "member.left",
      entityId: project._id,
      summaryBefore: { userId: ownerId },
    });

    realtimeService.publishProjectEvent(projectId, "member_removed", {
      projectId,
      userId: ownerId,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Bạn đã rời dự án thành công",
    };
  },

  async transferOwnership(projectId, targetUserId, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    ensureValidObjectId(targetUserId, "Target User ID");
    const ownerId = resolveUserId(actorId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, ["owner"]);

    if (asStringId(targetUserId) === ownerId) {
      throw new ViewModelError(400, "CANNOT_TRANSFER_TO_SELF", "Bạn đã là chủ sở hữu dự án này");
    }

    const isMember = project.members.find(
      (m) => asStringId(m.userId) === asStringId(targetUserId)
    );
    if (!isMember) {
      throw new ViewModelError(400, "TARGET_NOT_MEMBER", "Người được bàn giao quyền phải là thành viên hiện tại của dự án");
    }

    const summaryBefore = { ownerId };
    
    // Make targetUserId the new owner and demote the former owner to editor
    project.ownerId = targetUserId;
    
    // Update target member's role to "owner"
    isMember.role = "owner";

    // Recheck former owner's member record or add it
    const formerOwnerMember = project.members.find(
      (m) => asStringId(m.userId) === ownerId
    );
    if (formerOwnerMember) {
      formerOwnerMember.role = "editor";
    } else {
      project.members.push({
        userId: ownerId,
        role: "editor",
        addedBy: targetUserId,
        addedAt: new Date(),
      });
    }

    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "project.ownership_transferred",
      entityId: project._id,
      summaryBefore,
      summaryAfter: { ownerId: targetUserId },
    });

    realtimeService.publishProjectEvent(projectId, "project_owner_changed", {
      projectId,
      ownerId: targetUserId,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Bàn giao quyền sở hữu dự án thành công. Bạn đã chuyển sang vai trò Editor.",
    };
  },

  async createShareLink(projectId, payload, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(actorId);

    const role = payload.role || "viewer";
    if (!["viewer", "comment", "editor"].includes(role)) {
      throw new ViewModelError(400, "INVALID_ROLE", "Vai trò liên kết không hợp lệ");
    }

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, EDIT_PROJECT_ROLES);

    const activeShareLinks = (project.shareLinks || []).filter((l) => !l.isRevoked);
    if (activeShareLinks.length >= MAX_SHARE_LINKS_PER_PROJECT) {
      throw new ViewModelError(400, "LINK_LIMIT_EXCEEDED", `Dự án đạt số lượng liên kết chia sẻ tối đa (${MAX_SHARE_LINKS_PER_PROJECT} links)`);
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);

    let expiresAt = null;
    if (payload.expiryDays) {
      const days = Number(payload.expiryDays);
      if (isNaN(days) || days < 1 || days > 30) {
        throw new ViewModelError(400, "INVALID_EXPIRY", "Thời hạn liên kết hợp lệ là từ 1 đến 30 ngày");
      }
      expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
    }

    const newLink = {
      token: plainToken,
      tokenHash,
      role,
      label: payload.label || `Link ${role} ${new Date().toLocaleDateString()}`,
      maxUses: payload.maxUses ? Number(payload.maxUses) : null,
      usedCount: 0,
      isRevoked: false,
      expiresAt,
      createdBy: ownerId,
      createdAt: new Date(),
    };

    project.shareLinks.push(newLink);
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "share_link.created",
      entityId: project._id,
      summaryAfter: { role, label: newLink.label },
    });

    return {
      statusCode: 201,
      success: true,
      data: {
        linkId: project.shareLinks[project.shareLinks.length - 1]._id,
        plainToken, // Output ONCE to the creator
        role,
        label: newLink.label,
        expiresAt,
      },
      message: "Tạo liên kết chia sẻ thành công. Vui lòng sao chép mã liên kết.",
    };
  },

  async revokeShareLink(projectId, linkId, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    ensureValidObjectId(linkId, "Link ID");
    const ownerId = resolveUserId(actorId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, EDIT_PROJECT_ROLES);

    const link = project.shareLinks.id(linkId);
    if (!link) {
      throw new ViewModelError(404, "LINK_NOT_FOUND", "Không tìm thấy liên kết chia sẻ");
    }

    if (link.isRevoked) {
      throw new ViewModelError(400, "ALREADY_REVOKED", "Liên kết này đã bị vô hiệu hóa từ trước");
    }

    project.shareLinks.pull(linkId);
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "share_link.revoked",
      entityId: project._id,
      summaryBefore: { linkId },
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã vô hiệu hóa liên kết chia sẻ thành công",
    };
  },

  async generateInviteCode(projectId, payload, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(actorId);

    const role = payload.role || "viewer";
    if (!["viewer", "comment", "editor"].includes(role)) {
      throw new ViewModelError(400, "INVALID_ROLE", "Vai trò không hợp lệ");
    }

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, EDIT_PROJECT_ROLES);

    const code = generateInviteCode();
    
    // Default 7 days expiry, max 30 days
    let expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    if (payload.expiryDays) {
      const days = Number(payload.expiryDays);
      if (isNaN(days) || days < 1 || days > 30) {
        throw new ViewModelError(400, "INVALID_EXPIRY", "Thời hạn hợp lệ là từ 1 đến 30 ngày");
      }
      expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
    }

    project.inviteCode = {
      code,
      role,
      expiresAt,
      maxUses: payload.maxUses ? Number(payload.maxUses) : null,
      usedCount: 0,
      isRevoked: false,
      createdBy: ownerId,
      createdAt: new Date(),
    };

    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "invite_code.generated",
      entityId: project._id,
      summaryAfter: { code, role, expiresAt },
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        code,
        role,
        expiresAt,
      },
      message: "Tạo mã tham gia dự án thành công",
    };
  },

  async revokeInviteCode(projectId, actorId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(actorId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId, EDIT_PROJECT_ROLES);

    if (!project.inviteCode || !project.inviteCode.code || project.inviteCode.isRevoked) {
      throw new ViewModelError(400, "NO_ACTIVE_CODE", "Không có mã mời đang hoạt động");
    }

    project.inviteCode.isRevoked = true;
    await project.save();

    await writeProjectAuditLog({
      actorId: ownerId,
      action: "invite_code.revoked",
      entityId: project._id,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã thu hồi mã tham gia dự án thành công",
    };
  },

  async joinViaShareLink(token, userId) {
    const joiningUserId = resolveUserId(userId);
    if (!token || typeof token !== "string") {
      throw new ViewModelError(400, "MISSING_TOKEN", "Mã liên kết là bắt buộc");
    }

    const tokenHash = hashToken(token);
    
    // Find project containing active share link matching hashed token
    const project = await Project.findOne({
      deletedAt: null,
      shareLinks: {
        $elemMatch: {
          tokenHash,
          isRevoked: false,
        },
      },
    });

    if (!project) {
      // Artificial delay (500ms) to deter brute force guessing of 64-char hashes (timing attack protection)
      await delay(500);
      throw new ViewModelError(404, "LINK_EXPIRED_OR_INVALID", "Liên kết không hợp lệ, đã hết hạn hoặc bị thu hồi");
    }

    const link = project.shareLinks.find((l) => l.tokenHash === tokenHash);
    
    // Extra safety validations
    if (link.isRevoked) {
      await delay(500);
      throw new ViewModelError(400, "LINK_REVOKED", "Liên kết này đã bị vô hiệu hóa");
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await delay(500);
      throw new ViewModelError(400, "LINK_EXPIRED", "Liên kết này đã hết hạn");
    }

    if (link.maxUses && link.usedCount >= link.maxUses) {
      await delay(500);
      throw new ViewModelError(400, "LINK_MAX_USES_REACHED", "Liên kết này đã đạt số lượt sử dụng tối đa");
    }

    // Join logic
    const alreadyMember = project.members.some(
      (m) => asStringId(m.userId) === asStringId(joiningUserId)
    );

    if (alreadyMember) {
      return {
        statusCode: 200,
        success: true,
        data: { projectId: project._id },
        message: "Bạn đã là thành viên của dự án này từ trước",
      };
    }

    if ((project.members || []).length >= MAX_MEMBERS_PER_PROJECT) {
      throw new ViewModelError(400, "PROJECT_FULL", "Không thể tham gia vì dự án đã đạt giới hạn thành viên tối đa");
    }

    // Add to project members list
    project.members.push({
      userId: joiningUserId,
      role: link.role,
      addedBy: link.createdBy || project.ownerId,
      addedAt: new Date(),
    });

    // Increment used count
    link.usedCount += 1;
    await project.save();

    const user = await User.findById(joiningUserId).select("email displayName");

    await writeProjectAuditLog({
      actorId: joiningUserId,
      action: "member.joined_via_link",
      entityId: project._id,
      summaryAfter: { email: user.email, role: link.role },
    });

    // Publish membership event
    realtimeService.publishProjectEvent(project._id, "member_joined", {
      projectId: project._id,
      userId: joiningUserId,
      email: user.email,
      displayName: user.displayName,
      role: link.role,
    });

    return {
      statusCode: 200,
      success: true,
      data: { projectId: project._id },
      message: "Tham gia dự án thành công",
    };
  },

  async joinViaInviteCode(code, userId) {
    const joiningUserId = resolveUserId(userId);
    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      throw new ViewModelError(400, "INVALID_CODE_FORMAT", "Mã mời phải là chuỗi 6 ký tự");
    }

    const cleanCode = code.trim().toUpperCase();

    // Query project having matches active code
    const project = await Project.findOne({
      deletedAt: null,
      "inviteCode.code": cleanCode,
      "inviteCode.isRevoked": false,
    });

    if (!project) {
      // Brute-force delay
      await delay(500);
      throw new ViewModelError(404, "CODE_EXPIRED_OR_INVALID", "Mã mời không hợp lệ hoặc đã bị thu hồi");
    }

    const inv = project.inviteCode;
    
    if (inv.isRevoked) {
      await delay(500);
      throw new ViewModelError(400, "CODE_REVOKED", "Mã mời này đã bị vô hiệu hóa");
    }

    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      await delay(500);
      throw new ViewModelError(400, "CODE_EXPIRED", "Mã mời này đã hết hạn");
    }

    if (inv.maxUses && inv.usedCount >= inv.maxUses) {
      await delay(500);
      throw new ViewModelError(400, "CODE_MAX_USES_REACHED", "Mã mời này đã đạt tối đa số lượt dùng");
    }

    // Join logic
    const alreadyMember = project.members.some(
      (m) => asStringId(m.userId) === asStringId(joiningUserId)
    );

    if (alreadyMember) {
      return {
        statusCode: 200,
        success: true,
        data: { projectId: project._id },
        message: "Bạn đã là thành viên của dự án này từ trước",
      };
    }

    if ((project.members || []).length >= MAX_MEMBERS_PER_PROJECT) {
      throw new ViewModelError(400, "PROJECT_FULL", "Không thể tham gia vì dự án đã đạt giới hạn thành viên tối đa");
    }

    project.members.push({
      userId: joiningUserId,
      role: inv.role,
      addedBy: inv.createdBy || project.ownerId,
      addedAt: new Date(),
    });

    // Increment count
    inv.usedCount += 1;
    await project.save();

    const user = await User.findById(joiningUserId).select("email displayName");

    await writeProjectAuditLog({
      actorId: joiningUserId,
      action: "member.joined_via_code",
      entityId: project._id,
      summaryAfter: { email: user.email, role: inv.role },
    });

    realtimeService.publishProjectEvent(project._id, "member_joined", {
      projectId: project._id,
      userId: joiningUserId,
      email: user.email,
      displayName: user.displayName,
      role: inv.role,
    });

    return {
      statusCode: 200,
      success: true,
      data: { projectId: project._id },
      message: "Tham gia dự án thành công",
    };
  },

  async getActivityFeed(projectId, userId) {
    ensureValidObjectId(projectId, "Project ID");
    const ownerId = resolveUserId(userId);

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new ViewModelError(404, "PROJECT_NOT_FOUND", "Dự án không tồn tại");
    }

    checkProjectAccess(project, ownerId);

    const logs = await AuditLog.find({
      entityType: "project",
      entityId: projectId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actorId", "email displayName")
      .lean();

    return {
      statusCode: 200,
      success: true,
      data: logs,
    };
  },

  async createAblyToken(userId) {
    const ownerId = resolveUserId(userId);
    try {
      const tokenRequest = await realtimeService.createTokenRequest(ownerId);
      return {
        statusCode: 200,
        success: true,
        data: tokenRequest,
      };
    } catch (err) {
      throw new ViewModelError(500, "ABLY_AUTH_FAILED", "Không thể tạo token xác thực realtime: " + err.message);
    }
  },
};

// Middleware error-handler wrapping standard VM responses
const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof ViewModelError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: error.message,
        },
      });
    }

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: "Dữ liệu gửi lên database không hợp lệ",
        },
      });
    }

    console.error("Unexpected project error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Lỗi hệ thống khi xử lý dự án",
      },
    });
  }
};

export { ViewModelError, errorHandler };
export default projectViewModel;
