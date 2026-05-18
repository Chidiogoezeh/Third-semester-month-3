import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";

const getMainMenu = () => {
  return `Welcome to Naija Bite! Select options below:
1. Select 1 to Place an order
99. Select 99 to checkout order
98. Select 98 to see order history
97. Select 97 to see current order
0. Select 0 to cancel order`;
};

export const handleBotMessage = async (deviceId, message) => {
  let session = await Session.findOne({ deviceId });
  if (!session) {
    session = await Session.create({
      deviceId,
      currentOrder: { items: [], total: 0 },
      state: "idle",
      menuSnapshot: [],
    });
  }

  if (!session.currentOrder) {
    session.currentOrder = { items: [], total: 0 };
  }

  const input = message.trim();

  // Global Structural Interceptor: Immediate routing exit maps
  if (["0", "1", "97", "98", "99"].includes(input)) {
    if (input === "0") {
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

    if (input === "1") {
      const items = await Menu.find().sort({ category: 1, name: 1 });
      if (items.length === 0) {
        return "The menu is currently empty. Please check back later!";
      }

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
            const desc = item.description ? ` (${item.description})` : "";
            menuList += `${overallIndex}. ${item.name}${desc} - #${item.price}\n`;
            overallIndex++;
          }
        });
        menuList += "\n";
      });

      menuList += "Type the number of the item you wish to add to your basket.";
      return menuList;
    }

    if (input === "97") {
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "Your current basket is empty. Select 1 to start a new order.";
      }
      const currentItems = session.currentOrder.items
        .map((i) => `${i.name} (#${i.price})`)
        .join("\n");
      return `Current Order Basket:\n${currentItems}\n\nTotal: #${session.currentOrder.total}\n\nSelect 99 to checkout or 1 to add more items.`;
    }

    if (input === "99") {
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        // Idempotency safety net: Check if they hit 99 again while already in scheduling state
        if (
          session.state === "scheduling" ||
          session.state === "awaiting_payment"
        ) {
          const existingPendingOrder = await Order.findOne({
            sessionId: deviceId,
            status: "pending",
            paymentStatus: "unpaid",
          }).sort({ createdAt: -1 });

          if (existingPendingOrder) {
            return `You already have an order checked out (Order ID: ${existingPendingOrder._id}).\n\n[Optional] Type a delivery schedule (e.g., '6 PM'), or type 'SKIP' to move directly to payment.`;
          }
        }
        return "No order to place.\n\nSelect 1 to place a new order.";
      }

      // Check if a matching pending order exists with the exact same total amount to prevent accidental duplicates
      let targetOrder = await Order.findOne({
        sessionId: deviceId,
        status: "pending",
        paymentStatus: "unpaid",
        totalAmount: session.currentOrder.total,
      }).sort({ createdAt: -1 });

      if (!targetOrder) {
        targetOrder = await Order.create({
          sessionId: deviceId,
          items: session.currentOrder.items,
          totalAmount: session.currentOrder.total,
        });
      }

      // Safe state updates: clear current basket items only after establishing/finding the Order ID
      session.currentOrder = { items: [], total: 0 };
      session.menuSnapshot = [];
      session.state = "scheduling";
      await session.save();

      return `order placed\nOrder ID: ${targetOrder._id}.\n\n[Optional] Would you like to schedule this order? Enter delivery details (e.g., '6 PM'), or type 'SKIP' to pay immediately.\n\nAlternatively, select 1 to place a new order.`;
    }

    if (input === "98") {
      const history = await Order.find({ sessionId: deviceId });
      if (history.length === 0) {
        return (
          "No previous order history found for this device.\n\n" + getMainMenu()
        );
      }
      return (
        "Order History:\n" +
        history
          .map(
            (o) =>
              `ID: ${o._id.toString().slice(-5)} - #${o.totalAmount} | Payment: ${o.paymentStatus} | Scheduled: ${o.scheduledFor}`,
          )
          .join("\n") +
        "\n\nSelect 1 to place a new order."
      );
    }
  }

  // State Handler: Ordering Item Selection
  if (session.state === "ordering") {
    const num = parseInt(input);
    if (!isNaN(num) && num > 0 && num <= session.menuSnapshot.length) {
      const targetId = session.menuSnapshot[num - 1];
      const selected = await Menu.findById(targetId);

      if (!selected) {
        return "This item is no longer available. Select 1 to refresh the updated menu list.";
      }

      session.currentOrder.items.push({
        name: selected.name,
        price: selected.price,
      });
      session.currentOrder.total += selected.price;
      await session.save();

      return `${selected.name} added to your order. Total: #${session.currentOrder.total}.\nSelect another item number to add more, 97 to see current order, or 99 to checkout order.`;
    }
    return "Invalid selection. Please choose a valid item number from the list, 97 to see current order, or 0 to cancel order.";
  }

  // State Handler: Scheduling Flow
  if (session.state === "scheduling") {
    const lastOrder = await Order.findOne({ sessionId: deviceId }).sort({
      createdAt: -1,
    });
    if (lastOrder) {
      if (input.toUpperCase() !== "SKIP") {
        lastOrder.scheduledFor = input;
        await lastOrder.save();
      }
    }
    session.state = "awaiting_payment";
    await session.save();
    return `Schedule Preference Updated.\n\nType 'PAY' to proceed to your secure Paystack checkout interface page or 0 to cancel.`;
  }

  // State Handler: Awaiting Payment Action
  if (session.state === "awaiting_payment") {
    if (input.toUpperCase() === "PAY") {
      const lastOrder = await Order.findOne({
        sessionId: deviceId,
        status: "pending",
      }).sort({ createdAt: -1 });

      if (!lastOrder)
        return "No pending order found to pay for. Select 1 to place an order.";
      return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${lastOrder._id}`;
    }
    return "Please type 'PAY' to complete payment, select 1 to place a new order instead, or 0 to cancel.";
  }

  return getMainMenu();
};
