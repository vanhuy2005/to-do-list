import express from "express";
import tasksControllers from "../controllers/tasksControllers.js";

const router = express.Router();

router.get("/", tasksControllers.getAllTasks);

router.post("/", tasksControllers.createTask);

router.put("/:id", tasksControllers.updateTask);

router.delete("/:id", tasksControllers.deleteTask);

export default router;