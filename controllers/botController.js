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
    });
  }

  // Ensure currentOrder subdocument initialization framework
  if (!session.currentOrder) {
    session.currentOrder = { items: [], total: 0 };
  }

  const input = message.trim();
  const globalCommands = ["1", "97", "98", "99", "0"];

  // Global command interceptor to break loops/states cleanly
  if (globalCommands.includes(input)) {
    session.state = "idle";
  }

  // State: Ordering loop
  if (session.state === "ordering" && !globalCommands.includes(input)) {
    const num = parseInt(input);
    const items = await Menu.find().sort({ category: 1, name: 1 });

    if (!isNaN(num) && num > 0 && num <= items.length) {
      const selected = items[num - 1];
      session.currentOrder.items.push({
        name: selected.name,
        price: selected.price,
      });
      session.currentOrder.total += selected.price;
      await session.save();
      return `${selected.name} added to your order. Total: #${session.currentOrder.total}.\nSelect another item number to add more, 97 to check basket, or 99 to checkout.`;
    }
    return "Invalid selection. Please choose a valid item number from the list, or 0 to cancel.";
  }

  // State: Scheduling preference handling
  if (session.state === "scheduling" && !globalCommands.includes(input)) {
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

  // State: Awaiting payment input check
  if (session.state === "awaiting_payment" && !globalCommands.includes(input)) {
    if (input.toUpperCase() === "PAY") {
      const lastOrder = await Order.findOne({ sessionId: deviceId }).sort({
        createdAt: -1,
      });
      if (!lastOrder)
        return "No pending order found to pay for. Select 1 to place an order.";
      return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${lastOrder._id}`;
    }
    return "Please type 'PAY' to complete payment, or 0 to cancel and start over.";
  }

  switch (input) {
    case "1":
      const items = await Menu.find().sort({ category: 1, name: 1 });
      if (items.length === 0) {
        return "The menu is currently empty. Please check back later!";
      }
      session.state = "ordering";
      await session.save();

      let menuList = "Our Menu:\n\n";
      const categories = [...new Set(items.map((item) => item.category))];

      let overallIndex = 1;
      categories.forEach((category) => {
        menuList += `--- Category: ${category} ---\n`;
        items.forEach((item) => {
          if (item.category === category) {
            menuList += `${overallIndex}. ${item.name}: ${item.description || ""} - #${item.price}\n`;
            overallIndex++;
          }
        });
        menuList += "\n";
      });

      menuList +=
        "Type the entry line index number of the item you wish to add.";
      return menuList;

    case "97":
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "Your current basket is empty. Select 1 to start a new order.";
      }
      const currentItems = session.currentOrder.items
        .map((i) => `${i.name} (#${i.price})`)
        .join("\n");
      return `Current Order Basket:\n${currentItems}\n\nTotal: #${session.currentOrder.total}\n\nSelect 99 to checkout or 1 to add more items.`;

    case "99":
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "No order to place. Select 1 to start a new order.";
      }
      const newOrder = await Order.create({
        sessionId: deviceId,
        items: session.currentOrder.items,
        totalAmount: session.currentOrder.total,
      });

      session.currentOrder = { items: [], total: 0 };
      session.state = "scheduling";
      await session.save();

      return `order placed\nOrder ID: ${newOrder._id}.\n\n[Optional] Would you like to schedule this order? Enter delivery details (e.g., '6 PM'), or type 'SKIP' to pay immediately.\n\nTo start a fresh basket instead, select 1 to place a new order.`;

    case "98":
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

    case "0":
      session.currentOrder = { items: [], total: 0 };
      session.state = "idle";
      await session.save();
      return "Current order cleared and actions reset.\n\n" + getMainMenu();

    default:
      return getMainMenu();
  }
};
