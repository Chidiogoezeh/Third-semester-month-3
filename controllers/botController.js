import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";
import { formatCurrency } from "../utils/helpers.js";

export const getMainMenu = () => {
  return `Main Menu:
• Select 1 to Place an order (View Categories)
• Select 97 to See current order (Cart)
• Select 99 to Checkout and Pay
• Select 98 to See order history
• Select 0 to Clear/Cancel current order`;
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
      session.menuSnapshot = [];
      await session.save();
      return "Your cart is already empty.\n\n" + getMainMenu();
    }
    session.currentOrder = { items: [], total: 0 };
    session.state = "idle";
    session.menuSnapshot = [];
    await session.save();
    return "Your order has been cleared.\n\n" + getMainMenu();
  }

  // Intercepting global navigational states to allow fluid escape hatches
  if (
    session.state !== "idle" &&
    (input === "97" || input === "98" || input === "99")
  ) {
    session.state = "idle";
    session.menuSnapshot = [];
    // Fall through to normal 'idle' evaluation loop below by changing memory state
  }

  switch (session.state) {
    case "idle":
      if (input === "1") {
        const categories = await Menu.distinct("category", {
          isDeleted: { $ne: true },
        });
        if (categories.length === 0) {
          return (
            "Our kitchen is currently updating the menu. Please check back shortly!\n\n" +
            getMainMenu()
          );
        }

        session.state = "awaiting_category";
        session.menuSnapshot = [];

        let catMsg = "Select a category:\n";
        categories.forEach((cat, idx) => {
          const selectionCode = `1${idx + 1}`;
          catMsg += `• Select ${selectionCode} for ${cat}\n`;
          session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
        });
        catMsg += "• Select 9 to Go Back to Main Menu";

        await session.save();
        return catMsg;
      }

      if (input === "97") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          return "Your cart is empty. Select 1 to place a new order.";
        }
        let cartMsg = "Current Order Basket:\n";
        session.currentOrder.items.forEach((item) => {
          cartMsg += `• ${item.name} x${item.quantity} (${formatCurrency(item.price * item.quantity)}) - Select 7${item.removalKey} to remove\n`;
        });
        cartMsg += `\nTotal: ${formatCurrency(session.currentOrder.total)}\n\nSelect 9 to Go Back to Main Menu`;
        return cartMsg;
      }

      if (/^7[a-zA-Z0-9]+$/.test(input)) {
        const targetKey = input.substring(2);
        if (session.currentOrder && session.currentOrder.items.length > 0) {
          const matchIndex = session.currentOrder.items.findIndex(
            (i) => i.removalKey === targetKey,
          );
          if (matchIndex !== -1) {
            const removedItem = session.currentOrder.items[matchIndex];
            const lineCost =
              Math.round(removedItem.price * removedItem.quantity * 100) / 100;
            session.currentOrder.total =
              Math.round((session.currentOrder.total - lineCost) * 100) / 100;
            session.currentOrder.items.splice(matchIndex, 1);
            await session.save();
            return `Removed ${removedItem.name} from cart. Type 97 to check cart balances or 9 to go back.`;
          }
        }
        return "Invalid option. Please try again.\n\n" + getMainMenu();
      }

      if (input === "9") {
        return getMainMenu();
      }

      if (input === "99") {
        if (!session.currentOrder || session.currentOrder.items.length === 0) {
          session.state = "idle";
          await session.save();
          return "Your cart is empty. Select 1 to place a new order.";
        }

        let order = await Order.findOne({
          sessionId,
          status: "Pending Payment",
          totalAmount: session.currentOrder.total,
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
        session.menuSnapshot = [];
        await session.save();
        return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${order._id}&sess=${sessionId}`;
      }

      if (input === "98") {
        const history = await Order.find({
          sessionId: sessionId,
          status: "Order Placed",
        }).sort({ createdAt: -1 });

        if (history.length === 0) {
          return "No previous order history found.\n\n" + getMainMenu();
        }
        let historyMsg = "Order History:\n";
        history.forEach((o) => {
          const itemsStr = o.items
            .map((i) => `${i.name} (${i.quantity})`)
            .join(", ");
          historyMsg += `• ${new Date(o.createdAt).toLocaleDateString()} - [${itemsStr}] - Total: ${formatCurrency(o.totalAmount)}\n`;
        });
        return historyMsg + "\nSelect 9 to Go Back to Main Menu";
      }

      return "Invalid option. Please try again.\n\n" + getMainMenu();

    case "awaiting_category":
      if (input === "9") {
        session.state = "idle";
        session.menuSnapshot = [];
        await session.save();
        return getMainMenu();
      }

      const catMatch = session.menuSnapshot.find((snap) =>
        snap.startsWith(`CAT|${input}|`),
      );
      if (catMatch) {
        const categoryName = catMatch.split("|")[2];
        const items = await Menu.find({
          category: categoryName,
          isDeleted: { $ne: true },
        });

        if (items.length === 0) {
          return `There are currently no items in ${categoryName}. Select 9 to go back.`;
        }

        session.state = "awaiting_item";
        session.selectedCategory = categoryName;

        // Wipe historical memory and construct explicit new numerical item lists
        session.menuSnapshot = [];
        let itemsList = `${categoryName} Menu:\n`;
        items.forEach((item, index) => {
          const numericSelection = `${input}${index + 1}`;
          itemsList += `• Select ${numericSelection} for ${item.name} (${formatCurrency(item.price)})\n`;
          session.menuSnapshot.push(`ITEM|${numericSelection}|${item._id}`);
        });

        itemsList += "• Select 9 to Go Back to Categories";
        await session.save();
        return itemsList;
      }

      // Return dynamic category reconstruction on input mismatch
      const activeCats = await Menu.distinct("category", {
        isDeleted: { $ne: true },
      });
      let fallbackCatMsg =
        "Invalid option. Please try again.\n\nSelect a category:\n";
      session.menuSnapshot = [];
      activeCats.forEach((cat, idx) => {
        const selectionCode = `1${idx + 1}`;
        fallbackCatMsg += `• Select ${selectionCode} for ${cat}\n`;
        session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
      });
      fallbackCatMsg += "• Select 9 to Go Back to Main Menu";
      return fallbackCatMsg;

    case "awaiting_item":
      if (input === "9") {
        const categories = await Menu.distinct("category", {
          isDeleted: { $ne: true },
        });
        session.state = "awaiting_category";
        session.menuSnapshot = [];
        let catMsg = "Select a category:\n";
        categories.forEach((cat, idx) => {
          const selectionCode = `1${idx + 1}`;
          catMsg += `• Select ${selectionCode} for ${cat}\n`;
          session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
        });
        catMsg += "• Select 9 to Go Back to Main Menu";
        await session.save();
        return catMsg;
      }

      const itemMatch = session.menuSnapshot.find((snap) =>
        snap.startsWith(`ITEM|${input}|`),
      );
      if (itemMatch) {
        const itemId = itemMatch.split("|")[2];
        session.selectedItemId = itemId;
        session.state = "awaiting_quantity";
        // Preserve menuSnapshot so we can gracefully step back if needed
        await session.save();
        return "How many servings would you like to add?";
      }
      return "Invalid option. Please try again.";

    case "awaiting_quantity":
      const qty = parseInt(input, 10);
      if (isNaN(qty) || qty <= 0 || !/^\d+$/.test(input)) {
        return "Invalid option. Please try again.\nHow many servings would you like to add?";
      }

      const targetItem = await Menu.findById(session.selectedItemId);
      if (!targetItem || targetItem.isDeleted) {
        const categories = await Menu.distinct("category", {
          isDeleted: { $ne: true },
        });
        session.state = "awaiting_category";
        session.menuSnapshot = [];
        let catMsg =
          "This item is no longer available. Returning to Categories.\n\nSelect a category:\n";
        categories.forEach((cat, idx) => {
          const selectionCode = `1${idx + 1}`;
          catMsg += `• Select ${selectionCode} for ${cat}\n`;
          session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
        });
        catMsg += "• Select 9 to Go Back to Main Menu";
        await session.save();
        return catMsg;
      }

      // Generate localized unique token identifier to dodge tracking index collisions
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const generatedRemover = `${session.currentOrder.items.length + 1}${uniqueSuffix}`;

      session.currentOrder.items.push({
        name: targetItem.name,
        price: targetItem.price,
        quantity: qty,
        removalKey: generatedRemover,
      });

      const linesTotal = Math.round(targetItem.price * qty * 100) / 100;
      session.currentOrder.total =
        Math.round((session.currentOrder.total + linesTotal) * 100) / 100;

      // Re-populate dynamic categories list elements seamlessly
      const fallbackCats = await Menu.distinct("category", {
        isDeleted: { $ne: true },
      });
      session.state = "awaiting_category";
      session.menuSnapshot = [];

      let nextCatMsg = `Added ${qty}x ${targetItem.name} to your cart.\n\nSelect a category:\n`;
      fallbackCats.forEach((cat, idx) => {
        const selectionCode = `1${idx + 1}`;
        nextCatMsg += `• Select ${selectionCode} for ${cat}\n`;
        session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
      });
      nextCatMsg += "• Select 9 to Go Back to Main Menu";

      await session.save();
      return nextCatMsg;

    case "awaiting_payment":
      if (input === "9") {
        session.state = "idle";
        session.menuSnapshot = [];
        await session.save();
        return getMainMenu();
      }
      return "Your order checkout is pending. Please complete your payment via the link provided, select 0 to clear order, or select 9 to view the Main Menu.";

    default:
      session.state = "idle";
      session.menuSnapshot = [];
      await session.save();
      return getMainMenu();
  }
};
