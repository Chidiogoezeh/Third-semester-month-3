import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (retries = 5, delay = 5000) => {
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
      console.log("MongoDB Connected Successfully...");
      break;
    } catch (err) {
      console.error(`MongoDB Connection Failed: ${err.message}`);
      retries -= 1;
      console.log(`Retries left: ${retries}. Waiting ${delay / 1000}s...`);
      if (retries === 0) process.exit(1);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

export default connectDB;