import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    items: [
      {
        menuId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true }, // Snapshotted price at checkout execution
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 }, // Stored absolute calculation
    status: {
      type: String,
      enum: ["Pending Payment", "Order Placed", "Cancelled"],
      default: "Pending Payment",
      index: true,
    },
    idempotencyToken: { type: String, unique: true, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Order", OrderSchema);
