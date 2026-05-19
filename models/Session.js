import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    currentOrder: {
      items: [
        {
          menuId: { type: String, required: true },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true },
          removalKey: { type: String, required: true },
        },
      ],
      total: { type: Number, default: 0 },
    },
    state: {
      type: String,
      enum: ["idle", "awaiting_category", "awaiting_item", "awaiting_quantity", "awaiting_payment"],
      default: "idle",
    },
    selectedCategory: { type: String, default: "" },
    selectedItemId: { type: String, default: "" },
    menuSnapshot: [{ type: String }],
    activeOrderLockId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Session", SessionSchema);