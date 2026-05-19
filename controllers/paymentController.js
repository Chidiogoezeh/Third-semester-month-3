import axios from "axios";
import crypto from "crypto";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";
import Session from "../models/Session.js";

export const initializePayment = async (req, res) => {
  const { orderId, sess } = req.query;
  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    if (order.status === "Order Placed") {
      return res.redirect(`/index.html?payment=success&orderId=${orderId}`);
    }

    const appUrl =
      process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const transactionEmail = sess
      ? `${sess}@nafabite.bot`
      : "customer@naijabite.com";

    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email: transactionEmail,
        amount: Math.round(order.totalAmount * 100), // Secure conversion to dynamic kobo integers
        callback_url: `${appUrl}/index.html?payment=success&orderId=${orderId}&sess=${sess || ""}`,
        reference: `REF_${orderId}_${Date.now()}`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` } },
    );
    res.redirect(response.data.data.authorization_url);
  } catch (error) {
    res.status(500).send("Failed to transition into Paystack Portal.");
  }
};

export const handlePaystackWebhook = async (req, res) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_CONFIG.secret_key)
    .update(req.rawBody) // Safely runs hashes over captured stream buffers
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Unauthorized Event Origin");
  }

  const event = req.body;
  if (event.event === "charge.success") {
    const reference = event.data.reference;
    const orderId = reference.split("_")[1];

    // Atomically find and lock preventing concurrent replay sweeps
    const confirmedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: "Pending Payment" },
      { $set: { status: "Order Placed" } },
      { new: true },
    );

    if (confirmedOrder) {
      await Session.findOneAndUpdate(
        { deviceId: confirmedOrder.sessionId },
        {
          $set: {
            state: "idle",
            currentOrder: { items: [], total: 0 },
            menuSnapshot: [],
          },
        },
      );
    }
  }
  res.sendStatus(200);
};
