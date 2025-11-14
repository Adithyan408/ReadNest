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
      required: false,
    },
    category: {
      type: String,
      ref: "Category",
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    stock : {
      type: Number,
      required: true
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
      required: false,
    },
    productOffer: {
      type: Number,
      required: false,
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
      required: false
    },
    yearOfPublishing :{
      type: Date,
      required: false
    },
    pages:{
      type: Number,
      default:null
    },
    status: {
      type: String,
      enum: ["Available", "Out of Stock", "Discontinued"],
      required: true,
      default: "Available",
    },
    isbnNumber:{
      type: Number,
      required: false
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productsSchema);

export default Product;
