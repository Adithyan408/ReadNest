import mongoose from 'mongoose';
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    categoryName: {
      type: String,
      required: true,
    },

    isListed: {
      type: Boolean,
      default: true,
    },
    offer: {
      isOffer: { type: Boolean, default: false },
      discountValue: { type: Number, default: 0 }, // percentage value
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export default mongoose.model('Category', categorySchema);
