import mongoose from "mongoose";

const emailCaptureSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    visitorEmail: { type: String, required: true },
    visitorName: { type: String },
    source: { type: String, default: "profile" }
  },
  { timestamps: true }
);

const EmailCapture = mongoose.model("EmailCapture", emailCaptureSchema);
export default EmailCapture;
