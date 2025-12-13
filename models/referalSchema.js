import mongoose from "mongoose";

const referralRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  couponCode: { type: String, required: true },
  discount: { type: Number, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export default mongoose.model("ReferralReward", referralRewardSchema);
