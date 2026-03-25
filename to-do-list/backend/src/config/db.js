import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("Kết nối MongoDB thành công");
    } catch (error) {
        console.error("Kết nối MongoDB thất bại:", error);
        process.exit(1);
    }
};

export default connectDB;