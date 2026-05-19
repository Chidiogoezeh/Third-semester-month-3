import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  currentOrder: {
    items: [
      {
        name: String,
        price: Number,
        quantity: Number,
        removalKey: String, // Lock tracking key to prevent index shifts
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
  menuSnapshot: [{ type: String }],
});

export default mongoose.model("Session", SessionSchema);
