import axios from "axios";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";

export const initializePayment = async (req, res) => {
  const { orderId } = req.query;
  const email = "customer@example.com";

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    // Idempotency Guard: If the order was already paid, prevent re-initializing with Paystack
    if (order.paymentStatus === "paid" || order.status === "completed") {
      return res.redirect("/?payment=success&orderId=" + orderId);
    }

    const appUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email,
        amount: order.totalAmount * 100,
        // OrderId is explicitly included in callback architecture
        callback_url: `${appUrl}/api/payment-success?orderId=${orderId}`,
        // MongoDB Order ID is used as Paystack's reference to ensure 1:1 mapped uniqueness
        reference: `REF_${orderId}_${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` },
      },
    );

    res.redirect(response.data.data.authorization_url);
  } catch (error) {
    res.status(500).send("Failed to transition into Paystack Portal gateway.");
  }
};

export const verifyPayment = async (req, res) => {
  const { reference, orderId } = req.query;

  try {
    const response = await axios.get(`${PAYSTACK_CONFIG.verify}${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` },
    });

    if (response.data.data.status === "success") {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        status: "completed",
      });
      res.redirect("/?payment=success&orderId=" + orderId);
    } else {
      res.redirect("/?payment=failed");
    }
  } catch (error) {
    res.status(500).send("Error verifying transaction framework.");
  }
};
