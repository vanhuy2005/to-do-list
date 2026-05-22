import express from "express";
import taskViewModel, { errorHandler } from "../viewmodels/taskViewModel.js";
import taskQueryMiddleware from "../middleware/taskQueryMiddleware.js";

const router = express.Router();

router.get(
  "/",
  taskQueryMiddleware,
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getAllTasks({
      query: req.query,
      userId: req.userId,
    });
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.createTask(req.body, req.userId);
    console.log("Task được tạo thành công:", result.data._id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.get(
  "/trash",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getDeletedTasks({
      query: req.query,
      userId: req.userId,
    });
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.get(
  "/invitations/me",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getMyTaskInvitations(req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.get(
  "/invitations/:token/preview",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.previewTaskInvitation(req.params.token);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/invitations/:token/accept",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.acceptTaskInvitation(req.params.token, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.post(
  "/invitations/:token/decline",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.declineTaskInvitation(req.params.token, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  }),
);

router.get(
  "/:id/shares",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getTaskShares(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/:id/shares",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.shareTask(
      req.params.id,
      req.body,
      req.userId,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.patch(
  "/:id/shares/:collaboratorId",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.updateTaskShare(
      req.params.id,
      req.params.collaboratorId,
      req.body,
      req.userId,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.delete(
  "/:id/shares/:collaboratorId",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.removeTaskShare(
      req.params.id,
      req.params.collaboratorId,
      req.userId,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.get(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getTaskById(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.put(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.updateTask(
      req.params.id,
      req.body,
      req.userId,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/:id/restore",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.restoreTask(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.delete(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.deleteTask(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  }),
);

router.get(
  "/:id/comments",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getTaskComments(req.params.id, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

router.post(
  "/:id/comments",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.createTaskComment(req.params.id, req.body, req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

export default router;
