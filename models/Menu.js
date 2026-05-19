import mongoose from "mongoose";

const MenuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 }, // Evaluated in standard units, stored cleanly
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("Menu", MenuSchema);
