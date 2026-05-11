import Order from "../models/Order.js";
import Session from "../models/Session.js";

export const getCurrentOrder = async (sessionId) => {
  const session = await Session.findOne({ sessionId });
  if (!session || session.currentOrder.length === 0) return null;
  return session.currentOrder;
};

export const addToOrder = async (sessionId, item) => {
  let session = await Session.findOne({ sessionId });
  if (!session) {
    session = new Session({ sessionId, currentOrder: [] });
  }
  session.currentOrder.push(item);
  await session.save();
  return session.currentOrder;
};

export const clearOrder = async (sessionId) => {
  await Session.findOneAndUpdate({ sessionId }, { currentOrder: [] });
};

export const saveOrderHistory = async (sessionId, items, total) => {
  const newOrder = new Order({
    sessionId,
    items,
    total,
    status: "completed",
  });
  return await newOrder.save();
};
