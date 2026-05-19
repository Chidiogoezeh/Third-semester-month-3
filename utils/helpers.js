export const formatCurrency = (amount) => `₦${Number(amount) % 1 === 0 ? Number(amount) : Number(amount).toFixed(2)}`;

export const safeIntAmount = (amount) => Math.round((amount * 100).toFixed(2));