import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date }
  },
  { timestamps: true }
);


couponUsageSchema.index({ userId: 1, couponId: 1 }, { unique: true });

export default mongoose.model("CouponUsage", couponUsageSchema);
