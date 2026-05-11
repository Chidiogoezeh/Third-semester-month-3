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

  switch (input) {
    case "1":
      const items = await Menu.find();
      session.state = "ordering";
      await session.save();
      let menuList = "Select an item by number:\n";
      items.forEach((item, index) => {
        menuList += `${index + 10}. ${item.name} - #${item.price}\n`;
      });
      return menuList;

    case "97":
      const current = session.currentOrder.items;
      if (current.length === 0) return "Your current order is empty.";
      return `Current Order: ${current.map((i) => i.name).join(", ")} \nTotal: #${session.currentOrder.total}`;

    case "99":
      if (session.currentOrder.items.length === 0) {
        return "No order to place. Select 1 to start a new order.";
      }
      const newOrder = await Order.create({
        sessionId: deviceId,
        items: session.currentOrder.items,
        totalAmount: session.currentOrder.total,
      });
      session.currentOrder = { items: [], total: 0 };
      session.state = "awaiting_payment"; // Update state
      await session.save();
      return `Order placed! Order ID: ${newOrder._id}. \n1. Type 'PAY' to pay via Paystack \n2. Select 1 to start a new order.`;

    case "PAY":
      if (session.state === "awaiting_payment") {
        return `To complete your payment, please click here: /api/pay/${deviceId}`;
      }
      return getMainMenu();

    case "98":
      const history = await Order.find({ sessionId: deviceId });
      if (history.length === 0) return "No previous orders found.";
      return history
        .map(
          (o) =>
            `ID: ${o._id.toString().slice(-5)} - #${o.totalAmount} (${o.status})`,
        )
        .join("\n");

    case "0":
      session.currentOrder = { items: [], total: 0 };
      await session.save();
      return "Order cancelled. Main Menu:\n" + getMainMenu();

    default:
      // Handle item selection (e.g., numbers >= 10)
      if (session.state === "ordering" && parseInt(input) >= 10) {
        const menuItems = await Menu.find();
        const selected = menuItems[parseInt(input) - 10];
        if (selected) {
          session.currentOrder.items.push({
            name: selected.name,
            price: selected.price,
          });
          session.currentOrder.total += selected.price;
          await session.save();
          return `${selected.name} added. Total: #${session.currentOrder.total}. Select more or 99 to checkout.`;
        }
      }
      return getMainMenu();
  }
};
