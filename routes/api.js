import express from "express";
import Menu from "../models/Menu.js";
import { initializePayment } from "../controllers/paymentController.js";

const router = express.Router();

router.get("/menu", async (req, res) => {
  const items = await Menu.find();
  res.json(items);
});

router.post("/menu", async (req, res) => {
  const newItem = await Menu.create(req.body);
  res.json(newItem);
});

router.delete("/menu/:id", async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.post("/pay", initializePayment);

router.get("/payment-success", (req, res) => {
  // Logic to verify via Paystack reference
  res.send(
    "<h1>Payment Successful!</h1><p>You can return to the chat now.</p>",
  );
});

export default router;
