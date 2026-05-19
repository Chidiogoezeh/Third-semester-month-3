import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  currentOrder: {
    items: [
      {
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
      },
    ],
    total: { type: Number, default: 0 },
  },
  state: {
    type: String,
    enum: [
      "idle",
      "awaiting_category",
      "awaiting_item",
      "awaiting_quantity",
      "awaiting_payment",
    ],
    default: "idle",
  },
  selectedCategory: { type: String, default: "" },
  selectedItemId: { type: String, default: "" },
  menuSnapshot: [{ type: String }], // Maps user entry string tokens (like "111") to DB _ids
});

export default mongoose.model("Session", SessionSchema);
