import mongoose from "mongoose";

const clickSchema = new mongoose.Schema(
  {
    linkId: { type: mongoose.Schema.Types.ObjectId, ref: "Link", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: { type: String, required: true },
    country: { type: String },
    city: { type: String },
    region: { type: String },
    device: { type: String, enum: ["mobile", "desktop", "tablet"], default: "desktop" },
    browser: { type: String },
    browserVersion: { type: String },
    os: { type: String },
    osVersion: { type: String },
    utmSource: { type: String, default: "" },
    utmMedium: { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    sessionId: { type: String, index: true },
    referrer: { type: String }
  },
  { timestamps: true }
);

clickSchema.index({ userId: 1, createdAt: -1 });
clickSchema.index({ linkId: 1, createdAt: -1 });
clickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const Click = mongoose.model("Click", clickSchema);
export default Click;
