import express from "express";
import taskViewModel, { errorHandler } from "../viewmodels/taskViewModel.js";

const router = express.Router();

router.get(
  "/",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.getAllTasks();
    res
      .status(result.statusCode)
      .json({
        success: result.success,
        data: result.data,
      });
  })
);

router.post(
  "/",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.createTask(req.body);
    console.log("Task được tạo thành công:", result.data._id);
    res
      .status(result.statusCode)
      .json({
        success: result.success,
        data: result.data,
        message: result.message,
      });
  })
);

router.put(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.updateTask(req.params.id, req.body);
    res
      .status(result.statusCode)
      .json({
        success: result.success,
        data: result.data,
      });
  })
);

router.delete(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await taskViewModel.deleteTask(req.params.id);
    res
      .status(result.statusCode)
      .json({
        success: result.success,
        message: result.message,
      });
  })
);

export default router;
