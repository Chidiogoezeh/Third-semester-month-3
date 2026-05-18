import express from "express";
import {
  initializePayment,
  handlePaystackWebhook,
} from "../controllers/paymentController.js";
import Menu from "../models/Menu.js";

const router = express.Router();

router.get("/pay-trigger", initializePayment);
router.post("/paystack-webhook", express.json(), handlePaystackWebhook);

// Filter out soft-deleted items to align Admin View with live customer menu expectations
router.get("/menu", async (req, res) => {
  const items = await Menu.find({ isDeleted: { $ne: true } });
  res.json(items);
});

router.post("/menu", async (req, res) => {
  const newItem = await Menu.create(req.body);
  res.json(newItem);
});

router.put("/menu/:id", async (req, res) => {
  const updatedItem = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updatedItem);
});

router.delete("/menu/:id", async (req, res) => {
  await Menu.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.json({ success: true });
});

export default router;
