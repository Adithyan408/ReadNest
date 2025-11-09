import mongoose from "mongoose";
const { Schema } = mongoose;

const productsSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    authorDescription: {
      type: String,
      required: true,
    },
    categotery: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    Translated: [
      {
        isTranslated: {
          type: Boolean,
          required: true,
          defalut: false,
        },
        transaltor: {
          type: String,
          required: true,
        },
        translatedLanguage: {
          type: String,
          required: true,
        },
        transaltorDescription: {
          type: String,
          required: true,
        },
      },
    ],
    regularPrice: {
      type: Number,
      required: true,
    },
    salesPrice: {
      type: Number,
      required: true,
    },
    productOffer: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    pages: {
      type: Number,
      required: true,
    },
    productImage: {
      type: [String],
      required: true,
    },
    isListed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Available", "Out of Stock", "Discontinued"],
      required: true,
      default: "Available",
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productsSchema);

export default Product;
