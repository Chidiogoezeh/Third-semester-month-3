import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";

const getMainMenu = () => {
  return `Welcome to our Restaurant!
1. Select 1 to Place an order
99. Select 99 to checkout order
98. Select 98 to see order history
97. Select 97 to see current order
0. Select 0 to cancel order`;
};

export const handleBotMessage = async (deviceId, message) => {
  let session = await Session.findOne({ deviceId });
  if (!session) session = await Session.create({ deviceId });

  const input = message.trim();

  // If the user is currently ordering items
  if (
    session.state === "ordering" &&
    input !== "99" &&
    input !== "97" &&
    input !== "0"
  ) {
    const num = parseInt(input);
    const items = await Menu.find();

    if (!isNaN(num) && num > 0 && num <= items.length) {
      const selected = items[num - 1];
      session.currentOrder.items.push({
        name: selected.name,
        price: selected.price,
      });
      session.currentOrder.total += selected.price;
      await session.save();
      return `${selected.name} added to your order. Total: #${session.currentOrder.total}.\nSelect another number to add more, or 99 to checkout.`;
    }
    return "Invalid selection. Please choose a valid item number from the menu list, or 0 to cancel.";
  }

  // If the user is scheduling their order
  if (session.state === "scheduling") {
    const lastOrder = await Order.findOne({ sessionId: deviceId }).sort({
      createdAt: -1,
    });
    if (lastOrder) {
      lastOrder.scheduledFor = input;
      await lastOrder.save();
    }
    session.state = "awaiting_payment";
    await session.save();
    return `Order scheduled for: ${input}.\n\nType 'PAY' to initialize your Paystack transaction or 0 to cancel.`;
  }

  switch (input) {
    case "1":
      const items = await Menu.find();
      if (items.length === 0) {
        return "The menu is currently empty. Please check back later!";
      }
      session.state = "ordering";
      await session.save();

      let menuList = "Our Menu:\n";
      items.forEach((item, index) => {
        menuList += `${index + 1}. ${item.name} (${item.category}) - #${item.price}\n`;
      });
      menuList += "\nType the number of the item you wish to add.";
      return menuList;

    case "97":
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "Your current basket is empty.";
      }
      const currentItems = session.currentOrder.items
        .map((i) => `${i.name} (#${i.price})`)
        .join("\n");
      return `Current Order Basket:\n${currentItems}\n\nTotal: #${session.currentOrder.total}`;

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

      return `Order placed successfully! Order ID: ${newOrder._id}.\n\nWould you like to schedule this order? Enter a date/time (e.g., 'Today, 6 PM') or type 'ASAP' to proceed directly to payment.`;

    case "PAY":
      if (session.state === "awaiting_payment") {
        const lastOrder = await Order.findOne({ sessionId: deviceId }).sort({
          createdAt: -1,
        });
        if (!lastOrder) return "No order found to pay for.";
        return `Click the link below to securely pay via Paystack:\n${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${lastOrder._id}`;
      }
      return "No pending payment found. " + getMainMenu();

    case "98":
      const history = await Order.find({ sessionId: deviceId });
      if (history.length === 0)
        return "No previous order history found for this device.";
      return (
        "Order History:\n" +
        history
          .map(
            (o) =>
              `ID: ${o._id.toString().slice(-5)} - #${o.totalAmount} | Payment: ${o.paymentStatus} | Scheduled: ${o.scheduledFor || "N/A"}`,
          )
          .join("\n")
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
