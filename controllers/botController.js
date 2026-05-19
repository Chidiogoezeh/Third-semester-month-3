import Menu from "../models/Menu.js";
import Session from "../models/Session.js";
import Order from "../models/Order.js";
import { formatCurrency, safeIntAmount } from "../utils/helpers.js";
import crypto from "crypto";

export const getMainMenu = () => `Main Menu:
• Select 1 to Place an order (View Categories)
• Select 97 to See current order (Cart)
• Select 99 to Checkout and Pay
• Select 98 to See order history
• Select 0 to Clear/Cancel current order`;

const formatInvalidOption = (currentMenuText) => `Invalid option. Please try again.\n\n${currentMenuText}`;

export const handleBotMessage = async (sessionId, message) => {
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length < 5) {
    return "Session context corrupted. Please refresh your browser client application.";
  }

  try {
    let session = await Session.findOne({ deviceId: sessionId }) || await Session.create({
      deviceId: sessionId,
      currentOrder: { items: [], total: 0 },
      state: "idle",
    });

    const input = message.trim();

    if (input === "0") {
      const isEmpty = !session.currentOrder || session.currentOrder.items.length === 0;
      session.currentOrder = { items: [], total: 0 };
      session.state = "idle";
      session.menuSnapshot = [];
      session.activeOrderLockId = null;
      await session.save();
      return isEmpty 
        ? `Your cart is already empty.\n\n${getMainMenu()}`
        : `Your order has been cleared.\n\n${getMainMenu()}`;
    }

    if (session.state !== "idle" && ["97", "98", "99"].includes(input)) {
      session.state = "idle";
      session.menuSnapshot = [];
    }

    switch (session.state) {
      case "idle":
        if (input === "1") {
          const categories = await Menu.distinct("category", { isDeleted: { $ne: true } });
          if (categories.length === 0) {
            return `Our kitchen is currently updating the menu. Please check back shortly!\n\n${getMainMenu()}`;
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
          const targetKey = input.substring(1);
          if (session.currentOrder && session.currentOrder.items.length > 0) {
            const matchIndex = session.currentOrder.items.findIndex((i) => i.removalKey === targetKey);
            if (matchIndex !== -1) {
              const removedItem = session.currentOrder.items[matchIndex];
              const currentTotalCents = safeIntAmount(session.currentOrder.total);
              const lineCostCents = safeIntAmount(removedItem.price) * removedItem.quantity;
              
              session.currentOrder.total = (currentTotalCents - lineCostCents) / 100;
              session.currentOrder.items.splice(matchIndex, 1);
              await session.save();
              return `Removed ${removedItem.name} from cart. Type 97 to check cart balances or 9 to go back.`;
            }
          }
          return formatInvalidOption(getMainMenu());
        }

        if (input === "9") return getMainMenu();

        if (input === "99") {
          if (!session.currentOrder || session.currentOrder.items.length === 0) {
            session.state = "idle";
            await session.save();
            return "Your cart is empty. Select 1 to place a new order.";
          }

          const itemPayloadFingerprint = crypto
            .createHash("sha256")
            .update(JSON.stringify(session.currentOrder.items) + session.currentOrder.total + session.deviceId)
            .digest("hex");

          let order = await Order.findOne({ idempotencyToken: itemPayloadFingerprint });
          if (!order) {
            const verifiedItems = [];
            let recalibratedCentsTotal = 0;

            for (const localItem of session.currentOrder.items) {
              const freshMenuDbItem = await Menu.findOne({ _id: localItem.menuId, isDeleted: { $ne: true } });
              if (!freshMenuDbItem) {
                return `Menu items updated. '${localItem.name}' is no longer available. Type 0 to clear and restart checkout.`;
              }
              verifiedItems.push({
                menuId: freshMenuDbItem._id,
                name: freshMenuDbItem.name,
                price: freshMenuDbItem.price,
                quantity: localItem.quantity,
              });
              recalibratedCentsTotal += safeIntAmount(freshMenuDbItem.price) * localItem.quantity;
            }

            session.currentOrder.total = recalibratedCentsTotal / 100;

            order = await Order.create({
              sessionId: session.deviceId,
              items: verifiedItems,
              totalAmount: session.currentOrder.total,
              status: "Pending Payment",
              idempotencyToken: itemPayloadFingerprint,
            });
          }

          session.state = "awaiting_payment";
          session.activeOrderLockId = order._id;
          session.menuSnapshot = [];
          await session.save();

          return `PAY_LINK|${process.env.APP_URL || "http://localhost:3000"}/api/pay-trigger?orderId=${order._id}&sess=${session.deviceId}`;
        }

        if (input === "98") {
          const history = await Order.find({ sessionId: session.deviceId, status: "Order Placed" }).sort({ createdAt: -1 });
          if (history.length === 0) return `No previous order history found.\n\n${getMainMenu()}`;
          
          let historyMsg = "Order History:\n";
          history.forEach((o) => {
            const itemsStr = o.items.map((i) => `${i.name} (${i.quantity})`).join(", ");
            historyMsg += `• ${new Date(o.createdAt).toLocaleDateString()} - [${itemsStr}] - Total: ${formatCurrency(o.totalAmount)}\n`;
          });
          return `${historyMsg}\nSelect 9 to Go Back to Main Menu`;
        }

        return formatInvalidOption(getMainMenu());

      case "awaiting_category": {
        if (input === "9") {
          session.state = "idle";
          session.menuSnapshot = [];
          await session.save();
          return getMainMenu();
        }

        const catMatch = session.menuSnapshot.find((snap) => snap.startsWith(`CAT|${input}|`));
        if (catMatch) {
          const categoryName = catMatch.split("|")[2];
          const items = await Menu.find({ category: categoryName, isDeleted: { $ne: true } });

          if (items.length === 0) return `There are currently no items in ${categoryName}. Select 9 to go back.`;

          session.state = "awaiting_item";
          session.selectedCategory = categoryName;
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

        const fallbackActiveCats = await Menu.distinct("category", { isDeleted: { $ne: true } });
        let errCatMsg = "Invalid choice. Please choose from available items:\n\nSelect a category:\n";
        session.menuSnapshot = [];
        fallbackActiveCats.forEach((cat, idx) => {
          const selectionCode = `1${idx + 1}`;
          errCatMsg += `• Select ${selectionCode} for ${cat}\n`;
          session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
        });
        errCatMsg += "• Select 9 to Go Back to Main Menu";
        return errCatMsg;
      }

      case "awaiting_item": {
        if (input === "9") {
          const categories = await Menu.distinct("category", { isDeleted: { $ne: true } });
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

        const itemMatch = session.menuSnapshot.find((snap) => snap.startsWith(`ITEM|${input}|`));
        if (itemMatch) {
          session.selectedItemId = itemMatch.split("|")[2];
          session.state = "awaiting_quantity";
          await session.save();
          return "How many servings would you like to add?";
        }
        return "Invalid option. Please check item listings and enter a valid numeric assignment option.";
      }

      case "awaiting_quantity": {
        const qty = parseInt(input, 10);
        if (isNaN(qty) || qty <= 0 || !/^\d+$/.test(input) || qty > 100) {
          return "Invalid quantity assignment. Please supply an integer value between 1 and 100:\nHow many servings would you like to add?";
        }

        const targetItem = await Menu.findById(session.selectedItemId);
        const fallbackCats = await Menu.distinct("category", { isDeleted: { $ne: true } });
        session.state = "awaiting_category";
        session.menuSnapshot = [];

        if (!targetItem || targetItem.isDeleted) {
          let catMsg = "This item is no longer available. Returning to Categories.\n\nSelect a category:\n";
          fallbackCats.forEach((cat, idx) => {
            const selectionCode = `1${idx + 1}`;
            catMsg += `• Select ${selectionCode} for ${cat}\n`;
            session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
          });
          catMsg += "• Select 9 to Go Back to Main Menu";
          await session.save();
          return catMsg;
        }

        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const generatedRemover = `${session.currentOrder.items.length + 1}${uniqueSuffix}`;

        session.currentOrder.items.push({
          menuId: targetItem._id.toString(),
          name: targetItem.name,
          price: targetItem.price,
          quantity: qty,
          removalKey: generatedRemover,
        });

        const existingCents = safeIntAmount(session.currentOrder.total);
        const addedCents = safeIntAmount(targetItem.price) * qty;
        session.currentOrder.total = (existingCents + addedCents) / 100;

        let nextCatMsg = `Added ${qty}x ${targetItem.name} to your cart.\n\nSelect a category:\n`;
        fallbackCats.forEach((cat, idx) => {
          const selectionCode = `1${idx + 1}`;
          nextCatMsg += `• Select ${selectionCode} for ${cat}\n`;
          session.menuSnapshot.push(`CAT|${selectionCode}|${cat}`);
        });
        nextCatMsg += "• Select 9 to Go Back to Main Menu";

        await session.save();
        return nextCatMsg;
      }

      case "awaiting_payment":
        if (input === "9") {
          session.state = "idle";
          session.menuSnapshot = [];
          await session.save();
          return getMainMenu();
        }

        if (session.activeOrderLockId) {
          const checkedOrderState = await Order.findById(session.activeOrderLockId);
          if (checkedOrderState && checkedOrderState.status === "Order Placed") {
            session.state = "idle";
            session.currentOrder = { items: [], total: 0 };
            session.activeOrderLockId = null;
            await session.save();
            return `Payment Successful! Your order has been officially placed.\n\n${getMainMenu()}`;
          }
        }
        return "Your checkout order processing verification is still pending. Please complete your transaction payment via the secure portal link window, or select 0 to clear and cancel current basket updates safely.";

      default:
        session.state = "idle";
        session.menuSnapshot = [];
        await session.save();
        return getMainMenu();
    }
  } catch (err) {
    console.error("Critical Runtime Fail Exception Handled Gracefully: ", err);
    return "System processing error occurred. Please type 0 to reset session cleanly.";
  }
};