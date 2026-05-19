import dotenv from "dotenv";
dotenv.config();

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error(
    "CRITICAL: PAYSTACK_SECRET_KEY environment variable is missing.",
  );
}

export const PAYSTACK_CONFIG = {
  secret_key: process.env.PAYSTACK_SECRET_KEY,
  initialize: "https://api.paystack.co/transaction/initialize",
  verify: "https://api.paystack.co/transaction/verify/",
  admin_secret: process.env.ADMIN_SECRET_KEY,
};

if (
  !PAYSTACK_CONFIG.admin_secret ||
  PAYSTACK_CONFIG.admin_secret === "SuperSecretAdminKey123"
) {
  console.warn(
    "WARNING: Default or weak ADMIN_SECRET_KEY in use. Change immediately in production.",
  );
}
