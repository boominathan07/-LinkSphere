import Stripe from "stripe";

const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
if (!key || key.includes("xxx")) {
  // eslint-disable-next-line no-console
  console.error("STRIPE_SECRET_KEY is not configured correctly in .env. Stripe features are disabled.");
}

const stripe = key ? new Stripe(key) : null;

export default stripe;
