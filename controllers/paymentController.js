import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import { PAYSTACK_CONFIG } from "../config/paystack.js";
import Order from "../models/Order.js";
import Session from "../models/Session.js";
import { safeIntAmount } from "../utils/helpers.js";

export const initializePayment = async (req, res) => {
  const { orderId, sess } = req.query;

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res.status(400).send("Bad Request: Invalid parameters.");
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order details could not be found.");

    if (order.status === "Order Placed") {
      return res.redirect(`/index.html?payment=success&orderId=${orderId}`);
    }

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const cleanSessionString = String(sess || "anonymous_device").replace(/[^a-zA-Z0-9_\-]/g, "");
    const transactionEmail = `${cleanSessionString}@naijabite.bot`;

    const response = await axios.post(
      PAYSTACK_CONFIG.initialize,
      {
        email: transactionEmail,
        amount: safeIntAmount(order.totalAmount),
        callback_url: `${appUrl}/index.html?payment=success&orderId=${orderId}&sess=${cleanSessionString}`,
        reference: `REF_${orderId}_${Date.now()}`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_CONFIG.secret_key}` } }
    );
    res.redirect(response.data.data.authorization_url);
  } catch (error) {
    console.error("Payment Gateway handoff error details:", error.message);
    res.status(500).send("Failed to securely transition into Paystack Portal. Please retry.");
  }
};

export const handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", PAYSTACK_CONFIG.secret_key)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Unauthorized Event Origin Validation Failed");
    }

    const event = req.body;
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const orderId = reference.split("_")[1];

      if (!orderId) return res.sendStatus(200);

      const confirmedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: "Pending Payment" },
        { $set: { status: "Order Placed" } },
        { new: true }
      );

      if (confirmedOrder) {
        await Session.findOneAndUpdate(
          { deviceId: confirmedOrder.sessionId, activeOrderLockId: confirmedOrder._id },
          {
            $set: {
              state: "idle",
              currentOrder: { items: [], total: 0 },
              menuSnapshot: [],
              activeOrderLockId: null,
            },
          }
        );
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook processing failure stacktrace:", err);
    res.status(500).send("Webhook process encounter fatal crash context");
  }
};