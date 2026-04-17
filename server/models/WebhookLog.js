import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema(
  {
    stripeEventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    payload: { type: mongoose.Schema.Types.Mixed },
    error: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const WebhookLog = mongoose.model("WebhookLog", webhookLogSchema);
export default WebhookLog;
