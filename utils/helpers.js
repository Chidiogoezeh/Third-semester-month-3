export const formatCurrency = (amount) => {
  return `₦${Number(amount).toFixed(2)}`;
};

export const safeIntAmount = (amount) => {
  return Math.round((amount * 100).toFixed(2));
};
