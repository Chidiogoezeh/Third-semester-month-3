import express from "express";
import {
  initializePayment,
  handlePaystackWebhook,
} from "../controllers/paymentController.js";
import Menu from "../models/Menu.js";
import { PAYSTACK_CONFIG } from "../config/paystack.js";

const router = express.Router();

// Simple Admin Access Authorization Middleware Strategy
const adminSecureGate = (req, res, next) => {
  const providedToken = req.headers["x-admin-secret"] || req.query.admin_key;
  if (providedToken === PAYSTACK_CONFIG.admin_secret) {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Access Denied: Invalid Administrative Token" });
};

router.get("/pay-trigger", initializePayment);

// Webhook endpoint uses express.raw() to capture the exact, unaltered payload structure
router.post(
  "/paystack-webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body.toString();
    try {
      req.body = JSON.parse(req.rawBody);
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
  const updatedItem = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updatedItem);
});

router.delete("/menu/:id", adminSecureGate, async (req, res) => {
  await Menu.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.json({ success: true });
});

export default router;
