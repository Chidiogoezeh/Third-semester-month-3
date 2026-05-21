import express from "express";
import mongoose from "mongoose";
import {
  initializePayment,
  handlePaystackWebhook,
} from "../controllers/paymentController.js";
import Menu from "../models/Menu.js";
import Order from "../models/Order.js";
import { PAYSTACK_CONFIG } from "../config/paystack.js";

const router = express.Router();

const adminSecureGate = (req, res, next) => {
  const providedToken = req.headers["x-admin-secret"];
  if (providedToken && providedToken === PAYSTACK_CONFIG.admin_secret) {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Access Denied: Invalid Administrative Token Payload" });
};

router.get("/pay-trigger", initializePayment);

// Custom raw body middleware pipeline engineered specifically for verification signatures
router.post(
  "/paystack-webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      req.rawBody = req.body.toString("utf8");
      req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
    } catch (e) {
      req.body = {};
    }
    next();
  },
  handlePaystackWebhook,
);

router.get("/menu", async (req, res) => {
  const items = await Menu.find({ isDeleted: { $ne: true } });
  res.json(items);
});

router.post("/menu", adminSecureGate, async (req, res) => {
  const newItem = await Menu.create(req.body);
  res.json(newItem);
});

router.put("/menu/:id", adminSecureGate, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: "Invalid ID format" });
  const updatedItem = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updatedItem);
});

router.delete("/menu/:id", adminSecureGate, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: "Invalid ID format" });
  await Menu.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.json({ success: true });
});

router.get("/orders", adminSecureGate, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to pull transaction logs" });
  }
});

router.patch("/orders/:id/fulfill", adminSecureGate, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  try {
    const fulfilledOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Order Fulfilled" } },
      { new: true },
    );
    res.json(fulfilledOrder);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update fulfillment state profile." });
  }
});

export default router;
