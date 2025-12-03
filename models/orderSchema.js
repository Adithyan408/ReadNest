import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: String,
  regularPrice: Number,
  stock: { type: Number, required: true },
  subtotal: Number,
   productImage: {
      type: [String],
      required: true,
    },
  quantity: { type: Number},
  status: {
    type: String,
    enum: ["ordered", "shipped", "delivered", "cancelled", "returned"],
    default: "ordered",
  },
  cancelledAt: Date,
  returnedAt: Date,
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    total: Number,
    paymentId: String, 
    quantity: { type: Number},
     
    status: {
      type: String,
      enum: ["processing", "partially_cancelled", "cancelled", "completed"],
      default: "processing",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
