import mongoose from "mongoose";
const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    refunded: {
      type: Boolean,
      default: false,
    },

    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true,
        },

        amount: {
          type: Number,
          required: true,
        },

        note: {
          type: String,
        },

        orderId: {
          type: String, 
          default: null,
        },
        paymentId: {
          type: String,
          default: null,
        },

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },

  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
