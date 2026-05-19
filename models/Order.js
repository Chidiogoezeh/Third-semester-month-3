import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  items: [
    {
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 },
    },
  ],
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["Pending Payment", "Order Placed", "Cancelled"],
    default: "Pending Payment",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", OrderSchema);
