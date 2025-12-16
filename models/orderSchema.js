import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  productName: String,

  regularPrice: Number, // MRP (display only)
  unitPrice: Number, // 🔥 actual paid per unit
  quantity: { type: Number, required: true },

  subtotal: Number, // unitPrice * quantity

  shippingShare: Number, // per-item shipping (important for refunds)

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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

    subtotal: Number,
    discount: Number,
    shippingCharge: Number,
    finalPayable: Number,

    couponCode: String,

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      required: true,
    },

    paymentId: String,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    address: {
      /* snapshot */
    },

    status: {
      type: String,
      enum: ["processing", "partially_cancelled", "cancelled", "completed"],
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
