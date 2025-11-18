import mongoose from "mongoose";
const { Schema } = mongoose;

const productsSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },

    // DESCRIPTION VALIDATION
    description: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          if (this.specialOfferType === "none") {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: "Description is required for normal products.",
      },
    },

    // AUTHOR VALIDATION
    author: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          if (this.specialOfferType === "none") {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: "Author is required for normal products.",
      },
    },

    authorDescription: {
      type: String,
      default: "",
    },

    // CATEGORY VALIDATION
    category: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          if (this.specialOfferType === "none") {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: "Category is required for normal products.",
      },
    },

    // LANGUAGE VALIDATION
    language: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          if (this.specialOfferType === "none") {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: "Language is required for normal products.",
      },
    },

    stock: {
      type: Number,
      required: true,
    },

    specialOfferType: {
      type: String,
      enum: ["none", "combo", "rush-hour"],
      default: "none",
    },

    regularPrice: {
      type: Number,
      required: true,
    },

    // SALE PRICE VALIDATION
    salePrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          if (this.specialOfferType === "none") return true;
          return v !== null && v !== undefined && v > 0;
        },
        message: "Sale price is required for combo or rush-hour.",
      },
    },

    productImage: {
      type: [String],
      required: true,
    },

    isListed: {
      type: Boolean,
      default: true,
    },

    publisher: { type: String, default: "" },
    yearOfPublishing: { type: String, default: "" },
    pages: { type: Number, default: null },
    isbnNumber: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Available", "Out of Stock", "Discontinued"],
      default: "Available",
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productsSchema);
export default Product;
