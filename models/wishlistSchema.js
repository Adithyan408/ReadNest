import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }
  ]
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;