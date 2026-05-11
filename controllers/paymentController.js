import axios from "axios";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";

export const initializePayment = async (req, res) => {
  const { orderId, email } = req.body;
  const order = await Order.findById(orderId);

  try {
    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email,
        amount: order.totalAmount * 100, // Paystack uses Kobo
        callback_url: `${req.protocol}://${req.get("host")}/payment-success`,
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` },
      },
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Payment initialization failed" });
  }
};
