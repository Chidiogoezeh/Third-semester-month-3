export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
};

export const validateSelection = (input, max) => {
  const num = parseInt(input);
  return !isNaN(num) && num >= 0 && num <= max;
};

export const generateSessionId = () => {
  return "sess_" + Math.random().toString(36).substr(2, 9);
};
