import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    icon: { type: String, default: "🔗" },
    thumbnailImage: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    scheduleStart: { type: Date },
    scheduleEnd: { type: Date },
    expiresAt: { type: Date },
    customSlug: { type: String },
    groupLabel: { type: String, default: "" },
    utmSource: { type: String, default: "" },
    utmMedium: { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    abVariantTitle: { type: String, default: "" },
    abVariantClicks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

linkSchema.index({ userId: 1, order: 1 });

const Link = mongoose.model("Link", linkSchema);
export default Link;
