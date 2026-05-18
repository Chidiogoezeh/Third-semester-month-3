export const formatCurrency = (amount) => {
  return `₦${amount}`;
};

export const validateSelection = (input, max) => {
  const num = parseInt(input, 10);
  return !isNaN(num) && num > 0 && num <= max;
};

export const generateSessionId = () => {
  return "sess_" + Math.random().toString(36).substr(2, 9);
};
