import mongoose from "mongoose";
import crypto from "crypto";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  category: {
    type: String, 
    required: true,
  },
  
  productName: String,

  regularPrice: Number,
  unitPrice: Number,
  quantity: { type: Number, required: true },

  subtotal: Number,

  shippingShare: Number,
  couponDiscount: Number,
  finalAmount: Number,
  stock: { type: Number, required: true },

  productImage: {
    type: [String],
    required: true,
  },

  status: {
    type: String,
    enum: ["ordered", "shipped", "delivered", "cancelled", "returned"],
    default: "ordered",
  },

  returnStatus: {
    type: String,
    enum: ["none", "requested", "approved", "rejected"],
    default: "none",
  },

  returnReason: String,
  adminReturnNote: String,

  cancelledAt: Date,
  returnedAt: Date,

  refundAmount: Number,
  refundStatus: {
    type: String,
    enum: ["none", "initiated", "completed"],
    default: "none",
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      default: () => crypto.randomUUID(),
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

    subtotal: Number,
    discount: Number,
    shippingCharge: Number,
    finalPayable: Number,

    couponCode: String,

    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay", "WALLET"],
      required: true,
    },

    paymentId: String,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    address: {
      
    },

    status: {
      type: String,
      enum: ["processing", "partially_cancelled", "cancelled", "completed", "Return_Requested"],
      default: "processing",
    },
    shippingRefunded: {
      type: Boolean,
      default: false,
    },

    couponAdjusted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
