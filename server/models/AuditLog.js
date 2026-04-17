import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    details: { type: Object, default: {} },
    ip: { type: String }
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
