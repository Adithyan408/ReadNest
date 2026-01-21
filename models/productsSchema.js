import mongoose from 'mongoose';
const { Schema } = mongoose;

const productsSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: '',
      required: true,
    },

    author: {
      type: String,
      default: '',
      required: true,
    },

    authorDescription: {
      type: String,
      default: '',
    },

    category: {
      type: String,
      default: '',
      required: true,
    },

    language: {
      type: String,
      default: '',
      required: true,
    },

    stock: {
      type: Number,
      required: true,
    },

    regularPrice: {
      type: Number,
      required: true,
    },

    productImage: {
      type: [String],
      required: true,
    },

    isListed: {
      type: Boolean,
      default: true,
    },

    publisher: {
      type: String,
      default: '',
    },

    yearOfPublishing: {
      type: String,
      default: '',
    },

    pages: {
      type: Number,
      default: null,
    },

    isbnNumber: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['Available', 'Out of Stock', 'Discontinued'],
      default: 'Available',
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

const Product = mongoose.model('Product', productsSchema);
export default Product;
