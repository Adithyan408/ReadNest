import mongoose from "mongoose";
const { Schema } = mongoose;

    const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false,
    unique: false,
    sparse: false,
    default: null,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  cart : [{
    type: Schema.Types.ObjectId,
    ref:"Cart"
  }],
  wallet: [{
    type: Schema.Types.ObjectId,
    ref: "Wishlist"
  }],
  orderHistory: [{
    type: Schema.Types.ObjectId,
    ref: "Order"
  }],
  searchHistory: [{
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category"
    },
    author: {
        type: String
    },
    searchOn: {
        type: Date,
        default: Date.now
    }
  }]
});


const User = mongoose.model("User", userSchema);

export default User;