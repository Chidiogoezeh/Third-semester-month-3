import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";
import { formatCurrency } from "../utils/helpers.js";

const getMainMenu = () => {
  return `Main Menu:
• Select 1 to Place an order (View Categories)
• Select 97 to See current order (Cart)
• Select 99 to Checkout and Pay
• Select 98 to See order history
• Select 0 to Clear/Cancel current order`;
};

const getCategoryMenu = () => {
  return `Select a category:
• Select 11 for Rice Dishes
• Select 12 for Swallow & Soups
• Select 13 for Beans and Tubers
• Select 14 for Snacks and Protein
• Select 15 for Drinks
• Select 9 to Go Back to Main Menu`;
};

const CATEGORY_MAP = {
  11: "Rice Dishes",
  12: "Swallow & Soups",
  13: "Beans and Tubers",
  14: "Snacks and Protein",
  15: "Drinks",
};

export const handleBotMessage = async (sessionId, message) => {
  let session = await Session.findOne({ deviceId: sessionId });
  if (!session) {
    session = await Session.create({
      deviceId: sessionId,
      currentOrder: { items: [], total: 0 },
      state: "idle",
    });
  }

  const input = message.trim();

  // Rule 0: Global Cancel/Clear Hook
  if (input === "0") {
    if (!session.currentOrder || session.currentOrder.items.length === 0) {
      session.state = "idle";
      await session.save();
      return "Your cart is already empty.\n\n" + getMainMenu();
    }
    session.currentOrder = { items: [], total: 0 };
    session.state = "idle";
    await session.save();
    return "Your order has been cleared.\n\n" + getMainMenu();
  }

  // State Management
  switch (session.state) {
    case "idle":
      if (input === "1") {
        session.state = "awaiting_category";
        await session.save();
        return getCategoryMenu();
      }

      if (input === "97") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          return "Your cart is empty. Select 1 to place a new order.";
        }
        let cartMsg = "Current Order Basket:\n";
        session.currentOrder.items.forEach((item, index) => {
          const removeCode = `7${index + 1}`;
          cartMsg += `• ${item.name} x${item.quantity} (${formatCurrency(item.price * item.quantity)}) - Select ${removeCode} to remove\n`;
        });
        cartMsg += `\nTotal: ${formatCurrency(session.currentOrder.total)}\n\nSelect 9 to Go Back to Main Menu`;
        return cartMsg;
      }

      // Explicit Cart item removal validation (e.g., 71, 72...)
      if (/^7\d+$/.test(input)) {
        const itemIndex = parseInt(input.substring(1), 10) - 1;
        if (session.currentOrder && session.currentOrder.items[itemIndex]) {
          const removedItem = session.currentOrder.items[itemIndex];
          session.currentOrder.total -=
            removedItem.price * removedItem.quantity;
          session.currentOrder.items.splice(itemIndex, 1);
          await session.save();
          return `Removed ${removedItem.name} from cart. Type 97 to check cart balances or 9 to go back.`;
        }
      }

      if (input === "9" || input === "97") {
        return getMainMenu();
      }

      if (input === "99") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          return "Your cart is empty. Select 1 to place a new order.";
        }

        // Enforce Idempotent Initialization
        let order = await Order.findOne({
          sessionId,
          status: "Pending Payment",
        });
        if (!order) {
          order = await Order.create({
            sessionId: sessionId,
            items: session.currentOrder.items,
            totalAmount: session.currentOrder.total,
            status: "Pending Payment",
          });
        }

        session.state = "awaiting_payment";
        await session.save();
        return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${order._id}&sess=${sessionId}`;
      }

      if (input === "98") {
        const history = await Order.find({
          sessionId: sessionId,
          status: "Order Placed",
        });
        if (history.length === 0) {
          return "No previous order history found.\n\n" + getMainMenu();
        }
        let historyMsg = "Order History:\n";
        history.forEach((o) => {
          const itemsStr = o.items
            .map((i) => `${i.name} (${i.quantity})`)
            .join(", ");
          historyMsg += `• ${o.createdAt.toLocaleDateString()} - [${itemsStr}] - Total: ${formatCurrency(o.totalAmount)}\n`;
        });
        return historyMsg + "\nSelect 9 to Go Back to Main Menu";
      }

      return "Invalid option. Please try again.\n\n" + getMainMenu();

    case "awaiting_category":
      if (input === "9") {
        session.state = "idle";
        await session.save();
        return getMainMenu();
      }

      if (CATEGORY_MAP[input]) {
        const categoryName = CATEGORY_MAP[input];
        const items = await Menu.find({
          category: categoryName,
          isDeleted: { $ne: true },
        });

        if (items.length === 0) {
          return `There are currently no items in ${categoryName}. Select 9 to go back.`;
        }

        session.state = "awaiting_item";
        session.selectedCategory = categoryName;

        let itemsList = `${categoryName} Menu:\n`;
        session.menuSnapshot = []; // Clean lookup array

        items.forEach((item, index) => {
          const numericSelection = `${input}${index + 1}`;
          itemsList += `• Select ${numericSelection} for ${item.name} (${formatCurrency(item.price)})\n`;
          session.menuSnapshot.push(`${numericSelection}|${item._id}`);
        });

        itemsList += "• Select 9 to Go Back to Categories";
        await session.save();
        return itemsList;
      }
      return "Invalid option. Please try again.\n\n" + getCategoryMenu();

    case "awaiting_item":
      if (input === "9") {
        session.state = "awaiting_category";
        await session.save();
        return getCategoryMenu();
      }

      const match = session.menuSnapshot.find((snap) =>
        snap.startsWith(`${input}|`),
      );
      if (match) {
        const itemId = match.split("|")[1];
        session.selectedItemId = itemId;
        session.state = "awaiting_quantity";
        await session.save();
        return "How many servings would you like to add?";
      }
      return "Invalid option. Please try again.";

    case "awaiting_quantity":
      const qty = parseInt(input, 10);
      if (isNaN(qty) || qty <= 0) {
        return "Invalid option. Please try again.\nHow many servings would you like to add?";
      }

      const targetItem = await Menu.findById(session.selectedItemId);
      if (!targetItem || targetItem.isDeleted) {
        session.state = "awaiting_category";
        await session.save();
        return (
          "This item is no longer available. Returning to Categories.\n\n" +
          getCategoryMenu()
        );
      }

      // Push into Cart Object Structurally
      session.currentOrder.items.push({
        name: targetItem.name,
        price: targetItem.price,
        quantity: qty,
      });
      session.currentOrder.total += targetItem.price * qty;

      session.state = "awaiting_category"; // Bounce back to category list view loop
      await session.save();
      return (
        `Added ${qty}x ${targetItem.name} to your cart.\n\n` + getCategoryMenu()
      );

    case "awaiting_payment":
      if (input === "9") {
        session.state = "idle";
        await session.save();
        return getMainMenu();
      }
      return "Your order checkout is pending. Please complete your payment via the link provided, select 0 to clear order, or select 9 to view the Main Menu.";

    default:
      session.state = "idle";
      await session.save();
      return getMainMenu();
  }
};
