import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

profileViewSchema.index({ userId: 1, createdAt: -1 });
profileViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const ProfileView = mongoose.model("ProfileView", profileViewSchema);
export default ProfileView;
