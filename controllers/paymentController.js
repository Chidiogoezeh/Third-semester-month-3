import axios from "axios";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";

export const initializePayment = async (req, res) => {
  const { orderId } = req.query;
  const email = "customer@example.com";

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email,
        amount: order.totalAmount * 100,
        callback_url: `${req.protocol}://${req.get("host")}/api/payment-success?orderId=${orderId}`,
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

      res.redirect("/?payment=success");
    } else {
      res.redirect("/?payment=failed");
    }
  } catch (error) {
    res.status(500).send("Error verifying transaction framework.");
  }
};
