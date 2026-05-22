import express from "express";
import projectViewModel, { errorHandler } from "../viewmodels/projectViewModel.js";

const router = express.Router();

// Get Ably authentication token request (must be logged in)
router.get(
  "/token/auth",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.createAblyToken(req.userId);
    res.status(result.statusCode).json(result.data);
  })
);

// List all projects the user can see (owner or member)
router.get(
  "/",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.getAllProjects(req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Create a new project workspace
router.post(
  "/",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.createProject(req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Join a project via secure share link token (must be logged in)
router.post(
  "/join/link",
  errorHandler(async (req, res) => {
    const token = req.body.token || req.query.token;
    const result = await projectViewModel.joinViaShareLink(token, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Join a project via a 6-character alphanumeric invite code (must be logged in)
router.post(
  "/join/code",
  errorHandler(async (req, res) => {
    const { code } = req.body;
    const result = await projectViewModel.joinViaInviteCode(code, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Preview secure join link metadata
router.get(
  "/join/link/:token/preview",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.previewProjectJoinLink(req.params.token);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Preview secure invite code metadata
router.post(
  "/join/code/preview",
  errorHandler(async (req, res) => {
    const { code } = req.body;
    const result = await projectViewModel.previewProjectJoinCode(code);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Project invitations list for current user
router.get(
  "/invitations/me",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.getMyProjectInvitations(req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Preview secure project invitation metadata
router.get(
  "/invitations/:token/preview",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.previewProjectInvitation(req.params.token);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Accept secure project invitation
router.post(
  "/invitations/:token/accept",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.acceptProjectInvitation(req.params.token, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Decline secure project invitation
router.post(
  "/invitations/:token/decline",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.declineProjectInvitation(req.params.token, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Get specific project workspace details (members only)
router.get(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.getProjectById(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Update project metadata (owner/editor only)
router.patch(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.updateProject(req.params.id, req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Soft delete project (owner only)
router.delete(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.deleteProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Restore soft-deleted project (owner only)
router.post(
  "/:id/restore",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.restoreProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Hard delete project and all tasks forever (owner only)
router.delete(
  "/:id/purge",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.hardDeleteProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Archive project workspace (owner only)
router.post(
  "/:id/archive",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.archiveProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Unarchive project workspace (owner only)
router.post(
  "/:id/unarchive",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.unarchiveProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Add a member directly by email (owner only)
router.post(
  "/:id/members",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.addMember(req.params.id, req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Update a member's workspace role (owner only)
router.patch(
  "/:id/members/:memberId",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.updateMemberRole(
      req.params.id,
      req.params.memberId,
      req.body,
      req.userId
    );
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Remove a member from the workspace (owner only)
router.delete(
  "/:id/members/:memberId",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.removeMember(
      req.params.id,
      req.params.memberId,
      req.userId
    );
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Leave a project workspace (members only, owners cannot leave without transfer)
router.post(
  "/:id/leave",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.leaveProject(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Atomic transfer of project ownership (owner only)
router.patch(
  "/:id/transfer",
  errorHandler(async (req, res) => {
    const { targetUserId } = req.body;
    const result = await projectViewModel.transferOwnership(req.params.id, targetUserId, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Create a secure hashed share link (owner/editor only)
router.post(
  "/:id/share-links",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.createShareLink(req.params.id, req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Revoke a share link immediately (owner/editor only)
router.delete(
  "/:id/share-links/:linkId",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.revokeShareLink(req.params.id, req.params.linkId, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Generate/Update the project's short invite code (owner/editor only)
router.post(
  "/:id/invite-code",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.generateInviteCode(req.params.id, req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// Revoke the project's invite code (owner/editor only)
router.delete(
  "/:id/invite-code",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.revokeInviteCode(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// Get specific project workspace activity feed logs (members only)
router.get(
  "/:id/activity",
  errorHandler(async (req, res) => {
    const result = await projectViewModel.getActivityFeed(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

export default router;
