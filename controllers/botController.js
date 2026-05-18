import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";
import { formatCurrency, validateSelection } from "../utils/helpers.js";

const getMainMenu = () => {
  return `Welcome to Naija Bite! Select options below:
1. Select 1 to Place an order
99. Select 99 to checkout order
98. Select 98 to see order history
97. Select 97 to see current order
0. Select 0 to cancel order`;
};

export const handleBotMessage = async (sessionId, message) => {
  let session = await Session.findOne({ deviceId: sessionId }); // keep deviceId schema matching if needed, but parameter must map right
  if (!session) {
    session = await Session.create({
      deviceId: sessionId, // Use the incoming payload correctly
      currentOrder: { items: [], total: 0 },
      state: "idle",
      menuSnapshot: [],
      menuVersion: 1,
    });
  }

  const input = message.trim();
  const isNumericInput = /^\d+$/.test(input);

  // Global Cancel Hook (Always Active)
  if (isNumericInput && input === "0") {
    await Order.updateMany(
      { sessionId: deviceId, status: "pending" },
      { status: "cancelled" },
    );
    session.currentOrder = { items: [], total: 0 };
    session.state = "idle";
    session.menuSnapshot = [];
    await session.save();
    return (
      "Current actions reset, basket cleared, and pending orders cancelled.\n\n" +
      getMainMenu()
    );
  }

  // State-Isolated Routing Engine
  switch (session.state) {
    case "idle":
    case "ordering":
      if (isNumericInput && input === "1") {
        // Fetch current active items matching the session's menu expectations
        const items = await Menu.find({ isDeleted: { $ne: true } }).sort({
          category: 1,
          name: 1,
        });
        if (items.length === 0) return "The menu is currently empty.";

        session.state = "ordering";
        session.menuSnapshot = items.map((item) => item._id.toString());
        await session.save();

        let menuList = "Our Menu:\n\n";
        const categories = [...new Set(items.map((item) => item.category))];
        let overallIndex = 1;

        categories.forEach((category) => {
          menuList += `--- Category: ${category} ---\n`;
          items.forEach((item) => {
            if (item.category === category) {
              menuList += `${overallIndex}. ${item.name} - ${formatCurrency(item.price)}\n`;
              overallIndex++;
            }
          });
          menuList += "\n";
        });
        return (
          menuList + "Type the number of the item to add it to your basket."
        );
      }

      if (isNumericInput && input === "97") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          return "Your basket is empty. Select 1 to start a new order.";
        }
        const currentItems = session.currentOrder.items
          .map((i) => `${i.name} (${formatCurrency(i.price)})`)
          .join("\n");
        return `Current Order Basket:\n${currentItems}\n\nTotal: ${formatCurrency(session.currentOrder.total)}\n\nSelect 99 to checkout.`;
      }

      if (isNumericInput && input === "99") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          return (
            "No order to place. Select 1 to place a new order.\n\n" +
            getMainMenu()
          );
        }
        // Move strictly forward to scheduling
        session.state = "scheduling";
        await session.save();
        return `Order initialized! Total: ${formatCurrency(session.currentOrder.total)}.\n\n[Optional] Would you like to schedule this order? Enter details (e.g., '6 PM'), or type 'SKIP' to pay immediately.`;
      }

      if (isNumericInput && input === "98") {
        const history = await Order.find({ sessionId: deviceId });
        if (history.length === 0)
          return "No previous order history found.\n\n" + getMainMenu();
        return (
          "Order History:\n" +
          history
            .map(
              (o) =>
                `ID: ${o._id.toString().slice(-5)} - ${formatCurrency(o.totalAmount)} | Payment: ${o.paymentStatus}`,
            )
            .join("\n") +
          "\n\nSelect 1 to place an order."
        );
      }

      // Handle item selection if inside ordering state
      if (session.state === "ordering" && isNumericInput) {
        // Use the utility to confirm boundaries safely before parsing the document IDs
        if (!validateSelection(input, session.menuSnapshot.length)) {
          return "Invalid menu option selected. Please choose a valid item number or press 0 to cancel.";
        }

        const num = parseInt(input, 10);
        if (num > 0 && num <= session.menuSnapshot.length) {
          const targetId = session.menuSnapshot[num - 1];
          const selected = await Menu.findOne({
            _id: targetId,
            isDeleted: { $ne: true },
          });

          if (!selected)
            return "This item was modified or removed. Type 1 to refresh menu.";

          session.currentOrder.items.push({
            name: selected.name,
            price: selected.price,
          });
          session.currentOrder.total += selected.price;
          await session.save();
          return `${selected.name} added. Total: ${formatCurrency(session.currentOrder.total)}.\nSelect another item number, 97 to view, or 99 to checkout.`;
        }
      }
      return "Invalid selection. Please follow menu choices or select 0 to reset.";

    case "scheduling":
      // Block processing options like '1' or '97' from mangling text values
      const schedulePreference =
        input.toUpperCase() === "SKIP" ? "ASAP" : input;

      // Idempotent Order Creation matching current session configuration
      let openOrder = await Order.findOne({
        sessionId: deviceId,
        status: "pending",
        paymentStatus: "unpaid",
      });
      if (!openOrder) {
        openOrder = await Order.create({
          sessionId: deviceId,
          items: session.currentOrder.items,
          totalAmount: session.currentOrder.total,
          scheduledFor: schedulePreference,
        });
      } else {
        openOrder.scheduledFor = schedulePreference;
        await openOrder.save();
      }

      session.currentOrder = { items: [], total: 0 }; // Clear context safe state
      session.state = "awaiting_payment";
      await session.save();
      return `Schedule Preference Set to: ${schedulePreference}.\n\nType 'PAY' to proceed to your secure Paystack payment page or 0 to cancel.`;

    case "awaiting_payment":
      if (input.toUpperCase() === "PAY") {
        const pendingOrder = await Order.findOne({
          sessionId: deviceId,
          status: "pending",
        }).sort({ createdAt: -1 });
        if (!pendingOrder)
          return "No pending order found. Select 1 to restart.";
        return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${pendingOrder._id}`;
      }
      return "Please type 'PAY' to complete payment, or 0 to cancel.";

    default:
      return getMainMenu();
  }
};
