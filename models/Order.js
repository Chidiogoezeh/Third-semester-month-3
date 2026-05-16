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
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  paymentStatus: { type: String, default: "unpaid" },
  scheduledFor: { type: String, default: "ASAP" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", OrderSchema);
