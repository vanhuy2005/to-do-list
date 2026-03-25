import express from "express"
import tasksRouters from "./routes/tasksRouters.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use("/api/tasks", tasksRouters);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server listen port http://localhost:${PORT}`);
    });
}).catch((error) => {
    console.log("Kết nối MongoDB thất bại:", error);
    process.exit(1);
});





