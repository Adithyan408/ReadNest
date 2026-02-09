import mongoose from 'mongoose';
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    categoryName: {
      type: String,
      required: true,
    },

    normalizedName: {
    type: String,
    required: true,
    unique: true, 
    },

    isListed: {
      type: Boolean,
      default: true,
    },
    offer: {
      isOffer: { type: Boolean, default: false },
      discountValue: { type: Number, default: 0 }, 
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
  },
  { timestamps: true },
);


export default mongoose.model('Category', categorySchema);
