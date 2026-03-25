import Task from "../models/Task.js";

export const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.status(200).json(tasks);
    } catch (error) {
        console.log("Lỗi khi gọi toàn bộ getAllTasks")
        res.status(500).json({ message: error.message });
    }
};

export const createTask = async (req, res) => {
    try {
        const { title, status, dueDate } = req.body;
        if (!title || !status || !dueDate) {
            return res.status(400).json({ message: "Title, status và due date là bắt buộc" });
        }
        const task = await Task.create(req.body);
        console.log("Task được tạo thành công:", task._id);
        res.status(201).json(task);
    } catch (error) {
        console.error("Lỗi khi tạo Task:", error.message);
        res.status(400).json({ message: error.message });
    }
};

export const updateTask = async (req, res) => {
    try{
        const task = await Task.findById(req.params.id);
        if(!task){
            return res.status(404).json({ message: "Task không tồn tại" });
        }
        const updateTask = await Task.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.status(200).json(updateTask);
    }catch(error){
        console.log("Lỗi khi gọi updateTask")
        res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try{
        const deleteTask = await Task.findByIdAndDelete(req.params.id);
        if(!deleteTask){
            return res.status(404).json({ message: "Task không tồn tại" });
        }
        res.status(200).json({ message: "Task đã được xóa thành công" });
    }catch(error){
        console.log("Lỗi khi gọi deleteTask")
        res.status(500).json({ message: error.message });
    }
};

export default {
    getAllTasks,
    createTask,
    updateTask,
    deleteTask
};