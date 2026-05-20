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
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending Payment", "Order Placed", "Order Fulfilled", "Cancelled"],
      default: "Pending Payment",
      index: true,
    },
    idempotencyToken: { type: String, unique: true, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Order", OrderSchema);
