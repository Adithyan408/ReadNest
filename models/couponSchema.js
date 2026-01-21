import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },

    discount: { type: Number, required: true },

    start: { type: Date, required: true },
    expiry: { type: Date, required: true },

    minPurchase: { type: Number, default: 0 },

    maxDiscount: {
      type: Number,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator: function (v) {
          if (this.type === 'referral') {
            return v !== null;
          }
          return true;
        },
        message: 'Referral coupons must belong to a user',
      },
    },

    type: {
      type: String,
      enum: ['general', 'referral'],
      default: 'general',
    },

    maxUse: { type: Number, default: 1 },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1, userId: 1 }, { unique: true });

export default mongoose.model('Coupon', couponSchema);
