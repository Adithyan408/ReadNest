import mongoose from 'mongoose';

const referralRewardSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  couponCode: {
    type: String,
    required: true,
    unique: true,
  },

  discount: {
    type: Number,
    required: true,
  },

  used: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  usedAt: Date,
});

export default mongoose.model('ReferralReward', referralRewardSchema);
