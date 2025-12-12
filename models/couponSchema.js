import mongoose from "mongoose";


 const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  discount: Number,
  expiry: Date,
  isUsed: { type: Boolean, default: false },
  minPurchase: { type: Number, default: 0 },

});


const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;