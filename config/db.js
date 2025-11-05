import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config();

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("DB connected!!");
        
    } catch (error) {
        console.log("DB Connection failed", error.message);
        process.exit(1);
    }
}