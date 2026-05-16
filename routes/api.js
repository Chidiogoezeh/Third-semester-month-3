import express from "express";
import Menu from "../models/Menu.js";
import {
  initializePayment,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/menu", async (req, res) => {
  const items = await Menu.find();
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
  await Menu.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get("/pay-trigger", initializePayment);
router.get("/payment-success", verifyPayment);

export default router;
