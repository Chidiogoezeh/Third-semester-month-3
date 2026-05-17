import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  currentOrder: {
    items: [{ name: String, price: Number }],
    total: { type: Number, default: 0 },
  },
  state: {
    type: String,
    enum: ["idle", "ordering", "scheduling", "awaiting_payment"],
    default: "idle",
  },
});

export default mongoose.model("Session", SessionSchema);
