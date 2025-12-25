import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },

    discount: { type: Number, required: true },

    expiry: { type: Date, required: true },

    minPurchase: { type: Number, default: 0 },

    maxDiscount: {type: Number},

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: ["general", "referral"],
      default: "general",
    },

    maxUse: { type: Number, default: 1 }, 
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);
