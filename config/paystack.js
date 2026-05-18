import dotenv from "dotenv";
dotenv.config();

export const PAYSTACK_CONFIG = {
  secret_key: process.env.PAYSTACK_SECRET_KEY,
  initialize: "https://api.paystack.co/transaction/initialize",
  verify: "https://api.paystack.co/transaction/verify/",
  admin_secret: process.env.ADMIN_SECRET_KEY || "SuperSecretAdminKey123",
};
