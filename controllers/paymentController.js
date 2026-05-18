import axios from "axios";
import crypto from "crypto";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";

export const initializePayment = async (req, res) => {
  const { orderId } = req.query;
  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");
    if (order.paymentStatus === "paid")
      return res.redirect("/?payment=success&orderId=" + orderId);

    const appUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email: "customer@example.com",
        amount: Math.round(order.totalAmount * 100),
        callback_url: `${appUrl}/index.html?payment=success&orderId=${orderId}`, // Ensure explicit routing file context if static
        reference: `REF_${orderId}_${Date.now()}`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` } },
    );
    res.redirect(response.data.data.authorization_url);
  } catch (error) {
    res.status(500).send("Failed to transition into Paystack Portal.");
  }
};

// Missing Paystack Secret Token Security (Webhook Implementation)
export const handlePaystackWebhook = async (req, res) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_CONFIG.secret_key)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Unauthorized Event Origin");
  }

  const event = req.body;
  if (event.event === "charge.success") {
    const reference = event.data.reference;
    // Extract OrderId safely from standard custom fields or reference string partitioning
    const orderId = reference.split("_")[1];

    // Idempotency update guard
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      status: "completed",
    });
  }
  res.sendStatus(200);
};
