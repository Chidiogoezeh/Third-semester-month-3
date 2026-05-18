import mongoose from "mongoose";

const MenuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  isDeleted: { type: Boolean, default: false }, // Menu Versioning Strategy Flag
});

export default mongoose.model("Menu", MenuSchema);
