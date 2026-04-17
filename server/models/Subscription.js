import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },
    plan: { type: String, enum: ["free", "pro", "business"], default: "free" },
    status: { type: String, enum: ["active", "cancelled", "trialing", "past_due"], default: "trialing" },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEnd: { type: Date }
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
